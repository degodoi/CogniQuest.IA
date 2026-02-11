import React, { useState, useEffect, useRef } from 'react';
import { Question, AnswerAttempt } from '../types';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface QuizInterfaceProps {
  questions: Question[];
  onComplete: (answers: AnswerAttempt[]) => void;
}

const QuizInterface: React.FC<QuizInterfaceProps> = ({ questions, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerAttempt[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeSeconds, setTimeSeconds] = useState(0);
  
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setTimeSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex]);

  const currentQuestion = questions[currentIndex];

  const handleConfirm = () => {
    if (selectedOption === null) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = selectedOption === currentQuestion.correctIndex;
    const newAttempt: AnswerAttempt = {
      questionId: currentQuestion.id,
      selectedIndex: selectedOption,
      timeSpentSeconds: timeSeconds,
      isCorrect
    };

    setAnswers(prev => [...prev, newAttempt]);
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
      setTimeSeconds(0);
    } else {
      onComplete(answers);
    }
  };

  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-colors duration-300">
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2">
          <div 
            className="bg-blue-600 dark:bg-blue-500 h-2 transition-all duration-300" 
            style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
          />
        </div>

        <div className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Questão {currentIndex + 1} de {questions.length}
            </span>
            <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm font-mono bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full transition-colors">
              <Clock className="w-4 h-4 mr-2" />
              {Math.floor(timeSeconds / 60)}:{(timeSeconds % 60).toString().padStart(2, '0')}
            </div>
          </div>

          <div className="mb-2">
            <span className="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded mb-2 font-semibold">
              {currentQuestion.topic}
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 leading-relaxed transition-colors">
              {currentQuestion.text}
            </h2>
          </div>

          <div className="space-y-3 mt-6">
            {currentQuestion.options.map((option, idx) => {
              let optionClass = "border-2 p-4 rounded-lg cursor-pointer transition-all flex items-center ";
              
              if (showExplanation) {
                if (idx === currentQuestion.correctIndex) {
                  optionClass += "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-300";
                } else if (idx === selectedOption) {
                  optionClass += "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-300";
                } else {
                  optionClass += "border-gray-200 dark:border-gray-700 opacity-50 dark:text-gray-400";
                }
              } else {
                if (selectedOption === idx) {
                  optionClass += "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500 text-gray-900 dark:text-white";
                } else {
                  optionClass += "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-800 dark:text-gray-200";
                }
              }

              return (
                <div 
                  key={idx} 
                  onClick={() => !showExplanation && setSelectedOption(idx)}
                  className={optionClass}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 flex-shrink-0 ${
                    showExplanation && idx === currentQuestion.correctIndex ? 'border-green-500 bg-green-500 text-white' :
                    showExplanation && idx === selectedOption ? 'border-red-500 bg-red-500 text-white' :
                    selectedOption === idx ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 dark:border-gray-500'
                  }`}>
                    {showExplanation && idx === currentQuestion.correctIndex && <CheckCircle className="w-4 h-4" />}
                    {showExplanation && idx === selectedOption && idx !== currentQuestion.correctIndex && <XCircle className="w-4 h-4" />}
                    {!showExplanation && selectedOption === idx && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="text-base">{option}</span>
                </div>
              );
            })}
          </div>

          {showExplanation && (
            <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 animate-fade-in transition-colors">
              <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3 flex items-center">
                 <div className="bg-blue-200 dark:bg-blue-800 rounded-full p-1 mr-2">
                    <CheckCircle className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                 </div>
                 Explicação do Professor:
              </h3>
              <p className="text-blue-900 dark:text-blue-100 text-base leading-relaxed whitespace-pre-wrap font-medium">
                {currentQuestion.explanation}
              </p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end transition-colors">
          {!showExplanation ? (
            <button
              onClick={handleConfirm}
              disabled={selectedOption === null}
              className={`px-8 py-3 rounded-lg font-bold text-white transition-all transform ${
                selectedOption === null 
                  ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 shadow-md hover:shadow-lg dark:bg-blue-600 dark:hover:bg-blue-500'
              }`}
            >
              Responder
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-8 py-3 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 dark:bg-green-600 dark:hover:bg-green-500"
            >
              {isLastQuestion ? 'Finalizar Simulado' : 'Próxima Questão'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizInterface;