import React, { useState, useEffect } from 'react';
import { UploadedFile, ExamProfile } from '../types';
import { saveFile, getFiles, deleteFile } from '../services/storageService';
import { UploadCloud, FileText, Trash2, Play, Building2, Briefcase, GraduationCap, ListOrdered } from 'lucide-react';

interface ExamCreationViewProps {
  onStart: (profile: ExamProfile, files: UploadedFile[], context: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  onError: (msg: string) => void;
}

const MAX_FILE_SIZE_MB = 4;

const ExamCreationView: React.FC<ExamCreationViewProps> = ({ onStart, onCancel, isLoading, onError }) => {
  const [banca, setBanca] = useState('');
  const [cargo, setCargo] = useState('');
  const [escolaridade, setEscolaridade] = useState<'Fundamental' | 'Médio' | 'Superior'>('Médio');
  const [qCount, setQCount] = useState<10 | 20 | 30 | 40>(10);
  const [storedFiles, setStoredFiles] = useState<UploadedFile[]>([]);
  const [context, setContext] = useState('');

  useEffect(() => {
    loadPreferences();
    loadFiles();
  }, []);

  const loadPreferences = () => {
    const saved = localStorage.getItem('lastExamProfile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.banca) setBanca(parsed.banca);
        if (parsed.cargo) setCargo(parsed.cargo);
        if (parsed.escolaridade) setEscolaridade(parsed.escolaridade);
        if (parsed.qCount) setQCount(parsed.qCount);
      } catch (e) {
        console.error("Failed to load preferences", e);
      }
    }
  };

  const savePreferences = () => {
    const profile = { banca, cargo, escolaridade, qCount };
    localStorage.setItem('lastExamProfile', JSON.stringify(profile));
  };

  const loadFiles = async () => {
    try {
      const files = await getFiles();
      setStoredFiles(files);
    } catch (error) {
      console.error("Failed to load files", error);
    }
  };

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
        newStreak = 1; 
      }
    } else {
      newStreak = 1; 
    }

    localStorage.setItem('lastStudyDate', Date.now().toString());
    localStorage.setItem('studyStreak', newStreak.toString());
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          onError(`O arquivo "${file.name}" é muito grande (Máx: ${MAX_FILE_SIZE_MB}MB).`);
          continue;
        }

        if (file.type === 'application/pdf' || file.type === 'text/plain') {
          try {
            const reader = new FileReader();
            const filePromise = new Promise<UploadedFile>((resolve, reject) => {
              reader.onload = (event) => {
                const base64 = (event.target?.result as string).split(',')[1];
                resolve({ name: file.name, mimeType: file.type, data: base64 });
              };
              reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
            });
            const pFile = await filePromise;
            await saveFile(pFile);
          } catch (err) {
             onError(`Erro ao processar "${file.name}".`);
          }
        } else {
          onError(`Formato inválido para "${file.name}". Use PDF ou TXT.`);
        }
      }
      loadFiles();
    }
    e.target.value = '';
  };

  const handleRemoveFile = async (id: string) => {
    if(!id) return;
    await deleteFile(id);
    loadFiles();
  };

  const handleStartWrapper = () => {
    savePreferences(); 
    updateStreakOnStart();
    const profile: ExamProfile = { banca, cargo, escolaridade, qCount };
    onStart(profile, storedFiles, context);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">Criar Simulado</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Configure o simulado perfeito para o seu objetivo.</p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors shadow-sm"
        >
          Voltar
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 transition-colors relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        <div className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <Building2 className="w-4 h-4 mr-1.5 text-indigo-500" /> Banca Organizadora (Opcional)
              </label>
              <input 
                type="text" 
                value={banca}
                onChange={(e) => setBanca(e.target.value)}
                placeholder="Ex: Cebraspe, Vunesp..."
                className="w-full p-3.5 bg-gray-50 dark:bg-gray-700/50 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-white transition-all font-medium border-gray-200 dark:border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <Briefcase className="w-4 h-4 mr-1.5 text-indigo-500" /> Cargo Pretendido (Opcional)
              </label>
              <input 
                type="text" 
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Ex: Policial, Técnico..."
                className="w-full p-3.5 bg-gray-50 dark:bg-gray-700/50 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-white transition-all font-medium border-gray-200 dark:border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <GraduationCap className="w-4 h-4 mr-1.5 text-indigo-500" /> Nível de Escolaridade
              </label>
              <div className="flex gap-2">
                {(['Fundamental', 'Médio', 'Superior'] as const).map((nivel) => (
                  <button
                    key={nivel}
                    onClick={() => setEscolaridade(nivel)}
                    className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                      escolaridade === nivel 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200 dark:ring-indigo-900' 
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {nivel}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <ListOrdered className="w-4 h-4 mr-1.5 text-indigo-500" /> Quantidade de Questões
              </label>
              <div className="flex gap-2">
                {([10, 20, 30, 40] as const).map((num) => (
                  <button
                    key={num}
                    onClick={() => setQCount(num)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                      qCount === num 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200 dark:ring-indigo-900' 
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative pt-6 border-t border-gray-100 dark:border-gray-700">
            <label className="flex justify-between items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <span className="flex items-center font-semibold"><FileText className="w-4 h-4 mr-1.5 text-indigo-500"/> Material de Apoio (PDFs) / Edital</span>
              <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full">Máx 4MB</span>
            </label>
            
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors relative mb-4 group cursor-pointer bg-gray-50/50 dark:bg-gray-800/50">
              <input
                type="file"
                multiple
                accept="application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="transform group-hover:scale-105 transition-transform duration-300 flex flex-col items-center">
                <div className="bg-white dark:bg-gray-700 p-4 rounded-full shadow-sm mb-4">
                   <UploadCloud className="w-8 h-8 text-indigo-500" />
                </div>
                <p className="text-base text-gray-700 dark:text-gray-200 font-medium">Clique ou arraste seus PDFs aqui</p>
                <p className="text-sm text-gray-400 mt-1">A IA criará questões baseadas exclusivamente neles.</p>
              </div>
            </div>

            {storedFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {storedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 group">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <FileText className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{file.name}</span>
                      </div>
                      {file.id && (
                        <button onClick={() => handleRemoveFile(file.id!)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition opacity-0 group-hover:opacity-100 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div>
             <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center mb-2">
                Contexto Adicional (Opcional)
             </label>
             <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Dica opcional para a IA: Ex: 'Quero focar em Direito Constitucional' ou 'Gere perguntas difíceis'..."
              className="w-full p-4 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 placeholder-gray-400 transition-colors"
            />
          </div>

          <button
            onClick={handleStartWrapper}
            disabled={isLoading}
            className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl shadow-indigo-500/20 transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center mt-4 ${
              isLoading 
                ? 'bg-gray-400 dark:bg-gray-600 cursor-wait' 
                : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                <span>Gerando Simulado Inteligente...</span>
              </div>
            ) : (
              <span className="flex items-center text-lg">
                <Play className="w-5 h-5 mr-2" fill="currentColor" />
                Gerar Simulado Agora
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamCreationView;
