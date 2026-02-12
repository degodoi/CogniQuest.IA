import React, { useState, useEffect, useMemo } from 'react';
import { UploadedFile, ExamProfile, Question, HistoryItem, StrategicAnalysis } from '../types';
import { saveFile, getFiles, deleteFile, getErrorQuestions, getHistory } from '../services/storageService';
import { UploadCloud, FileText, Trash2, BookOpen, BrainCircuit, Play, Flame, History, Building2, Briefcase, GraduationCap, Trophy, Target, Clock, TrendingUp, Lightbulb, ListOrdered } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface UploadSectionProps {
  onStart: (profile: ExamProfile, files: UploadedFile[], context: string) => void;
  onStartReview: (questions: Question[]) => void;
  onViewHistory: (item: HistoryItem) => void;
  isLoading: boolean;
}

const COLORS = {
  high: '#10B981', // Green
  mid: '#F59E0B',  // Amber
  low: '#EF4444',  // Red
};

const UploadSection: React.FC<UploadSectionProps> = ({ onStart, onStartReview, onViewHistory, isLoading }) => {
  // State for Dynamic Inputs
  const [banca, setBanca] = useState('');
  const [cargo, setCargo] = useState('');
  const [escolaridade, setEscolaridade] = useState<'Fundamental' | 'Médio' | 'Superior'>('Médio');
  const [qCount, setQCount] = useState<10 | 20 | 30 | 40>(10); // Default to 10 for quick start

  const [storedFiles, setStoredFiles] = useState<UploadedFile[]>([]);
  const [errorQuestions, setErrorQuestions] = useState<Question[]>([]);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const [allHistory, setAllHistory] = useState<HistoryItem[]>([]); // For stats
  const [context, setContext] = useState('');
  const [streak, setStreak] = useState(0);

  // Load everything on mount
  useEffect(() => {
    loadData();
    calculateStreak();
    loadPreferences();
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

  const loadData = async () => {
    try {
      const files = await getFiles();
      setStoredFiles(files);
      const errors = await getErrorQuestions();
      setErrorQuestions(errors);
      const hist = await getHistory();
      setAllHistory(hist);
      setRecentHistory([...hist].reverse().slice(0, 5));
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
      lastDate.setHours(0,0,0,0);
      today.setHours(0,0,0,0);

      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        setStreak(currentStreak);
      } else {
        setStreak(0);
        localStorage.setItem('studyStreak', '0');
      }
    } else {
      setStreak(0);
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
              resolve({ name: file.name, mimeType: file.type, data: base64 });
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
    if (!banca.trim() || !cargo.trim()) {
      alert("Por favor, preencha a Banca e o Cargo para iniciar.");
      return;
    }
    savePreferences(); // Auto-save
    updateStreakOnStart();
    const profile: ExamProfile = { banca, cargo, escolaridade, qCount };
    onStart(profile, storedFiles, context);
  };

  const handleReviewWrapper = () => {
    updateStreakOnStart();
    onStartReview(errorQuestions);
  };

  // --- DASHBOARD CALCULATIONS ---
  const stats = useMemo(() => {
    if (allHistory.length === 0) return null;

    let totalSeconds = 0;
    let totalQuestionsAnswered = 0;
    let totalCorrect = 0;
    const topicStats: Record<string, { correct: number; total: number }> = {};

    allHistory.forEach(h => {
      totalSeconds += h.totalTimeSeconds || 0;
      totalQuestionsAnswered += h.totalQuestions || 0;
      // Estimate correct based on score if answers not present (legacy) or calculate exactly
      const correctInSession = Math.round((h.score / 100) * h.totalQuestions);
      totalCorrect += correctInSession;

      // Aggregating topics
      if (h.questions && h.answers) {
        h.questions.forEach(q => {
          const t = q.topic || 'Geral';
          if (!topicStats[t]) topicStats[t] = { correct: 0, total: 0 };
          topicStats[t].total++;
          const isCorrect = h.answers?.find(a => a.questionId === q.id)?.isCorrect;
          if (isCorrect) topicStats[t].correct++;
        });
      }
    });

    // Calculate Weaknesses and Strengths based on data
    const topicPerformance = Object.entries(topicStats).map(([topic, data]) => ({
      topic,
      percentage: Math.round((data.correct / data.total) * 100),
      total: data.total
    })).sort((a, b) => a.percentage - b.percentage); // Lowest first

    const globalScore = totalQuestionsAnswered > 0 ? Math.round((totalCorrect / totalQuestionsAnswered) * 100) : 0;
    
    // Get latest recommendations
    const lastSession = allHistory[allHistory.length - 1];
    const latestPlan = lastSession?.analysis?.recommendations || "Realize um simulado para gerar seu plano.";

    return {
      totalHours: Math.floor(totalSeconds / 3600),
      totalMinutes: Math.floor((totalSeconds % 3600) / 60),
      globalScore,
      questionsCount: totalQuestionsAnswered,
      topicPerformance, // Full list for chart
      latestPlan
    };
  }, [allHistory]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-10">
      
      {/* Header & Streak */}
      <div className="flex flex-col md:flex-row items-center justify-between">
         <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl shadow-lg">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
               <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white tracking-tight">Painel do Estudante</h2>
               <p className="text-sm text-gray-500 dark:text-gray-400">Bem-vindo de volta!</p>
            </div>
         </div>
         
         <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-5 py-2 rounded-2xl flex items-center shadow-sm">
            <div className={`p-2 rounded-full mr-3 ${streak > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Ofensiva</p>
              <p className="text-lg font-bold text-gray-800 dark:text-white">{streak} dias</p>
            </div>
         </div>
      </div>

      {/* --- DASHBOARD SECTION --- */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in-up">
          
          {/* Stats Cards */}
          <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl mr-4 text-blue-600 dark:text-blue-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Tempo Total</p>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {stats.totalHours}h {stats.totalMinutes}m
                </h3>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl mr-4 text-green-600 dark:text-green-400">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Precisão Global</p>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{stats.globalScore}%</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl mr-4 text-purple-600 dark:text-purple-400">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Questões Feitas</p>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{stats.questionsCount}</h3>
              </div>
            </div>
          </div>

          {/* Charts & Plans */}
          <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
             <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center">
               <TrendingUp className="w-5 h-5 mr-2 text-indigo-500" />
               Pontos Fortes e Fracos (Geral)
             </h3>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={stats.topicPerformance} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#374151" opacity={0.1} />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="topic" type="category" width={100} tick={{fontSize: 10}} interval={0} />
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                      cursor={{fill: 'transparent'}}
                    />
                    <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={20}>
                      {stats.topicPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.percentage >= 70 ? COLORS.high : entry.percentage >= 50 ? COLORS.mid : COLORS.low} />
                      ))}
                    </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
             <p className="text-xs text-center text-gray-400 mt-2">Baseado em todo o seu histórico.</p>
          </div>

          <div className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-white dark:from-gray-800 dark:to-gray-800 p-6 rounded-2xl border border-indigo-100 dark:border-gray-700 shadow-sm flex flex-col">
             <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center">
               <Lightbulb className="w-5 h-5 mr-2 text-amber-500" />
               Plano de Estudo Atual
             </h3>
             <div className="flex-1 overflow-y-auto custom-scrollbar max-h-60 pr-2">
               <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                 {stats.latestPlan}
               </p>
             </div>
             <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
               <p className="text-xs text-gray-500 italic">
                 Dica: Faça um novo simulado para atualizar este plano com base no seu desempenho mais recente.
               </p>
             </div>
          </div>

        </div>
      )}

      {/* --- CONFIG SECTION (FORM) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Main Form */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transition-colors relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          
          <div className="flex items-center space-x-2 mb-6">
            <Play className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Iniciar Novo Simulado</h3>
          </div>

          <div className="space-y-6">
            
            {/* Input Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <Building2 className="w-4 h-4 mr-1 text-indigo-500" /> Banca Organizadora
                </label>
                <input 
                  type="text" 
                  value={banca}
                  onChange={(e) => setBanca(e.target.value)}
                  placeholder="Ex: Cebraspe, Vunesp, FGV..."
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-white transition-all font-semibold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <Briefcase className="w-4 h-4 mr-1 text-indigo-500" /> Cargo Pretendido
                </label>
                <input 
                  type="text" 
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ex: Policial, Técnico Adm..."
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-white transition-all font-semibold"
                />
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <GraduationCap className="w-4 h-4 mr-1 text-indigo-500" /> Nível de Escolaridade
                </label>
                <div className="flex gap-2">
                  {(['Fundamental', 'Médio', 'Superior'] as const).map((nivel) => (
                    <button
                      key={nivel}
                      onClick={() => setEscolaridade(nivel)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                        escolaridade === nivel 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {nivel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <ListOrdered className="w-4 h-4 mr-1 text-indigo-500" /> Quantidade de Questões
                </label>
                <div className="flex gap-2">
                  {([10, 20, 30, 40] as const).map((num) => (
                    <button
                      key={num}
                      onClick={() => setQCount(num)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                        qCount === num 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* File Upload */}
            <div className="relative pt-4 border-t border-gray-100 dark:border-gray-700">
              <label className="flex justify-between items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span>Material de Apoio (PDFs)</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-normal border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full">Opcional</span>
              </label>
              
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative mb-4 group cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="transform group-hover:scale-105 transition-transform duration-300 flex flex-col items-center">
                  <UploadCloud className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-1 group-hover:text-indigo-500" />
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">Arraste PDFs aqui</p>
                </div>
              </div>

              {/* File List */}
              {storedFiles.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3 max-h-32 overflow-y-auto custom-scrollbar border border-gray-100 dark:border-gray-700 mb-4">
                  <div className="space-y-2">
                    {storedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <FileText className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
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
                placeholder="Dica extra: Ex: 'Quero focar em Direito Constitucional' ou 'Gere perguntas difíceis'..."
                className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-16 placeholder-gray-400 transition-colors"
              />
            </div>

            <button
              onClick={handleStartWrapper}
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center ${
                isLoading 
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-wait' 
                  : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  <span>Gerando Simulado ({qCount} questões)...</span>
                </div>
              ) : (
                  "Iniciar Simulado Agora"
              )}
            </button>
          </div>
        </div>

        {/* Right Panel (Side items) */}
        <div className="space-y-6 md:col-span-1">
          
          {/* Review Card */}
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
                Questões pendentes.
              </p>
            </div>

            <div className="mt-2 relative z-10">
              <button
                onClick={handleReviewWrapper}
                disabled={errorQuestions.length === 0 || isLoading}
                className={`w-full py-3 rounded-xl font-bold text-white text-sm shadow-md transition-all transform hover:-translate-y-1 ${
                  errorQuestions.length === 0
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500'
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                Revisar Erros
              </button>
            </div>
          </div>

          {/* History Card */}
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
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{new Date(item.date).toLocaleDateString('pt-BR')}</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                        {item.profile ? `${item.profile.cargo}` : 'Simulado Antigo'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold block mb-1 ${
                        item.score >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {item.score}%
                      </span>
                    </div>
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