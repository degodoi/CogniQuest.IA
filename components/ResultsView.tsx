import React, { useEffect, useState } from 'react';
import { AnswerAttempt, Question, StrategicAnalysis, ExamProfile, HistoryItem } from '../types';
import { saveHistory, getHistory, saveErrorQuestion, removeErrorQuestion } from '../services/storageService';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { AlertTriangle, Award, BookOpen, Clock, Target, TrendingUp, Layers, Hourglass, Calendar, CheckCircle2, XCircle } from 'lucide-react';

interface ResultsViewProps {
  answers: AnswerAttempt[];
  questions: Question[];
  analysis: StrategicAnalysis | null;
  profile: ExamProfile;
  onRestart: () => void;
}

const COLORS = {
  correct: '#10B981',
  incorrect: '#EF4444',
};

const ResultsView: React.FC<ResultsViewProps> = ({ answers, questions, analysis, profile, onRestart }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [savedErrorsCount, setSavedErrorsCount] = useState(0);

  const correctCount = answers.filter(a => a.isCorrect).length;
  const incorrectCount = answers.length - correctCount;
  const totalTimeSeconds = answers.reduce((acc, curr) => acc + curr.timeSpentSeconds, 0);
  const avgTime = Math.round(totalTimeSeconds / answers.length);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const topicData = React.useMemo(() => {
    const topics: Record<string, { total: number; correct: number }> = {};
    questions.forEach((q) => {
      const t = q.topic || 'Geral';
      if (!topics[t]) topics[t] = { total: 0, correct: 0 };
      topics[t].total++;
      if (answers.find(a => a.questionId === q.id)?.isCorrect) {
        topics[t].correct++;
      }
    });
    return Object.entries(topics).map(([name, data]) => ({
      name,
      Acertos: data.correct,
      Erros: data.total - data.correct,
      total: data.total,
      percentage: Math.round((data.correct / data.total) * 100)
    })).sort((a, b) => b.percentage - a.percentage);
  }, [questions, answers]);

  useEffect(() => {
    const processResults = async () => {
      const currentHistory = await getHistory();
      
      const isDuplicate = currentHistory.length > 0 && 
                          currentHistory[currentHistory.length - 1].score === Math.round((correctCount / answers.length) * 100) &&
                          currentHistory[currentHistory.length - 1].totalQuestions === answers.length &&
                          Math.abs(currentHistory[currentHistory.length - 1].date - Date.now()) < 5000;

      if (analysis && !isDuplicate) {
        const item: Omit<HistoryItem, 'id'> = {
          date: Date.now(),
          profile: profile,
          score: Math.round((correctCount / answers.length) * 100),
          totalQuestions: answers.length,
          totalTimeSeconds: totalTimeSeconds, 
          analysis,
          questions,
          answers
        };
        await saveHistory(item);
        
        const h = await getHistory();
        setHistory(h);

        let errorsSaved = 0;
        for (const answer of answers) {
          if (!answer.isCorrect) {
            const question = questions.find(q => q.id === answer.questionId);
            if (question) {
              await saveErrorQuestion(question);
              errorsSaved++;
            }
          } else {
            await removeErrorQuestion(answer.questionId);
          }
        }
        setSavedErrorsCount(errorsSaved);
      } else {
        setHistory(currentHistory);
      }
    };

    processResults();
  }, [analysis, correctCount, answers, questions, profile, totalTimeSeconds]);

  const pieData = [
    { name: 'Corretas', value: correctCount },
    { name: 'Erradas', value: incorrectCount },
  ];

  const historyData = history.map(h => ({
    date: new Date(h.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}),
    nota: h.score,
    minutos: Math.round((h.totalTimeSeconds || 0) / 60)
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
          <p className="font-bold text-gray-700 dark:text-gray-200">{label}</p>
          {payload.map((p: any, idx: number) => (
             <p key={idx} style={{ color: p.color }} className="text-sm">
                {p.name}: {p.value} {p.unit || ''}
             </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const percentage = Math.round((correctCount / answers.length) * 100);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-12">
      
      {/* Alert Banner for Errors */}
      {savedErrorsCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 mr-3" />
            <div>
              <h4 className="font-bold text-amber-800 dark:text-amber-200 text-sm uppercase">Banco de Erros Atualizado</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Adicionamos <strong>{savedErrorsCount} questões</strong> à sua lista de revisão. Estude-as mais tarde!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- SECTION 1: SESSION SUMMARY (Immediate Feedback) --- */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">Resultado do Simulado</h2>
        <p className="text-gray-500 font-medium">{profile.cargo} • {profile.banca}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Main Score Card */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden flex items-center justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-6 -mt-6"></div>
          <div>
             <p className="text-gray-400 dark:text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Seu Aproveitamento</p>
             <h3 className={`text-6xl font-extrabold tracking-tighter ${
               percentage >= 70 ? 'text-green-500' : percentage >= 50 ? 'text-amber-500' : 'text-red-500'
             }`}>
               {percentage}%
             </h3>
             <p className="text-sm text-gray-500 mt-2 font-medium">
               {percentage >= 80 ? 'Excelente! Você está voando!' : percentage >= 50 ? 'Bom trabalho, continue melhorando.' : 'Atenção, vamos reforçar os estudos.'}
             </p>
          </div>
          <div className="hidden sm:block h-24 w-24">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={35} outerRadius={45} dataKey="value" stroke="none">
                    <Cell key="correct" fill={COLORS.correct} />
                    <Cell key="incorrect" fill={COLORS.incorrect} />
                  </Pie>
                </PieChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
           <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-3xl flex flex-col justify-center border border-green-100 dark:border-green-800/30">
              <div className="bg-white dark:bg-green-800/50 w-10 h-10 rounded-full flex items-center justify-center mb-3 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-300" />
              </div>
              <p className="text-3xl font-bold text-green-700 dark:text-green-300">{correctCount}</p>
              <p className="text-xs font-bold uppercase text-green-600/70 dark:text-green-400">Acertos</p>
           </div>
           
           <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-3xl flex flex-col justify-center border border-red-100 dark:border-red-800/30">
              <div className="bg-white dark:bg-red-800/50 w-10 h-10 rounded-full flex items-center justify-center mb-3 shadow-sm">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-300" />
              </div>
              <p className="text-3xl font-bold text-red-700 dark:text-red-300">{incorrectCount}</p>
              <p className="text-xs font-bold uppercase text-red-600/70 dark:text-red-400">Erros</p>
           </div>

           <div className="col-span-2 bg-white dark:bg-gray-800 p-5 rounded-3xl flex items-center justify-between shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center">
                 <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl mr-4">
                    <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                 </div>
                 <div>
                    <p className="text-xl font-bold text-gray-800 dark:text-white">{formatDuration(totalTimeSeconds)}</p>
                    <p className="text-xs text-gray-500 uppercase font-bold">Tempo Total</p>
                 </div>
              </div>
              <div className="text-right border-l pl-6 border-gray-100 dark:border-gray-700">
                 <p className="text-lg font-bold text-gray-800 dark:text-white">{avgTime}s</p>
                 <p className="text-xs text-gray-500 uppercase font-bold">Média / Questão</p>
              </div>
           </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- SECTION 2: AI ANALYSIS (Coach) --- */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center border-b border-gray-100 dark:border-gray-700 pb-4">
              <BookOpen className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
              Análise do Treinador IA
            </h3>
            
            {analysis ? (
              <div className="space-y-6 overflow-y-auto flex-1 custom-scrollbar pr-2">
                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-700/30">
                  <h4 className="font-bold text-indigo-800 dark:text-indigo-200 mb-2 text-xs uppercase tracking-wide flex items-center">
                     <Target className="w-3 h-3 mr-1" />
                     Plano de Ação Recomendado
                  </h4>
                  <p className="text-sm text-indigo-900 dark:text-indigo-100 leading-relaxed whitespace-pre-wrap font-medium">
                    {analysis.recommendations}
                  </p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-700/30">
                  <h4 className="font-bold text-amber-800 dark:text-amber-200 flex items-center mb-2 text-xs uppercase tracking-wide">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Padrão da Banca Identificado
                  </h4>
                  <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed whitespace-pre-wrap">
                    {analysis.bancaPattern}
                  </p>
                </div>

                <div className="space-y-4">
                   <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Pontos Fortes</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.strengths.length > 0 ? analysis.strengths.map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold border border-green-200 dark:border-green-800">
                          {s}
                        </span>
                      )) : <span className="text-sm text-gray-400 italic">Continue estudando para descobrir.</span>}
                    </div>
                   </div>

                   <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Pontos a Melhorar</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.weaknesses.length > 0 ? analysis.weaknesses.map((w, i) => (
                        <span key={i} className="px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-full text-xs font-semibold border border-red-200 dark:border-red-800">
                          {w}
                        </span>
                      )) : <span className="text-sm text-gray-400 italic">Nenhum ponto crítico detectado.</span>}
                    </div>
                   </div>
                </div>

              </div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-6 min-h-[300px]">
                 <div className="relative">
                   <div className="w-16 h-16 border-4 border-blue-100 dark:border-gray-700 rounded-full"></div>
                   <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                 </div>
                 <div className="text-center space-y-2">
                   <p className="font-medium text-gray-600 dark:text-gray-300">Consultando a IA...</p>
                   <p className="text-xs max-w-[200px] mx-auto opacity-70">Analisando o padrão da banca {profile.banca} e seu desempenho...</p>
                 </div>
               </div>
            )}
          </div>
        </div>

        {/* --- SECTION 3: GRAPHS & HISTORY --- */}
        <div className="lg:col-span-2 space-y-6">
          
             {/* Topic Performance Bar Chart */}
             <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center">
                  <Layers className="w-5 h-5 mr-2 text-indigo-500" />
                  Desempenho por Matéria (Neste Simulado)
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topicData}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#374151" opacity={0.1} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} 
                        interval={0}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                      <Bar dataKey="Acertos" stackId="a" fill={COLORS.correct} radius={[0, 4, 4, 0]} barSize={20} />
                      <Bar dataKey="Erros" stackId="a" fill="#E5E7EB" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

          {/* Evolution Chart (History) */}
          {history.length > 1 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-6 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                Sua Evolução no Tempo
              </h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNota" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} vertical={false} />
                    <XAxis dataKey="date" stroke="#9CA3AF" tick={{fontSize: 10}} tickLine={false} axisLine={false} dy={10} />
                    <YAxis domain={[0, 100]} stroke="#9CA3AF" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="nota" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorNota)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Action */}
      <div className="flex justify-center mt-8">
         <button onClick={onRestart} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-12 rounded-2xl shadow-xl shadow-indigo-500/30 transition-all transform hover:-translate-y-1 text-lg">
            Voltar ao Início e Praticar Mais
         </button>
      </div>

    </div>
  );
};

export default ResultsView;