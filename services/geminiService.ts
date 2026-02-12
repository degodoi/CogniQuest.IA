import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, ExamProfile, UploadedFile, StrategicAnalysis, AnswerAttempt } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  try {
    return JSON.parse(text);
  } catch (e) {
    try {
      const match = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        return JSON.parse(text.substring(start, end + 1));
      }
    } catch (innerE) {
      console.error("Failed to clean and parse JSON:", innerE);
    }
    throw new Error("Invalid JSON format from model");
  }
};

export const generateQuestions = async (
  profile: ExamProfile, 
  files: UploadedFile[], 
  extraContext: string
): Promise<Question[]> => {
  
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
            systemInstruction += `\nMODO AUTOMÁTICO: Use a 'googleSearch' para identificar o conteúdo programático real para '${profile.cargo}' na banca '${profile.banca}' e garantir que os tópicos "Específicos" sejam precisos.`;
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

          // Attempt 1: With Search
          const response = await ai.models.generateContent({
            model: model,
            contents: { parts },
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              responseSchema: questionSchema,
              tools: [{ googleSearch: {} }],
              thinkingConfig: { thinkingBudget: 1024 },
            },
          });

          if (!response.text) throw new Error("Empty response");
          return response;

        } catch (searchError) {
          console.warn(`Batch ${i} failed with Search. Retrying fallback...`, searchError);
          
          // Fallback Strategy (Simpler model config if first fails)
          try {
            let fallbackInstruction = `
              Você é um especialista na banca ${profile.banca}.
              Crie uma prova para ${profile.cargo} (${profile.escolaridade}).
              Gere ${questionsInBatch} questões MISTURANDO: Português, Matemática e Conhecimentos Específicos.
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
                // Reduced thinking budget or remove if causing timeouts locally
                thinkingConfig: { thinkingBudget: 1024 }, 
              },
            });
            return fallbackResponse;
          } catch (e) {
            console.error("Fallback failed", e);
            return null;
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
        throw new Error("Nenhuma questão foi gerada. Tente novamente ou verifique sua conexão.");
    }

    return finalQuestions.map((q: any, index: number) => ({
      ...q,
      id: `q-${Date.now()}-${index}`
    }));

  } catch (error) {
    console.error("Error generating questions:", error);
    throw new Error("Falha ao gerar questões. Verifique sua chave de API ou conexão.");
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