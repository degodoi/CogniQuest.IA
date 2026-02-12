
export enum Role {
  VIGIA = 'Vigia',
  MOTORISTA = 'Motorista Categoria D',
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
  id?: string; // Made optional for backward compatibility, but used for storage
  name: string;
  mimeType: string;
  data: string; // Base64
  dateAdded?: number;
}

export enum AppView {
  HOME = 'HOME',
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
  role: Role;
  score: number;
  totalQuestions: number;
  totalTimeSeconds: number; // New field for study duration tracking
  analysis: StrategicAnalysis;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
