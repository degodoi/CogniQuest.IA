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

  const totalQuestions = 40;
  const batchSize = 10;
  const batches = totalQuestions / batchSize;
  
  const promises = [];

  for (let i = 0; i < batches; i++) {
    promises.push(
      (async () => {
        try {
          // Dynamic System Instruction based on Profile
          let systemInstruction = `
            Você é um examinador especialista na banca '${profile.banca}', criando uma prova simulada para o cargo de '${profile.cargo}' (Nível ${profile.escolaridade}).
            
            SUA MISSÃO:
            1. Analisar o perfil da banca '${profile.banca}' e o cargo '${profile.cargo}'.
            2. Selecionar automaticamente as matérias mais cobradas para este cargo (Ex: Se for Administrativo, cobrar Português/Informática/Adm; Se for Policial, cobrar Direito Penal/Processual, etc).
            3. Gerar questões INÉDITAS que imitem o estilo da banca (tamanho do texto, tipo de pegadinha, dificuldade).
            4. O gabarito/explicação deve ser EXTREMAMENTE DIDÁTICO, ensinando o aluno.
          `;

          if (isAutomaticMode) {
            systemInstruction += `\nMODO AUTOMÁTICO: Use a 'googleSearch' para identificar o conteúdo programático real ou provável para '${profile.cargo}' na banca '${profile.banca}'.`;
          }

          let prompt = `Gere ${batchSize} questões para o cargo de ${profile.cargo} (${profile.escolaridade}) - Banca ${profile.banca}. Lote ${i + 1}.`;
          prompt += `\nIMPORTANTE: Garanta uma distribuição realista das matérias conforme o edital típico dessa banca para este cargo.`;
          
          if (extraContext) prompt += `\nFoco/Pedido do Usuário: "${extraContext}".`;
          
          if (files.length > 0) {
            prompt += `\nINSTRUÇÃO SOBRE ARQUIVOS: Use os arquivos anexos como base de conteúdo. Se os arquivos não cobrirem todo o edital (ex: usuário só enviou PDF de lei), use seu conhecimento da banca para gerar as outras matérias (Português, Raciocínio Lógico, etc) e completar o simulado.`;
          }

          const parts: any[] = [{ text: prompt }];
          files.forEach(file => {
            parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
          });

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
          
          // Fallback Strategy
          try {
            let fallbackInstruction = `
              Você é um especialista na banca ${profile.banca}.
              Crie uma prova realista para ${profile.cargo} (${profile.escolaridade}).
              Use seu conhecimento interno para definir as matérias corretas (Português, Matemática, Específicas, etc).
            `;
            
            let fallbackPrompt = `Gere ${batchSize} questões variadas para ${profile.cargo} - Banca ${profile.banca}.`;
            if (extraContext) fallbackPrompt += `\nContexto: ${extraContext}`;

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
                tools: [], 
                thinkingConfig: { thinkingBudget: 1024 },
              },
            });
            return fallbackResponse;
          } catch (e) {
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

    return allQuestions.map((q: any, index: number) => ({
      ...q,
      id: `q-${Date.now()}-${index}`
    }));

  } catch (error) {
    console.error("Error generating questions:", error);
    throw new Error("Falha ao gerar questões.");
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