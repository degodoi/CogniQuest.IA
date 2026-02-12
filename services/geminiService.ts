import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, Role, UploadedFile, StrategicAnalysis, AnswerAttempt } from "../types";

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
      topic: { type: Type.STRING, description: "The subject (e.g., Português, Matemática, Legislação)." }
    },
    required: ["text", "options", "correctIndex", "explanation", "topic"],
  },
};

// Helper to clean and parse JSON from LLM response
const cleanAndParseJSON = (text: string): any => {
  try {
    // 1. Try direct parse
    return JSON.parse(text);
  } catch (e) {
    // 2. Try stripping markdown code blocks
    try {
      const match = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
      // 3. Try finding the array brackets directly
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
  role: Role, 
  files: UploadedFile[], 
  extraContext: string
): Promise<Question[]> => {
  
  const model = "gemini-3-flash-preview";
  
  // Logic to determine if we are in "Automatic Mode" (No files)
  const isAutomaticMode = files.length === 0;

  const totalQuestions = 40;
  const batchSize = 10;
  const batches = totalQuestions / batchSize;
  
  const promises = [];

  for (let i = 0; i < batches; i++) {
    promises.push(
      (async () => {
        // --- ATTEMPT 1: WITH GOOGLE SEARCH (Ideal) ---
        try {
          let systemInstruction = `
            Você é um professor particular experiente em concursos da banca 'Instituto JK', preparando um aluno para o cargo de ${role}.
            
            SUA MISSÃO:
            1. Gerar questões que simulem fielmente a banca Instituto JK.
            2. O gabarito/explicação deve ser EXTREMAMENTE DIDÁTICO.
            
            REGRAS PARA A EXPLICAÇÃO:
            - Matemática: Arme a conta passo a passo.
            - Legislação: Cite o artigo e dê exemplo prático.
            - Português: Explique a regra gramatical.
          `;

          if (isAutomaticMode) {
            systemInstruction += `\nMODO AUTOMÁTICO: Use a 'googleSearch' para encontrar questões REAIS ou SIMILARES da banca Instituto JK recentes.`;
          }

          let prompt = `Gere ${batchSize} questões INÉDITAS para ${role} (Banca Instituto JK). Lote ${i + 1}.`;
          if (extraContext) prompt += `\nContexto: "${extraContext}".`;
          if (files.length > 0) prompt += `\nBaseie-se nos arquivos anexos.`;

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
              tools: [{ googleSearch: {} }], // Try using search tool
              thinkingConfig: { thinkingBudget: 1024 },
            },
          });

          if (!response.text) throw new Error("Empty response with search");
          return response;

        } catch (searchError) {
          console.warn(`Batch ${i} failed with Search (likely API tier limit). Retrying without Search...`, searchError);
          
          // --- ATTEMPT 2: FALLBACK WITHOUT SEARCH (Reliable) ---
          try {
             let fallbackSystemInstruction = `
              Você é um professor especialista em concursos.
              ATENÇÃO: A busca na web falhou. Use seu CONHECIMENTO INTERNO para simular o estilo da banca 'Instituto JK'.
              Crie questões desafiadoras e realistas para ${role}.
              Mantenha as explicações EXTREMAMENTE DIDÁTICAS conforme solicitado anteriormente.
            `;

            let fallbackPrompt = `Gere ${batchSize} questões INÉDITAS para ${role} simulando a banca Instituto JK com seu conhecimento interno.`;
            if (extraContext) fallbackPrompt += `\nContexto: "${extraContext}".`;
            
            // Re-build parts for fallback (include files if present)
            const fallbackParts: any[] = [{ text: fallbackPrompt }];
            files.forEach(file => {
              fallbackParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
            });

            const fallbackResponse = await ai.models.generateContent({
              model: model,
              contents: { parts: fallbackParts },
              config: {
                systemInstruction: fallbackSystemInstruction,
                responseMimeType: "application/json",
                responseSchema: questionSchema,
                tools: [], // NO TOOLS - Pure generation
                thinkingConfig: { thinkingBudget: 1024 },
              },
            });

            return fallbackResponse;
          } catch (fallbackError) {
            console.error(`Batch ${i} failed completely.`, fallbackError);
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
          } else {
            console.error(`Batch ${idx} result is not an array:`, batchQuestions);
          }
        } catch (e) {
          console.error(`Failed to parse batch ${idx} json:`, response.text, e);
        }
      }
    });

    if (allQuestions.length === 0) {
      console.warn("No questions were generated from any batch.");
    }

    return allQuestions.map((q: any, index: number) => ({
      ...q,
      id: `q-${Date.now()}-${index}`
    }));

  } catch (error) {
    console.error("Error generating questions:", error);
    throw new Error("Falha ao gerar questões. Tente novamente.");
  }
};

export const analyzePerformanceAndPattern = async (
  role: Role,
  answers: AnswerAttempt[],
  questions: Question[]
): Promise<StrategicAnalysis> => {
  const model = "gemini-3-flash-preview";

  const correctCount = answers.filter(a => a.isCorrect).length;
  const total = questions.length;
  
  const topicPerformance: Record<string, { total: number, correct: number }> = {};
  questions.forEach(q => {
    // Normalize topic names to avoid "Matemática" vs "Matematica" duplication
    const topic = q.topic.trim(); 
    if (!topicPerformance[topic]) topicPerformance[topic] = { total: 0, correct: 0 };
    topicPerformance[topic].total++;
    const isCorrect = answers.find(a => a.questionId === q.id)?.isCorrect;
    if (isCorrect) topicPerformance[topic].correct++;
  });

  const topicSummary = Object.entries(topicPerformance)
    .map(([topic, stats]) => `- ${topic}: ${stats.correct}/${stats.total} acertos (${Math.round(stats.correct/stats.total*100)}%)`)
    .join("\n");

  const prompt = `
    Aja como um coach de concursos. Analise o desempenho:
    
    Cargo: ${role}
    Banca Alvo: Instituto JK
    
    Dados:
    Acertos Totais: ${correctCount} de ${total}
    Por Matéria:
    ${topicSummary}

    1. Identifique os pontos críticos. Onde o aluno vai reprovar se não melhorar?
    2. Pesquise sobre a banca Instituto JK (se possível) ou use conhecimento geral de bancas similares. Explique isso no campo 'bancaPattern'.
    3. Crie um plano de ação prático no 'recommendations'. Diga exatamente o que estudar.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
      weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
      bancaPattern: { type: Type.STRING, description: "Detailed analysis of the exam board style." },
      recommendations: { type: Type.STRING, description: "Study plan advice." }
    },
    required: ["strengths", "weaknesses", "bancaPattern", "recommendations"]
  };

  try {
    // Try with search first for analysis
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        tools: [{ googleSearch: {} }]
      }
    });

    if (response.text) return cleanAndParseJSON(response.text) as StrategicAnalysis;
    throw new Error("Empty analysis response");

  } catch (error) {
    console.warn("Analysis search failed, trying fallback...", error);
    try {
      // Fallback analysis without search
       const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          tools: [] // No tools
        }
      });
      if (response.text) return cleanAndParseJSON(response.text) as StrategicAnalysis;
    } catch(e) {
      console.error("Analysis failed completely", e);
    }
    
    return {
      strengths: [],
      weaknesses: [],
      bancaPattern: "Não foi possível analisar o padrão no momento.",
      recommendations: "Continue estudando os tópicos onde errou mais questões."
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
    Você é um professor particular paciente e didático.
    O aluno está com dúvida em uma questão de concurso (Banca Instituto JK).
    
    Questão: "${question.text}"
    Opções: ${JSON.stringify(question.options)}
    Correta: ${question.options[question.correctIndex]}
    O aluno marcou: ${userAnswerIndex !== null ? question.options[userAnswerIndex] : "Não respondeu"}
    
    Se o aluno perguntar "Por que errei?", explique o erro específico da opção dele.
    Use linguagem simples, analogias e exemplos práticos. Seja breve e direto.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: `Histórico da conversa:\n${history}\n\nAluno: ${userQuery}`,
    config: {
      systemInstruction: systemInstruction,
    },
  });

  return response.text || "Desculpe, não consegui gerar uma explicação agora.";
};