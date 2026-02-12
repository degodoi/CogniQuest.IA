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
  
  // Remove markdown code blocks if present
  cleanText = cleanText.replace(/```json/g, "").replace(/```/g, "").trim();

  // Sometimes the model adds text before the array, find the first '[' and last ']'
  const firstOpen = cleanText.indexOf('[');
  const lastClose = cleanText.lastIndexOf(']');

  if (firstOpen !== -1 && lastClose !== -1) {
    cleanText = cleanText.substring(firstOpen, lastClose + 1);
  }

  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Error. Raw Text:", text);
    throw new Error("A IA gerou uma resposta, mas não foi possível ler o formato (JSON inválido). Tente novamente.");
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
  
  const promises = [];

  for (let i = 0; i < batches; i++) {
    // Determine questions for this specific batch (handles the last partial batch if any)
    const questionsInBatch = (i === batches - 1 && totalQuestions % batchSize !== 0) 
      ? totalQuestions % batchSize 
      : batchSize;

    promises.push(
      (async () => {
        try {
          // Dynamic System Instruction with Explicit Distribution Rules
          let systemInstruction = `
            Você é um examinador especialista na banca '${profile.banca}', criando uma prova simulada para o cargo de '${profile.cargo}' (Nível ${profile.escolaridade}).
            
            SUA MISSÃO:
            1. Gerar exatamente ${questionsInBatch} questões para este lote.
            2. REGRA DE OURO: Você DEVE misturar as matérias NESTE lote de ${questionsInBatch} questões. 
               - Distribuição Ideal: 30% Língua Portuguesa, 20% Matemática/Raciocínio Lógico, 50% Conhecimentos Específicos do Cargo.
               - NÃO gere questões de apenas um assunto. O usuário precisa de um mix.
            3. Estilo: Imite o estilo da banca '${profile.banca}' (tamanho do texto, pegadinhas).
            4. Explicação: Didática e completa.
          `;

          if (isAutomaticMode) {
            systemInstruction += `\nMODO AUTOMÁTICO: Tente ser fiel ao conteúdo programático real.`;
          }

          let prompt = `Gere um lote de ${questionsInBatch} questões variadas (Português, Matemática e Específicas) para ${profile.cargo} - Banca ${profile.banca}.`;
          prompt += `\nIMPORTANTE: Garanta a proporção de matérias solicitada na instrução. O aluno precisa testar todos os conhecimentos agora.`;
          
          if (extraContext) prompt += `\nFoco/Pedido do Usuário: "${extraContext}".`;
          
          if (files.length > 0) {
            prompt += `\nINSTRUÇÃO SOBRE ARQUIVOS: Use os arquivos anexos como base. Se os arquivos forem limitados (ex: só tem lei), use seu conhecimento da banca para criar as questões de Português e Matemática que faltam para completar o mix.`;
          }

          const parts: any[] = [{ text: prompt }];
          files.forEach(file => {
            parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
          });

          // Attempt 1: Try with googleSearch if needed, but be ready to failover
          // Note: googleSearch tools sometimes cause issues on free tiers or specific accounts.
          // If it fails, we catch and retry without tools.
          
          let response;
          try {
             response = await ai.models.generateContent({
              model: model,
              contents: { parts },
              config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: questionSchema,
                // Only use search if automatic mode (no files), otherwise rely on context or internal knowledge to save tokens/latency
                tools: isAutomaticMode ? [{ googleSearch: {} }] : [], 
                thinkingConfig: { thinkingBudget: 1024 },
              },
            });
          } catch (apiError: any) {
            console.warn(`Batch ${i} primary attempt failed:`, apiError);
            throw apiError; // Throw to trigger the outer catch (Fallback)
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
              Gere ${questionsInBatch} questões MISTURANDO: Português, Matemática e Conhecimentos Específicos.
              Retorne APENAS JSON.
            `;
            
            let fallbackPrompt = `Gere ${questionsInBatch} questões variadas para ${profile.cargo}.`;

             const fallbackParts: any[] = [{ text: fallbackPrompt }];
             files.forEach(file => {
                fallbackParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
             });

            const fallbackResponse = await ai.models.generateContent({
              model: model, 
              contents: { parts: fallbackParts },
              config: {
                systemInstruction: fallbackInstruction,
                responseMimeType: "application/json",
                responseSchema: questionSchema,
                tools: [], // No tools
                thinkingConfig: { thinkingBudget: 512 }, // Lower budget for speed
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
    2. Pesquise sobre o "Padrão ${profile.banca}" (estilo de cobrança, pegadinhas comuns).
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
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: `Histórico:\n${history}\n\nAluno: ${userQuery}`,
    config: { systemInstruction },
  });

  return response.text || "Sem resposta.";
};