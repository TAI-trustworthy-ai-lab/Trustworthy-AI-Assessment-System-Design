"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import translate from 'google-translate-api-x';
// ----------------------------------------------------
// 翻譯工具函式 (Google Translate API-X)
// ----------------------------------------------------
const translateText = async (text: string, source = "zh-CN", target = "en") => {
    const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source, target })
    });

    const data = await res.json();
    return data.translatedText;
};
//用於條件或迴圈時的翻譯
const TranslatedText: React.FC<{ text: string }> = ({ text }) => {
    const { i18n } = useTranslation();
    const [translated, setTranslated] = useState(text);

    useEffect(() => {
        if (i18n.language.startsWith("en")) {
            translateText(text, "zh-CN", "en").then(setTranslated);
        } else {
            setTranslated(text);
        }
    }, [text, i18n.language]);

    return <>{translated}</>;
};

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
    "UNKNOWN": "未知分類：{{category}}"
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

interface QuestionnaireData {
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


type Answers = Record<number, AnswerValue>; 

// ----------------------------------------------------
// Loading UI - 提交按鈕上的指示器
// ----------------------------------------------------
const SubmissionLoadingIndicator: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="flex items-center justify-center space-x-2">
            <span className="font-bold">{t('questionnaire.submitting')}</span>
            {/* Animated Dots using Tailwind's built-in animate-pulse */}
            <div className="flex items-end h-4 pb-0.5">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
        </div>
    );
};


// ----------------------------------------------------
// Loading Overlay - 全頁面 loading設計
// ----------------------------------------------------
const FullPageLoadingOverlay: React.FC<{ message: string }> = ({ message }) => {
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 z-[100] bg-gray-800/40 bg-opacity-70 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300">
            <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-2xl">
                {/* 這裡使用一個旋轉的齒輪圖標，或替換成其他有趣的 SVG/動畫 */}
                <svg
                    className="w-16 h-16 text-indigo-600 animate-spin mb-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    {/* 旋轉齒輪或類似圖案 */}
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{message}</h3>
                <p className="text-sm text-gray-500">{t('Questionnaire.overlay.doNotClose')}</p>
            </div>
        </div>
    );
};

// ----------------------------------------------------
// 錯誤提示組件
// ----------------------------------------------------
const ErrorAlert: React.FC<{ message: string | null, onClose: () => void }> = ({ message, onClose }) => {
    if (!message) return null;
    return (
        <div 
            className="fixed top-0 left-0 right-0 z-50 p-4 bg-red-600 text-white shadow-lg flex items-center justify-between transition-opacity duration-300"
            role="alert"
        >
            <p className="font-medium">{message}</p>
            <button 
                onClick={onClose}
                className="text-white opacity-90 hover:opacity-100 font-bold text-2xl ml-4"
            >
                &times;
            </button>
        </div>
    );
};


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
    const { t } = useTranslation();
    return (
        <textarea
            rows={3}
            value={textValue}
            onChange={(e) => onAnswer({ textValue: e.target.value })}
            placeholder={t('Questionnaire.placeholder.answer')}
            className="w-full p-3 border border-gray-300 rounded-lg resize-none text-gray-700 
                       focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
        />
    );
};


// ----------------------------------------------------
// 問題渲染器：根據 type 選擇組件
// ----------------------------------------------------
const QuestionRenderer: React.FC<QuestionRendererProps> = (props) => {
    const { t } = useTranslation();
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
            return <p className="text-red-500">{t('Questionnaire.error.unknownType', { type: props.question.type })}</p>;
    }
};


// ----------------------------------------------------
// 問卷內容主組件
// ----------------------------------------------------

export default function QuestionnaireContent({ questionnaireId }: { questionnaireId: string | number | null }) {
    const router = useRouter();
    const { t } = useTranslation();
    const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null);
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [currentPage, setCurrentPage] = useState(0); 
    const [answers, setAnswers] = useState<Answers>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [submittedResponseId, setSubmittedResponseId] = useState<number | null>(null);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);


    // 1. 根據指標映射表獲取分頁標題
    const getPageTitle = (category: string): string => {
        return CATEGORY_MAP[category.toUpperCase()] || category;
    };

    // 2. 分頁資料結果處理
    const allPages: PageData[] = useMemo(() => {
        if (!questionnaire) return [];
        
        // 按 category 分組
        const grouped = questionnaire.questions.reduce((acc, question) => {
            const category = question.category;
            if (!acc[category]) {
                acc[category] = { category: category, pageTitle: category, questions: [] };
            }
            acc[category].questions.push(question);
            return acc;
        }, {} as Record<string, PageData & { category: string }>);
        
        // 每個頁面的問題按 order 排序
        return Object.values(grouped)
            .sort((a, b) => {
                const keys = Object.keys(CATEGORY_MAP);
                const indexA = keys.indexOf(a.category.toUpperCase());
                const indexB = keys.indexOf(b.category.toUpperCase());
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                return 0; 
            })
            .map(page => ({
                pageTitle: getPageTitle(page.pageTitle), 
                questions: page.questions.sort((a, b) => a.order - b.order) // 保持頁面內的問題按 order 排序
            }));
    }, [questionnaire]);

    // 3. 總頁數與當前頁面資料
    const TOTAL_PAGES = allPages.length;
    const currentPageData = allPages[currentPage];
    const API_BASE_URL = "http://localhost:3001/api";

    // 4. --- 後端取問卷資料 --- //
    const fetchQuestionnaire = useCallback(async () => {
        // 預設問卷 ID 無誤 & 後端截取資料結構一定正確！
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
            const data = responseBody.data; 
            setQuestionnaire(data as QuestionnaireData);
            setLoadingStatus('success');
            setSubmissionError(null);
        } catch (error) {
            console.error('獲取問卷詳情失敗:', error);
            setSubmissionError(`問卷加載失敗: ${error instanceof Error ? error.message : String(error)}`);
            setLoadingStatus('error');
        }
    }, [questionnaireId]);

    // 5. 分頁切換處理
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setSubmissionError(null);
    }, [currentPage]);

    useEffect(() => {
        fetchQuestionnaire();
    }, [fetchQuestionnaire]);


    // 6. 進度計算與頁面完成檢查
    const progressPercent = useMemo(() => {
        return TOTAL_PAGES > 0 ? Math.round(((currentPage) / TOTAL_PAGES) * 100) : 0;
    }, [currentPage, TOTAL_PAGES]);
    
    const isCurrentPageComplete = useMemo(() => {
        if (!currentPageData) return false;
        
        return currentPageData.questions.every(q => {
            const answer = answers[q.id];
            if (!q.required) return true; 
            if (!answer) return false; 

            switch (q.type) {
                case 'SCALE':
                    return answer.score !== undefined;
                case 'SINGLE_CHOICE':
                    return answer.optionIds;
                case 'MULTIPLE_CHOICE':
                    return answer.optionIds && answer.optionIds.length > 0;
                case 'TEXT':
                    return answer.textValue && answer.textValue.trim() !== ''; 
                default:
                    return false;
            }
        });
    }, [answers, currentPageData]);

    // 7. --- 後端製造報告 --- //
    const generateReport = async (responseId: number, token: string) => {
        const url = `${API_BASE_URL}/report/generate/${responseId}`;
        // 假設後端一定會成功生成報告
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            return true;
        } catch (error) {
            console.error("報告生成過程中發生網路錯誤:", error);
            return false;
        }
    };

    // 8. 處理答案變更與分頁導航
    const handleAnswer = (questionId: number, answerValue: AnswerValue) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answerValue,
        }));
    };

    const handleNext = () => {
        if (currentPage < TOTAL_PAGES - 1) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevious = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    // 9. 提交問卷處理
    const handleSubmit = async () => {
        setIsSubmitting(true);
        setSubmissionError(null);
        
        const currentUserId = localStorage.getItem('userId');
        const userToken = localStorage.getItem('authToken');
        const currentProjectId = localStorage.getItem('currentProjectId');

        // 錯誤處理：基本不會使用到
        if (!currentUserId || !userToken) {
            setSubmissionError("您尚未登入或登入資訊已過期，無法提交問卷。請重新登入。"); // ⭐️ 替換 alert
            setIsSubmitting(false);
            router.push('/login'); 
            return;
        }
        if (!currentProjectId) {
            setSubmissionError("錯誤：無法找到專案 ID。"); 
            setIsSubmitting(false);
            return;
        }
        if (!questionnaire) {
            setSubmissionError("錯誤：問卷資料尚未載入。"); 
            setIsSubmitting(false);
            return;
        }

        // ** 記錄 answer[] 結構 **
        const answersPayload = Object.entries(answers).reduce<{
            questionId: number;
            optionId: number | null; // 給 SINGLE_CHOICE/SCALE 用
            optionIds: number[] | null; // 給 MULTIPLE_CHOICE 用
            value: number | null;
            textValue: string | null;
        }[]>((acc, [idString, answerValue]) => {
            const questionId = parseInt(idString, 10);
            const question = questionnaire.questions.find(q => q.id === questionId);

            if (!question) return acc; 
            const scoreToSubmit = typeof answerValue.score === 'number' ? answerValue.score : null;

            // 處理不同類型的答案
            if (question.type === 'SCALE') {
                const optionId = answerValue.optionIds?.[0] ?? null;
                acc.push({
                    questionId: questionId,
                    optionId: optionId,
                    optionIds: null, 
                    value: scoreToSubmit, 
                    textValue: null,
                });

            } else if (question.type === 'SINGLE_CHOICE' && answerValue.optionIds?.[0]) {
                const optionId = answerValue.optionIds[0];
                acc.push({
                    questionId: questionId,
                    optionId: optionId,
                    optionIds: null, 
                    value: scoreToSubmit, 
                    textValue: null,
                });

            } else if (question.type === 'MULTIPLE_CHOICE' && answerValue.optionIds && answerValue.optionIds.length > 0) {
                acc.push({
                    questionId: questionId,
                    optionId: null, 
                    optionIds: answerValue.optionIds, 
                    value: scoreToSubmit, 
                    textValue: null,
                });
            } else if (question.type === 'TEXT') {
                acc.push({
                    questionId: questionId,
                    optionId: null,
                    optionIds: null,
                    value: null,
                    textValue: answerValue.textValue ?? null, // 文字回答或 null
                });
            }
            return acc;
        }, []);
        
        const parsedUserId = parseInt(currentUserId, 10);
        const parsedProjectId = parseInt(currentProjectId, 10);
        const parsedVersionId = typeof questionnaireId === 'number'
            ? questionnaireId
            : questionnaireId !== null && questionnaireId !== undefined
                ? parseInt(String(questionnaireId), 10)
                : NaN;

        // ** 最終提交的 Payload 結構 **
        const finalPayload = {
            userId: parsedUserId,
            projectId: parsedProjectId,
            versionId: parsedVersionId,
            answers: answersPayload,
        };


        // --- 提交問卷給後端 --- //
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
                const data = await response.json();
                const responseId = data.data.id;
                
                localStorage.setItem('responseId', responseId.toString());
                setSubmittedResponseId(responseId);
                setIsGeneratingReport(true);
                await generateReport(responseId, userToken);
                setShowSuccessModal(true); 
                
            } else {
                let errorDetail = `伺服器錯誤 (${response.status})`;
                setSubmissionError(`提交失敗: ${errorDetail}`); 
            }
        } catch (error) {
            console.error('提交錯誤:', error);
            setSubmissionError("提交過程中發生網路錯誤。"); 
        } finally {
            setIsSubmitting(false);
            setIsGeneratingReport(false);
        }
    };
    
    
    // 10. 成功提交後的 Modal 組件
    const SuccessModal = () => (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm text-center">
                <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-900mb-2">{t('Questionnaire.submitSuccess')}</h3>
                <p className="text-gray-600 mb-6">{t('Questionnaire.report.generated')}。</p>
                <div className="flex justify-center space-x-4">
                    <button
                        onClick={() => router.push('/home')}
                        className="py-2 px-4 bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300 transition duration-150"
                    >
                        {t('Questionnaire.actions.backToHome')}
                    </button>
                    <button
                        onClick={() => router.push('/report')}
                        className="py-2 px-4 bg-violet-600 text-white font-semibold rounded-lg shadow-md hover:bg-violet-800 transition duration-150"
                    >
                        {t('Questionnaire.actions.backToHome')}
                    </button>
                </div>
            </div>
        </div>
    );

    // 11. loading / error 狀態處理
    if (loadingStatus === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-xl font-medium text-purple-800">{t('Questionnaire.loading')}</p>
            </div>
        );
    }

    if (loadingStatus === 'error' || !questionnaire) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="p-8 bg-white rounded-xl shadow-lg text-center">
                    <p className="text-xl font-bold text-red-600 mb-4">{t('Questionnaire.loadFailedOrMissing')}</p>
                    <p className="text-gray-600 mb-4">{submissionError}</p>
                    <button 
                        onClick={fetchQuestionnaire} 
                        className="py-2 px-4 bg-purple-800 text-white rounded-lg hover:bg-purple-700 transition duration-150"
                    >
                        {t('Questionnaire.actions.retryLoad')}
                    </button>
                </div>
            </div>
        );
    }



    // 12. 正常問卷內容渲染!!!
    return (
        <div className="min-h-screen bg-gray-50">
            {/* 頂部錯誤提示 */}
            <ErrorAlert 
                message={submissionError} 
                onClose={() => setSubmissionError(null)} 
            />
            
            <main className="pt-8 flex flex-col items-center min-h-[calc(100vh)] px-4">
                <div className="w-full max-w-3xl bg-white p-8 rounded-xl shadow-lg mt-15">
                    {/* 問卷題目 titleA */}
                    <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-4">
                        {<TranslatedText text={questionnaire.title} />}
                    </h1>

                    {/* 问卷描述 description */}
                    {<TranslatedText text={questionnaire.description} /> && (
                        <p className="text-left text-gray-500 mb-8">{<TranslatedText text={questionnaire.description} />}</p>
                    )}

                    {/* 进度条 (Progress Bar) */}
                    <div className="w-full mb-8">
                        <div className="text-sm font-medium text-gray-700 mb-2 flex justify-between">
                            <span>{t('Questionnaire.progress.page', { current: currentPage + 1, total: TOTAL_PAGES })}</span>
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
                                {<TranslatedText text={currentPageData.pageTitle} />}
                            </h2>

                            <div className="space-y-6">
                                {currentPageData.questions.map((q) => (
                                    <div key={q.id} className="p-4 border rounded-lg bg-gray-50">
                                        <p className="font-semibold text-gray-700 mb-3">
                                            {<TranslatedText text={q.text} />}
                                            {q.required && <span className="text-red-500 ml-1">*</span>}
                                        </p>

                                        {/* 根據 type 渲染不同 UI */}
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
                            {t('Questionnaire.actions.prev')}
                        </button>

                        {currentPage < TOTAL_PAGES - 1 ? (
                            <button
                                onClick={handleNext}
                                disabled={!isCurrentPageComplete || isSubmitting} // 未填完或提交中不給進入下一頁
                                className="py-2 px-6 bg-violet-600 text-white font-bold rounded-lg transition duration-150 hover:bg-violet-500 disabled:opacity-50"
                            >
                                {t('Questionnaire.actions.next')}
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !isCurrentPageComplete}
                                // 增加 min-width 以確保動畫有足夠空間
                                className="py-2 px-6 bg-green-600 text-white font-bold rounded-lg transition duration-150 hover:bg-green-500 disabled:opacity-50 flex items-center justify-center min-w-[150px]"
                            >
                                {isSubmitting ? <SubmissionLoadingIndicator /> : t('Questionnaire.actions.finishAndSubmit')}
                            </button>
                        )}
                    </div>
                </div>
            </main>
            {/* Modal 渲染移到最頂層，由狀態控制 */}
            {showSuccessModal && <SuccessModal />}
            {isGeneratingReport && <FullPageLoadingOverlay message={t('Questionnaire.report.generating')} />}
        </div>
    );
}
