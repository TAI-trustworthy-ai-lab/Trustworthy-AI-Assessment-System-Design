"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import translate from 'google-translate-api-x';

// ----------------------------------------------------
//  其他檔案資料 IMPORT FROM OTHERS FOLDER
// ----------------------------------------------------
import { CATEGORY_MAP } from '@/config/constants'; 
import { 
    fetchQuestionnaire as fetchQuestionnaireService, 
    saveDraft as saveDraftService,
    loadDraft as loadDraftService,
    submitQuestionnaire as submitQuestionnaireService,
    generateReport as generateReportService,
} from '@/services/responseService';


// ----------------------------------------------------
// 翻譯工具函式 (Google Translate API-X)
// ----------------------------------------------------
const capitalizeFirstLetter = (text: string) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
};
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
const TranslatedText: React.FC<{ text: string; capitalize?: boolean }> = ({ text, capitalize = false }) => {
    const { i18n } = useTranslation();
    const [translated, setTranslated] = useState(text);

    useEffect(() => {
        if (i18n.language.startsWith("en")) {
            translateText(text, "zh-CN", "en").then(result => {
                setTranslated(capitalize ? capitalizeFirstLetter(result) : result);
            });
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
// 後端回傳資料結構定義 BACKEND DATA STRUCT. HANDLE
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

type PayloadAnswer = {
    questionId: number;
    optionId: number | null;
    optionIds: number[] | null;
    value: number | null;
    textValue: string | null;
}[]


type Answers = Record<number, AnswerValue>;
// ----------------------------------------------------
//  傳入後端 Answer 格式 FORMAT FOR ANS
// ----------------------------------------------------
const formatAnswersForSubmission = (currentAnswers: Answers, allQuestions: Question[]): PayloadAnswer => {
    return Object.entries(currentAnswers).reduce<PayloadAnswer>((acc, [idString, answerValue]) => {
        const questionId = parseInt(idString, 10);
        const question = allQuestions.find(q => q.id === questionId);

        if (!question) return acc;
        const scoreToSubmit = typeof answerValue.score === 'number' ? answerValue.score : null;

        // handle different type of questions
        if (question.type === 'SCALE' || question.type === 'SINGLE_CHOICE') {
            const optionId = answerValue.optionIds?.[0] ?? null;
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
                textValue: answerValue.textValue ?? null, 
            });
        }
        return acc;
    }, []);
};

// ----------------------------------------------------
// Loading UI - 提交按鈕上的指示器
// ----------------------------------------------------
const SubmissionLoadingIndicator: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="flex items-center justify-center space-x-2">
            <span className="font-bold">{t('Questionnaire.submitting')}</span>
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
// Loading Overlay - 全頁面 loading 設計
// ----------------------------------------------------
const FullPageLoadingOverlay: React.FC<{ message: string }> = ({ message }) => {
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 z-[100] bg-gray-800/40 bg-opacity-70 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300">
            <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-2xl">
                <svg
                    className="w-16 h-16 text-indigo-600 animate-spin mb-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{message}</h3>
                <p className="text-sm text-gray-500">{t('Questionnaire.overlay.doNotClose')}</p>
            </div>
        </div>
    );
};

// ----------------------------------------------------
// 錯誤提示組件 ERROR COMPONENT
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
// 根據 Type 渲染不同 UI  QUESTION TYPE UI
// ----------------------------------------------------
interface QuestionRendererProps {
    question: Question;
    currentAnswer: AnswerValue;
    onAnswer: (answer: AnswerValue) => void;
}

// 1. SCALE type
const ScaleQuestion: React.FC<QuestionRendererProps> = ({ question, currentAnswer, onAnswer }) => {
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

// 2. SINGLE_CHOICE
const SingleChoiceQuestion: React.FC<QuestionRendererProps> = ({ question, currentAnswer, onAnswer }) => {
    const options = question.options || [];
    const selectedOptionId = currentAnswer.optionIds?.[0];

    return (
        <div className="flex flex-wrap gap-3">
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
                    <TranslatedText text={opt.text} capitalize={true} />
                </button>
            ))}
        </div>
    );
};

// 3. MULTIPLE_CHOICE 
const MultipleChoiceQuestion: React.FC<QuestionRendererProps> = ({ question, currentAnswer, onAnswer }) => {
    const options = question.options || [];
    const selectedOptionIds = currentAnswer.optionIds || [];

    const handleOptionClick = (optionId: number) => {
        let newSelectedOptionIds;
        if (selectedOptionIds.includes(optionId)) {
            // If selected, remove previous selection
            newSelectedOptionIds = selectedOptionIds.filter(id => id !== optionId);
        } else {
            // If didn't select, select
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
                    <TranslatedText text={opt.text} capitalize={true} />
                </button>
            ))}
        </div>
    );
};

// 4. TEXT
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
// 問卷內容主組件 QUESTIONNAIRE INFO CONTENT
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
    const [draftResponseId, setDraftResponseId] = useState<number | null>(null);
    const [isSavingDraft, setIsSavingDraft] = useState(false);


    // =============
    //     分頁
    // =============
        // 1. Using TAI MAP for description of every TAI
    const getPageTitle = (category: string): string => {
        return CATEGORY_MAP[category.toUpperCase()] || category;
    };

        // 2. Data result handling for every page
    const allPages: PageData[] = useMemo(() => {
        if (!questionnaire) return [];

        // Reorder category, by TAI indicators
        const grouped = questionnaire.questions.reduce((acc, question) => {
            const category = question.category;
            if (!acc[category]) {
                acc[category] = { category: category, pageTitle: category, questions: [] };
            }
            acc[category].questions.push(question);
            return acc;
        }, {} as Record<string, PageData & { category: string }>);

        // Order sequences for pages
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

    // =============
    //  BCKEND API
    // =============
    // 1. 取問卷内容
    const fetchQuestionnaire = useCallback(async () => {
        // 預設問卷 ID 無誤 & 後端截取資料結構一定正確！
        setLoadingStatus('loading');
        if (!questionnaireId) { 
             setLoadingStatus('error');
             setSubmissionError("問卷 ID 缺失，無法加載。");
             return;
        }

        try {
            const data = await fetchQuestionnaireService(questionnaireId); 
            
            setQuestionnaire(data as QuestionnaireData);
            setLoadingStatus('success');
            setSubmissionError(null);
        } catch (error: any) {
            let message = `問卷加載失敗: ${t('Questionnaire.error.unknown')}`;
            try {
                const errorObj = JSON.parse(error.message);
                message = `問卷加載失敗 (${errorObj.status}): ${errorObj.message}`;
            } catch (e) {

            }

            console.error('獲取問卷詳情失敗:', error);
            setSubmissionError(message);
            setLoadingStatus('error');
        }
    }, [questionnaireId]);

    // 2. 儲存草稿
    const saveDraft = useCallback(async (currentAnswers: Answers, currentDraftId: number | null) => {
        if (!questionnaire) return;
        
        setIsSavingDraft(true);
        setSubmissionError(null);

        const answersPayload = formatAnswersForSubmission(currentAnswers, questionnaire.questions);
        const currentUserId = localStorage.getItem('userId');
        const currentProjectId = localStorage.getItem('currentProjectId');

        const parsedUserId = parseInt(currentUserId || '0', 10);
        const parsedProjectId = parseInt(currentProjectId || '0', 10);
        const parsedVersionId = typeof questionnaireId === 'number' ? questionnaireId : parseInt(String(questionnaireId), 10);

        const basePayload = {
            answers: answersPayload,
            isDraft: true, // 標記為草稿
        };

        let finalPayload: any = basePayload;
        
        // 如果是 POST (創建草稿)，則需要這些 ID
        if (!currentDraftId) {
            finalPayload = {
                ...basePayload,
                userId: parsedUserId,
                projectId: parsedProjectId,
                versionId: parsedVersionId,
            };
        }
/* 後端 PATCH 有問題，暫時注解掉
        try {
            const data = await saveDraftService(finalPayload, currentDraftId);
            const newResponseId = data.id;
            
            if (!currentDraftId) {
                setDraftResponseId(newResponseId); // 設置新的草稿 ID
                localStorage.setItem('draftResponseId', newResponseId.toString()); // 儲存到 LocalStorage
            }
            console.log(`草稿儲存成功: ID ${newResponseId}`);
        } catch (error: any) {
            let errorMsg = `儲存草稿失敗`;
            try {
                const errorObj = JSON.parse(error.message);
                console.error(`儲存草稿失敗 (${errorObj.status})`, errorObj);
                errorMsg += ` (${errorObj.status}): ${errorObj.message}`;
            } catch (e) {

            }
        } finally {
            setIsSavingDraft(false);
        }
*/
    }, [questionnaire, questionnaireId]);

    // 3. 載入草稿
    const loadDraft = useCallback(async (draftId: number, token: string) => {
        try {
            const data = await loadDraftService(draftId);
            const draftData = data;

            const loadedAnswers: Answers = (draftData.answers || []).reduce((acc: Answers, ans: any) => {
                acc[ans.questionId] = {
                    score: ans.value || undefined,
                    optionIds: ans.optionIds || (ans.optionId ? [ans.optionId] : undefined),
                    textValue: ans.textValue || undefined,
                };
                return acc;
            }, {});
                
            setAnswers(loadedAnswers);
        } catch (error) {
            console.error('載入草稿時發生網路錯誤:', error);
            localStorage.removeItem('draftResponseId');
            setDraftResponseId(null);
        }
    }, []);

    // 4. 生成報告
    const generateReport = async (responseId: number) => {
        try {
            await generateReportService(responseId);
            return true;
        } catch (error) {
            console.error("報告生成過程中發生錯誤:", error);
            return false;
        }
    };


    // =============
    //   useEffect
    // =============
    // 1. 下一頁自動划去最高點
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setSubmissionError(null);
    }, [currentPage]);

    // 2. 取問卷資料
    useEffect(() => {
        fetchQuestionnaire().then(() => {
            const savedDraftIdString = localStorage.getItem('draftResponseId');
            const userToken = localStorage.getItem('authToken');
            
            if (savedDraftIdString && userToken) {
                const savedDraftId = parseInt(savedDraftIdString, 10);
                setDraftResponseId(savedDraftId);
                // 載入草稿答案並覆蓋初始的空答案
                loadDraft(savedDraftId, userToken);
            }
        });
    }, [fetchQuestionnaire, loadDraft]);

    // 3. 自動儲存機制（每 30 秒自動儲存）
/* 後端 PATCH 有問題，暫時注解掉！！！
    useEffect(() => {
        if (loadingStatus !== 'success') return;
        const intervalId = setInterval(() => {
            saveDraft(answers, draftResponseId); 
        }, 30000); 

        return () => clearInterval(intervalId); // 清除定時器
    }, [answers, draftResponseId, saveDraft, loadingStatus]);
*/  

    // =============
    //   分頁進度
    // =============
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

    // =============
    //  不同處理
    // =============
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

    // =============
    // 後端提交問卷
    // =============
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
        const answersPayload = formatAnswersForSubmission(answers, questionnaire.questions);
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
            const data = await submitQuestionnaireService(finalPayload);
            const responseId = data.id;

            localStorage.setItem('responseId', responseId.toString());
            localStorage.removeItem('draftResponseId');
            setDraftResponseId(null);
            setSubmittedResponseId(responseId);
            setIsGeneratingReport(true);

            const reportGeneratedSuccessfully = await generateReport(responseId); 
            if (!reportGeneratedSuccessfully) {
                throw new Error('提交報告發生錯誤。'); 
            }
            setShowSuccessModal(true);
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
                        {t('Questionnaire.actions.viewReport')}
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
                            <h2 className="text-xl font-bold text-gray-800 mb-6 text-left border-b pb-3">
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
                    <div className="flex justify-between mt-10 pt-6 border-t px-4 sm:px-0">

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
                                className="py-2 px-6 bg-green-600 text-white font-bold rounded-lg transition duration-150 hover:bg-green-500 disabled:opacity-50 flex items-center justify-center min-w-[150px]"
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
