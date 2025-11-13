"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
// 定义数据类型和常量
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

interface QuestionnaireData {
    id: number;
    title: string;
    description: string | null;
    questions: Question[];
    group: {
        id: number;
        name: string;
        // ... 其他 group 字段
    }
}


type AnswerValue = {
    score?: number; 
    optionIds?: number[]; 
    textValue?: string; 
};

// 答案狀態：Key 是 Question ID
type Answers = Record<number, AnswerValue>; 

const API_BASE_URL = "http://localhost:3001/api";

interface QuestionnaireContentProps {
    questionnaireId: string | number | null; 
}


// ----------------------------------------------------
// 新增：問題渲染子元件 (根據 Type 渲染不同 UI)
// ----------------------------------------------------

interface QuestionRendererProps {
    question: Question;
    currentAnswer: AnswerValue;
    onAnswer: (answer: AnswerValue) => void;
}

// 刻度題 (Likert Scale 1-5)
const ScaleQuestion: React.FC<QuestionRendererProps> = ({ question, currentAnswer, onAnswer }) => {
    const scale = [1, 2, 3, 4, 5];
    const selectedScore = currentAnswer.score;

    return (
        <div className="flex justify-center space-x-2 sm:space-x-4">
            {scale.map(score => (
                <button
                    key={score}
                    onClick={() => onAnswer({ score })}
                    className={`
                        w-10 h-10 sm:w-12 sm:h-12 rounded-full font-bold transition-all duration-200
                        ${selectedScore === score 
                            ? 'bg-purple-700 text-white shadow-lg ring-4 ring-purple-300'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-purple-100'
                        }
                    `}
                >
                    {score}
                </button>
            ))}
        </div>
    );
};



const SingleChoiceQuestion: React.FC<QuestionRendererProps> = ({ question, currentAnswer, onAnswer }) => {
    const options = question.options || [];
    if (options.length === 0) return <p className="text-red-500">選項資料缺失。</p>; // 處理選項缺失的情況
    const selectedOptionId = currentAnswer.optionIds?.[0];

    return (
        <div className="flex space-x-6">
            {options.map(opt => (
                <button
                    key={opt.id}
                    onClick={() => onAnswer({ optionIds: [opt.id], score: opt.value })}
                    className={`py-2 px-6 rounded-lg font-medium transition duration-150 border
                        ${selectedOptionId === opt.id
                            ? 'bg-purple-700 text-white shadow-md border-purple-700'
                            : 'bg-white text-gray-800 hover:bg-purple-50'
                        }`}
                >
                    {opt.text}
                </button>
            ))}
        </div>
    );
};

const MultipleChoiceQuestion: React.FC<QuestionRendererProps> = ({ question, currentAnswer, onAnswer }) => {
    const options = question.options || []; // 確保 options 存在
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

        // 可以根據需求計算總分數，這裡簡單地把所有選中選項的分數加起來
        const newScore = options
            .filter(opt => newSelectedOptionIds.includes(opt.id))
            .reduce((sum, opt) => sum + opt.score, 0);

        onAnswer({ optionIds: newSelectedOptionIds, score: newScore });
    };

    return (
        <div className="flex flex-wrap gap-3"> {/* 使用 flex-wrap 和 gap 讓選項在一行並自動換行 */}
            {options.map(opt => (
                <button
                    key={opt.id}
                    onClick={() => handleOptionClick(opt.id)}
                    className={`
                        py-2 px-4 rounded-lg font-medium transition duration-150 border
                        ${selectedOptionIds.includes(opt.id)
                            ? 'bg-blue-600 text-white shadow-md border-blue-600' // 選中時的樣式
                            : 'bg-white text-gray-800 hover:bg-blue-50 border-gray-300' // 未選中時的樣式
                        }
                    `}
                >
                    {opt.text}
                </button>
            ))}
        </div>
    );
};

// 文字輸入題 (Text)
const TextQuestion: React.FC<QuestionRendererProps> = ({ question, currentAnswer, onAnswer }) => {
    const textValue = currentAnswer.textValue || '';
    
    return (
        <textarea
            rows={3}
            value={textValue}
            onChange={(e) => onAnswer({ textValue: e.target.value })}
            placeholder="請在此輸入您的回答..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 resize-none text-gray-800"
        />
    );
};


// 根據問題類型選擇渲染元件
const QuestionRenderer: React.FC<QuestionRendererProps> = (props) => {
    switch (props.question.type) {
        case 'SCALE':
            return <ScaleQuestion {...props} />;
        case 'SINGLE_CHOICE':
            // 注意：單選題的選項通常在後端 API 中定義
            return <SingleChoiceQuestion {...props} />;
        case 'MULTIPLE_CHOICE':
            // 這裡可以實現多選邏輯
            return <MultipleChoiceQuestion {...props} />; // Placeholder
        case 'TEXT':
            return <TextQuestion {...props} />;
        default:
            return <p className="text-red-500">未知問題類型: {props.question.type}</p>;
    }
};


// ----------------------------------------------------
// 通用问卷组件 (QuestionnaireContent)
// ----------------------------------------------------

export default function QuestionnaireContent({ questionnaireId }: QuestionnaireContentProps) {
    const router = useRouter();
    
    // --- 狀態管理 ---
    const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null);
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [currentPage, setCurrentPage] = useState(0);    
    const [answers, setAnswers] = useState<Answers>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ... (getPageTitle 保持不變) ...
    const getPageTitle = (category: string): string => {
        return CATEGORY_MAP[category.toUpperCase()] || category;
    };


    // ----------------------------------------------------
    // 分頁邏輯 (useMemo 保持不變)
    // ----------------------------------------------------
    const allPages: PageData[] = useMemo(() => {
        if (!questionnaire) return [];
        
        // 1. 按 category 分組，並按 order 排序
        const grouped = questionnaire.questions.reduce((acc, question) => {
            const category = question.category;
            if (!acc[category]) {
                acc[category] = { category: category, pageTitle: category, questions: [] };
            }
            acc[category].questions.push(question);
            return acc;
        }, {} as Record<string, PageData & { category: string }>);
        
        // 2. 將對象轉換為陣列，應用映射標題，並對每個頁面的問題按 order 排序
        return Object.values(grouped)
            // ⭐️ 核心變動：根據 CATEGORY_MAP 的鍵順序來排序頁面
            .sort((a, b) => {
                const keys = Object.keys(CATEGORY_MAP); // 獲取正確的 category 順序
                const indexA = keys.indexOf(a.category.toUpperCase());
                const indexB = keys.indexOf(b.category.toUpperCase());
                // 如果 CATEGORY_MAP 中有定義，就用它的順序，否則保持原始順序
                if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB;
                }
                // 如果不在 CATEGORY_MAP 裡，則回退到按 order 排序 (但這部分比較難實現，通常建議所有 category 都在 map 中)
                // 這裡簡單回退到 0 (不排序)，但最好確保所有 category 都在 map 中
                return 0; 
            })
            .map(page => ({
                pageTitle: getPageTitle(page.pageTitle),    
                questions: page.questions.sort((a, b) => a.order - b.order) // 保持頁面內的問題按 order 排序
            }));
    }, [questionnaire]);

    const TOTAL_PAGES = allPages.length;
    const currentPageData = allPages[currentPage];


    // --- API 調用：獲取問卷 (使用新的 API 響應結構) ---
    const fetchQuestionnaire = useCallback(async () => {
        if (!questionnaireId) {
            setLoadingStatus('error');
            alert("問卷 ID 無效，無法加載。");
            return;
        }

        setLoadingStatus('loading');
        
        try {
            const response = await fetch(`${API_BASE_URL}/questionnaire/${questionnaireId}`, {
                method: "GET",
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `加載失敗，狀態碼: ${response.status}`);
            }

            const responseBody = await response.json();
            // ⭐️ 核心變動：直接取 data.data
            const data = responseBody.data; 

            if (data && data.questions && data.questions.length > 0) {
                setQuestionnaire(data as QuestionnaireData); // 斷言為新的結構
                setLoadingStatus('success');
            } else {
                throw new Error('問卷數據為空或結構不完整。');
            }

        } catch (error) {
            console.error('獲取問卷詳情失敗:', error);
            alert(`問卷加載失敗: ${error instanceof Error ? error.message : String(error)}`);
            setLoadingStatus('error');
        }
    }, [questionnaireId]);    

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [currentPage]);

    useEffect(() => {
        fetchQuestionnaire();
    }, [fetchQuestionnaire]);


    // --- 狀態計算 ---
    const progressPercent = useMemo(() => {
        return TOTAL_PAGES > 0 ? Math.round(((currentPage) / TOTAL_PAGES) * 100) : 0;
    }, [currentPage, TOTAL_PAGES]);
    
    // 檢查當前頁面是否完成，現在需要檢查所有回答的屬性
    const isCurrentPageComplete = useMemo(() => {
        if (!currentPageData) return false;
        
        return currentPageData.questions.every(q => {
            const answer = answers[q.id];
            if (!q.required) return true; // 如果不是必填，則視為完成

            if (!answer) return false; // 沒有答案

            switch (q.type) {
                case 'SCALE':
                    return answer.score !== undefined;
                case 'SINGLE_CHOICE':
                    return answer.optionIds;
                case 'MULTIPLE_CHOICE':
                    return answer.optionIds && answer.optionIds.length > 0;
                case 'TEXT':
                    // 檢查 textValue 不為空
                    return answer.textValue && answer.textValue.trim() !== ''; 
                default:
                    return false;
            }
        });
    }, [answers, currentPageData]);

    // --- 交互處理 ---
    // 答案處理現在接收一個 Question ID 和完整的 AnswerValue 物件
    const handleAnswer = (questionId: number, answerValue: AnswerValue) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answerValue,
        }));
    };

    const handleNext = () => {
        if (!isCurrentPageComplete) {
            alert("請先完成本頁所有題目才能進入下一頁。");
            return;
        }

        if (currentPage < TOTAL_PAGES - 1) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevious = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };


    // ----------------------------------------------------
    // 提交問卷 (重大修改)
    // ----------------------------------------------------
    const handleSubmit = async () => {
        if (!isCurrentPageComplete) {
            alert("請先完成本頁所有題目才能提交問卷。");
            return;
        }

        setIsSubmitting(true);
        
        const currentUserId = localStorage.getItem('userId');
        const userToken = localStorage.getItem('authToken');
        const currentProjectId = localStorage.getItem('currentProjectId');

        if (!currentUserId || !userToken) {
            alert("您尚未登入或登入資訊已過期，無法提交問卷。請重新登入。");    
            setIsSubmitting(false);
            router.push('/login');    
            return;
        }
        if (!currentProjectId) {
            alert("錯誤：無法找到專案 ID。");    
            setIsSubmitting(false);
            return;
        }
        if (!questionnaire) {
            alert("錯誤：問卷資料尚未載入。");
            setIsSubmitting(false);
            return;
        }

        const answersPayload = Object.entries(answers).reduce<{
            questionId: number;
            optionId: number | null;
            value: number | null;
            textValue: string | null;
        }[]>((acc, [idString, answerValue]) => {
            const questionId = parseInt(idString, 10);
            const question = questionnaire.questions.find(q => q.id === questionId);

            if (!question) return acc; // 忽略找不到的問題

            // 處理不同類型的答案
            if (question.type === 'SCALE') {
                const scaleValue = typeof answerValue.score === 'number' ? answerValue.score : null;

                acc.push({
                    questionId: questionId,
                    optionId: null,
                    value: scaleValue !== null ? scaleValue * 20 : null,
                    textValue: null,
                });
            } else if (question.type === 'SINGLE_CHOICE' && answerValue.optionIds?.[0]) {
                const optionId = answerValue.optionIds[0];
                const selectedOption = question.options?.find(opt => opt.id === optionId);
                const valueToSubmit = selectedOption?.value ?? null;
                acc.push({
                    questionId: questionId,
                    optionId: optionId,
                    value: valueToSubmit, 
                    textValue: null,
                });

            } else if (question.type === 'TEXT') {
                acc.push({
                    questionId: questionId,
                    optionId: null,
                    value: null,
                    textValue: answerValue.textValue ?? null, // 文字回答或 null
                });
            }
            // 忽略其他類型或未完成的答案
            return acc;
        }, []);
        
        const parsedUserId = parseInt(currentUserId, 10);
        const parsedProjectId = parseInt(currentProjectId, 10);
        const parsedVersionId = typeof questionnaireId === 'number'
            ? questionnaireId
            : questionnaireId !== null && questionnaireId !== undefined
                ? parseInt(String(questionnaireId), 10)
                : NaN;

        const finalPayload = {
            userId: parsedUserId,
            projectId: parsedProjectId,
            versionId: parsedVersionId,
            answers: answersPayload,
        };

        console.log('--- 準備提交的 finalPayload ---');
        console.log(finalPayload);
        console.log('---------------------------------');
        try {
            const response = await fetch(`${API_BASE_URL}/response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`,    
                },
                body: JSON.stringify(finalPayload),    
            });

            if (response.ok) {
                alert("問卷提交成功！");
                router.push('/report');    
            } else {
                let errorDetail = '伺服器錯誤 (500)';
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        // 嘗試提取 message 或 error 字段
                        errorDetail = errorData.message || errorData.error || errorDetail;
                    } else {
                        // 嘗試獲取非 JSON 文本，例如 HTML 錯誤頁面
                        const errorText = await response.text();
                        console.error('伺服器 500 錯誤的原始回應:', errorText.substring(0, 200)); // 只顯示前 200 字元
                        errorDetail = `伺服器 500 錯誤，請檢查後台日誌。`;
                    }
                } catch (parseError) {
                    console.error('解析錯誤訊息失敗:', parseError);
                    errorDetail = '伺服器返回了無法解析的回應。';
                }
                alert(`提交失敗: ${errorDetail}`);
            }
        } catch (error) {
            console.error('提交錯誤:', error);
            alert("提交過程中發生網路錯誤。");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // --- 渲染邏輯 (UI 部分) ---

    // Loading 和 Error 狀態渲染
    if (loadingStatus === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-xl font-medium text-purple-800">正在加载问卷...</p>
            </div>
        );
    }

    if (loadingStatus === 'error' || !questionnaire) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="p-8 bg-white rounded-xl shadow-lg text-center">
                    <p className="text-xl font-bold text-red-600 mb-4">问卷加载失败或不存在。</p>
                    <button 
                        onClick={fetchQuestionnaire} 
                        className="py-2 px-4 bg-purple-800 text-white rounded-lg hover:bg-purple-700"
                    >
                        重试加载
                    </button>
                </div>
            </div>
        );
    }



    // 渲染主體
    return (
        <div className="min-h-screen bg-gray-50">
            <main className="pt-8 flex flex-col items-center min-h-[calc(100vh)] px-4">
                <div className="w-full max-w-3xl bg-white p-8 rounded-xl shadow-lg mt-15">
                    {/* 問卷題目 titleA */}
                    <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-4">
                        {questionnaire.title}
                    </h1>

                    {/* 问卷描述 description */}
                    {questionnaire.description && (
                        <p className="text-left text-gray-500 mb-8">{questionnaire.description}</p>
                    )}

                    {/* 进度条 (Progress Bar) */}
                    <div className="w-full mb-8">
                        <div className="text-sm font-medium text-gray-700 mb-2 flex justify-between">
                            <span>第 {currentPage + 1} / {TOTAL_PAGES} 頁</span>
                            <span>{progressPercent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                                className="bg-purple-700 h-2.5 rounded-full transition-all duration-500" 
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* 當期分頁內容 */}
                    {currentPageData && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center border-b pb-3">
                                {currentPageData.pageTitle}
                            </h2>

                            <div className="space-y-6">
                                {currentPageData.questions.map((q) => (
                                    <div key={q.id} className="p-4 border rounded-lg bg-gray-50">
                                        <p className="font-semibold text-gray-700 mb-3">
                                            {q.text} 
                                            {q.required && <span className="text-red-500 ml-1">*</span>}
                                        </p>
                                        
                                        {/* ⭐️ 渲染區塊：根據 type 渲染不同 UI */}
                                        <div className="flex justify-center sm:justify-start">
                                            <QuestionRenderer
                                                question={q}
                                                currentAnswer={answers[q.id] || {}}
                                                onAnswer={(answer) => handleAnswer(q.id, answer)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 導航按鈕 */}
                    <div className="flex justify-between mt-10 pt-6 border-t">

                        <button
                            onClick={handlePrevious}
                            disabled={currentPage === 0 || isSubmitting}
                            className="py-2 px-6 bg-gray-500 text-white font-bold rounded-lg transition duration-150 hover:bg-gray-400 disabled:opacity-50"
                        >
                            上一步
                        </button>

                        {currentPage < TOTAL_PAGES - 1 ? (
                            <button
                                onClick={handleNext}
                                disabled={!isCurrentPageComplete || isSubmitting} // 未填完或提交中不給進入下一頁
                                className="py-2 px-6 bg-purple-700 text-white font-bold rounded-lg transition duration-150 hover:bg-purple-500 disabled:opacity-50"
                            >
                                下一步
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !isCurrentPageComplete}
                                className="py-2 px-6 bg-green-600 text-white font-bold rounded-lg transition duration-150 hover:bg-green-500 disabled:opacity-50"
                            >
                                {isSubmitting ? '提交中...' : '完成並提交'}
                            </button>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}