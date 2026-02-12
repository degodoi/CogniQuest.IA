import React, { useState, useEffect } from 'react';
import { AppView, Question, AnswerAttempt, UploadedFile, Role, StrategicAnalysis } from './types';
import UploadSection from './components/UploadSection';
import QuizInterface from './components/QuizInterface';
import ResultsView from './components/ResultsView';
import { generateQuestions, analyzePerformanceAndPattern } from './services/geminiService';
import { GraduationCap, Moon, Sun } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<Role>(Role.VIGIA);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerAttempt[]>([]);
  const [analysis, setAnalysis] = useState<StrategicAnalysis | null>(null);
  
  // Initialize dark mode from system preference or default to false
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

  const handleStartQuiz = async (selectedRole: Role, files: UploadedFile[], context: string) => {
    setLoading(true);
    setRole(selectedRole);
    try {
      const generatedQuestions = await generateQuestions(selectedRole, files, context);
      if (generatedQuestions.length > 0) {
        setQuestions(generatedQuestions);
        setView(AppView.QUIZ);
      } else {
        alert("Não foi possível gerar questões. Tente adicionar mais contexto ou arquivos.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com a IA. Verifique sua conexão ou tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartReview = (errorQuestions: Question[]) => {
    // Shuffle the questions for better review
    const shuffled = [...errorQuestions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setView(AppView.QUIZ);
  };

  const handleQuizComplete = async (completedAnswers: AnswerAttempt[]) => {
    setAnswers(completedAnswers);
    setView(AppView.RESULTS);
    
    // Trigger async analysis without blocking the UI transition
    analyzePerformanceAndPattern(role, completedAnswers, questions).then(result => {
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
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-400 dark:to-indigo-400">
                CogniQuest.IA
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide">Vigia & Motorista</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {view !== AppView.HOME && (
              <button 
                onClick={handleRestart}
                className="text-sm font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
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
            role={role}
            onRestart={handleRestart}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 mt-auto transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 dark:text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} CogniQuest.IA. Sistema Inteligente de Estudos.</p>
          <p className="mt-1 text-xs">Desenvolvido por Marcos Felipe</p>
        </div>
      </footer>

    </div>
  );
};

export default App;