"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponseMeta, 
  ResponseData
} from "@/services/responseService";

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
const CATEGORY_MAP: Record<string, {title:string, content:string}> = {
  "ACCURACY": {title:"準確性", content:"AI判斷的結果與真實情況相近程度"},
  "RELIABILITY": {title:"可靠性", content:"AI 模型在面對不同類型的干擾或異常情況時，敏感度適中，不會過度敏感導致表現不穩定"},
  "SAFETY": {title:"安全性", content:"不會對周遭環境、利害關係人（例如使用者與民眾）造成不利的影響或傷害"},
  "RESILIENCE": {title:"韌性", content:"AI 系統與相關設備能夠適應不同的環境、需求及條件，靈活調整與擴展，以滿足不斷變化的需求和挑戰"},
  "TRANSPARENCY": {title:"透明性", content:"AI 系統使用者可以追溯AI 在做判斷或決策時，所使用的資料、演算法或規則"},
  "ACCOUNTABILITY": {title:"當責性", content:"當AI系統導致非預期的負面影響時，要有監督機制或該負責的單位或人"},
  "EXPLAINABILITY": {title:"可解釋性", content:"AI 的決策邏輯（即資料輸入與決策結果之間的因果關係）可以被清楚描述與呈現，讓使用者與利害關係者更了解AI的決策理由"},
  "AUTONOMY": {title:"自主性", content:"AI系統使用者與AI的互動過程中，能保持充分的自主性，不過度依賴AI的判斷或決策"},
  "PRIVACY": {title:"隱私", content:"在使用AI系統時，不會侵犯到個人隱私"},
  "FAIRNESS": {title:"公平性", content:"AI系統在做判斷或決策時，能平等對待不同群體，避免不公正的情況"},
  "SECURITY": {title:"資訊安全性", content:"防止外部環境對AI模型的侵入和損害，以保護訓練與測試過程中的資料安全"},
  "UNKNOWN": {title:"未知分類", content:"{{category}}"}
}

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

export const styleSelected   = 'bg-indigo-500 text-white border border-transparent hover:bg-[#5C5BED] hover:shadow hover:shadow-[0_0_8px_rgba(120,120,120,0.5)]' 
export const styleUnselected = 'bg-white text-gray-700 border border-gray-300 hover:border-blue-200 hover:shadow-[0_0_8px_rgba(159,168,218,0.5)]'

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
  const selectedOptionId = currentAnswer.optionIds?.[0];
  //console.log(`${options[0].id}, ${currentAnswer.optionIds[1]}`)

  return (
    <div className="flex justify-center space-x-2 sm:space-x-4">
      {options.map((opt) => {
        const displayScore = opt.value; 
        
        return (
          <button
            key={opt.id}
            onClick={() => 
              onAnswer({ optionIds: [opt.id], score: opt.value }) 
            }
            className={`
              w-10 h-10 sm:w-12 sm:h-12 rounded-full font-bold cursor-pointer 
              ${selectedOptionId === opt.id ? styleSelected: styleUnselected
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

const gridColNum = [
  "grid-cols-0",
  "grid-cols-1",
  "grid-cols-2",
  "grid-cols-3",
]

// 2. SINGLE_CHOICE 題型
const SingleChoiceQuestion: React.FC<QuestionRendererProps> = ({ question, currentAnswer, onAnswer }) => {
  const options = question.options || [];
  const selectedOptionId = currentAnswer.optionIds?.[0];

  //console.log("option length", options.length)

  return (
    <div className={`gap-3 w-full sm:w-fit grid ${options.length >= 4 ? " grid-cols-2" :`${gridColNum[options.length]}`} `}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onAnswer({ optionIds: [opt.id], score: opt.value })}
          className={`
            py-2 px-2 max-w-[300px] rounded-lg
            font-medium cursor-pointer 

            sm:px-4
            sm:min-w-[80px]
            ${selectedOptionId === opt.id? styleSelected: styleUnselected}`}
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
    <div className={`gap-3 w-full grid sm:w-fit ${options.length >= 4 ? "grid-cols-2 " : `${gridColNum[options.length]}`}`}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => handleOptionClick(opt.id)}
          className={`
            py-2 px-2 max-w-[300px] rounded-lg
            font-medium cursor-pointer 

            sm:px-4
            sm:min-w-[80px]
            ${selectedOptionIds.includes(opt.id)? styleSelected: styleUnselected 
          }`}
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
        className="
          w-full p-3
          rounded-lg resize-none
          border border-gray-300 text-gray-700 bg-[#fcfcfc]
          focus:outline-none 
          focus:ring-1 focus:ring-indigo-300 focus:bg-white"
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

   // 1. 根據指標映射表獲取分頁標題
  const getPageTitle = (category: string): string => CATEGORY_MAP[category.toUpperCase()].title || category
  const getPageContent = (category: string): string => CATEGORY_MAP[category.toUpperCase()].content || ""

  const p = (()=>{
    // group by category
    const grouped = q.questions.reduce((acc, question) => {
      const category = question.category
      if (!acc[category]) {
        acc[category] = {
          category: category,
          pageTitle: category,
          questions: []
        }
      }
      acc[category].questions.push(question);
      return acc
    }, {} as Record<string, { category: string, pageTitle: string, questions: Question[]}>)

    // sort by category, question order
    return Object.values(grouped)
      .sort((a, b) => {
        const keys = Object.keys(CATEGORY_MAP)
        const indexA = keys.indexOf(a.category.toUpperCase())
        const indexB = keys.indexOf(b.category.toUpperCase())
        if (indexA !== -1 && indexB !== -1)
          return indexA - indexB
        return 0
      })
      .map(page => ({
        title: getPageTitle(page.pageTitle),
        content: getPageContent(page.pageTitle),
        questions: page.questions.sort((a, b) => a.order - b.order)
      })
    )
  })()

  // original answer
  const answers: Record<number, AnswerValue> = r.answers.reduce((acc, data)=>{
    let opts = [data.optionId]
    if(data.question.type === 'SCALE'){
      
      const os = q.questions.find((q)=>q.id===data.questionId)?.options?.find((o)=>{
        //console.log(`${o.value}, ${data.value}`)
        return o.value === data.value
      })?.id
      if(os) opts = [os]
      //console.log(`SCALE: ${os}`)
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

  // edited answer
  const [a, setA] = useState<Record<number, AnswerValue>>(answers)

  const handleAnswer = (questionId: number, answerValue: AnswerValue) => {
    setA(prev => ({
        ...prev,
        [questionId]: answerValue,
    }));
  }

  return (
    <div className="size-full bg-white px-6 pt-13 pb-20 overflow-y-scroll">
      {/* 問卷題目 titleA */}
      <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-4">
        {q.title}
      </h1>

      {/* 问卷描述 description */}
      {q.description && (
        <p className="text-center text-gray-500 mb-8">{q.description}</p>
      )}

      {/* 當期分頁內容 */}
      {
        p.map(page=>{
          return (
            <div key={p.indexOf(page)}>
              <div className='
                flex mt-7 mb-5
              '>
                <div className='
                  flex justify-around w-[8px] ml-3 mr-2 bg-indigo-400 text-transparent select-none
                '>.</div>
                <div className='
                  flex flex-col items-start justify-center gap-0.5
                '>
                  <div className="text-2xl font-bold text-gray-700 text-start">
                      {page.title}
                  </div>
                  <div className="text-md text-gray-500 text-start">
                      {page.content}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {page.questions.map((question) => (
                  <div key={question.id} className="p-4 rounded-lg bg-white shadow-[inset_0_0_5px_rgba(0,0,0,0.15)]">
                    <div className="font-semibold text-gray-700 mb-3">
                      {question.text} 
                      {question.required && <span className="
                        relative inline-flex justify-center items-center w-fit
                        text-red-500 px-2 select-none overflow-hidden
                        hover:overflow-visible">
                          *
                          <div className='
                            absolute -right-[180%] w-fit px-1.5 py-1
                            text-center font-bold text-xs text-white whitespace-nowrap
                            bg-red-400 rounded-full shadow shadow-gray-500'>
                            必填
                          </div>
                        </span>}
                    </div>
                    
                    {/* 根據 type 渲染不同 UI */}
                    <div className="flex justify-start">
                      <QuestionRenderer
                        question={question}
                        currentAnswer={a[question.id] || {}}
                        onAnswer={(answer) => handleAnswer(question.id, answer)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      }
    </div>
  )
}