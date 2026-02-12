import React, { useState, useEffect } from 'react';
import { AppView, Question, AnswerAttempt, UploadedFile, ExamProfile, StrategicAnalysis, HistoryItem } from './types';
import UploadSection from './components/UploadSection';
import QuizInterface from './components/QuizInterface';
import ResultsView from './components/ResultsView';
import { generateQuestions, analyzePerformanceAndPattern } from './services/geminiService';
import { GraduationCap, Moon, Sun } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [loading, setLoading] = useState(false);
  
  // profile state replaces role
  const [profile, setProfile] = useState<ExamProfile>({
    banca: '',
    cargo: '',
    escolaridade: 'Médio',
    qCount: 10
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerAttempt[]>([]);
  const [analysis, setAnalysis] = useState<StrategicAnalysis | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleStartQuiz = async (selectedProfile: ExamProfile, files: UploadedFile[], context: string) => {
    setLoading(true);
    setProfile(selectedProfile);
    try {
      const generatedQuestions = await generateQuestions(selectedProfile, files, context);
      if (generatedQuestions.length > 0) {
        setQuestions(generatedQuestions);
        setAnswers([]); 
        setAnalysis(null);
        setView(AppView.QUIZ);
      } else {
        alert("A IA não conseguiu gerar questões para este perfil. Tente reformular a Banca ou Cargo.");
      }
    } catch (error: any) {
      console.error("Erro na App.tsx:", error);
      // Show the specific error message to the user
      alert(`Erro: ${error.message || "Erro desconhecido ao conectar com a IA."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartReview = (errorQuestions: Question[]) => {
    const shuffled = [...errorQuestions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setAnswers([]);
    setAnalysis(null);
    setView(AppView.QUIZ);
  };

  const handleViewHistory = (item: HistoryItem) => {
    if (item.questions && item.answers) {
      setQuestions(item.questions);
      setAnswers(item.answers);
      setAnalysis(item.analysis);
      if (item.profile) {
        setProfile(item.profile);
      }
      setView(AppView.RESULTS);
    } else {
      alert("Item de histórico inválido ou antigo.");
    }
  };

  const handleQuizComplete = async (completedAnswers: AnswerAttempt[]) => {
    setAnswers(completedAnswers);
    setView(AppView.RESULTS);
    
    analyzePerformanceAndPattern(profile, completedAnswers, questions).then(result => {
      setAnalysis(result);
    });
  };

  const handleRestart = () => {
    setQuestions([]);
    setAnswers([]);
    setAnalysis(null);
    setView(AppView.HOME);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300">
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={handleRestart}>
            <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2 rounded-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700 dark:from-indigo-400 dark:to-purple-400">
                CogniQuest.IA
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {view !== AppView.HOME && (
              <button 
                onClick={handleRestart}
                className="text-sm font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
              >
                Voltar ao Início
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8">
        {view === AppView.HOME && (
          <UploadSection 
            onStart={handleStartQuiz} 
            onStartReview={handleStartReview}
            onViewHistory={handleViewHistory}
            isLoading={loading} 
          />
        )}

        {view === AppView.QUIZ && (
          <QuizInterface 
            questions={questions} 
            onComplete={handleQuizComplete} 
          />
        )}

        {view === AppView.RESULTS && (
          <ResultsView 
            answers={answers} 
            questions={questions} 
            analysis={analysis} 
            profile={profile}
            onRestart={handleRestart}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 mt-auto transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 dark:text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} CogniQuest.IA. Sistema Inteligente Multi-Banca.</p>
          <p className="mt-1 text-xs">Desenvolvido por Marcos Felipe</p>
        </div>
      </footer>

    </div>
  );
};

export default App;