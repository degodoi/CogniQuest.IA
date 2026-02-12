import React, { useState, useEffect } from 'react';
import { UploadedFile, Role, Question } from '../types';
import { saveFile, getFiles, deleteFile, getErrorQuestions } from '../services/storageService';
import { UploadCloud, FileText, Trash2, BookOpen, Database, BrainCircuit, Play, Flame } from 'lucide-react';

interface UploadSectionProps {
  onStart: (role: Role, files: UploadedFile[], context: string) => void;
  onStartReview: (questions: Question[]) => void;
  isLoading: boolean;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onStart, onStartReview, isLoading }) => {
  const [role, setRole] = useState<Role>(Role.VIGIA);
  const [storedFiles, setStoredFiles] = useState<UploadedFile[]>([]);
  const [errorQuestions, setErrorQuestions] = useState<Question[]>([]);
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
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      
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

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Material de Apoio (PDFs)
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
                </div>
              </div>

              {/* File List */}
              <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3 max-h-32 overflow-y-auto custom-scrollbar border border-gray-100 dark:border-gray-700">
                {storedFiles.length > 0 ? (
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
                ) : (
                   <p className="text-xs text-gray-400 text-center italic py-2">Nenhum arquivo adicionado.</p>
                )}
              </div>
            </div>

             {/* Context Input */}
            <div>
               <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Dica extra para a IA: Ex: 'Quero focar em Direção Defensiva' ou 'Gere perguntas difíceis sobre Crase'..."
                className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20 placeholder-gray-400 transition-colors"
              />
            </div>

            <button
              onClick={handleStartWrapper}
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0 ${
                isLoading 
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-wait' 
                  : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500'
              }`}
            >
              {isLoading ? 'Gerando Questões...' : 'Gerar Simulado (40 Questões)'}
            </button>
          </div>
        </div>

        {/* Right Panel: Smart Review */}
        <div className="md:col-span-1">
          <div className="bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 border border-amber-200 dark:border-amber-700/50 p-8 rounded-2xl shadow-xl h-full flex flex-col relative overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center space-x-2 mb-4 relative z-10">
              <BrainCircuit className="w-6 h-6 text-amber-600 dark:text-amber-500" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Banco de Erros</h3>
            </div>
            
            <div className="flex-grow flex flex-col justify-center items-center text-center space-y-4 relative z-10">
              <div className="text-5xl font-extrabold text-amber-600 dark:text-amber-500">
                {errorQuestions.length}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium px-4">
                Questões que você errou e precisa revisar para garantir a aprovação.
              </p>
            </div>

            <div className="mt-6 relative z-10">
              <button
                onClick={handleReviewWrapper}
                disabled={errorQuestions.length === 0 || isLoading}
                className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-all transform hover:-translate-y-1 ${
                  errorQuestions.length === 0
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                {errorQuestions.length === 0 ? 'Tudo Limpo!' : 'Revisar Erros Agora'}
              </button>
              {errorQuestions.length === 0 && (
                <p className="text-xs text-center text-green-600 dark:text-green-400 mt-3 font-medium">
                  Parabéns! Você zerou suas pendências.
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UploadSection;