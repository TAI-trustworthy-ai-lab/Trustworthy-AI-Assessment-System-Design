"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
// Floating chat window component
import FloatingChatWindow from '@/components/FloatingChatWindow'; 
// --- Data and Services ---
import { CATEGORY_MAP } from '@/config/constants'; 
import { 
    fetchQuestionnaire as fetchQuestionnaireService, 
    submitQuestionnaire as submitQuestionnaireService,
    generateReport as generateReportService,
} from '@/services/responseService';


// ----------------------------------------------------
// Translation Cache and Utilities
// ----------------------------------------------------
const translationCache: {
    zh: Record<string, string>;
    en: Record<string, string>;
} = {
    zh: {},
    en: {},
};

// Capitalize first letter utility
const capitalizeFirstLetter = (text: string) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
};

// API call for text translation
const translateText = async (text: string, source = "zh-CN", target = "en") => {
    const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source, target }),
    });

    const data = await res.json();
    return data.translatedText;
};

// Translated Text Component with cache logic
const TranslatedText: React.FC<{ text: string; capitalize?: boolean }> = ({
    text,
    capitalize = false,
}) => {
    const { i18n } = useTranslation();
    const [translated, setTranslated] = useState(text);
    useEffect(() => {
        let isActive = true; // Effect lifecycle flag

        if (!translationCache.zh[text]) {
            translationCache.zh[text] = text; // Cache original text
        }

        if (i18n.language.startsWith("en")) {
            // Check English cache
            if (translationCache.en[text]) {
                setTranslated(
                    capitalize ? capitalizeFirstLetter(translationCache.en[text]) : translationCache.en[text]
                );
            } else {
                // Fetch translation
                translateText(text, "zh-CN", "en").then((result) => {
                    if (isActive) {
                        result = result || translationCache.zh[text]; // Fallback to Chinese
                        translationCache.en[text] = result;
                        setTranslated(capitalize ? capitalizeFirstLetter(result) : result);
                    }
                });
            }
        } else {
            // Use Chinese text directly
            setTranslated(translationCache.zh[text]);
        }
        return () => {
            isActive = false; // Cleanup
        };
    }, [text, i18n.language, capitalize]);

    return <>{translated}</>;
};

// Simple hook replacement for Next.js router push
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
// Backend Data Structures
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
    description: string;
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
// Format Answers for API Submission
// ----------------------------------------------------
const formatAnswersForSubmission = (currentAnswers: Answers, allQuestions: Question[]): PayloadAnswer => {
    return Object.entries(currentAnswers).reduce<PayloadAnswer>((acc, [idString, answerValue]) => {
        const questionId = parseInt(idString, 10);
        const question = allQuestions.find(q => q.id === questionId);

        if (!question) return acc;
        const scoreToSubmit = (typeof answerValue.score === 'number') ? answerValue.score : null;

        // Handle different question types
        if (question.type === 'SCALE') {
            const optionId = answerValue.optionIds?.[0] ?? null;
            acc.push({
                questionId: questionId,
                optionId: optionId,
                optionIds: null,
                value: scoreToSubmit,
                textValue: null,
            });

        } else if (question.type === 'SINGLE_CHOICE') {
            const optionId = answerValue.optionIds?.[0] ?? null;
            acc.push({
                questionId: questionId,
                optionId: optionId,
                optionIds: null,
                value: null,
                textValue: null,
            });

        } 
        else if (question.type === 'MULTIPLE_CHOICE' && answerValue.optionIds && answerValue.optionIds.length > 0) {
            acc.push({
                questionId: questionId,
                optionId: null,
                optionIds: answerValue.optionIds,
                value: null,
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
// Loading UI - Submission Button Indicator
// ----------------------------------------------------
const SubmissionLoadingIndicator: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="flex items-center justify-center space-x-2">
            <span className="font-bold">{t('Questionnaire.submitting')}</span>
            {/* Animated Dots */}
            <div className="flex items-end h-4 pb-0.5">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
        </div>
    );
};


// ----------------------------------------------------
// Loading Overlay - Full Page Overlay
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
// Error Alert Component
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
// Question Type Renderers
// ----------------------------------------------------
interface QuestionRendererProps {
    question: Question;
    currentAnswer: AnswerValue;
    onAnswer: (answer: AnswerValue) => void;
}

// 1. SCALE
const ScaleQuestion: React.FC<QuestionRendererProps> = ({ question, currentAnswer, onAnswer }) => {
    const options = question.options || [];
    const selectedOptionId = currentAnswer.optionIds?.[0];

    return (
        <div className="flex justify-center space-x-2 sm:space-x-4">
            {options.map((opt) => {
                const displayScore = opt.order; // Display order as score number

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
            // Remove selection
            newSelectedOptionIds = selectedOptionIds.filter(id => id !== optionId);
        } else {
            // Add selection
            newSelectedOptionIds = [...selectedOptionIds, optionId];
        }

        // Recalculate total score from selected options
        const newScore = options
            .filter(opt => newSelectedOptionIds.includes(opt.id))
            .reduce((sum, opt) => {
                const optionValue = Number(opt.value);
                return sum + optionValue;
            }, 0); 
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
// Question Renderer Switch
// ----------------------------------------------------
const QuestionRenderer: React.FC<QuestionRendererProps> = (props) => {
    const { t } = useTranslation();
    switch (props.question.type) {
        case 'SCALE':
            return <ScaleQuestion {...props} />;
        case 'SINGLE_CHOICE':
            return <SingleChoiceQuestion {...props} />;
        case 'MULTIPLE_CHOICE':
            return <MultipleChoiceQuestion {...props} />;
        case 'TEXT':
            return <TextQuestion {...props} />;
        default:
            return <p className="text-red-500">{t('Questionnaire.error.unknownType', { type: props.question.type })}</p>;
    }
};


// ----------------------------------------------------
// Question Description Toggle Component
// ----------------------------------------------------
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
                className="flex items-center text-gray-600 hover:text-gray-800 transition duration-150 font-medium"
            >
                {/* Toggle Icon */}
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                </svg>
                {t(isExpanded ? 'Questionnaire.actions.hideDetails' : 'Questionnaire.actions.showDetails')}
            </button>
            
            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-3">
                    <TranslatedText text={description} />
                </div>
            )}
        </div>
    );
};


// ----------------------------------------------------
// Main Questionnaire Content Component
// ----------------------------------------------------
export default function QuestionnaireContent({ questionnaireId }: { questionnaireId: string | number | null }) {
    const router = useRouter();
    const { t } = useTranslation();
    // Data states
    const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null);
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [answers, setAnswers] = useState<Answers>({});
    // UI/Navigation states
    const [currentPage, setCurrentPage] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [submittedResponseId, setSubmittedResponseId] = useState<number | null>(null);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [isFinalizedProgress, setIsFinalizedProgress] = useState(false);
    // Floating chat window state
    const [isChatVisible, setIsChatVisible] = useState(false); 

    // =============
    // Pagination & Data Grouping
    // =============
    // Get page title (translated category name)
    const getPageTitle = (category: string): string => {
        return CATEGORY_MAP[category.toUpperCase()] || category;
    };

    // Group questions by category (page)
    const allPages: PageData[] = useMemo(() => {
        if (!questionnaire) return [];

        const grouped = questionnaire.questions.reduce((acc, question) => {
            const category = question.category;
            if (!acc[category]) {
                acc[category] = { category: category, pageTitle: category, questions: [] };
            }
            acc[category].questions.push(question);
            return acc;
        }, {} as Record<string, PageData & { category: string }>);

        // Sort pages based on TAI indicator order
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
                questions: page.questions.sort((a, b) => a.order - b.order) // Sort questions within page
            }));
    }, [questionnaire]);

    // Page properties
    const TOTAL_PAGES = allPages.length;
    const currentPageData = allPages[currentPage];

    // =============
    // Backend API Interaction
    // =============
    // Fetch questionnaire details
    const fetchQuestionnaire = useCallback(async () => {
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
                // Ignore parse error
            }

            console.error('獲取問卷詳情失敗:', error);
            setSubmissionError(message);
            setLoadingStatus('error');
        }
    }, [questionnaireId]);

    // Generate report after submission
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
    // Effects
    // =============
    // Scroll to top on page change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setSubmissionError(null);
    }, [currentPage]);

    // Initial data fetch and state recovery from localStorage
    useEffect(() => {
        fetchQuestionnaire().then(() => {
            // Load saved answers
            const savedAnswersJson = localStorage.getItem('questionnaireAnswers');
            if (savedAnswersJson) {
                try {
                    const loadedAnswers = JSON.parse(savedAnswersJson);
                    setAnswers(loadedAnswers);
                } catch (e) {
                    console.error("解析 LocalStorage 答案失敗:", e);
                    localStorage.removeItem('questionnaireAnswers');
                }
            }
            
            // Load saved page progress
            const savedPage = localStorage.getItem('questionnaireCurrentPage');
            if (savedPage) {
                const pageIndex = parseInt(savedPage, 10);
                if (!isNaN(pageIndex) && pageIndex >= 0) {
                    setCurrentPage(pageIndex);
                }
            }
        });
    }, [fetchQuestionnaire]);


    // =============
    // Progress & Validation
    // =============
    // Calculate progress percentage
    const progressPercent = useMemo(() => {
        if (isFinalizedProgress) return 100; // 100% when submitted/finalizing

        return TOTAL_PAGES > 0 ? Math.round(((currentPage) / TOTAL_PAGES) * 100) : 0;
    }, [currentPage, TOTAL_PAGES, isFinalizedProgress]);

    // Check if current page is fully answered (required questions only)
    const isCurrentPageComplete = useMemo(() => {
        if (!currentPageData) return false;

        return currentPageData.questions.every(q => {
            const answer = answers[q.id];
            if (!q.required) return true; // Skip non-required questions
            if (!answer) return false;

            switch (q.type) {
                case 'SCALE':
                case 'SINGLE_CHOICE':
                    // Check if score or option ID is set
                    return answer.score !== undefined || answer.optionIds;
                case 'MULTIPLE_CHOICE':
                    // Check if at least one option is selected
                    return answer.optionIds && answer.optionIds.length > 0;
                case 'TEXT':
                    // Check if text is non-empty
                    return answer.textValue && answer.textValue.trim() !== '';
                default:
                    return false;
            }
        });
    }, [answers, currentPageData]);

    // =============
    // Handlers
    // =============
    // Update answer state and save to local storage
    const handleAnswer = (questionId: number, answerValue: AnswerValue) => {
        setAnswers(prev => {
            const newAnswers = {
                ...prev,
                [questionId]: answerValue,
            };
            localStorage.setItem('questionnaireAnswers', JSON.stringify(newAnswers));
            return newAnswers;
        });
    };

    // Navigate to next page
    const handleNext = () => {
        if (currentPage < TOTAL_PAGES - 1) {
            const newPage = currentPage + 1;
            setCurrentPage(newPage);
            localStorage.setItem('questionnaireCurrentPage', newPage.toString());
        }
    };

    // Navigate to previous page
    const handlePrevious = () => {
        if (currentPage > 0) {
            const newPage = currentPage - 1;
            setCurrentPage(newPage);
            localStorage.setItem('questionnaireCurrentPage', newPage.toString());
        }
    };

    // Submit questionnaire answers
    const handleSubmit = async () => {
        setIsSubmitting(true);
        setSubmissionError(null);
        setIsFinalizedProgress(true); // Visually set progress to 100%

        const currentUserId = localStorage.getItem('userId');
        const userToken = localStorage.getItem('authToken');
        const currentProjectId = localStorage.getItem('currentProjectId');

        // Basic validation check
        if (!currentUserId || !userToken) {
            setSubmissionError("您尚未登入或登入資訊已過期，無法提交問卷。請重新登入。");
            setIsSubmitting(false);
            router.push('/login');
            return;
        }
        if (!currentProjectId || !questionnaire) {
            setSubmissionError("錯誤：問卷或專案資料缺失。");
            setIsSubmitting(false);
            return;
        }

        // Prepare payload data
        const answersPayload = formatAnswersForSubmission(answers, questionnaire.questions);
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

        // --- Submit to Backend --- //
        try {
            const data = await submitQuestionnaireService(finalPayload);
            const responseId = data.id;

            if (!responseId) {
                throw new Error('提交或更新後未取得回覆 ID。');
            }

            // Cleanup local storage and save response ID
            localStorage.setItem('responseId', responseId.toString());
            localStorage.removeItem('questionnaireCurrentPage');
            setSubmittedResponseId(responseId);
            setIsGeneratingReport(true);

            // Generate report in the background
            const reportGeneratedSuccessfully = await generateReport(responseId); 
            if (!reportGeneratedSuccessfully) {
                throw new Error('報告生成服務發生錯誤。'); 
            }
            setShowSuccessModal(true); // Show success modal

        } catch (error) {
            console.error('提交錯誤:', error);
            setSubmissionError("提交過程中發生網路錯誤。");
        } finally {
            setIsSubmitting(false);
            setIsGeneratingReport(false);
        }
    };


    // 10. Success Modal Component
    const SuccessModal = () => (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm text-center">
                <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-900mb-2">{t('Questionnaire.submitSuccess')}</h3>
                <p className="text-gray-600 mb-6">{t('Questionnaire.report.generated')}</p>
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

    // 11. Loading / Error States UI
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


    // 12. Main Questionnaire Content Render
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Error Alert */}
            <ErrorAlert
                message={submissionError}
                onClose={() => setSubmissionError(null)}
            />

            <main className="pt-8 flex flex-col items-center min-h-[calc(100vh)] px-4">
                <div className="w-full max-w-3xl bg-white p-8 rounded-xl shadow-lg mt-15">
                    {/* Questionnaire Title */}
                    <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-4">
                        {<TranslatedText text={questionnaire.title} />}
                    </h1>

                    {/* Questionnaire Description */}
                    {questionnaire.description && (
                        <p className="text-left text-gray-500 mb-8">{<TranslatedText text={questionnaire.description} />}</p>
                    )}

                    {/* Progress Bar */}
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

                    {/* Current Page Content */}
                    {currentPageData && (
                        <div>
                            {/* Page / Category Title */}
                            <h2 className="text-xl font-bold text-gray-800 mb-6 text-left border-b pb-3">
                                {<TranslatedText text={currentPageData.pageTitle} />}
                            </h2>

                            {/* Questions List */}
                            <div className="space-y-6">
                                {currentPageData.questions.map((q) => (
                                    <div key={q.id} className="p-4 border rounded-lg bg-gray-50">
                                        {/* Question Text */}
                                        <p className="font-semibold text-gray-700 mb-3">
                                            {<TranslatedText text={q.text} />}
                                            {q.required && <span className="text-red-500 ml-1">*</span>}
                                        </p>
                                        {/* Description Toggle */}
                                        <QuestionDescriptionToggle description={q.description} />

                                        {/* Answer Renderer */}
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

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-10 pt-6 border-t px-4 sm:px-0">

                        {/* Previous Button */}
                        <button
                            onClick={handlePrevious}
                            disabled={currentPage === 0 || isSubmitting}
                            className="py-2 px-6 bg-gray-500 text-white font-bold rounded-lg transition duration-150 hover:bg-gray-400 disabled:opacity-50"
                        >
                            {t('Questionnaire.actions.prev')}
                        </button>

                        {/* Next or Submit Button */}
                        {currentPage < TOTAL_PAGES - 1 ? (
                            // Next Page
                            <button
                                onClick={handleNext}
                                disabled={!isCurrentPageComplete || isSubmitting} // Disabled if incomplete or submitting
                                className="py-2 px-6 bg-green-600 text-white font-bold rounded-lg transition duration-150 hover:bg-green-500 disabled:opacity-50 flex items-center justify-center"
                            >
                                {t('Questionnaire.actions.next')}
                            </button>
                        ) : (
                            // Submit (Final Page)
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !isCurrentPageComplete}
                                className="py-2 px-6 bg-green-600 text-white font-bold rounded-lg transition duration-150 hover:bg-green-500 disabled:opacity-50 flex items-center justify-center min-w-[150px]"
                            >
                                {isSubmitting ? <SubmissionLoadingIndicator /> : t('Questionnaire.actions.finishAndSubmit')}
                            </button>
                        )}
                    </div>
                </div>
            </main>
            
            {/* Modals and Overlays */}
            {showSuccessModal && <SuccessModal />}
            {isGeneratingReport && <FullPageLoadingOverlay message={t('Questionnaire.report.generating')} />}
            
            {/* Floating AI Chat Window and Toggle Button */}
            <FloatingChatWindow 
                isVisible={isChatVisible} 
                onClose={() => setIsChatVisible(false)} 
            />

            <button
                onClick={() => setIsChatVisible(prev => !prev)}
                className="fixed bottom-4 right-4 p-4 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 transition duration-300 z-50"
                title="AI 助手"
            >
                {/* Icon based on chat visibility */}
                {isChatVisible ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
            </button>
        </div>
    );
}
