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

// Helper to manage seen questions in localStorage to avoid duplicates
const getSeenQuestionKeys = (): string[] => {
  try {
    const seen = localStorage.getItem('cogniquest_seen_questions');
    return seen ? JSON.parse(seen) : [];
  } catch { return []; }
};

const saveSeenQuestionKeys = (newQuestions: Question[]) => {
  const seen = getSeenQuestionKeys();
  // Keep only a hash or first 30 chars of the question text to save space
  const currentKeys = newQuestions.map(q => q.text.substring(0, 50).trim());
  const updated = [...new Set([...seen, ...currentKeys])].slice(-200); // Keep last 200
  localStorage.setItem('cogniquest_seen_questions', JSON.stringify(updated));
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

  const model = "gemini-3-flash-preview";
  const isAutomaticMode = files.length === 0;
  const totalQuestions = profile.qCount || 10;
  
  // Para modo automático, fazemos em batches para maior variedade. 
  // Para PDF, um batch maior para extrair tudo.
  const batchSize = isAutomaticMode ? 10 : 250; 
  const batches = isAutomaticMode ? Math.ceil(totalQuestions / batchSize) : 1;
  
  const concursoContext = profile.concurso ? `para o concurso '${profile.concurso}'` : "";
  
  const searchStrategies = [
    `BUSCA POR EDITAL: Encontre o edital oficial ${concursoContext} e liste as matérias (Português, RLM, Informática, Específicas, etc.).`,
    `TENDÊNCIAS DA BANCA: Pesquise como a banca ${profile.banca} cobrou o cargo ${profile.cargo} nos últimos 2 anos.`,
    `QUESTÕES REAIS: Localize cadernos de prova reais do site PCI Concursos para ${profile.cargo} ${concursoContext}.`,
    `LEGISLAÇÃO ESPECÍFICA: Verifique se o edital ${concursoContext} exige leis municipais, estaduais ou normas internas.`
  ];

  const seenKeys = getSeenQuestionKeys();
  const avoidList = seenKeys.length > 0 
    ? `EVITE gerar questões com enunciados similares a estes (já apresentados ao usuário): \n- ${seenKeys.join('\n- ')}`
    : "";

  const promises = [];

  for (let i = 0; i < batches; i++) {
    const questionsInBatch = isAutomaticMode 
      ? ((i === batches - 1 && totalQuestions % batchSize !== 0) ? totalQuestions % batchSize : batchSize)
      : "TODAS";

    let distributionString = "";
    if (!isAutomaticMode) {
       distributionString = `
         - EXTRAIA EXATAMENTE TODAS as questões presentes nos arquivos.
         - BUSQUE por padrões de numeração (1., 2., Q1, Questão 1), enunciados e alternativas (a, b, c, d, e).
         - Mantenha a fidelidade absoluta ao texto original da prova.
         - Se houver gabarito no final do PDF, use-o. Caso contrário, resolva você mesmo com 100% de precisão.
       `;
    } else {
       const qBatchNum = questionsInBatch as number;
       distributionString = `
         - IDENTIFIQUE as matérias reais do edital ${concursoContext}.
         - GERE as ${qBatchNum} questões distribuindo-as entre as matérias identificadas (ex: Português, Informática, RLM, Específicas).
         - PRIORIZE o que é mais cobrado para o cargo ${profile.cargo}.
       `;
       
       if (extraContext) {
           distributionString += `\n- FOCO ADICIONAL: "${extraContext}".`;
       }
    }

    const currentStrategy = searchStrategies[i % searchStrategies.length];

    promises.push(
      (async () => {
        try {
          let systemInstruction = `
            Você é um ESPECIALISTA em concursos públicos brasileiros. 
            Sua missão é atuar como a banca organizadora: '${profile.banca || 'Banca de Excelência'}'.
            Cargo: '${profile.cargo || 'Diversos'}' (Escolaridade: ${profile.escolaridade}).
            ${profile.concurso ? `Foco no Concurso: '${profile.concurso}'` : ""}

            DIRETRIZES DE ALTA PERFORMANCE:
            1. PESQUISA DE EDITAL: Use o 'googleSearch' para encontrar o edital ou provas REAIS ${concursoContext}. 
            2. MATÉRIAS REAIS: Não invente matérias. Descubra se cai Informática, RLM, Matemática, etc., para este cargo específico.
            3. REALISMO: As questões DEVEM ser idênticas ou seguir EXATAMENTE o rigor e estilo da banca ${profile.banca}.
            4. NÃO REPETIÇÃO: ${avoidList}
            5. ESTRATÉGIA DO BATCH: ${currentStrategy}
            6. DISTRIBUIÇÃO: ${distributionString}
            
            FORMATO: Retorne um ARRAY de objetos JSON seguindo o schema fornecido.
          `;

          if (files.length > 0) {
             systemInstruction += `\n\nREGRA PARA PDF: Você deve ser um extrator fiel. Se o arquivo for uma prova, ignore sua criatividade e extraia as questões como elas são. Se for material de estudo (apostila), crie questões inéditas baseadas APENAS no texto do arquivo.`;
          }

          let prompt = isAutomaticMode 
            ? `Pesquise o edital e provas de ${profile.cargo} ${concursoContext} da banca ${profile.banca}. Gere ${questionsInBatch} questões reais das matérias do concurso (ex: PT, Informática, RLM, Específicas).`
            : `Extraia TODAS as questões do PDF anexo de forma minuciosa.`;
          
          if (extraContext) prompt += `\nConsidere também este contexto: ${extraContext}`;

          const parts: any[] = [{ text: prompt }];
          files.forEach(file => {
             if (file.data.length < 10 * 1024 * 1024) { 
                 parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
             }
          });

          const response = await getAiInstance().models.generateContent({
            model: model,
            contents: { parts },
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              responseSchema: questionSchema,
              tools: isAutomaticMode ? [{ googleSearch: {} }] : [], // Sempre buscar se for automático
              thinkingConfig: { thinkingBudget: 1024 },
            },
          });

          if (!response.text) throw new Error("Empty response from AI");
          return response;

        } catch (error: any) {
          console.warn(`Batch ${i} failed. Error:`, error);
          // Fallback robusto sem ferramentas de busca se a busca falhar
          const fallbackInstruction = `Gere ${questionsInBatch} questões simuladas de ${profile.banca || 'concurso'} para ${profile.cargo || 'nível ' + profile.escolaridade}. Retorne JSON.`;
          const fallbackResponse = await getAiInstance().models.generateContent({
            model: model, 
            contents: { parts: [{ text: fallbackInstruction }] },
            config: {
              responseMimeType: "application/json",
              responseSchema: questionSchema,
            },
          });
          return fallbackResponse;
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

    const finalQuestions = (isAutomaticMode ? allQuestions.slice(0, totalQuestions) : allQuestions).map((q: any, index: number) => {
      let parsedIndex = Number(q.correctIndex);
      if (isNaN(parsedIndex)) {
          const letterMatch = String(q.correctIndex).toUpperCase().match(/[A-E]/);
          parsedIndex = letterMatch ? letterMatch[0].charCodeAt(0) - 65 : 0;
      }
      return {
        ...q,
        correctIndex: parsedIndex,
        id: `q-${Date.now()}-${index}`
      };
    });

    if (finalQuestions.length === 0) {
        throw new Error("A IA respondeu, mas não foi possível extrair questões válidas. Tente novamente.");
    }

    saveSeenQuestionKeys(finalQuestions);
    return finalQuestions;

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