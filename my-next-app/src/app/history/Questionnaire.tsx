"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {ResponseData} from '@/app/history/page'

const useRouter = () => {
    return {
        push: (url: string) => {
            if (typeof window !== 'undefined') {
                window.location.href = url;
            }
        },
    };
};


// ----------------------------------------------------
// 定义指標解釋映射表
// ----------------------------------------------------
const CATEGORY_MAP: Record<string, string> = {
    "ACCURACY": "一、準確性（Accuracy）：AI判斷的結果與真實情況相近程度",
    "RELIABILITY": "二、可靠性（Reliability)：AI 模型在面對不同類型的干擾或異常情況時，敏感度適中，不會過度敏感導致表現不穩定",
    "SAFETY": "三、安全性（Safety）：AI系統若出錯，不會對周遭環境、利害關係人（例如使用者與民眾）造成不利的影響或傷害",
    "RESILIENCE": "四、韌性(Resilience)：AI 系統與相關設備能夠適應不同的環境、需求及條件，靈活調整與擴展，以滿足不斷變化的需求和挑戰",
    "TRANSPARENCY": "五、透明性(Transparency)：AI 系統使用者可以追溯AI 在做判斷或決策時，所使用的資料、演算法或規則",
    "ACCOUNTABILITY": "六、當責性(Accountability)：當AI系統導致非預期的負面影響時，要有監督機制或該負責的單位或人",
    "EXPLAINABILITY": "七、可解釋性(Explanability)：AI 的決策邏輯（即資料輸入與決策結果之間的因果關係）可以被清楚描述與呈現，讓使用者與利害關係者更了解AI的決策理由",
    "AUTONOMY": "八、自主性(Autonomy)：AI系統使用者與AI的互動過程中，能保持充分的自主性，不過度依賴AI的判斷或決策",
    "PRIVACY": "九、隱私(Privacy)：在使用AI系統時，不會侵犯到個人隱私",
    "FAIRNESS": "十、公平性(Fairness)：AI系統在做判斷或決策時，能平等對待不同群體，避免不公正的情況",
    "SECURITY": "十一、資訊安全性(Security)：防止外部環境對AI模型的侵入和損害，以保護訓練與測試過程中的資料安全",
};

// ----------------------------------------------------
// 後端回傳資料結構定義
// ----------------------------------------------------
interface Option {
  id: number;
  text: string;
  value: number;
  order: number;
}

interface Question {
  id: number;
  text: string;
  category: string;
  order: number;
  type: 'SCALE' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT'; 
  required: boolean;
  options?: Option[]; 
}

interface PageData {
  pageTitle: string;
  questions: Question[];
}

export interface QuestionnaireData {
  id: number;
  title: string;
  description: string | null;
  questions: Question[];
  group: {
    id: number;
    name: string;
  }
}

type AnswerValue = {
  score?: number; 
  optionIds?: number[]; 
  textValue?: string; 
};

// ----------------------------------------------------
// Loading UI - 提交按鈕上的指示器
// ----------------------------------------------------
const SubmissionLoadingIndicator: React.FC = () => (
    <div className="flex items-center justify-center space-x-2">
        <span className="font-bold">提交中</span>
        {/* Animated Dots using Tailwind's built-in animate-pulse */}
        <div className="flex items-end h-4 pb-0.5">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
    </div>
);

// ----------------------------------------------------
// 根據 Type 渲染不同 UI
// ----------------------------------------------------

interface QuestionRendererProps {
    question: Question;
    currentAnswer: AnswerValue;
    onAnswer: (answer: AnswerValue) => void;
}

// 1. SCALE 題型
const ScaleQuestion: React.FC<QuestionRendererProps> = ({ question, currentAnswer, onAnswer }) => {
  // 假設選項已經按 order 排序 + options 存在
  const options = question.options || [];
  const selectedOptionId = currentAnswer.optionIds?.[1];
  //console.log(`${options[0].id}, ${currentAnswer.optionIds[1]}`)

  return (
    <div className="flex justify-center space-x-2 sm:space-x-4">
      {options.map((opt) => {
        const displayScore = opt.order; 
        
        return (
          <button
            key={opt.id}
            onClick={() => 
              onAnswer({ optionIds: [opt.id], score: opt.value }) 
            }
            className={`
              w-10 h-10 sm:w-12 sm:h-12 rounded-full font-bold transition-all duration-200
              ${selectedOptionId === opt.id 
                ? 'bg-indigo-500 text-white shadow-lg ring-3 ring-indigo-300'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-indigo-100'
              }
            `}
          >
            {displayScore}
          </button>
        );
      })}
    </div>
  );
};

// 2. SINGLE_CHOICE 題型
const SingleChoiceQuestion: React.FC<QuestionRendererProps> = ({ question, currentAnswer, onAnswer }) => {
    const options = question.options || [];
    const selectedOptionId = currentAnswer.optionIds?.[0];

    return (
        <div className="flex space-x-6">
            {options.map(opt => (
                <button
                    key={opt.id}
                    onClick={() => onAnswer({ optionIds: [opt.id], score: opt.value })}
                    className={`py-2 px-6 rounded-lg font-medium transition duration-150 border
                        ${selectedOptionId === opt.id
                            ? 'bg-indigo-500 text-white shadow-md border-indigo-700 ring-3 ring-indigo-300'
                            : 'bg-white text-gray-800 hover:bg-indigo-50'
                        }`}
                >
                    {opt.text}
                </button>
            ))}
        </div>
    );
};

// 3. MULTIPLE_CHOICE 題型
const MultipleChoiceQuestion: React.FC<QuestionRendererProps> = ({ question, currentAnswer, onAnswer }) => {
    const options = question.options || [];
    const selectedOptionIds = currentAnswer.optionIds || [];

    const handleOptionClick = (optionId: number) => {
        let newSelectedOptionIds;
        if (selectedOptionIds.includes(optionId)) {
            // 如果已經選中，則取消選中
            newSelectedOptionIds = selectedOptionIds.filter(id => id !== optionId);
        } else {
            // 如果未選中，則選中
            newSelectedOptionIds = [...selectedOptionIds, optionId];
        }

        const newScore = options
            .filter(opt => newSelectedOptionIds.includes(opt.id))
            .reduce((sum, opt) => {
                const optionValue = Number(opt.value);
                return sum + optionValue;
            }, 0); // Initiate number = 0
        onAnswer({ optionIds: newSelectedOptionIds, score: newScore });
    };

    return (
        <div className="flex flex-wrap gap-3">
            {options.map(opt => (
                <button
                    key={opt.id}
                    onClick={() => handleOptionClick(opt.id)}
                    className={`
                        py-2 px-4 rounded-lg font-medium transition duration-150 border
                        ${selectedOptionIds.includes(opt.id)
                            ? 'bg-indigo-500 text-white shadow-md border-indigo-600' 
                            : 'bg-white text-gray-800 hover:bg-indigo-50 border-gray-300' 
                        }
                    `}
                >
                    {opt.text}
                </button>
            ))}
        </div>
    );
};

// 4. TEXT 題型
const TextQuestion: React.FC<QuestionRendererProps> = ({ question, currentAnswer, onAnswer }) => {
    const textValue = currentAnswer.textValue || '';
    
    return (
        <textarea
            rows={3}
            value={textValue}
            onChange={(e) => onAnswer({ textValue: e.target.value })}
            placeholder="請在此輸入您的回答..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none text-gray-700 
                       focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
        />
    );
};


// ----------------------------------------------------
// 問題渲染器：根據 type 選擇組件
// ----------------------------------------------------
const QuestionRenderer: React.FC<QuestionRendererProps> = (props) => {
  switch (props.question.type) {
    case 'SCALE':
        return <ScaleQuestion {...props} />;
    case 'SINGLE_CHOICE':
        return <SingleChoiceQuestion {...props} />;
    case 'MULTIPLE_CHOICE':
        return <MultipleChoiceQuestion {...props} />; // Placeholder
    case 'TEXT':
        return <TextQuestion {...props} />;
    default:
        return <p className="text-red-500">未知問題類型: {props.question.type}</p>;
  }
};


// ----------------------------------------------------
// 問卷內容主組件
// ----------------------------------------------------

export default function ResponseViewer({ data }: { data:{response: ResponseData, questionnaire: QuestionnaireData}}) {
  const q = data.questionnaire
  const r = data.response
  const answers: Record<number, AnswerValue> = r.answers.reduce((acc, data)=>{
    let opts = [data.optionId]
    if(data.question.type === 'SCALE'){
      
      const os = q.questions.find((q)=>q.id===data.questionId)?.options?.find((o)=>{
        //console.log(`${o.value}, ${data.value}`)
        return o.value === data.value
      })?.id
      if(os) opts = [...opts, os]
      console.log(`SCALE: ${os}`)
    }
    if(acc[data.questionId] && acc[data.questionId].optionIds){
      const tmp = acc[data.questionId].optionIds as number[]
      opts = [...opts, ...tmp]
    }
    const a : AnswerValue = {
      score: data.value,
      optionIds: opts,
      textValue: data.textValue
    }
    acc[data.questionId] = a
    return acc},  
    {} as Record<number, AnswerValue>
  )

  const handleAnswer = (questionId: number, answerValue: AnswerValue) => {

  }

  // 12. 正常問卷內容渲染!!!
  return (
    <div className="size-full bg-white p-8 overflow-y-scroll">
      {/* 問卷題目 titleA */}
      <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-4">
        {q.title}
      </h1>

      {/* 问卷描述 description */}
      {q.description && (
        <p className="text-center text-gray-500 mb-8">{q.description}</p>
      )}

      {/* 當期分頁內容 */}
      <div>
        <div className="space-y-6">
          {q.questions.map((question) => (
            <div key={question.id} className="p-4 border rounded-lg bg-gray-50">
              <p className="font-semibold text-gray-700 mb-3">
                {question.text} 
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </p>
              
              {/* 根據 type 渲染不同 UI */}
              <div className="flex justify-center sm:justify-start">
                <QuestionRenderer
                  question={question}
                  currentAnswer={answers[question.id] || {}}
                  onAnswer={(answer) => handleAnswer(question.id, answer)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}