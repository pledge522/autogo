"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

interface QuestionOption {
  label: string;
  description?: string;
  preview?: string;
}

interface QuestionItem {
  question: string;
  header: string;
  options: QuestionOption[];
  multiple?: boolean;
}

interface QuestionMessageProps {
  questions: QuestionItem[];
  onSubmitAnswer?: (answers: Record<string, string>) => void;
}

export function QuestionMessage({ questions, onSubmitAnswer }: QuestionMessageProps) {
  // 每个问题的选中状态
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | string[]>>({});

  const handleSelect = (question: string, answer: string, multiple: boolean | undefined) => {
    if (multiple) {
      setSelectedAnswers((prev) => {
        const current = prev[question] as string[] | undefined;
        if (!current) {
          return { ...prev, [question]: [answer] };
        }
        if (current.includes(answer)) {
          // 取消选择
          return { ...prev, [question]: current.filter((a) => a !== answer) };
        }
        return { ...prev, [question]: [...current, answer] };
      });
    } else {
      setSelectedAnswers((prev) => ({ ...prev, [question]: answer }));
    }
  };

  const handleSubmit = () => {
    // 将答案转换为 Record<string, string> 格式
    const answers: Record<string, string> = {};
    Object.entries(selectedAnswers).forEach(([question, answer]) => {
      answers[question] = Array.isArray(answer) ? answer.join(", ") : answer;
    });
    onSubmitAnswer?.(answers);
  };

  const allAnswered = questions.every((q) => {
    const answer = selectedAnswers[q.question];
    return answer && (Array.isArray(answer) ? answer.length > 0 : true);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 py-2"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
        <MessageSquare size={14} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-amber-700 mb-2">AI 需要你确认</p>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl rounded-tl-none px-4 py-3 border border-amber-200">
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    {q.header}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800">{q.question}</p>
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = Array.isArray(selectedAnswers[q.question])
                      ? (selectedAnswers[q.question] as string[]).includes(opt.label)
                      : selectedAnswers[q.question] === opt.label;

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelect(q.question, opt.label, q.multiple)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                          isSelected
                            ? "bg-amber-100 border-amber-400 shadow-sm shadow-amber-400/20"
                            : "bg-white border-gray-200 hover:border-amber-300 hover:bg-amber-50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 ${
                            q.multiple ? "rounded-md" : ""
                          } ${
                            isSelected
                              ? "border-amber-500 bg-amber-500"
                              : "border-gray-300"
                          }`}>
                            {isSelected && (
                              <svg className="w-full h-full text-white p-0.5" viewBox="0 0 24 24" fill="none">
                                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                            {opt.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-amber-200">
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                allAnswered
                  ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/20"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              确认并继续
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
