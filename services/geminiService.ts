import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, ExamProfile, UploadedFile, StrategicAnalysis, AnswerAttempt } from "../types";

// Helper to safely get the API key
const getApiKey = () => {
  const localKey = localStorage.getItem('cogniquest_gemini_api_key');
  if (localKey) return localKey;

  const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("API Key is missing in process.env.API_KEY");
    return "";
  }
  return key;
};

const getAiInstance = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Chave de API não encontrada. Configure-a nas configurações do sistema (ícone de engrenagem) ou no arquivo .env.");
  }
  return new GoogleGenAI({ apiKey });
};

// Schema for generating questions
const questionSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING, description: "The question stem/statement." },
      options: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "List of 4 or 5 answer choices."
      },
      correctIndex: { type: Type.INTEGER, description: "Zero-based index of the correct answer." },
      explanation: { type: Type.STRING, description: "Detailed, step-by-step didactic explanation." },
      topic: { type: Type.STRING, description: "The subject (e.g., Português, Informática, Direito Penal, etc)." }
    },
    required: ["text", "options", "correctIndex", "explanation", "topic"],
  },
};

const cleanAndParseJSON = (text: string): any => {
  if (!text) throw new Error("Received empty response from AI");

  let cleanText = text.trim();
  
  // Remove markdown code blocks if present (covers json, JSON, nothing)
  cleanText = cleanText.replace(/```[a-zA-Z]*\n/g, "").replace(/```/g, "").trim();

  // Find the first '[' and the last ']' to ignore any introductory text
  const firstOpen = cleanText.indexOf('[');
  const lastClose = cleanText.lastIndexOf(']');

  if (firstOpen !== -1 && lastClose !== -1) {
    cleanText = cleanText.substring(firstOpen, lastClose + 1);
  } else {
    // Fallback: if array brackets aren't found, try object curly braces (rare but possible)
    const firstCurly = cleanText.indexOf('{');
    const lastCurly = cleanText.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1) {
       cleanText = cleanText.substring(firstCurly, lastCurly + 1);
    }
  }

  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Error. Raw Text:", text);
    // Attempt simple fixes like trailing commas before failure
    try {
        const fixedText = cleanText.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");
        return JSON.parse(fixedText);
    } catch (e2) {
         throw new Error("A IA gerou uma resposta, mas não foi possível ler o formato (JSON inválido). Tente novamente.");
    }
  }
};

export const generateQuestions = async (
  profile: ExamProfile, 
  files: UploadedFile[], 
  extraContext: string
): Promise<Question[]> => {
  
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Chave de API não encontrada. Verifique seu arquivo .env ou a configuração do projeto.");
  }

  // Use a stable model. Instructions suggest avoiding gemini-1.5-flash, using gemini-3-flash-preview.
  const model = "gemini-3-flash-preview";
  const isAutomaticMode = files.length === 0;

  // Use the selected count from profile, default to 10 if missing
  const totalQuestions = profile.qCount || 10;
  const batchSize = 10;
  // Calculate batches needed (e.g. 20 q / 10 = 2 batches)
  const batches = Math.ceil(totalQuestions / batchSize);
  
  // Strategy Definitions for Broader Search
  const searchStrategies = [
    "Foco em TENDÊNCIAS RECENTES (2023-2025) e provas aplicadas ultimamente.",
    "Foco em CONCEITOS CLÁSSICOS, gramática normativa e fundamentos da matemática.",
    "Foco em QUESTÕES DIFÍCEIS, pegadinhas comuns da banca e casos complexos.",
    "Foco em LEGISLAÇÃO PURA (Lei Seca), atualizações de leis e jurisprudência."
  ];

  const promises = [];

  for (let i = 0; i < batches; i++) {
    // Determine questions for this specific batch (handles the last partial batch if any)
    const questionsInBatch = (i === batches - 1 && totalQuestions % batchSize !== 0) 
      ? totalQuestions % batchSize 
      : batchSize;

    let distributionString = "";
    if (files.length > 0) {
       distributionString = `
         - EXTRAIA ou CRIE as ${questionsInBatch} questões ESTRITAMENTE baseando-se com exclusividade no conteúdo dos arquivos anexos fornecidos.
         - NÃO INVENTE matérias ou assuntos genéricos que não constam categoricamente no arquivo enviado.
       `;
    } else {
       const countPT = Math.max(1, Math.floor(questionsInBatch * 0.3));
       const countMat = Math.max(1, Math.floor(questionsInBatch * 0.2));
       const countSpec = questionsInBatch - countPT - countMat;

       distributionString = `
         - ${countPT} questões de Língua Portuguesa (NÍVEL EXATO do cargo de ${profile.cargo || 'geral'})
         - ${countMat} questões de Matemática/Raciocínio Lógico (NÍVEL ADEQUADO: estritamente o nível real cobrado para o cargo, ABORTE criar questões matemáticas imbecis ou genéricas do tipo regra de 3 se o cargo exigir mais complexidade)
         - ${countSpec} questões de Conhecimentos Específicos do Cargo/Legislação pertinente
       `;
    }

    // Rotate strategies based on batch index to ensure variety across the whole exam
    const currentStrategy = searchStrategies[i % searchStrategies.length];

    promises.push(
      (async () => {
        try {
          // Dynamic System Instruction with Explicit Distribution Rules AND Search Strategy
          let systemInstruction = `
            Você é um examinador sênior hiper-exigente${profile.banca ? ` da banca '${profile.banca}'` : ''}, criando uma prova simulada com ALTO RIGOR COGNITIVO${profile.cargo ? ` para o cargo de '${profile.cargo}'` : ''} (Nível ${profile.escolaridade}).
            
            SUA MISSÃO:
            1. Gerar exatamente ${questionsInBatch} questões para este lote.
            2. DISTRIBUIÇÃO E CONTEÚDO OBRIGATÓRIOS:
               ${distributionString}
            3. ESTRATÉGIA DESTE LOTE: ${currentStrategy}
            4. NÍVEL DE DIFICULDADE E REALISMO: A dificuldade deve refletir ESTRITAMENTE a realidade do cargo e escolaridade. Seja extremamente fidedigno à formatação e pegadinhas da banca pretendida (ou estilo de concurso caso banca em branco).

          `;

          if (files.length > 0) {
             systemInstruction += `\n5. REGRA DE OURO SOBRE ARQUIVOS PDF: 
             - MATERIAL FORNECIDO! Seus dados devem vir DO ARQUIVO.
             - Se for uma prova anterior, copie e EXTRAIA as questões exatamente de lá, formatando-as em JSON.
             - Se for apostila de estudo, faça questões focadas e limitadas EXCLUSIVAMENTE ao conteúdo ali demonstrado. NUNCA gere perguntas de temas alheios ao conteúdo.`;
          } else if (isAutomaticMode) {
            systemInstruction += `\n5. MODO AUTOMÁTICO DE BUSCA: Use o 'googleSearch' agressivamente para validar matérias, encontrar o edital real do cargo e provas passadas recentes.`;
          }

          if (extraContext) {
             systemInstruction += `\n\nATENÇÃO MÁXIMA AO PEDIDO DO USUÁRIO: "${extraContext}". Você DEVE priorizar este tema/foco acima de qualquer outra regra de distribuição.`;
          }

          let prompt = `Gere ${questionsInBatch} questões altamentes relevantes e aderentes ao nível.${profile.cargo ? ` Cargo: ${profile.cargo}.` : ''}`;
          prompt += `\nContexto de Busca: ${currentStrategy}`;
          
          if (extraContext) {
            prompt += `\n\nATENÇÃO MÁXIMA AO PEDIDO DO USUÁRIO: "${extraContext}". Você DEVE priorizar este pedido acima de qualquer outra regra genérica.`;
          }

          const parts: any[] = [{ text: prompt }];
          files.forEach(file => {
             // Basic safety check: don't send gigantic files if user managed to bypass frontend checks
             if (file.data.length < 10 * 1024 * 1024) { 
                 parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
             }
          });

          // Attempt 1: Try with googleSearch if needed
          let response;
          try {
             response = await getAiInstance().models.generateContent({
              model: model,
              contents: { parts },
              config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: questionSchema,
                // Use search if automatic mode to get internet data. 
                // Even with files, we might want search if the user asks for "internet" variety, but usually files take precedence.
                // Assuming "Automatic Mode" means no user files provided.
                tools: isAutomaticMode ? [{ googleSearch: {} }] : [], 
                thinkingConfig: { thinkingBudget: 1024 },
              },
            });
          } catch (apiError: any) {
            console.warn(`Batch ${i} primary attempt failed:`, apiError);
            throw apiError; 
          }

          if (!response.text) throw new Error("Empty response from AI");
          return response;

        } catch (searchError: any) {
          console.warn(`Batch ${i} failed. Retrying fallback without tools...`, searchError);
          
          // Fallback Strategy: No Search, Standard Prompt
          try {
            let fallbackInstruction = `
              Você é um examinador hiper-rigoroso${profile.banca ? ` da banca ${profile.banca}` : ''}.
              Crie uma prova${profile.cargo ? ` para ${profile.cargo}` : ''} (Nível: ${profile.escolaridade}).
              Gere EXATAMENTE:
              ${distributionString}
              Retorne APENAS JSON válido, focado de forma estrita no nível de dificuldade exigido.
            `;
            
            if (extraContext) {
               fallbackInstruction += `\n\nATENÇÃO MÁXIMA AO PEDIDO DO USUÁRIO: "${extraContext}". Você DEVE priorizar este tema/foco acima de qualquer outra regra de distribuição.`;
            }

            let fallbackPrompt = `Gere ${questionsInBatch} questões diversificadas${profile.cargo ? ` para ${profile.cargo}` : ''}.`;
            if (extraContext) {
               fallbackPrompt += `\n\nATENÇÃO MÁXIMA AO PEDIDO DO USUÁRIO: "${extraContext}". Você DEVE priorizar este tema/foco acima de qualquer outra regra de distribuição.`;
            }

             const fallbackParts: any[] = [{ text: fallbackPrompt }];
             files.forEach(file => {
                 if (file.data.length < 10 * 1024 * 1024) { 
                    fallbackParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
                 }
             });

            const fallbackResponse = await getAiInstance().models.generateContent({
              model: model, 
              contents: { parts: fallbackParts },
              config: {
                systemInstruction: fallbackInstruction,
                responseMimeType: "application/json",
                responseSchema: questionSchema,
                tools: [], // No tools
                thinkingConfig: { thinkingBudget: 512 }, 
              },
            });
            return fallbackResponse;
          } catch (e: any) {
            console.error("Fallback failed", e);
            throw new Error(`Falha crítica na API (Fallback): ${e.message || e}`);
          }
        }
      })()
    );
  }

  try {
    const results = await Promise.all(promises);
    let allQuestions: Question[] = [];

    results.forEach((response, idx) => {
      if (response && response.text) {
        try {
          const batchQuestions = cleanAndParseJSON(response.text);
          if (Array.isArray(batchQuestions)) {
            allQuestions = [...allQuestions, ...batchQuestions];
          }
        } catch (e) {
          console.error(`Failed to parse batch ${idx}`, e);
        }
      }
    });

    // Limit to requested count in case AI generated extra
    const finalQuestions = allQuestions.slice(0, totalQuestions);

    if (finalQuestions.length === 0) {
        throw new Error("A IA respondeu, mas não foi possível extrair questões válidas. Tente novamente.");
    }

    return finalQuestions.map((q: any, index: number) => {
      let parsedIndex = Number(q.correctIndex);
      if (isNaN(parsedIndex) && typeof q.correctIndex === 'string') {
         const letterMatch = q.correctIndex.toUpperCase().match(/[A-E]/);
         if (letterMatch) {
            parsedIndex = letterMatch[0].charCodeAt(0) - 65; // A=0, B=1, etc.
         } else {
            parsedIndex = 0; // fallback
         }
      } else if (isNaN(parsedIndex)) {
          parsedIndex = 0;
      }
      return {
        ...q,
        correctIndex: parsedIndex,
        id: `q-${Date.now()}-${index}`
      };
    });

  } catch (error: any) {
    console.error("Error generating questions:", error);
    // Return a user-friendly error message based on the exception
    if (error.message.includes("API Key")) throw error;
    if (error.message.includes("403")) throw new Error("Erro de permissão (403). Verifique se sua API Key tem acesso ao modelo 'gemini-3-flash-preview'.");
    if (error.message.includes("429")) throw new Error("Muitas requisições (429). Aguarde um momento e tente novamente.");
    if (error.message.includes("fetch")) throw new Error("Erro de conexão. Verifique sua internet.");
    
    throw new Error(`Erro ao gerar simulado: ${error.message}`);
  }
};

export const analyzePerformanceAndPattern = async (
  profile: ExamProfile,
  answers: AnswerAttempt[],
  questions: Question[]
): Promise<StrategicAnalysis> => {
  const model = "gemini-3-flash-preview";

  const correctCount = answers.filter(a => a.isCorrect).length;
  const total = questions.length;
  
  const topicPerformance: Record<string, { total: number, correct: number }> = {};
  questions.forEach(q => {
    const topic = q.topic.trim(); 
    if (!topicPerformance[topic]) topicPerformance[topic] = { total: 0, correct: 0 };
    topicPerformance[topic].total++;
    const isCorrect = answers.find(a => a.questionId === q.id)?.isCorrect;
    if (isCorrect) topicPerformance[topic].correct++;
  });

  const topicSummary = Object.entries(topicPerformance)
    .map(([topic, stats]) => `- ${topic}: ${stats.correct}/${stats.total} acertos`)
    .join("\n");

  const prompt = `
    Aja como um coach de concursos.
    Analise o desempenho para:
    Cargo: ${profile.cargo || 'Geral'} (${profile.escolaridade})
    Banca: ${profile.banca || 'Não especificada'}
    
    Dados:
    Acertos: ${correctCount}/${total}
    ${topicSummary}

    1. Identifique pontos críticos baseados no peso típico dessas matérias para a banca ${profile.banca || 'padrão'}.
    2. Pesquise sobre o "Padrão ${profile.banca || 'padrão'}" (estilo de cobrança, pegadinhas comuns). Use a busca do Google para encontrar informações RECENTES sobre o estilo dessa banca.
    3. Crie um plano de ação.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
      weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
      bancaPattern: { type: Type.STRING, description: "Analysis of the exam board style." },
      recommendations: { type: Type.STRING, description: "Study plan advice." }
    },
    required: ["strengths", "weaknesses", "bancaPattern", "recommendations"]
  };

  try {
    const response = await getAiInstance().models.generateContent({
      model: model,
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        tools: [{ googleSearch: {} }]
      }
    });
    if (response.text) return cleanAndParseJSON(response.text);
    throw new Error("Empty analysis");
  } catch (error) {
     // Fallback
     return {
      strengths: [],
      weaknesses: [],
      bancaPattern: `Análise do padrão da banca ${profile.banca} indisponível no momento.`,
      recommendations: "Foque nos tópicos com maior taxa de erro."
    };
  }
};

export const getTutorResponse = async (
  question: Question,
  userAnswerIndex: number | null,
  userQuery: string,
  history: string
): Promise<string> => {
  const model = "gemini-3-flash-preview";

  const systemInstruction = `
    Você é um professor particular de elite.
    O aluno está estudando a questão: "${question.text}"
    Opções: ${JSON.stringify(question.options)}
    Gabarito: ${question.options[question.correctIndex]}
    
    Responda a dúvida do aluno de forma clara, direta e motivadora.
    Se necessário, use exemplos práticos.
  `;

  const response = await getAiInstance().models.generateContent({
    model: model,
    contents: `Histórico:\n${history}\n\nAluno: ${userQuery}`,
    config: { systemInstruction },
  });

  return response.text || "Sem resposta.";
};