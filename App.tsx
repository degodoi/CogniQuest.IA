import React, { useState, useEffect, useCallback } from 'react';
import { AppView, Question, AnswerAttempt, UploadedFile, ExamProfile, StrategicAnalysis, HistoryItem } from './types';
import UploadSection from './components/UploadSection';
import QuizInterface from './components/QuizInterface';
import ResultsView from './components/ResultsView';
import { generateQuestions, analyzePerformanceAndPattern } from './services/geminiService';
import { GraduationCap, Moon, Sun, X, CheckCircle, AlertCircle, Info } from 'lucide-react';

// --- TOAST COMPONENT ---
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [loading, setLoading] = useState(false);
  
  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // profile state
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
        addToast("Simulado gerado com sucesso! Boa prova.", "success");
      } else {
        addToast("A IA não conseguiu gerar questões. Tente mudar o tema.", "error");
      }
    } catch (error: any) {
      console.error("Erro na App.tsx:", error);
      addToast(error.message || "Erro desconhecido ao conectar com a IA.", "error");
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
    addToast("Modo Revisão iniciado! Foco nos erros.", "info");
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
      addToast("Este item do histórico está incompleto.", "error");
    }
  };

  const handleQuizComplete = async (completedAnswers: AnswerAttempt[]) => {
    setAnswers(completedAnswers);
    setView(AppView.RESULTS);
    addToast("Simulado finalizado! Analisando desempenho...", "success");
    
    analyzePerformanceAndPattern(profile, completedAnswers, questions).then(result => {
      setAnalysis(result);
    }).catch(err => {
      console.error(err);
      addToast("Não foi possível gerar a análise detalhada no momento.", "error");
    });
  };

  const handleRestart = () => {
    // If currently in quiz, confirm exit is handled by QuizInterface, but purely for navigation:
    if (view === AppView.QUIZ && answers.length < questions.length) {
      if (!window.confirm("Sair agora perderá o progresso do simulado atual. Continuar?")) {
        return;
      }
    }
    setQuestions([]);
    setAnswers([]);
    setAnalysis(null);
    setView(AppView.HOME);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300">
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`pointer-events-auto flex items-center p-4 rounded-lg shadow-lg text-white transform transition-all animate-fade-in-up max-w-sm ${
              toast.type === 'success' ? 'bg-green-600' : 
              toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
            }`}
          >
            <div className="mr-3">
              {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
            </div>
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="ml-3 hover:text-gray-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

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
            onError={(msg) => addToast(msg, 'error')}
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