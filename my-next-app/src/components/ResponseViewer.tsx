"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  ResponseData,
  ViewerState,
  updateResponse,
  generateReport
} from "@/services/responseService";
import { LoadingComponent } from '@/components/LoadingComponent';
import { ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next';

// ----------------------------------------------------
// 暫存結構：中文原文 & 英文翻譯
// ----------------------------------------------------
const translationCache: {
    zh: Record<string, string>;
    en: Record<string, string>;
} = {
    zh: {},
    en: {},
};

// ----------------------------------------------------
// 翻譯工具函式 (支援 AbortController)
// ----------------------------------------------------
const capitalizeFirstLetter = (text: string) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const translateText = async (
    text: string,
    source = "zh-CN",
    target = "en",
    signal?: AbortSignal
) => {
    try {
        const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q: text, source, target }),
            signal,
        });

        const data = await res.json();
        return data.translatedText;
    } catch (err: any) {
        if (err.name === "AbortError") {
            console.log("翻譯請求已中斷");
            return null; // ✅ 回傳 null，表示翻譯未完成
        }
        console.error("翻譯失敗:", err);
        return null;
    }
};

// ----------------------------------------------------
// TranslatedText Component with cache + AbortController
// ----------------------------------------------------
/*const TranslatedText: React.FC<{ text: string; capitalize?: boolean }> = ({
    text,
    capitalize = false,
}) => {
    const { i18n } = useTranslation();
    const [translated, setTranslated] = useState(text);

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        if (!translationCache.zh[text]) {
            translationCache.zh[text] = text;
        }

        if (i18n.language.startsWith("en")) {
            if (translationCache.en[text]) {
                setTranslated(
                    capitalize ? capitalizeFirstLetter(translationCache.en[text]) : translationCache.en[text]
                );
            } else {
                translateText(text, "zh-CN", "en", signal).then((result) => {
                    if (result) {
                        translationCache.en[text] = result;
                        setTranslated(capitalize ? capitalizeFirstLetter(result) : result);
                    } else {
                        // ✅ 沒翻譯成功 → 顯示中文，並保留機會下次再翻譯
                        setTranslated(translationCache.zh[text]);
                    }
                });
            }
        } else {
            setTranslated(translationCache.zh[text]);
        }

        return () => controller.abort();
    }, [text, i18n.language, capitalize]);

    return <>{translated}</>;
};*/


// ----------------------------------------------------
// 定义指標解釋映射表
// ----------------------------------------------------
export const CATEGORY_MAP: Record<
  string,
  Record<string, { title: string; content: string }>
> = {
  ACCURACY: {
    "zh": {
      title: "準確性",
      content: "AI判斷的結果與真實情況相近程度"
    },
    en: {
      title: "Accuracy",
      content: "How closely the AI's output matches the real-world situation."
    }
  },
  RELIABILITY: {
    "zh": {
      title: "可靠性",
      content: "AI 模型在面對不同類型的干擾或異常情況時，敏感度適中，不會過度敏感導致表現不穩定"
    },
    en: {
      title: "Reliability",
      content:
        "The AI model maintains stable performance without being overly sensitive to various disturbances or abnormal conditions."
    }
  },
  SAFETY: {
    "zh": {
      title: "安全性",
      content: "不會對周遭環境、利害關係人（例如使用者與民眾）造成不利的影響或傷害"
    },
    en: {
      title: "Safety",
      content:
        "Ensures that the AI does not cause harm or negative impact to the environment or stakeholders such as users and the public."
    }
  },
  RESILIENCE: {
    "zh": {
      title: "韌性",
      content:
        "AI 系統與相關設備能夠適應不同的環境、需求及條件，靈活調整與擴展，以滿足不斷變化的需求和挑戰"
    },
    en: {
      title: "Resilience",
      content:
        "The AI system and related equipment can adapt to different environments, demands, and conditions, adjusting flexibly to meet evolving challenges."
    }
  },
  TRANSPARENCY: {
    "zh": {
      title: "透明性",
      content:
        "AI 系統使用者可以追溯AI 在做判斷或決策時，所使用的資料、演算法或規則"
    },
    en: {
      title: "Transparency",
      content:
        "Users can trace the data, algorithms, or rules the AI used when making judgments or decisions."
    }
  },
  ACCOUNTABILITY: {
    "zh": {
      title: "當責性",
      content:
        "當AI系統導致非預期的負面影響時，要有監督機制或該負責的單位或人"
    },
    en: {
      title: "Accountability",
      content:
        "Mechanisms must exist to oversee and assign responsibility when an AI system causes unintended negative impacts."
    }
  },
  EXPLAINABILITY: {
    "zh": {
      title: "可解釋性",
      content:
        "AI 的決策邏輯（即資料輸入與決策結果之間的因果關係）可以被清楚描述與呈現，讓使用者與利害關係者更了解AI的決策理由"
    },
    en: {
      title: "Explainability",
      content:
        "The AI's decision logic (the causal relationship between input data and outputs) can be clearly described and presented to help users and stakeholders understand the reasoning."
    }
  },
  AUTONOMY: {
    "zh": {
      title: "自主性",
      content:
        "AI系統使用者與AI的互動過程中，能保持充分的自主性，不過度依賴AI的判斷或決策"
    },
    en: {
      title: "Autonomy",
      content:
        "Users of the AI system can maintain autonomy and avoid excessive reliance on AI decisions during interactions."
    }
  },
  PRIVACY: {
    "zh": {
      title: "隱私",
      content: "在使用AI系統時，不會侵犯到個人隱私"
    },
    en: {
      title: "Privacy",
      content: "Ensures that the use of AI systems does not infringe on personal privacy."
    }
  },
  FAIRNESS: {
    "zh": {
      title: "公平性",
      content: "AI系統在做判斷或決策時，能平等對待不同群體，避免不公正的情況"
    },
    en: {
      title: "Fairness",
      content:
        "The AI system treats different groups equally when making decisions, avoiding discrimination or unfair outcomes."
    }
  },
  SECURITY: {
    "zh": {
      title: "資訊安全性",
      content:
        "防止外部環境對AI模型的侵入和損害，以保護訓練與測試過程中的資料安全"
    },
    en: {
      title: "Security",
      content:
        "Protects the AI model from external intrusion or damage, ensuring the security of data used during training and testing."
    }
  },
  UNKNOWN: {
    "zh": {
      title: "未知分類",
      content: "{{category}}"
    },
    en: {
      title: "Unknown Category",
      content: "{{category}}"
    }
  }
};
/*
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
}*/

// ----------------------------------------------------
// 後端回傳資料結構定義
// ----------------------------------------------------
export interface Option {
  id: number;
  text: string;
  value: number;
  order: number;
}

export interface Question {
  id: number;
  text: string;
  category: string;
  description: string;
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
  optionIds?: Set<number>; 
  textValue?: string; 
};

export const editableSelected   = "cursor-pointer hover:bg-[#5C5BED] hover:shadow hover:shadow-[0_0_8px_rgba(120,120,120,0.5)]"
export const editableUnselected = "cursor-pointer hover:border-blue-200 hover:shadow-[0_0_8px_rgba(159,168,218,0.5)]"
export const styleSelected   = 'bg-indigo-500 text-white border border-transparent ' 
export const styleUnselected = 'bg-white text-gray-700 border border-gray-300 '

// ----------------------------------------------------
// Loading UI - 提交按鈕上的指示器
// ----------------------------------------------------
const SubmissionLoadingIndicator: React.FC = () => {
  const { t } = useTranslation()
  return(
    <div className="flex items-center justify-center space-x-2">
      <span className="font-bold">{t('Questionnaire.submitting')}</span>
      {/* Animated Dots using Tailwind's built-in animate-pulse */}
      <div className="flex items-end h-4 pb-0.5">
        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  )
}

// ----------------------------------------------------
// 根據 Type 渲染不同 UI
// ----------------------------------------------------

interface QuestionRendererProps {
  editable: boolean,
  question: Question;
  currentAnswer: AnswerValue;
  onAnswer: (answer: AnswerValue) => void;
}

const gridColNum = [
  "grid-cols-0",
  "grid-cols-1",
  "grid-cols-2",
  "grid-cols-3",
]

// SCALE qustion
const ScaleQuestion: React.FC<QuestionRendererProps> = ({ editable, question, currentAnswer, onAnswer }) => {
  // 假設選項已經按 order 排序 + options 存在
  if(!currentAnswer.optionIds) return

  const options = question.options || []
  options.sort((a, b) => a.id - b.id)
  const selectedOptionId = [...currentAnswer.optionIds][0]
  //console.log(`${options[0].id}, ${currentAnswer.optionIds[1]}`)

  return (
    <div className="flex justify-center space-x-2 sm:space-x-4">
      {options.map((opt) => {
        const displayScore = opt.value; 
        
        return (
          <button
            key={opt.id}
            onClick={() => 
              onAnswer({
                score: opt.value,
                optionIds: new Set<number>().add(opt.id),
                textValue: ''
              }) 
            }
            className={`
              w-10 h-10 sm:w-12 sm:h-12 rounded-full font-bold  
              ${editable ? (selectedOptionId === opt.id ? editableSelected : editableUnselected): ""}
              ${selectedOptionId === opt.id ? styleSelected: styleUnselected}
            `}
          >
            {displayScore}
          </button>
        );
      })}
    </div>
  );
};

// SINGLE_CHOICE qustion
const SingleChoiceQuestion: React.FC<QuestionRendererProps> = ({ editable, question, currentAnswer, onAnswer }) => {
  if(!currentAnswer.optionIds) return

  const options = question.options || [];
  options.sort((a, b) => a.id - b.id)
  const selectedOptionId = [...currentAnswer.optionIds][0]
  // console.log(`${question.text}, ${options[0].id}: ${options[0].text}: ${options[1].id}: ${options[1].text}, ${options[2].id}: ${options[2].text}`)

  return (
    <div className={`gap-3 w-full sm:w-fit grid ${options.length >= 4 ? " grid-cols-2" :`${gridColNum[options.length]}`} `}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onAnswer({
            score: opt.value,
            optionIds: new Set<number>().add(opt.id),
            textValue: ''
          })}
          className={`
            py-2 px-2 max-w-[300px] rounded-lg
            font-medium

            sm:px-4
            sm:min-w-20
            ${editable ? (selectedOptionId === opt.id ? editableSelected : editableUnselected): ""}
            ${selectedOptionId === opt.id? styleSelected: styleUnselected}`}
        >
          {opt.text}
        </button>
      ))}
    </div>
  );
};

// MULTIPLE_CHOICE qustion
const MultipleChoiceQuestion: React.FC<QuestionRendererProps> = ({ editable, question, currentAnswer, onAnswer }) => {
  if(!currentAnswer.optionIds) return
  
  const options = question.options || [];
  options.sort((a, b) => a.id - b.id)
  const selectedOptionIds = [...currentAnswer.optionIds]

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
    onAnswer({
      score: newScore,
      optionIds: new Set<number>(newSelectedOptionIds),
      textValue: ''
    });
  };

  return (
    <div className={`gap-3 w-full grid sm:w-fit ${options.length >= 4 ? "grid-cols-2 " : `${gridColNum[options.length]}`}`}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => handleOptionClick(opt.id)}
          className={`
            py-2 px-2 max-w-[300px] rounded-lg
            font-medium

            sm:px-4
            sm:min-w-20

            ${editable ? (selectedOptionIds.includes(opt.id) ? editableSelected : editableUnselected): ""}
            ${selectedOptionIds.includes(opt.id)? styleSelected: styleUnselected 
          }`}
          >
            {opt.text}
        </button>
      ))}
    </div>
  );
};

// TEXT qustion
const TextQuestion: React.FC<QuestionRendererProps> = ({ editable, question, currentAnswer, onAnswer }) => {
  const textValue = currentAnswer.textValue || '';
  console.log(question)
  
  return (
    <textarea
      rows={3}
      value={textValue}
      onChange={(e) => onAnswer({ textValue: e.target.value })}
      placeholder="請在此輸入您的回答..."
      className={`
        w-full p-3
        rounded-lg resize-none
        border border-gray-300 text-gray-700 bg-[#fcfcfc]

        ${editable? "focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:bg-white": ""}`}
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

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const val of a) {
      if (!b.has(val)) return false;
    }
    return true;
  }

  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, val] of a) {
      if (!b.has(key)) return false;
      if (!deepEqual(val, b.get(key))) return false;
    }
    return true;
  }

  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

// ----------------------------------------------------
// 問卷內容主組件
// ----------------------------------------------------

export default function ResponseViewer({curState, data, onEdit, onReport, notify }: { 
  curState: ViewerState,
  data:{response: ResponseData, questionnaire: QuestionnaireData},
  onEdit: ()=>void,
  onReport: ()=>void,
  notify: (text:string, type:string)=>void,
}) {
  const { i18n, t } = useTranslation()
  
  const q = data.questionnaire
  const r = data.response
  const qs = q.questions.reduce<Record<number, Question>>(
    (acc, value) => {
      acc[value.id] = value
      return acc
    }, {}
  )

  const [translating, setTranslating] = useState(false)
  const [editable, setEditable] = useState(false)
  useEffect(()=>{
    setEditable((curState & ViewerState.editing) !== 0)
    setTranslating((curState & ViewerState.translating) !== 0)
  }, [curState])

  const viewerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [curPage, setCurPage] = useState(0);

  // expand / collapse state
  // key is question id
  const [isExpanded, SetIsExpanded] = useState<Record<number, boolean>>({})

  const [isUpdate, SetIsUpdate] = useState(false)
  const [isComplete, SetIsComplete] = useState(true)

  const scrollToWithOffset = (element: HTMLElement, offset: number) => {
    const viewer = viewerRef.current
    if (!viewer || !element) return

    const y = element.offsetTop - viewer.offsetTop + offset

    //console.log("scrolling")
    viewer.scrollTo({
      top: y,
      behavior: "smooth",
    })
  }
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"))
            setCurPage(index)
          }
        })
      },
      {
        root: viewerRef.current || null,
        threshold: 0.5,
      }
    )

    sectionRefs.current.forEach((el) => el && observer.observe(el))

    return () => observer.disconnect()
  }, [])

  // map to corresponding title and content
  const getPageTitle = (category: string): string => CATEGORY_MAP[category.toUpperCase()][i18n.language].title || category
  const getPageContent = (category: string): string => CATEGORY_MAP[category.toUpperCase()][i18n.language].content || ""

  // build each page
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

  const [editQ, setEditQ] = useState<Record<number, boolean>>({})
  const [doneQ, setDoneQ] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const newQ = data.questionnaire
    // console.log(newQ.questions)

    newQ.questions.forEach((question) => {
      if(!(question.id in isExpanded)
        && question.description
        && question.description.length > 0
      ){
        SetIsExpanded(prev=>{
          const p = {...prev}
          p[question.id] = false
          return p
        })
      }
      if(!(question.id in editQ)){
        setEditQ(prev=>{
          const p = {...prev}
          p[question.id] = false
          return p
        })
      }
      if(!(question.id in doneQ)){
        setDoneQ(prev=>{
          const p = {...prev}
          p[question.id] = true
          return p
        })
      }
    })
  }, [data])

  // original answer
  // reminder: key is questionId
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>(
    r.answers.reduce<Record<number, AnswerValue>>((acc, data)=>{
      let opt = -1
      if(data.question.type === 'SCALE'){
        const os = q.questions.find((q)=>q.id===data.questionId)?.options?.find((o)=>{
          return o.value === data.value
        })?.id
        if(os) opt = os
      } else {
        opt = data.optionId
      }
      if(acc[data.questionId]){
        // multi choice
        acc[data.questionId].optionIds?.add(opt)
      } else {
        const a : AnswerValue = {
          score: data.value,
          optionIds: new Set<number>().add(opt),
          textValue: data.textValue || ''
        }
        acc[data.questionId] = a
      }
      return acc}, {}
    )
  )

  // edited answer
  const [a, setA] = useState<Record<number, AnswerValue>>({...answers})
  const handleAnswer = (questionId: number, answerValue: AnswerValue) => {
    setA(prev => ({
      ...prev,
      [questionId]: answerValue,
    }));
    
    const typeQ = qs[questionId].type
    let changed = false
    if(typeQ === 'SCALE') changed = (answerValue.score === answers[questionId].score)
    else if (typeQ === 'SINGLE_CHOICE') changed = !deepEqual(answerValue.optionIds, answers[questionId].optionIds)
    else if (typeQ === 'MULTIPLE_CHOICE') changed = !deepEqual(answerValue.optionIds, answers[questionId].optionIds)
    else if (typeQ === 'TEXT') changed = (answerValue.textValue === answers[questionId].textValue)

    // answer changed
    setEditQ(prev=>{
      const p = {...prev}
      p[questionId] = changed
      /*if(p[questionId] === true){
        console.log("new:", answerValue, "\nold:", answers[questionId], "\noriginal:", answers[questionId])
      }*/
      return p
    })
    
    // question done?
    // please handle SetIsComplete(), setDoneQ
    // be care of it's required question or not
    // also need to handle text type question
    if(typeQ == 'MULTIPLE_CHOICE'){
      if(!answerValue.optionIds 
        || (qs[questionId].required && answerValue.optionIds && answerValue.optionIds.size <= 0)
      ){
        SetIsComplete(false)
        setDoneQ(prev=>{
          const p = {...prev}
          p[questionId] = false
          return p
        })
      } else {
        SetIsComplete(true)
        setDoneQ(prev=>{
          const p = {...prev}
          p[questionId] = true
          return p
        })
      }
    }
  }

  function chunk<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

  const handleUpdate = async () => {
    if(!isComplete) return
    
    { // no need to handle if no change
      let hasEdit = false
      for (const key in editQ){
        if(editQ[key] == true){
          hasEdit = true
          break
        }
      }
      if(!hasEdit){
        //console.log(" no change")
        notify(t('historyPage.notify.response.noChange'), "default")
        return
      }
    }

    SetIsUpdate(true)
    setEditable(false)
    try {
      const data: {
        questionId: number,
        value?: number,
        textValue?: string,
        optionId?: number
        optionIds?: number[]
      }[] = []

      for (const key in editQ){
        if(editQ[key] === true){
          data.push({
            questionId: Number.parseInt(key),
            value: a[key].score,
            textValue: a[key].textValue,
            optionId: a[key].optionIds? [...a[key].optionIds][0]: undefined,
            optionIds: a[key].optionIds? [...a[key].optionIds]: undefined
          })
        }
      }
      // console.log(data)
      const requests = chunk(data, 3).map(chunk => updateResponse(r.id, { answers: chunk }))
      await Promise.all(requests)
      SetIsUpdate(false)
      setAnswers({...a}) // hint: the response updated
      setEditQ(prev=>{
        const p = {...prev}
        for(const key in p){
          p[key] = false
        }
        return p
      })
      
      onEdit()
      notify(t('historyPage.notify.report.on'), "default")
      await generateReport(r.id)
      onReport()
      // success if it doesnt catch any error

    } catch (error) {
      // if any error, revert to editable
      notify(t('historyPage.notify.common.fail'), "error")
      setEditable(true)
      console.error('提交錯誤:', error)
    }
  }

  const QuestionDescriptionToggle: React.FC<{qId: number}> = ({qId}) => {
    const { t } = useTranslation()

    const isExpandedState = isExpanded[qId] || false
    const description = qs[qId].description
    if (!description || description.trim() === '') {
      return null
    }

    return (
      <div className="
        mt-2 mb-3
        text-sm text-black/50"
      >
        <button
          onClick={() => SetIsExpanded(prev => ({
            ...prev,
            [qId]: !isExpandedState
          }))}
          className="
            flex items-center 
            text-black/40 font-medium
            cursor-pointer"
        >
          {/* hide / show */}
          <svg 
            className="w-4 h-4 mr-1"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isExpandedState ?
                "M5 15l7-7 7 7" :
                "M19 9l-7 7-7-7"
              } 
            />
          </svg>
          {t(isExpandedState ? 
            'Questionnaire.actions.hideDetails' : 
            'Questionnaire.actions.showDetails')
          }
        </button>
        
        {/* show description */}
        {isExpandedState && (
          <div className="mx-3 mt-2">
            {description}
          </div>
        )}
      </div>
    )
  }

  return (<>
    <div
      className="
        fixed inset-0 z-60
        flex items-center justify-center
        pointer-events-none"
    >
      {/* this is the same as ResponseWindow in history page
          add pointer-events-auto to enable event */}
      <div
        className=" 
          absolute top-[3vh]
          flex flex-col 
          w-full h-[90vh] max-h-[680] mx-0 p-5
          
          md:mx-20
          md:max-w-[800]"
      >
        <div className="
          relative
          h-full w-full
          rounded
          overflow-hidden"
        >
          {/* submit button */}
          {((curState & ViewerState.editing) !== 0) && (
            <button
              onClick={handleUpdate}
              disabled={isUpdate || !isComplete}
              className="
                absolute z-51 top-5 right-6
                flex items-center justify-center
                min-w-[150px]
                py-2 px-6
                bg-green-600 rounded-lg
                text-white font-bold
                pointer-events-auto cursor-pointer
                
                hover:bg-green-500
                disabled:opacity-50
                disabled:cursor-not-allowed"
            >
              {isUpdate ? <SubmissionLoadingIndicator /> : t('Questionnaire.actions.finishAndSubmit')}
            </button>
          )}
          <div
            className="
              absolute z-51 bottom-5 right-6
              pointer-events-auto"
          >
            {/* jump to page */}
            <ClickAwaySelect
              value={curPage}
              options={p.map((page, index)=>{
                return { label: page.title, value: index }
              })}
              onChange={(v)=>{
                setCurPage(v)
                scrollToWithOffset(sectionRefs.current[v]!, -20)
              }}
            />
          </div>
        </div>
      </div>
    </div>
    
    <div className="
      relative
      px-6 pt-18 pb-20
      size-full
      bg-white  
      overflow-y-scroll overflow-x-hidden"
      ref={(el) => {viewerRef.current = el}}
    >
      {/* quetionnaire title */}
      <h1 className="
        mb-4
        text-3xl font-extrabold text-gray-900 text-center"
      >
        {q.title}
      </h1>

      {/* quetionnaire description */}
      {q.description && (
        <p className="
          mb-8
          text-center text-gray-500"
        >
          {q.description}
        </p>
      )}

      {/* page content */}
      {
        p.map((page, index)=>{
          return (
            <div
              key={index}
              data-index={index}
              ref={(el) => {sectionRefs.current[index] = el}}
            >
              <div className='
                flex
                mt-7 mb-5
                bg-white'
              >
                {/* blue line for decoration */}
                <div className='
                  flex justify-around
                  w-2 ml-3 mr-2
                  bg-indigo-400
                  text-transparent
                  select-none'
                >
                  .
                </div>

                <div className='
                  flex flex-col gap-0.5 items-start justify-center'
                >
                  {/* page title */}
                  <h2 className="text-2xl font-bold text-gray-700 text-start">
                    {page.title}
                  </h2>
                  {/* page content text */}
                  <div className="text-md text-gray-500 text-start">
                    {page.content}
                  </div>
                </div>
              </div>

              {/* questions in this page */}
              <div className="space-y-2">
                {page.questions.map((question) => (
                  <div
                    key={question.id}
                    className={`
                      p-4
                      rounded-lg shadow-[inset_0_0_5px_rgba(0,0,0,0.15)]
                      
                      ${editQ[question.id] == true?
                        (doneQ[question.id] == true?
                          "bg-yellow-100":
                          "bg-red-100"
                        ):
                        "bg-white"}
                    `}
                  >
                    <div className="font-semibold text-gray-700 mb-3">

                      {/* question text */}
                      {question.text}

                      {/* a "required" tip */}
                      {question.required &&
                        <span className="
                          relative
                          inline-flex justify-center items-center
                          w-fit px-2
                          text-red-500
                          select-none overflow-hidden

                          hover:overflow-visible"
                        >
                          *
                          <div className='
                            absolute left-full
                            ml-1.5 w-fit px-1.5 py-1
                            text-center font-bold text-xs text-white whitespace-nowrap
                            bg-red-400 rounded-full shadow shadow-gray-500'
                          >
                            {t('historyPage.required')}
                          </div>
                        </span>
                      }
                    </div>

                    {/* question description */}
                    {question.description && question.description.length > 0 &&
                      <QuestionDescriptionToggle qId={question.id}/>
                    }
                    
                    {/* render with different question type */}
                    <div className="flex justify-start">
                      <QuestionRenderer
                        editable={editable}
                        question={question}
                        currentAnswer={a[question.id] || {}}
                        onAnswer={(answer) => {
                          if(editable) handleAnswer(question.id, answer)
                        }}
                      />
                    </div>
                  </div>
                ))}
                
              </div>
            </div>
          )
        })
      }

      {/* "translating..." tip, temporary no use */}
      <div className='h-20 w-full'>
        {
          translating && (
            <LoadingComponent message='Translating...' />
          )
        }
      </div>
    </div>
  </>)
}

export function ClickAwaySelect<T>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // collase when click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="
        relative w-13 select-none
        sm:w-40"
    >
      <button
        type="button"
        className="
          flex justify-center items-center 
          px-3 py-2 w-full
          rounded-lg border border-gray-300 bg-white shadow-sm 
          cursor-pointer
          
          sm:justify-between"
        onClick={() => setOpen(!open)}
      >
        <span className='hidden sm:flex'>{options.find((o) => o.value === value)?.label}</span>
        <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>
          <ChevronUp/>
        </span>
      </button>

      {open && (
        <div className="
          absolute z-40
          bottom-full right-0 mb-4 w-fit min-w-40 max-h-[67vh]
          rounded-lg bg-white border border-gray-200 shadow-lg
          overflow-y-auto whitespace-nowrap"
        >
          {options.map((o) => {
            const isSelected = o.value === value;
            return (<div
              key={options.indexOf(o)}
              className={`
                pl-3 pr-5 py-2
                cursor-pointer
                ${isSelected ?
                  "bg-[#e7f1ff] hover:bg-blue-100 active:bg-blue-200" :
                  "bg-white hover:bg-gray-50 active:bg-gray-100"
                }
              `}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </div>)
          })}
        </div>
      )}
    </div>
  )
}
