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

export const generateQuestions = async (
  role: Role, 
  files: UploadedFile[], 
  extraContext: string
): Promise<Question[]> => {
  
  const model = "gemini-3-flash-preview";
  
  // Instruções reforçadas para didática e busca
  const systemInstruction = `
    Você é um professor particular experiente em concursos da banca 'Instituto JK', preparando um aluno para o cargo de ${role}.
    
    SUA MISSÃO:
    1. Gerar questões que simulem fielmente a banca Instituto JK. Use a ferramenta de busca para encontrar o estilo real deles.
    2. O gabarito/explicação deve ser EXTREMAMENTE DIDÁTICO, "como se estivesse ensinando uma criança" ou um leigo total.
    
    REGRAS PARA A EXPLICAÇÃO (GABARITO):
    - SE FOR MATEMÁTICA: Não diga apenas a resposta. Arme a conta, mostre a soma, subtração, regra de três passo a passo. Exemplo: "Primeiro somamos X + Y...".
    - SE FOR LEGISLAÇÃO (Motorista): Cite o artigo do CTB, mas explique com um exemplo prático do dia a dia do motorista.
    - SE FOR PORTUGUÊS: Explique a regra gramatical de forma simples, mostrando por que as outras opções estão erradas.
    
    TÓPICOS PRINCIPAIS:
    - Motorista: CTB, Direção Defensiva, Mecânica Básica, Primeiros Socorros.
    - Vigia: Português, Matemática Básica, Atualidades, Noções de Segurança Patrimonial.
  `;

  const totalQuestions = 40;
  const batchSize = 10;
  const batches = totalQuestions / batchSize;
  
  const promises = [];

  for (let i = 0; i < batches; i++) {
    const prompt = `
      Gere ${batchSize} questões INÉDITAS para ${role} focadas na banca Instituto JK.
      Lote ${i + 1} de ${batches}.
      
      USE A BUSCA DO GOOGLE (googleSearch) para encontrar questões recentes ou similares aplicadas por essa banca.
      
      Contexto do usuário: "${extraContext}".
      
      Importante: A explicação deve ser detalhada e educativa. O usuário precisa aprender lendo a resposta.
    `;

    const parts: any[] = [{ text: prompt }];

    files.forEach(file => {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      });
    });

    promises.push(
      ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: questionSchema,
          tools: [{ googleSearch: {} }], // Busca ativa ativada
          thinkingConfig: { thinkingBudget: 2048 }, // Aumentado para garantir raciocínio na explicação
        },
      }).catch(e => {
        console.error(`Batch ${i} failed`, e);
        return null;
      })
    );
  }

  try {
    const results = await Promise.all(promises);
    let allQuestions: Question[] = [];

    results.forEach((response) => {
      if (response && response.text) {
        try {
          const batchQuestions = JSON.parse(response.text);
          allQuestions = [...allQuestions, ...batchQuestions];
        } catch (e) {
          console.error("Failed to parse batch json", e);
        }
      }
    });

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
    2. Pesquise sobre a banca Instituto JK. Qual o estilo deles? (Texto longo? Pegadinha? Lei seca?). Explique isso no campo 'bancaPattern'.
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
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        tools: [{ googleSearch: {} }]
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as StrategicAnalysis;
    }
    throw new Error("No analysis returned");
  } catch (error) {
    console.error("Error analyzing pattern:", error);
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
