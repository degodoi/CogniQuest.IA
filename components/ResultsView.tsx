import React, { useEffect, useState } from 'react';
import { AnswerAttempt, Question, StrategicAnalysis, Role, HistoryItem } from '../types';
import { saveHistory, getHistory, saveErrorQuestion, removeErrorQuestion } from '../services/storageService';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { AlertTriangle, Award, BookOpen, Clock, Target, TrendingUp, Layers, Hourglass, Calendar, CheckCircle } from 'lucide-react';

interface ResultsViewProps {
  answers: AnswerAttempt[];
  questions: Question[];
  analysis: StrategicAnalysis | null;
  role: Role;
  onRestart: () => void;
}

const COLORS = {
  correct: '#10B981', // Green 500
  incorrect: '#EF4444', // Red 500
  charts: ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1'] // Tailwind palette
};

const ResultsView: React.FC<ResultsViewProps> = ({ answers, questions, analysis, role, onRestart }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [savedErrorsCount, setSavedErrorsCount] = useState(0);

  const correctCount = answers.filter(a => a.isCorrect).length;
  const incorrectCount = answers.length - correctCount;
  const totalTimeSeconds = answers.reduce((acc, curr) => acc + curr.timeSpentSeconds, 0);
  const avgTime = Math.round(totalTimeSeconds / answers.length);

  // Helper to format seconds into readable string (e.g. 1h 30m)
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Process data for Topic Performance Chart
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
    })).sort((a, b) => b.percentage - a.percentage); // Sort best performing first
  }, [questions, answers]);

  // Handle History Saving AND Error Bank Management
  useEffect(() => {
    const processResults = async () => {
      // 1. Save History (only if analysis exists to prevent duplicates on re-render if logic changes)
      if (analysis) {
        const item = {
          date: Date.now(),
          role,
          score: Math.round((correctCount / answers.length) * 100),
          totalQuestions: answers.length,
          totalTimeSeconds: totalTimeSeconds, 
          analysis
        };
        await saveHistory(item);
        const h = await getHistory();
        setHistory(h);
      }

      // 2. Process Error Bank
      let errorsSaved = 0;
      for (const answer of answers) {
        if (!answer.isCorrect) {
          // Save the full question object to the error bank
          const question = questions.find(q => q.id === answer.questionId);
          if (question) {
            await saveErrorQuestion(question);
            errorsSaved++;
          }
        } else {
          // If correct, remove from error bank (if it was there previously)
          // This creates the "Review until mastered" loop
          await removeErrorQuestion(answer.questionId);
        }
      }
      setSavedErrorsCount(errorsSaved);
    };

    processResults();
  }, [analysis, correctCount, answers, questions, role, totalTimeSeconds]);

  const pieData = [
    { name: 'Corretas', value: correctCount },
    { name: 'Erradas', value: incorrectCount },
  ];

  const historyData = history.map(h => ({
    date: new Date(h.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}),
    nota: h.score,
    minutos: Math.round((h.totalTimeSeconds || 0) / 60)
  }));

  const totalLifetimeSeconds = history.reduce((acc, curr) => acc + (curr.totalTimeSeconds || 0), 0);

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

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-12">
      
      {/* Feedback Banner about Errors */}
      {savedErrorsCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 mr-3" />
            <div>
              <h4 className="font-bold text-amber-800 dark:text-amber-200">Atenção aos Detalhes</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {savedErrorsCount} questões que você errou foram salvas no <strong>Banco de Erros</strong>. 
                Use a opção "Revisar Erros" na tela inicial para praticá-las novamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {incorrectCount === 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" />
            <div>
              <h4 className="font-bold text-green-800 dark:text-green-200">Desempenho Perfeito!</h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Parabéns! Se havia questões dessas no seu Banco de Erros, elas foram removidas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Score Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Nota Final</p>
          <div className="flex items-end space-x-2">
            <h3 className="text-4xl font-extrabold text-gray-800 dark:text-white">{Math.round((correctCount / answers.length) * 100)}%</h3>
            <span className="text-sm text-gray-400 mb-1">aproveitamento</span>
          </div>
          <Award className="absolute right-6 top-6 w-8 h-8 text-blue-500 opacity-50" />
        </div>

        {/* Correct/Total Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Acertos</p>
          <div className="flex items-end space-x-2">
            <h3 className="text-4xl font-extrabold text-green-600 dark:text-green-400">{correctCount}</h3>
            <span className="text-sm text-gray-400 mb-1">de {answers.length} questões</span>
          </div>
          <Target className="absolute right-6 top-6 w-8 h-8 text-green-500 opacity-50" />
        </div>

        {/* Time Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
           <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Tempo do Simulado</p>
          <div className="flex items-end space-x-2">
            <h3 className="text-4xl font-extrabold text-gray-800 dark:text-white">{formatDuration(totalTimeSeconds)}</h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">Média: {avgTime}s / questão</p>
          <Clock className="absolute right-6 top-6 w-8 h-8 text-purple-500 opacity-50" />
        </div>

        {/* Action Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl shadow-lg flex flex-col justify-center items-center text-center">
             <h4 className="text-white font-bold mb-3 text-sm">Pronto para o próximo?</h4>
             <button onClick={onRestart} className="w-full bg-white text-indigo-700 hover:bg-indigo-50 font-bold py-3 px-4 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5">
                Voltar ao Início
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Charts */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Visuals Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Donut Chart - Overall */}
             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
               <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 text-center">Resumo de Acertos</h3>
               <div className="h-64 w-full relative">
                 <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell key="cell-correct" fill={COLORS.correct} />
                      <Cell key="cell-incorrect" fill={COLORS.incorrect} />
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <span className="block text-3xl font-bold text-gray-800 dark:text-white">{Math.round((correctCount / answers.length) * 100)}%</span>
                  </div>
                </div>
               </div>
             </div>

             {/* Topic Performance - Horizontal Bar */}
             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center justify-center">
                  <Layers className="w-5 h-5 mr-2 text-indigo-500" />
                  Desempenho por Matéria
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topicData}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#374151" opacity={0.2} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        tick={{ fill: '#6B7280', fontSize: 11 }} 
                        interval={0}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                      <Bar dataKey="Acertos" stackId="a" fill={COLORS.correct} radius={[0, 4, 4, 0]} barSize={20} />
                      <Bar dataKey="Erros" stackId="a" fill="#E5E7EB" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>

          {/* History & Study Time Section */}
          {history.length > 0 && (
            <div className="space-y-6">
              
              {/* Lifetime Stats Banner */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold opacity-90">Total de Horas Estudadas</h3>
                  <p className="text-sm opacity-75">Somando todos os simulados realizados</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold flex items-center gap-2">
                    <Hourglass className="w-8 h-8 opacity-80" />
                    {formatDuration(totalLifetimeSeconds)}
                  </div>
                </div>
              </div>

              {/* Chart Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Evolution Line Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-6 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                    Evolução da Nota
                  </h3>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} vertical={false} />
                        <XAxis dataKey="date" stroke="#9CA3AF" tick={{fontSize: 10}} tickLine={false} axisLine={false} dy={10} />
                        <YAxis domain={[0, 100]} stroke="#9CA3AF" tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line 
                          type="monotone" 
                          dataKey="nota" 
                          name="Nota (%)"
                          stroke="#3B82F6" 
                          strokeWidth={3} 
                          dot={{r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff'}} 
                          activeDot={{r: 6}} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Study Time Area Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-6 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-purple-500" />
                    Tempo por Sessão (min)
                  </h3>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} vertical={false} />
                        <XAxis dataKey="date" stroke="#9CA3AF" tick={{fontSize: 10}} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#9CA3AF" tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="minutos" 
                          name="Minutos"
                          unit="min"
                          stroke="#8B5CF6" 
                          fillOpacity={1} 
                          fill="url(#colorTime)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Analysis */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 h-full flex flex-col">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center border-b border-gray-100 dark:border-gray-700 pb-4">
              <BookOpen className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
              Análise Estratégica
            </h3>
            
            {analysis ? (
              <div className="space-y-6 overflow-y-auto flex-1 custom-scrollbar pr-2">
                
                {/* Banca Pattern */}
                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-700/30">
                  <h4 className="font-bold text-amber-800 dark:text-amber-200 flex items-center mb-3 text-sm uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Padrão Instituto JK
                  </h4>
                  <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed whitespace-pre-wrap">
                    {analysis.bancaPattern}
                  </p>
                </div>

                {/* Recommendations */}
                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-200 dark:border-indigo-700/30">
                  <h4 className="font-bold text-indigo-800 dark:text-indigo-200 mb-3 text-sm uppercase tracking-wide">
                    Plano de Estudo
                  </h4>
                  <p className="text-sm text-indigo-900 dark:text-indigo-100 leading-relaxed whitespace-pre-wrap">
                    {analysis.recommendations}
                  </p>
                </div>

                {/* Strengths/Weaknesses */}
                <div className="grid grid-cols-1 gap-4">
                   <div>
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Pontos Fortes</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.strengths.length > 0 ? analysis.strengths.map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold border border-green-200 dark:border-green-800">
                          {s}
                        </span>
                      )) : <span className="text-sm text-gray-400 italic">Continue estudando para descobrir.</span>}
                    </div>
                   </div>

                   <div>
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Atenção (Pontos Fracos)</h4>
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
                   <p className="text-xs max-w-[200px] mx-auto">Analisando seu desempenho e comparando com o histórico da banca.</p>
                 </div>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;