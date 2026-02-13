import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, ExamProfile, UploadedFile, StrategicAnalysis, AnswerAttempt } from "../types";

// Helper to safely get the API key
const getApiKey = () => {
  const key = process.env.API_KEY; // Direct access as per instructions
  if (!key) {
    console.error("API Key is missing in process.env.API_KEY");
    return "";
  }
  return key;
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

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

    // Explicitly calculate distribution for this batch to ensure variety
    // Target: 30% Portuguese, 20% Math/Logic, 50% Specific
    const countPT = Math.max(1, Math.floor(questionsInBatch * 0.3));
    const countMat = Math.max(1, Math.floor(questionsInBatch * 0.2));
    // Ensure the remainder goes to Specifics so the sum equals questionsInBatch
    const countSpec = questionsInBatch - countPT - countMat;

    const distributionString = `
      - ${countPT} questões de Língua Portuguesa
      - ${countMat} questões de Matemática ou Raciocínio Lógico
      - ${countSpec} questões de Conhecimentos Específicos do Cargo/Legislação
    `;

    // Rotate strategies based on batch index to ensure variety across the whole exam
    const currentStrategy = searchStrategies[i % searchStrategies.length];

    promises.push(
      (async () => {
        try {
          // Dynamic System Instruction with Explicit Distribution Rules AND Search Strategy
          let systemInstruction = `
            Você é um examinador sênior da banca '${profile.banca}', criando uma prova simulada para o cargo de '${profile.cargo}' (Nível ${profile.escolaridade}).
            
            SUA MISSÃO:
            1. Gerar exatamente ${questionsInBatch} questões para este lote.
            2. OBRIGATÓRIO SEGUIR ESTA DISTRIBUIÇÃO:
               ${distributionString}
            3. ESTRATÉGIA DESTE LOTE: ${currentStrategy}
            4. INSTRUÇÃO DE BUSCA: Não se limite a uma única fonte. Varra a internet por provas anteriores, fóruns de concurso e sites especializados para trazer diversidade.
            5. Estilo: Imite o estilo da banca '${profile.banca}' (tamanho do texto, vocabulário).
          `;

          if (isAutomaticMode) {
            systemInstruction += `\nMODO AUTOMÁTICO: Use o 'googleSearch' agressivamente para validar o conteúdo programático real.`;
          }

          let prompt = `Gere ${questionsInBatch} questões (${countPT} Port, ${countMat} Mat, ${countSpec} Específicas). Cargo: ${profile.cargo}.`;
          prompt += `\nContexto de Busca: ${currentStrategy}`;
          
          if (extraContext) prompt += `\nFoco/Pedido do Usuário: "${extraContext}".`;
          
          if (files.length > 0) {
            prompt += `\nINSTRUÇÃO SOBRE ARQUIVOS: Use os arquivos anexos como base prioritária, mas use seu conhecimento da banca para preencher lacunas de matérias que não estejam nos arquivos.`;
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
             response = await ai.models.generateContent({
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
              Você é um especialista na banca ${profile.banca}.
              Crie uma prova para ${profile.cargo} (${profile.escolaridade}).
              Gere EXATAMENTE:
              ${distributionString}
              Retorne APENAS JSON.
            `;
            
            let fallbackPrompt = `Gere ${questionsInBatch} questões diversificadas para ${profile.cargo}.`;

             const fallbackParts: any[] = [{ text: fallbackPrompt }];
             files.forEach(file => {
                 if (file.data.length < 10 * 1024 * 1024) { 
                    fallbackParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
                 }
             });

            const fallbackResponse = await ai.models.generateContent({
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

    return finalQuestions.map((q: any, index: number) => ({
      ...q,
      id: `q-${Date.now()}-${index}`
    }));

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
    Cargo: ${profile.cargo} (${profile.escolaridade})
    Banca: ${profile.banca}
    
    Dados:
    Acertos: ${correctCount}/${total}
    ${topicSummary}

    1. Identifique pontos críticos baseados no peso típico dessas matérias para a banca ${profile.banca}.
    2. Pesquise sobre o "Padrão ${profile.banca}" (estilo de cobrança, pegadinhas comuns). Use a busca do Google para encontrar informações RECENTES sobre o estilo dessa banca.
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
    const response = await ai.models.generateContent({
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

  const response = await ai.models.generateContent({
    model: model,
    contents: `Histórico:\n${history}\n\nAluno: ${userQuery}`,
    config: { systemInstruction },
  });

  return response.text || "Sem resposta.";
};