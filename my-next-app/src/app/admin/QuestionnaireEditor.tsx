"use client";

import React, { useState, useEffect } from "react";
import { ResponseData, ViewerState } from "@/services/responseService";
import { useTranslation } from "react-i18next";
import { createQuestionnaire, deleteQuestionnaire } from '@/services/questionnaireService';


// ----------------------------------------------------
// Router（保留你的原始行為）
// ----------------------------------------------------
const useRouter = () => {
    return {
        push: (url: string) => {
            if (typeof window !== "undefined") {
                window.location.href = url;
            }
        },
    };
};

// ----------------------------------------------------
// 翻譯快取
// ----------------------------------------------------
const translationCache: {
    zh: Record<string, string>;
    en: Record<string, string>;
} = {
    zh: {},
    en: {},
};

const capitalizeFirstLetter = (text: string) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
};

// ----------------------------------------------------
// 翻譯 API（支援 AbortController）
// ----------------------------------------------------
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
            return null;
        }
        console.error("翻譯失敗:", err);
        return null;
    }
};

// ----------------------------------------------------
// TranslatedText Component（保留你的邏輯 + 清理排版）
// ----------------------------------------------------
const TranslatedText: React.FC<{ text: string; capitalize?: boolean }> = ({
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
                    capitalize
                        ? capitalizeFirstLetter(translationCache.en[text])
                        : translationCache.en[text]
                );
            } else {
                translateText(text, "zh-CN", "en", signal).then((result) => {
                    if (result) {
                        translationCache.en[text] = result;
                        setTranslated(capitalize ? capitalizeFirstLetter(result) : result);
                    } else {
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
};

// ----------------------------------------------------
// CATEGORY_MAP（保留你的內容）
// ----------------------------------------------------
const CATEGORY_MAP: Record<
    string,
    Record<string, { title: string; content: string }>
> = {
    ACCURACY: {
        zh: {
            title: "準確性",
            content: "AI判斷的結果與真實情況相近程度",
        },
        en: {
            title: "Accuracy",
            content: "How closely the AI's output matches the real-world situation.",
        },
    },
    RELIABILITY: {
        zh: {
            title: "可靠性",
            content:
                "AI 模型在面對不同類型的干擾或異常情況時，敏感度適中，不會過度敏感導致表現不穩定",
        },
        en: {
            title: "Reliability",
            content:
                "The AI model maintains stable performance without being overly sensitive to disturbances.",
        },
    },
    SAFETY: {
        zh: {
            title: "安全性",
            content:
                "不會對周遭環境、利害關係人（例如使用者與民眾）造成不利的影響或傷害",
        },
        en: {
            title: "Safety",
            content:
                "Ensures that the AI does not cause harm or negative impact to the environment or stakeholders.",
        },
    },
    RESILIENCE: {
        zh: {
            title: "韌性",
            content:
                "AI 系統與相關設備能夠適應不同的環境、需求及條件，靈活調整與擴展，以滿足不斷變化的需求和挑戰",
        },
        en: {
            title: "Resilience",
            content:
                "The AI system adapts to different environments and evolving challenges.",
        },
    },
    TRANSPARENCY: {
        zh: {
            title: "透明性",
            content:
                "AI 系統使用者可以追溯AI 在做判斷或決策時，所使用的資料、演算法或規則",
        },
        en: {
            title: "Transparency",
            content:
                "Users can trace the data, algorithms, or rules used by the AI.",
        },
    },
    ACCOUNTABILITY: {
        zh: {
            title: "當責性",
            content: "當AI系統導致非預期的負面影響時，要有監督機制或負責單位",
        },
        en: {
            title: "Accountability",
            content:
                "Mechanisms must exist to assign responsibility when AI causes unintended impacts.",
        },
    },
    EXPLAINABILITY: {
        zh: {
            title: "可解釋性",
            content:
                "AI 的決策邏輯可以被清楚描述與呈現，讓使用者了解AI的決策理由",
        },
        en: {
            title: "Explainability",
            content:
                "The AI's decision logic can be clearly described to users and stakeholders.",
        },
    },
    AUTONOMY: {
        zh: {
            title: "自主性",
            content:
                "AI系統使用者能保持充分的自主性，不過度依賴AI的判斷或決策",
        },
        en: {
            title: "Autonomy",
            content:
                "Users maintain autonomy and avoid excessive reliance on AI decisions.",
        },
    },
    PRIVACY: {
        zh: {
            title: "隱私",
            content: "在使用AI系統時，不會侵犯到個人隱私",
        },
        en: {
            title: "Privacy",
            content: "Ensures AI usage does not infringe personal privacy.",
        },
    },
    FAIRNESS: {
        zh: {
            title: "公平性",
            content: "AI系統能平等對待不同群體，避免不公正的情況",
        },
        en: {
            title: "Fairness",
            content:
                "The AI system treats groups equally and avoids unfair outcomes.",
        },
    },
    SECURITY: {
        zh: {
            title: "資訊安全性",
            content:
                "防止外部環境對AI模型的侵入和損害，以保護訓練與測試資料安全",
        },
        en: {
            title: "Security",
            content:
                "Protects the AI model from intrusion and ensures data security.",
        },
    },
    UNKNOWN: {
        zh: { title: "未知分類", content: "{{category}}" },
        en: { title: "Unknown Category", content: "{{category}}" },
    },
};

// ----------------------------------------------------
// 型別定義（保留你的）
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
    description?: string;
    category: string;
    order: number;
    type: "SCALE" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT";
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
    };
}

type AnswerValue = {
    score?: number;
    optionIds?: number[];
    textValue?: string;
};


// ----------------------------------------------------
// 統一後的按鈕樣式（所有題型共用）
// ----------------------------------------------------
const baseOption =
    "py-2 px-3 rounded-lg border text-sm sm:text-base transition-all select-none";

const selectedOption =
    "bg-indigo-500 text-white border-transparent shadow";

const unselectedOption =
    "bg-white text-gray-700 border-gray-300 hover:border-indigo-300 hover:shadow-sm";


// ----------------------------------------------------
// 題型元件：SCALE
// ----------------------------------------------------
const ScaleQuestion: React.FC<{
    editable: boolean;
    question: Question;
    currentAnswer: AnswerValue;
    onAnswer: (answer: AnswerValue) => void;
}> = ({ editable, question, currentAnswer, onAnswer }) => {
    const options = question.options || [];
    const selectedId = currentAnswer.optionIds?.[0];

    return (
        <div className="flex justify-center gap-3 sm:gap-4">
            {options.map((opt) => (
                <button
                    key={opt.id}
                    onClick={() => editable && onAnswer({ optionIds: [opt.id], score: opt.value })}
                    className={`
            w-10 h-10 sm:w-12 sm:h-12 rounded-full font-bold transition-all
            ${selectedId === opt.id ? "bg-indigo-500 text-white shadow" : "bg-white border border-gray-300 text-gray-700"}
            ${editable ? "cursor-pointer hover:border-indigo-300 hover:shadow-sm" : "cursor-default"}
          `}
                >
                    {opt.value}
                </button>
            ))}
        </div>
    );
};

// ----------------------------------------------------
// 題型元件：SINGLE_CHOICE
// ----------------------------------------------------
const SingleChoiceQuestion: React.FC<{
    editable: boolean;
    question: Question;
    currentAnswer: AnswerValue;
    onAnswer: (answer: AnswerValue) => void;
}> = ({ editable, question, currentAnswer, onAnswer }) => {
    const options = question.options || [];
    const selectedId = currentAnswer.optionIds?.[0];

    return (
        <div className={`grid gap-3 w-full sm:w-fit ${options.length >= 4 ? "grid-cols-2" : "grid-cols-1"}`}>
            {options.map((opt) => (
                <button
                    key={opt.id}
                    onClick={() => editable && onAnswer({ optionIds: [opt.id], score: opt.value })}
                    className={`
            ${baseOption}
            ${selectedId === opt.id ? selectedOption : unselectedOption}
            ${editable ? "cursor-pointer" : "cursor-default"}
          `}
                >
                    {opt.text}
                </button>
            ))}
        </div>
    );
};

// ----------------------------------------------------
// 題型元件：MULTIPLE_CHOICE
// ----------------------------------------------------
const MultipleChoiceQuestion: React.FC<{
    editable: boolean;
    question: Question;
    currentAnswer: AnswerValue;
    onAnswer: (answer: AnswerValue) => void;
}> = ({ editable, question, currentAnswer, onAnswer }) => {
    const options = question.options || [];
    const selectedIds = currentAnswer.optionIds || [];

    const toggle = (id: number) => {
        if (!editable) return;

        const newIds = selectedIds.includes(id)
            ? selectedIds.filter((x) => x !== id)
            : [...selectedIds, id];

        const newScore = options
            .filter((opt) => newIds.includes(opt.id))
            .reduce((sum, opt) => sum + Number(opt.value), 0);

        onAnswer({ optionIds: newIds, score: newScore });
    };

    return (
        <div className={`grid gap-3 w-full sm:w-fit ${options.length >= 4 ? "grid-cols-2" : "grid-cols-1"}`}>
            {options.map((opt) => (
                <button
                    key={opt.id}
                    onClick={() => toggle(opt.id)}
                    className={`
            ${baseOption}
            ${selectedIds.includes(opt.id) ? selectedOption : unselectedOption}
            ${editable ? "cursor-pointer" : "cursor-default"}
          `}
                >
                    {opt.text}
                </button>
            ))}
        </div>
    );
};

// ----------------------------------------------------
// 題型元件：TEXT
// ----------------------------------------------------
const TextQuestion: React.FC<{
    editable: boolean;
    question: Question;
    currentAnswer: AnswerValue;
    onAnswer: (answer: AnswerValue) => void;
}> = ({ editable, currentAnswer, onAnswer }) => {
    const textValue = currentAnswer.textValue || "";

    return (
        <textarea
            rows={3}
            value={textValue}
            onChange={(e) => editable && onAnswer({ textValue: e.target.value })}
            placeholder="請在此輸入您的回答..."
            className={`
        w-full p-3 rounded-lg border border-gray-300 bg-gray-50
        transition-all resize-none
        ${editable ? "focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300" : "cursor-default"}
      `}
        />
    );
};

// ----------------------------------------------------
// 問題渲染器（依題型切換）
// ----------------------------------------------------
const QuestionRenderer: React.FC<{
    editable: boolean;
    question: Question;
    currentAnswer: AnswerValue;
    onAnswer: (answer: AnswerValue) => void;
}> = (props) => {
    const { i18n, t } = useTranslation();
    switch (props.question.type) {
        case "SCALE":
            return <ScaleQuestion {...props} />;
        case "SINGLE_CHOICE":
            return <SingleChoiceQuestion {...props} />;
        case "MULTIPLE_CHOICE":
            return <MultipleChoiceQuestion {...props} />;
        case "TEXT":
            return <TextQuestion {...props} />;
        default:
            return <p className="text-red-500">{t('questionnaireEditor.unknownQuestionType')}: {props.question.type}</p>;
    }
};


// ----------------------------------------------------
// QuestionEditor（題目編輯器）
// ----------------------------------------------------
const QuestionEditor = ({
    question,
    onChange, // 這個 onChange 現在只用於通知父層變髒 (isDirty)
    onUpdate, // 新增：用於將局部狀態傳回父層
    onDeleteQuestion, // 🌟 新增 Prop
}: {
    question: Question;
    onChange: () => void;
        onUpdate: (updatedQuestion: Question) => void;
        onDeleteQuestion: (questionId: number) => void; // 🌟 新增 Prop 類型
}) => {

    const [editingQuestion, setEditingQuestion] = useState(question);

    // 🌟 新增：追蹤局部是否有變動
    const [hasLocalChange, setHasLocalChange] = useState(false);
    const { i18n, t } = useTranslation();

    // 🌟 使用 useEffect 來延遲觸發父元件的 onChange (setIsDirty)
    useEffect(() => {
        if (hasLocalChange) {
            onChange(); // 這是父元件的 setIsDirty(true)
            setHasLocalChange(false); // 重置標記
        }
    }, [hasLocalChange, onChange]);

    // 💡 注意：由於 QuestionEditor 會在 editingQuestionId 改變時被重新掛載，
    // 所以這裡不需要 useEffect 來同步 props.question。

    // ✅ 2. 定義一個同步函數，用於更新局部狀態並通知父元件資料變髒
    const updateLocalQuestion = (updater: (q: Question) => Question, shouldSave = false) => {
        setEditingQuestion((prev) => {
            const updated = updater(prev);

            // 當需要保存時 (例如 onBlur)，將更新後的題目傳回給父元件
            if (shouldSave) {
                setTimeout(() => {
                onUpdate(updated); 
            }, 0);
            }
            setHasLocalChange(true);
            return updated;
        });
    };

    // 🌟 當輸入框失去焦點時，將局部狀態同步回頂層
    const handleBlur = () => {
        onUpdate(editingQuestion);
    };


    // 更新題目文字
    const updateText = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateLocalQuestion((q) => ({
            ...q,
            text: e.target.value,
        }));
    };

    const updateDescription = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateLocalQuestion((q) => ({
            ...q,
            description: e.target.value,
        }));
    };

    // 更新選項文字
    const updateOption = (index: number, value: string) => {
        updateLocalQuestion((q) => ({
            ...q,
            options: q.options?.map((opt, i) =>
                i === index ? { ...opt, text: value } : opt
            ),
            // 🌟 關鍵修正：移除 `, true)`
        }));
    };

    // ✅ 新增選項
    const addOption = () => {
        // 使用 updateLocalQuestion 來更新局部狀態
        updateLocalQuestion((q) => {
            const newId = Date.now();
            const newOption = {
                id: newId,
                text: t('questionnaireEditor.newOption'),
                value: 0,
                order: (q.options?.length || 0) + 1,
            };
            return {
                ...q,
                options: [...(q.options || []), newOption],
            };
        }, true); // 🌟 立即同步保存 (shouldSave=true)，將新的 question 物件傳回父元件
    };

    // 刪除選項
    const deleteOption = (index: number) => {
        updateLocalQuestion((q) => ({
            ...q,
            options: q.options?.filter((_, i) => i !== index),
        }), true); // 刪除後立即同步
    };

    // 🌟 處理刪除題目邏輯
    const handleDeleteQuestion = () => {
        // 呼叫父元件傳入的刪除函數
        onDeleteQuestion(question.id);
        // Note: 父元件的 deleteQuestion 會呼叫 setEditingQuestionId(null)，導致此元件被卸載。
    };

    // ----------------------------------------------------
    // QuestionEditor 內部：changeType 函數
    // ----------------------------------------------------

    // 題型枚舉（假設您有定義 QuestionType 類型）
    type QuestionType = "SCALE" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT";

    // ----------------------------------------------------
    // QuestionEditor 內部：輔助函數 - 生成量表選項
    // ----------------------------------------------------
    // 假設 Option 結構 { id: number, text: string, value: number, order: number }

    const createScaleOptions = (count: number): Option[] => {
        const options: Option[] = [];
        for (let i = 1; i <= count; i++) {
            options.push({
                id: Date.now() + i, // 確保 ID 唯一性
                text: String(i),
                value: i,
                order: i,
            });
        }
        return options;
    };

    const resetOptions = (type: QuestionType, currentOptions: Option[] | undefined): Option[] | undefined => {

        // 1. TEXT 題型：清除選項
        if (type === 'TEXT') {
            return undefined; // 文本輸入題不需要選項
        }

        // 2. SCALE 題型：生成數字選項
        if (type === 'SCALE') {
            return createScaleOptions(5); // 預設生成 5 點量表
        }

        // 3. SINGLE_CHOICE / MULTIPLE_CHOICE：保留現有選項或初始化預設選項
        if (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') {

            // 如果選項已存在，則保留它們
            if (currentOptions && currentOptions.length > 0) {
                return currentOptions;
            }

            // 否則，初始化兩個預設的文本選項
            return [
                { id: Date.now(), text: t('questionnaireEditor.defaultOption1'), value: 0, order: 1 },
                { id: Date.now() + 1, text: t('questionnaireEditor.defaultOption1'), value: 0, order: 2 },
            ];
        }

        // 預設返回 undefined（或根據您的數據結構決定）
        return undefined;
    };


    // ----------------------------------------------------
    // QuestionEditor 內部：changeType 函數（保持不變，它會呼叫 resetOptions）
    // ----------------------------------------------------
    const changeType = (newType: QuestionType) => {
        // 立即儲存 (shouldSave=true)
        updateLocalQuestion((q) => ({
            ...q,
            type: newType,
            options: resetOptions(newType, q.options),
        }), true);
    };

    return (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
            {/* 題目敘述 */}
            <input
                value={editingQuestion.text}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => updateText(e)}
                onBlur={handleBlur} // ✅ 補上 onBlur
                className="w-full border px-3 py-2 rounded-lg focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400"
            />

            {/* 題目描述（可編輯） */}
            <div className="space-y-2">
                <label className="font-semibold text-gray-700">{t('questionnaireEditor.descriptionLabel')}</label>
                <textarea
                    value={editingQuestion.description || ""}
                    onChange={(e) =>
                        updateDescription(e)
                    }
                    onBlur={handleBlur} // ✅ 補上 onBlur
                    placeholder={t('questionnaireEditor.descriptionPlaceholder')}
                    className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300"
                    rows={3}
                />
            </div>


            {/* 選項編輯（僅選擇題顯示） */}
            {(editingQuestion.type === 'SINGLE_CHOICE' ||
                editingQuestion.type === 'MULTIPLE_CHOICE' ||
                editingQuestion.type === 'SCALE') && (
                    <div className="space-y-3">
                        {editingQuestion.options?.map((opt, idx) => (
                            <div key={opt.id} className="flex items-center gap-2">
                                <input
                                    value={opt.text}
                                    onChange={(e) => updateOption(idx, e.target.value)}
                                    onBlur={handleBlur}
                                    className="flex-1 border px-3 py-2 rounded-lg focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400"
                                />
                                <button
                                    onClick={() => deleteOption(idx)}
                                    className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                >
                                    {t('questionnaireEditor.deleteOption')}
                                </button>
                            </div>
                        ))}

                        <button
                            onClick={addOption}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                        {t('questionnaireEditor.addOption')}
                        </button>
                    </div>
                )}

            {/* 題目類型切換 */}
            <div className="flex justify-end items-center gap-2">
                {/* 假設您使用一個下拉選單 (Select) 來切換題型 */}
                <select
                    value={editingQuestion.type}
                    onChange={(e) => changeType(e.target.value as QuestionType)}
                    className="px-3 py-1 border rounded-lg"
                >
                    {/* 🌟 確保這裡的 value 字串與您的數據定義一致 */}
                    <option value="SINGLE_CHOICE">{t('questionnaireEditor.type.singleChoice')}</option>
                    <option value="MULTIPLE_CHOICE">{t('questionnaireEditor.type.multipleChoice')}</option>
                    <option value="SCALE">{t('questionnaireEditor.type.scale')}</option>
                    <option value="TEXT">{t('questionnaireEditor.type.text')}</option>
                </select>

                {/* 🌟 刪除按鈕 UI 綁定 handleDeleteQuestion */}
                <button
                    onClick={handleDeleteQuestion}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    {t('questionnaireEditor.deleteQuestion')}
                </button>
            </div>

            {/* 🌟 根據題型顯示選項編輯器 */}
            

            
        </div>
    );
};

// ----------------------------------------------------
// ResponseEditor 主體
// ----------------------------------------------------
export default function ResponseEditor({
    curState,
    data,
}: {
    curState: ViewerState;
    data: { response: ResponseData; questionnaire: QuestionnaireData };
}) {
    const { i18n, t } = useTranslation();
    const q = data.questionnaire;
    const r = data.response;
    const editable = curState === ViewerState.editing;

    // ----------------------------------------------------
    // Category 標題與內容
    // ----------------------------------------------------
    const getPageTitle = (category: string): string =>
        CATEGORY_MAP[category.toUpperCase()]?.[i18n.language]?.title || category;

    const getPageContent = (category: string): string =>
        CATEGORY_MAP[category.toUpperCase()]?.[i18n.language]?.content || "";

    // ----------------------------------------------------
    // 編輯狀態
    // ----------------------------------------------------
    const [isDirty, setIsDirty] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [editingDescription, setEditingDescription] = useState(false);
    const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

    const [questionnaire, setQuestionnaire] = useState(q);

    
    // 🌟 新增：處理題目刪除的函數
    const deleteQuestion = (questionId: number) => {
        // 1. 更新頂層狀態：過濾掉被刪除的題目
        setQuestionnaire((prev) => ({
            ...prev,
            questions: prev.questions.filter((q) => q.id !== questionId),
        }));
        // 2. 清除當前編輯中的狀態（強制 QuestionEditor 卸載）
        setEditingQuestionId(null);
        // 3. 標記為 Dirty
        setIsDirty(true);
    };

    // ResponseEditor 內部
    // ...
    const updateQuestion = (updatedQuestion: Question) => {
        setQuestionnaire(prev => {
            return {
                ...prev,
                questions: prev.questions.map(q =>
                    q.id === updatedQuestion.id ? updatedQuestion : q
                ),
            };
        });
        setIsDirty(true);
    };

    // ----------------------------------------------------
    // 分頁（依 category 分組）
    // ----------------------------------------------------
    const pages = (() => {
        const grouped = questionnaire.questions.reduce((acc, question) => {
            const category = question.category;
            if (!acc[category]) {
                acc[category] = {
                    category,
                    questions: [],
                };
            }
            acc[category].questions.push(question);
            return acc;
        }, {} as Record<string, { category: string; questions: Question[] }>);

        return Object.values(grouped)
            .sort((a, b) => {
                const keys = Object.keys(CATEGORY_MAP);
                const indexA = keys.indexOf(a.category.toUpperCase());
                const indexB = keys.indexOf(b.category.toUpperCase());
                return indexA - indexB;
            })
            .map((page) => ({
                title: getPageTitle(page.category),
                content: getPageContent(page.category),
                questions: page.questions.sort((a, b) => a.order - b.order),
            }));
    })();

    // ----------------------------------------------------
    // 原始答案整理
    // ----------------------------------------------------
    const answers: Record<number, AnswerValue> = r.answers.reduce(
        (acc, data) => {
            let optionIds = [data.optionId];

            if (data.question.type === "SCALE") {
                const matched = q.questions
                    .find((q) => q.id === data.questionId)
                    ?.options?.find((o) => o.value === data.value)?.id;

                if (matched) optionIds = [matched];
            }

            if (acc[data.questionId]?.optionIds) {
                optionIds = [...optionIds, ...acc[data.questionId].optionIds!];
            }

            acc[data.questionId] = {
                score: data.value,
                optionIds,
                textValue: data.textValue,
            };

            return acc;
        },
        {} as Record<number, AnswerValue>
    );

    // ----------------------------------------------------
    // 編輯後答案
    // ----------------------------------------------------
    const [a, setA] = useState<Record<number, AnswerValue>>(answers);

    const handleAnswer = (questionId: number, answerValue: AnswerValue) => {
        setA((prev) => ({
            ...prev,
            [questionId]: answerValue,
        }));
    };

    // ----------------------------------------------------
    // 儲存 / 取消
    // ----------------------------------------------------
    const onSave = async () => {
        try {
            const updatedPayload = {
                groupName: questionnaire.group.name,
                title: questionnaire.title,
                //description: questionnaire.description || "",
                questions: questionnaire.questions
                    .sort((a, b) => a.order - b.order)
                    .map((q) => ({
                        text: q.text,
                        category: q.category,
                        order: q.order,
                        type: q.type,
                        options: q.options?.map((opt) => ({
                            text: opt.text,
                            value: opt.value,
                            order: opt.order,
                        })) || [],
                    })),
            };

            // ✅ 1. 先新增新問卷
            const status = await createQuestionnaire(updatedPayload);

            if (status !== 201 && status !== 200) {
                alert("❌ 新問卷建立失敗，舊問卷未刪除");
                return;
            }

            // ✅ 2. 新問卷建立成功 → 刪除舊問卷
            await deleteQuestionnaire(questionnaire.id);

            alert("✅ 問卷已成功更新");
            setIsDirty(false);
            window.location.reload();
        } catch (err) {
            console.error("❌ 儲存問卷失敗:", err);
            alert("❌ 儲存問卷失敗，請稍後再試");
        }
    };


    const onCancel = () => {
        window.location.reload();
    };


    // 問題描述可切換顯示組件
    const QuestionDescriptionToggle: React.FC<{ description: string | null }> = ({ description }) => {
        const { t } = useTranslation();
        const [isExpanded, setIsExpanded] = useState(false);

        if (!description || description.trim() === '') {
            return null;
        }

        return (
            <div className="text-sm text-gray-500 mt-2 mb-3">
                <button
                    onClick={() => setIsExpanded(prev => !prev)}
                    className="flex items-center text-indigo-600 hover:text-indigo-800 transition duration-150 font-medium"
                >
                    {/* 顯示/隱藏 圖標 */}
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                    </svg>
                    {t(isExpanded ? 'Questionnaire.actions.hideDetails' : 'Questionnaire.actions.showDetails')}
                </button>

                {/* 展開時才顯示描述內容 */}
                {isExpanded && (
                    <div className="mt-2 p-3 bg-indigo-50 border-l-4 border-indigo-400 rounded-md">
                        <TranslatedText text={description} />
                    </div>
                )}
            </div>
        );
    };


    // ----------------------------------------------------
    // 主體 Layout
    // ----------------------------------------------------
    return (
        <div
            className="w-full h-full bg-white px-8 py-10 overflow-y-auto"
            onClick={() => {
                setEditingQuestionId(null);
                setEditingTitle(false);
                setEditingDescription(false);
            }}
        >
            {/* ----------------------------------------------------
          問卷標題
      ---------------------------------------------------- */}
            <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-4 flex items-center justify-center gap-2">
                {editingTitle ? (
                    <input
                        value={questionnaire.title}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                            setQuestionnaire((prev) => ({
                                ...prev,
                                title: e.target.value,
                            }));
                            setIsDirty(true);
                        }}
                        className="border px-2 py-1 rounded"
                    />
                ) : (
                    questionnaire.title
                )}

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setEditingTitle(!editingTitle);
                    }}
                >
                    <svg width="20" height="20" fill="gray">
                        <path d="M3 17l3-1 11-11-2-2L4 14l-1 3z" />
                    </svg>
                </button>
            </h1>

            {/* ----------------------------------------------------
          問卷描述
      ---------------------------------------------------- */}
            {editingDescription ? (
                <textarea
                    value={questionnaire.description || ""}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                        setQuestionnaire((prev) => ({
                            ...prev,
                            description: e.target.value,
                        }));
                        setIsDirty(true);
                    }}
                    className="w-full max-w-2xl mx-auto border p-2 rounded mb-8"
                />
            ) : (
                questionnaire.description && (
                    <p className="text-center text-gray-500 mb-8 flex items-center justify-center gap-2">
                        {questionnaire.description}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingDescription(true);
                            }}
                        >
                            <svg width="18" height="18" fill="gray">
                                <path d="M3 17l3-1 11-11-2-2L4 14l-1 3z" />
                            </svg>
                        </button>
                    </p>
                )
            )}

            {/* ----------------------------------------------------
          分頁內容（Category）
      ---------------------------------------------------- */}
            {pages.map((page, pageIndex) => (
                <div key={pageIndex}>
                    {/* Category Header */}
                    <div className="mt-10 mb-6">
                        <div className="flex items-center justify-between">
                            {/* 左側：分類標題 */}
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-6 bg-indigo-500 rounded"></div>
                                <h2 className="text-2xl font-bold text-gray-800">{page.title}</h2>
                            </div>

                            {/* 右側：新增問題按鈕 */}
                            <button
                                onClick={() => {
                                    const newId = Date.now();

                                    const titleToCategory = Object.fromEntries(
                                        Object.entries(CATEGORY_MAP).map(([key, value]) => [
                                            value[i18n.language].title,
                                            key,
                                        ])
                                    );
                                    const category = titleToCategory[page.title];

                                    setQuestionnaire((prev) => {
                                        // 先把同一個 category 的題目抓出來，並依原本 order 排好
                                        const sameCategory = prev.questions
                                            .filter((q) => q.category === category)
                                            .sort((a, b) => a.order - b.order);

                                        // 新題目插在最上面（order 先給 1）
                                        const newQuestion: Question = {
                                            id: newId,
                                            text: t('questionnaireEditor.newQuestion'),
                                            category,
                                            order: 1,
                                            type: "SINGLE_CHOICE",
                                            required: false,
                                            options: [
                                                { id: newId + 1, text:  t('questionnaireEditor.defaultOption1') , value: 1, order: 1 },
                                                { id: newId + 2, text:  t('questionnaireEditor.defaultOption2') , value: 2, order: 2 },
                                            ],
                                        };

                                        // 其他同 category 題目往後排，order 重新編號
                                        const reorderedSameCategory = [newQuestion, ...sameCategory].map(
                                            (q, index) => ({
                                                ...q,
                                                order: index + 1,
                                            })
                                        );

                                        // 把不同 category 的題目保留原狀
                                        const otherQuestions = prev.questions.filter(
                                            (q) => q.category !== category
                                        );

                                        return {
                                            ...prev,
                                            questions: [...otherQuestions, ...reorderedSameCategory],
                                        };
                                    });

                                    setEditingQuestionId(newId);
                                    setIsDirty(true);
                                }}
                                className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                                {t('questionnaireEditor.addQuestion')}
                            </button>

                        </div>

                        {/* 分類描述 */}
                        <p className="ml-5 mt-1 text-gray-500">{page.content}</p>
                    </div>


                    {/* 問題列表 */}
                    <div className="space-y-4">
                        {page.questions.map((question) => (
                            <div
                                key={question.id}
                                className={`
                  p-5 rounded-xl border transition-all cursor-pointer
                  ${editingQuestionId === question.id
                                        ? "border-indigo-500 shadow-md bg-indigo-50"
                                        : "border-gray-200 hover:border-indigo-300 hover:shadow-sm"
                                    }
                `}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingQuestionId(question.id);
                                }}
                            >
                                {/* ✅ 如果正在編輯 → 顯示編輯介面 */}
                                {editingQuestionId === question.id ? (
                                    <QuestionEditor
                                        key={question.id}
                                        question={question}
                                        onChange={() => setIsDirty(true)}
                                        onUpdate={(updatedQuestion) => updateQuestion(updatedQuestion)}
                                        onDeleteQuestion={deleteQuestion}
                                    />
                                ) : (
                                    <>
                                        {/* ✅ 題目標題 + 必填 tooltip */}
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-1 font-semibold text-gray-800 relative group">
                                                <span>{question.text}</span>

                                                {question.required && (
                                                    <span className="text-red-500 font-bold relative">
                                                        *
                                                        {/* ✅ tooltip */}
                                                        <span
                                                            className="
                  absolute left-3 top-1/2 -translate-y-1/2
                  opacity-0 group-hover:opacity-100
                  bg-red-500 text-white text-xs px-2 py-1 rounded
                  whitespace-nowrap shadow transition-opacity
                "
                                                        >
                                                            必填
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 題目描述（可展開/收合） */}
                                        {question.description && (
                                            <QuestionDescriptionToggle description={question.description} />
                                        )}

                                        {/* ✅ 題型渲染 */}
                                        <QuestionRenderer
                                            editable={editable}
                                            question={question}
                                            currentAnswer={a[question.id] || {}}
                                            onAnswer={(ans) => handleAnswer(question.id, ans)}
                                        />
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {isDirty && (
                <div
                    className="
            fixed bottom-6 right-6
            flex gap-3
            z-50
        "
                >
                    <button
                        onClick={onCancel}
                        className="
                px-4 py-2 rounded-lg border border-gray-300
                bg-white text-gray-700 shadow
                hover:bg-gray-50
            "
                    >
                        {t('questionnaireEditor.cancel')}
                    </button>

                    <button
                        onClick={onSave}
                        className="
                px-5 py-2 rounded-lg
                bg-indigo-600 text-white font-semibold shadow
                hover:bg-indigo-700
            "
                    >
                        {t('questionnaireEditor.save')}
                    </button>
                </div>
            )}
        </div>
    );
}






