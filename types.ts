
// Removed static Role enum to allow dynamic inputs
export interface ExamProfile {
  banca: string;
  cargo: string;
  concurso?: string; // New field for specific competition/institution
  escolaridade: 'Fundamental' | 'Médio' | 'Superior';
  qCount: 10 | 20 | 30 | 40; 
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

export interface AnswerAttempt {
  questionId: string;
  selectedIndex: number;
  timeSpentSeconds: number;
  isCorrect: boolean;
}

export interface QuizSession {
  questions: Question[];
  answers: AnswerAttempt[];
  startTime: number;
  endTime?: number;
}

export interface UploadedFile {
  id?: string;
  name: string;
  mimeType: string;
  data: string; // Base64
  dateAdded?: number;
}

export enum AppView {
  HOME = 'HOME',
  CREATE_EXAM = 'CREATE_EXAM',
  QUIZ = 'QUIZ',
  RESULTS = 'RESULTS',
  LOADING = 'LOADING',
}

export interface StrategicAnalysis {
  strengths: string[];
  weaknesses: string[];
  bancaPattern: string;
  recommendations: string;
}

export interface HistoryItem {
  id: number;
  date: number;
  profile: ExamProfile; 
  score: number;
  totalQuestions: number;
  totalTimeSeconds: number;
  analysis: StrategicAnalysis;
  questions?: Question[];
  answers?: AnswerAttempt[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface UserStats {
  xp: number;
  streak: number;
  lastStudyDate: string;
}