import React, { useState, useEffect } from 'react';
import { UploadedFile, Role } from '../types';
import { saveFile, getFiles, deleteFile } from '../services/storageService';
import { UploadCloud, FileText, Trash2, BookOpen, Database } from 'lucide-react';

interface UploadSectionProps {
  onStart: (role: Role, files: UploadedFile[], context: string) => void;
  isLoading: boolean;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onStart, isLoading }) => {
  const [role, setRole] = useState<Role>(Role.VIGIA);
  const [storedFiles, setStoredFiles] = useState<UploadedFile[]>([]);
  const [newFiles, setNewFiles] = useState<UploadedFile[]>([]);
  const [context, setContext] = useState('');

  // Load files from DB on mount
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const files = await getFiles();
      setStoredFiles(files);
    } catch (error) {
      console.error("Failed to load files", error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const processedFiles: UploadedFile[] = [];
      
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
          // Save immediately to DB
          await saveFile(pFile);
          processedFiles.push(pFile);
        }
      }
      // Refresh list
      loadFiles();
    }
  };

  const handleRemoveFile = async (id: string) => {
    if(!id) return;
    await deleteFile(id);
    loadFiles();
  };

  const allFiles = [...storedFiles]; // Use stored files as the source of truth

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl animate-fade-in transition-colors duration-300">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4 transition-colors">
          <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-300" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">Configurar Simulado</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Personalize seu estudo para o Instituto JK</p>
      </div>

      <div className="space-y-6">
        
        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cargo Pretendido</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setRole(Role.VIGIA)}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                role === Role.VIGIA 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold' 
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-200 dark:hover:border-blue-500'
              }`}
            >
              🛡️ Vigia
            </button>
            <button
              onClick={() => setRole(Role.MOTORISTA)}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                role === Role.MOTORISTA 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold' 
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-200 dark:hover:border-blue-500'
              }`}
            >
              🚌 Motorista Cat. D
            </button>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Banco de Dados de Conhecimento
            <span className="text-gray-400 dark:text-gray-500 font-normal ml-2">(PDFs Salvos)</span>
          </label>
          
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative mb-4">
            <input
              type="file"
              multiple
              accept="application/pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Adicionar novos PDFs à biblioteca</p>
          </div>

          {/* File List */}
          <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 max-h-48 overflow-y-auto custom-scrollbar border border-gray-100 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center">
              <Database className="w-3 h-3 mr-1" />
              Arquivos na Biblioteca ({allFiles.length})
            </h4>
            {allFiles.length > 0 ? (
              <div className="space-y-2">
                {allFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{file.name}</span>
                    </div>
                    {file.id && (
                      <button onClick={() => handleRemoveFile(file.id!)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition ml-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
               <p className="text-sm text-gray-400 text-center italic">Nenhum arquivo salvo.</p>
            )}
          </div>
        </div>

        {/* Extra Context */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Instruções Extras ou Links</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Ex: Foque em questões sobre direção defensiva, ou use o link https://..."
            className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[100px] placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
          />
        </div>

        <button
          onClick={() => onStart(role, allFiles, context)}
          disabled={isLoading}
          className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all transform hover:-translate-y-1 ${
            isLoading 
              ? 'bg-gray-400 dark:bg-gray-600 cursor-wait' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Gerando 40 Questões...
            </span>
          ) : 'Começar Simulado (40 Questões)'}
        </button>
      </div>
    </div>
  );
};

export default UploadSection;