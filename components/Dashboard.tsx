import React, { useState, useEffect, useMemo } from 'react';
import { Question, HistoryItem } from '../types';
import { getErrorQuestions, getHistory } from '../services/storageService';
import { BookOpen, BrainCircuit, Play, Flame, History, Trophy, Target, Clock, TrendingUp, Lightbulb, ListOrdered, Calendar, Star } from 'lucide-react';
import { getUserStats, calculateLevel } from '../services/userService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface DashboardProps {
  onCreateExam: () => void;
  onStartReview: (questions: Question[]) => void;
  onViewHistory: (item: HistoryItem) => void;
  isLoading: boolean;
}

const COLORS = {
  high: '#10B981', // Green
  mid: '#F59E0B',  // Amber
  low: '#EF4444',  // Red
};

const Dashboard: React.FC<DashboardProps> = ({ onCreateExam, onStartReview, onViewHistory, isLoading }) => {
  const [errorQuestions, setErrorQuestions] = useState<Question[]>([]);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const [allHistory, setAllHistory] = useState<HistoryItem[]>([]); 
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    loadData();
    const stats = getUserStats();
    setStreak(stats.streak);
    setXp(stats.xp);
    setLevel(calculateLevel(stats.xp));
  }, []);

  const loadData = async () => {
    try {
      const errors = await getErrorQuestions();
      setErrorQuestions(errors);
      const hist = await getHistory();
      setAllHistory(hist);
      setRecentHistory([...hist].reverse().slice(0, 5));
    } catch (error) {
      console.error("Failed to load data", error);
    }
  };

  const handleReviewWrapper = () => {
    onStartReview(errorQuestions);
  };

  const stats = useMemo(() => {
    let lifetimeSeconds = 0;
    let lifetimeQuestions = 0;
    let lifetimeCorrect = 0;
    let todaySeconds = 0;
    let todayQuestions = 0;

    const topicStats: Record<string, { correct: number; total: number }> = {};
    const todayDateString = new Date().toDateString();

    allHistory.forEach(h => {
      lifetimeSeconds += h.totalTimeSeconds || 0;
      lifetimeQuestions += h.totalQuestions || 0;
      const correctInSession = Math.round((h.score / 100) * h.totalQuestions);
      lifetimeCorrect += correctInSession;

      const sessionDate = new Date(h.date);
      if (sessionDate.toDateString() === todayDateString) {
        todaySeconds += h.totalTimeSeconds || 0;
        todayQuestions += h.totalQuestions || 0;
      }

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

    const topicPerformance = Object.entries(topicStats).map(([topic, data]) => ({
      topic: topic.length > 15 ? topic.substring(0, 15) + '...' : topic,
      fullTopic: topic,
      percentage: Math.round((data.correct / data.total) * 100),
      total: data.total,
      correct: data.correct
    })).sort((a, b) => a.percentage - b.percentage);

    const globalAccuracy = lifetimeQuestions > 0 ? Math.round((lifetimeCorrect / lifetimeQuestions) * 100) : 0;
    
    const formatTime = (totalSecs: number) => {
       const h = Math.floor(totalSecs / 3600);
       const m = Math.floor((totalSecs % 3600) / 60);
       if (h > 0) return `${h}h ${m}m`;
       return `${m}m`;
    };

    const lastSession = allHistory[allHistory.length - 1];
    const latestPlan = lastSession?.analysis?.recommendations || "Realize um simulado para gerar seu plano.";

    return {
      lifetime: {
        time: formatTime(lifetimeSeconds),
        questions: lifetimeQuestions,
        accuracy: globalAccuracy
      },
      today: {
        time: formatTime(todaySeconds),
        questions: todayQuestions
      },
      topicPerformance,
      latestPlan,
      hasData: allHistory.length > 0
    };
  }, [allHistory]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg z-50">
          <p className="font-bold text-gray-700 dark:text-gray-200 mb-1">{data.fullTopic}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Acertos: <span className="font-mono font-bold text-gray-800 dark:text-white">{data.correct}/{data.total}</span>
          </p>
          <p className={`text-sm font-bold mt-1 ${
             data.percentage >= 70 ? 'text-green-500' : data.percentage >= 50 ? 'text-amber-500' : 'text-red-500'
          }`}>
            Aproveitamento: {data.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-10">
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="flex items-center space-x-4">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl shadow-lg ring-4 ring-white dark:ring-gray-800">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
               <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white tracking-tight">Painel do Estudante</h2>
               <p className="text-sm text-gray-500 dark:text-gray-400">Prepare-se com inteligência.</p>
            </div>
         </div>
         
         <div className="flex flex-wrap items-center gap-4 justify-end mt-4 md:mt-0">
            {/* XP / Level Badge */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-6 py-3 rounded-2xl flex items-center shadow-sm">
               <div className="p-2 rounded-full mr-4 bg-yellow-100 text-yellow-600">
                 <Star className="w-6 h-6" fill="currentColor" />
               </div>
               <div>
                 <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Level {level}</p>
                 <div className="flex items-baseline">
                   <p className="text-2xl font-bold text-gray-800 dark:text-white mr-1">{xp}</p>
                   <span className="text-sm text-gray-500">XP</span>
                 </div>
               </div>
            </div>
         
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-6 py-3 rounded-2xl flex items-center shadow-sm">
            <div className={`p-2 rounded-full mr-4 ${streak > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Ofensiva</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-gray-800 dark:text-white mr-1">{streak}</p>
                <span className="text-sm text-gray-500">dias</span>
              </div>
            </div>
            </div>
         </div>
      </div>

      <div className="bg-indigo-600 dark:bg-indigo-700 rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between group">
        <div className="absolute inset-0 bg-white opacity-5 group-hover:opacity-10 transition-opacity"></div>
        <div className="relative z-10 mb-6 sm:mb-0">
          <h3 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Pronto para treinar?</h3>
          <p className="text-indigo-100 text-lg">Crie um simulado personalizado focado na sua banca e cargo.</p>
        </div>
        <button
          onClick={onCreateExam}
          className="relative z-10 px-8 py-4 bg-white text-indigo-600 hover:bg-indigo-50 font-bold rounded-2xl shadow-lg transition-transform transform hover:scale-105 active:scale-95 flex items-center text-lg whitespace-nowrap"
        >
          <Play className="w-6 h-6 mr-2" fill="currentColor" />
          Novo Simulado
        </button>
      </div>

      {stats.hasData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
          
          <div className="space-y-6 lg:col-span-1 flex flex-col">
             
             <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                  <Calendar className="w-24 h-24" />
                </div>
                <h3 className="text-blue-100 font-medium text-sm uppercase tracking-wide mb-4 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Hoje
                </h3>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div>
                     <p className="text-3xl font-bold">{stats.today.time}</p>
                     <p className="text-blue-200 text-xs mt-1">Tempo de Estudo</p>
                  </div>
                  <div>
                     <p className="text-3xl font-bold">{stats.today.questions}</p>
                     <p className="text-blue-200 text-xs mt-1">Questões Feitas</p>
                  </div>
                </div>
             </div>

             <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden flex-grow">
                <h3 className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase tracking-wide mb-6 flex items-center">
                  <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
                  Jornada Total
                </h3>
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4">
                    <div className="flex items-center">
                       <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg mr-3 text-green-600 dark:text-green-400">
                          <Target className="w-5 h-5" />
                       </div>
                       <span className="text-gray-600 dark:text-gray-300 font-medium">Precisão Média</span>
                    </div>
                    <span className="text-xl font-bold text-gray-800 dark:text-white">{stats.lifetime.accuracy}%</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4">
                    <div className="flex items-center">
                       <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg mr-3 text-purple-600 dark:text-purple-400">
                          <ListOrdered className="w-5 h-5" />
                       </div>
                       <span className="text-gray-600 dark:text-gray-300 font-medium">Questões Totais</span>
                    </div>
                    <span className="text-xl font-bold text-gray-800 dark:text-white">{stats.lifetime.questions}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                       <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg mr-3 text-orange-600 dark:text-orange-400">
                          <History className="w-5 h-5" />
                       </div>
                       <span className="text-gray-600 dark:text-gray-300 font-medium">Tempo Total</span>
                    </div>
                    <span className="text-xl font-bold text-gray-800 dark:text-white">{stats.lifetime.time}</span>
                  </div>
                </div>
             </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex-1 min-h-[300px]">
               <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                     <TrendingUp className="w-5 h-5 mr-2 text-indigo-500" />
                     Desempenho por Tópico
                   </h3>
                   <p className="text-xs text-gray-400 mt-1">Ordenado do menor para o maior (Foque no topo!)</p>
                 </div>
               </div>
               
               <div className="h-[280px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart 
                      data={stats.topicPerformance} 
                      layout="vertical" 
                      margin={{top: 5, right: 30, left: 40, bottom: 5}}
                   >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#374151" opacity={0.1} />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis 
                        dataKey="topic" 
                        type="category" 
                        width={120} 
                        tick={{fontSize: 11, fill: '#6B7280', fontWeight: 500}} 
                        interval={0} 
                      />
                      <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                      <Bar dataKey="percentage" radius={[0, 6, 6, 0]} barSize={24} background={{ fill: '#F3F4F6', radius: [0,6,6,0] }}>
                        {stats.topicPerformance.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.percentage >= 70 ? COLORS.high : entry.percentage >= 50 ? COLORS.mid : COLORS.low} 
                          />
                        ))}
                      </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-amber-50 dark:bg-gray-800/80 p-6 rounded-3xl border border-amber-100 dark:border-gray-700 shadow-sm flex flex-col">
               <h3 className="text-lg font-bold text-amber-800 dark:text-amber-400 mb-3 flex items-center">
                 <Lightbulb className="w-5 h-5 mr-2" />
                 Plano de Ação Atual
               </h3>
               <div className="flex-1 overflow-y-auto custom-scrollbar max-h-32 pr-2">
                 <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                   {stats.latestPlan}
                 </p>
               </div>
            </div>
          </div>

        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        
        <div className="bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 border border-amber-200 dark:border-amber-700/50 p-6 rounded-3xl shadow-lg flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-400/30 transition-all"></div>

          <div className="flex items-center space-x-2 mb-4 relative z-10">
            <div className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-sm">
              <BrainCircuit className="w-5 h-5 text-amber-600 dark:text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Banco de Erros</h3>
          </div>
          
          <div className="flex-grow flex flex-col justify-center items-center text-center space-y-1 relative z-10 py-6">
            <div className="text-5xl font-extrabold text-amber-600 dark:text-amber-500 tracking-tighter">
              {errorQuestions.length}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium uppercase tracking-wide">
              Questões Pendentes
            </p>
          </div>

          <div className="mt-2 relative z-10">
            <button
              onClick={handleReviewWrapper}
              disabled={errorQuestions.length === 0 || isLoading}
              className={`w-full py-3.5 rounded-xl font-bold text-white text-sm shadow-md transition-all transform hover:-translate-y-1 ${
                errorQuestions.length === 0
                  ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500'
                  : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
              }`}
            >
              Revisar Erros
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-3xl shadow-lg flex flex-col relative overflow-hidden min-h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                <History className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Recentes</h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {recentHistory.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 py-8">
                  <History className="w-8 h-8 opacity-20" />
                  <p className="text-xs italic">Nenhum histórico ainda.</p>
               </div>
            ) : (
              recentHistory.map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => onViewHistory(item)}
                  className="w-full text-left p-3 rounded-2xl bg-gray-50 dark:bg-gray-700/30 hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-purple-200 dark:hover:border-purple-500/30 hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{new Date(item.date).toLocaleDateString('pt-BR')}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      item.score >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.score}%
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-800 dark:text-white truncate">
                    {item.profile ? `${item.profile.concurso ? item.profile.concurso + ' - ' : ''}${item.profile.cargo}` : 'Simulado Geral'}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {item.profile ? item.profile.banca : ''} • {item.totalQuestions} questões
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
