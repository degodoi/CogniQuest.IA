import React, { useState, useEffect } from 'react';
import { UploadedFile, Role, Question, HistoryItem } from '../types';
import { saveFile, getFiles, deleteFile, getErrorQuestions, getHistory } from '../services/storageService';
import { UploadCloud, FileText, Trash2, BookOpen, Database, BrainCircuit, Play, Flame, Search, Sparkles, AlertCircle, History, ArrowRight } from 'lucide-react';

interface UploadSectionProps {
  onStart: (role: Role, files: UploadedFile[], context: string) => void;
  onStartReview: (questions: Question[]) => void;
  onViewHistory: (item: HistoryItem) => void;
  isLoading: boolean;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onStart, onStartReview, onViewHistory, isLoading }) => {
  const [role, setRole] = useState<Role>(Role.VIGIA);
  const [storedFiles, setStoredFiles] = useState<UploadedFile[]>([]);
  const [errorQuestions, setErrorQuestions] = useState<Question[]>([]);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const [context, setContext] = useState('');
  const [streak, setStreak] = useState(0);

  // Load files, errors and calculate streak on mount
  useEffect(() => {
    loadData();
    calculateStreak();
  }, []);

  const loadData = async () => {
    try {
      const files = await getFiles();
      setStoredFiles(files);
      const errors = await getErrorQuestions();
      setErrorQuestions(errors);
      const hist = await getHistory();
      // Get last 5, reversed
      setRecentHistory(hist.reverse().slice(0, 5));
    } catch (error) {
      console.error("Failed to load data", error);
    }
  };

  const calculateStreak = () => {
    const lastStudy = localStorage.getItem('lastStudyDate');
    const currentStreak = parseInt(localStorage.getItem('studyStreak') || '0', 10);
    
    if (lastStudy) {
      const lastDate = new Date(parseInt(lastStudy));
      const today = new Date();
      // Reset hours to compare just dates
      lastDate.setHours(0,0,0,0);
      today.setHours(0,0,0,0);

      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Studied today already
        setStreak(currentStreak);
      } else if (diffDays === 1) {
        // Studied yesterday
        setStreak(currentStreak);
      } else {
        // Streak broken
        setStreak(0);
        localStorage.setItem('studyStreak', '0');
      }
    } else {
      setStreak(0);
    }
  };

  // Helper to update streak when user starts a quiz
  const updateStreakOnStart = () => {
    const lastStudy = localStorage.getItem('lastStudyDate');
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let newStreak = parseInt(localStorage.getItem('studyStreak') || '0', 10);

    if (lastStudy) {
      const lastDate = new Date(parseInt(lastStudy));
      lastDate.setHours(0,0,0,0);
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1; // Reset and start new
      }
      // If diffDays is 0, do nothing (streak stays same for same day)
    } else {
      newStreak = 1; // First time ever
    }

    localStorage.setItem('lastStudyDate', Date.now().toString());
    localStorage.setItem('studyStreak', newStreak.toString());
    setStreak(newStreak);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (file.type === 'application/pdf' || file.type === 'text/plain') {
          const reader = new FileReader();
          
          const filePromise = new Promise<UploadedFile>((resolve) => {
            reader.onload = (event) => {
              const base64 = (event.target?.result as string).split(',')[1];
              resolve({
                name: file.name,
                mimeType: file.type,
                data: base64
              });
            };
          });

          const pFile = await filePromise;
          await saveFile(pFile);
        }
      }
      loadData();
    }
  };

  const handleRemoveFile = async (id: string) => {
    if(!id) return;
    await deleteFile(id);
    loadData();
  };

  const handleStartWrapper = () => {
    updateStreakOnStart();
    onStart(role, storedFiles, context);
  };

  const handleReviewWrapper = () => {
    updateStreakOnStart();
    onStartReview(errorQuestions);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-10">
      
      {/* Welcome Header with Streak */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8">
         <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
               <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">Instituto JK</h2>
               <p className="text-sm text-gray-500 dark:text-gray-400">Preparatório Vigia & Motorista</p>
            </div>
         </div>
         
         {/* Streak Badge */}
         <div className="bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/50 px-5 py-3 rounded-2xl flex items-center shadow-sm">
            <div className={`p-2 rounded-full mr-3 ${streak > 0 ? 'bg-orange-500 text-white animate-pulse' : 'bg-gray-300 dark:bg-gray-700 text-gray-500'}`}>
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Ofensiva</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white">
                {streak} {streak === 1 ? 'dia' : 'dias'}
              </p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Main Simulation Panel (Left 2/3) */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="flex items-center space-x-2 mb-6">
            <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Novo Simulado</h3>
          </div>

          <div className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cargo Pretendido</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setRole(Role.VIGIA)}
                  className={`p-4 rounded-xl border-2 transition-all text-center flex flex-col items-center justify-center space-y-2 ${
                    role === Role.VIGIA 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold shadow-sm' 
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-200 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span className="text-2xl">🛡️</span>
                  <span>Vigia</span>
                </button>
                <button
                  onClick={() => setRole(Role.MOTORISTA)}
                  className={`p-4 rounded-xl border-2 transition-all text-center flex flex-col items-center justify-center space-y-2 ${
                    role === Role.MOTORISTA 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold shadow-sm' 
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-200 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span className="text-2xl">🚌</span>
                  <span>Motorista</span>
                </button>
              </div>
            </div>

            {/* File Upload - NOW MARKED AS OPTIONAL */}
            <div className="relative">
              <label className="flex justify-between items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span>Material de Apoio (PDFs)</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-normal border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full">Opcional</span>
              </label>
              
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative mb-4 group cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="transform group-hover:scale-105 transition-transform duration-300">
                  <UploadCloud className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-2 group-hover:text-blue-500" />
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Clique ou arraste PDFs aqui</p>
                  <p className="text-xs text-gray-400 mt-1">Aumenta a precisão, mas leva +30s para processar.</p>
                </div>
              </div>

              {/* File List */}
              {storedFiles.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3 max-h-32 overflow-y-auto custom-scrollbar border border-gray-100 dark:border-gray-700 mb-4">
                  <div className="space-y-2">
                    {storedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                          <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{file.name}</span>
                        </div>
                        {file.id && (
                          <button onClick={() => handleRemoveFile(file.id!)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition ml-2">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

             {/* Context Input */}
            <div>
               <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Dica extra (Opcional): Ex: 'Quero focar em Direção Defensiva' ou 'Gere perguntas difíceis sobre Crase'..."
                className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20 placeholder-gray-400 transition-colors"
              />
            </div>

            <button
              onClick={handleStartWrapper}
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center ${
                isLoading 
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-wait' 
                  : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500'
              }`}
            >
              {isLoading ? (
                <div className="flex flex-col items-center">
                   <div className="flex items-center">
                     <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                     <span>Processando...</span>
                   </div>
                   {storedFiles.length > 0 && (
                     <span className="text-xs font-normal mt-1 opacity-90">Lendo PDFs (pode demorar um pouco)</span>
                   )}
                </div>
              ) : storedFiles.length === 0 ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Automático (Via Web)
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Gerar Baseado em PDFs
                </>
              )}
            </button>
            
            {/* Warnings */}
            {storedFiles.length > 0 && !isLoading && (
              <p className="text-xs text-center text-amber-600 dark:text-amber-400 flex items-center justify-center bg-amber-50 dark:bg-amber-900/10 p-2 rounded">
                <AlertCircle className="w-3 h-3 mr-1" />
                Dica: O uso de arquivos PDF consome mais recursos. O carregamento pode levar até 1 minuto.
              </p>
            )}

          </div>
        </div>

        {/* Right Panel Column */}
        <div className="space-y-8 md:col-span-1">
          
          {/* Smart Review Card */}
          <div className="bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 border border-amber-200 dark:border-amber-700/50 p-6 rounded-2xl shadow-xl flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center space-x-2 mb-4 relative z-10">
              <BrainCircuit className="w-6 h-6 text-amber-600 dark:text-amber-500" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Banco de Erros</h3>
            </div>
            
            <div className="flex-grow flex flex-col justify-center items-center text-center space-y-2 relative z-10 py-4">
              <div className="text-4xl font-extrabold text-amber-600 dark:text-amber-500">
                {errorQuestions.length}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 font-medium px-2">
                Questões pendentes de revisão.
              </p>
            </div>

            <div className="mt-2 relative z-10">
              <button
                onClick={handleReviewWrapper}
                disabled={errorQuestions.length === 0 || isLoading}
                className={`w-full py-3 rounded-xl font-bold text-white text-sm shadow-md transition-all transform hover:-translate-y-1 ${
                  errorQuestions.length === 0
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                {errorQuestions.length === 0 ? 'Tudo Limpo!' : 'Revisar Erros Agora'}
              </button>
            </div>
          </div>

          {/* Recent History Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-2xl shadow-lg flex flex-col relative overflow-hidden">
            <div className="flex items-center space-x-2 mb-4">
              <History className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Histórico Recente</h3>
            </div>

            <div className="space-y-3">
              {recentHistory.length === 0 ? (
                 <p className="text-sm text-gray-400 italic text-center py-4">Nenhum simulado recente.</p>
              ) : (
                recentHistory.map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => onViewHistory(item)}
                    className="w-full text-left p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-600 flex justify-between items-center group"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{new Date(item.date).toLocaleDateString('pt-BR')}</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{item.role}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        item.score >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        Nota: {item.score}%
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </button>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default UploadSection;