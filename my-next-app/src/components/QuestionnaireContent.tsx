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
    "EXPLANABILITY": "七、可解釋性(Explanability)：AI 的決策邏輯（即資料輸入與決策結果之間的因果關係）可以被清楚描述與呈現，讓使用者與利害關係者更了解AI的決策理由",
    "AUTONOMY": "八、自主性(Autonomy)：AI系統使用者與AI的互動過程中，能保持充分的自主性，不過度依賴AI的判斷或決策",
    "PRIVACY": "九、隱私(Privacy)：在使用AI系統時，不會侵犯到個人隱私",
    "FAIRNESS": "十、公平性(Fairness)：AI系統在做判斷或決策時，能平等對待不同群體，避免不公正的情況",
    "SECURITY": "十一、資訊安全性(Security)：防止外部環境對AI模型的侵入和損害，以保護訓練與測試過程中的資料安全",
};

interface Question {
    id: number;
    text: string;
    category: string;
    order: number;
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
}


type Answers = Record<number, '是' | '否'>;

const API_BASE_URL = "http://localhost:3001/api";



interface QuestionnaireContentProps {
    /** 由外部页面传入的问卷 ID (1, 2, 或 3) */
    questionnaireId: number; 
}


// ----------------------------------------------------
// 通用问卷组件
// ----------------------------------------------------

export default function QuestionnaireContent({ questionnaireId }: QuestionnaireContentProps) {
    const router = useRouter();
    
    // --- 状态管理 ---
    const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null);
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [currentPage, setCurrentPage] = useState(0); 
    const [answers, setAnswers] = useState<Answers>({});
    const [isSubmitting, setIsSubmitting] = useState(false);


    const getPageTitle = (category: string): string => {
        return CATEGORY_MAP[category.toUpperCase()] || category;
    };


    // ----------------------------------------------------
    // 分页逻辑
    // ----------------------------------------------------
    const allPages: PageData[] = useMemo(() => {
        if (!questionnaire) return [];
        
        // 1. 按 category 分组，并按 order 排序
        const grouped = questionnaire.questions.reduce((acc, question) => {
            const category = question.category;
            if (!acc[category]) {
                acc[category] = { pageTitle: category, questions: [] };
            }
            acc[category].questions.push(question);
            return acc;
        }, {} as Record<string, PageData>);
        
        // 2. 将对象转换为数组，应用映射标题，并对每个页面的问题按 order 排序
        return Object.values(grouped).map(page => ({
            pageTitle: getPageTitle(page.pageTitle), 
            questions: page.questions.sort((a, b) => a.order - b.order)
        }));
    }, [questionnaire]);

    const TOTAL_PAGES = allPages.length;
    const currentPageData = allPages[currentPage];


    // --- API 调用：获取问卷 (现在依赖于 props.questionnaireId) ---
    const fetchQuestionnaire = useCallback(async () => {
        if (!questionnaireId) {
            setLoadingStatus('error');
            alert("问卷 ID 无效，无法加载。");
            return;
        }

        setLoadingStatus('loading');
        
        try {
            const response = await fetch(`${API_BASE_URL}/questionnaire/${questionnaireId}`, { // ⭐️ 使用传入的 ID
                method: "GET",
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `加载失败，状态码: ${response.status}`);
            }

            const responseBody = await response.json();
            const data = responseBody.data;

            if (data && data.questions && data.questions.length > 0) {
                setQuestionnaire(data);
                setLoadingStatus('success');
            } else {
                throw new Error('问卷数据为空或结构不完整。');
            }

        } catch (error) {
            console.error('获取问卷详情失败:', error);
            alert(`问卷加载失败: ${error instanceof Error ? error.message : String(error)}`);
            setLoadingStatus('error');
        }
    }, [questionnaireId]); 

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [currentPage]);

    useEffect(() => {
        // 当 ID 变化时，重新获取问卷数据
        fetchQuestionnaire();
    }, [fetchQuestionnaire]);

    // --- 状态计算 ---
    const progressPercent = useMemo(() => {
        return TOTAL_PAGES > 0 ? Math.round(((currentPage) / TOTAL_PAGES) * 100) : 0;
    }, [currentPage, TOTAL_PAGES]);
    
    const isCurrentPageComplete = useMemo(() => {
        if (!currentPageData) return false;
        return currentPageData.questions.every(q => answers[q.id] !== undefined);
    }, [answers, currentPageData]);

    // --- 交互处理 (逻辑不变) ---
    const handleAnswer = (questionId: number, answer: '是' | '否') => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer,
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
    // 提交问卷
    // ----------------------------------------------------
    const handleSubmit = async () => {
        if (!isCurrentPageComplete) {
            alert("請先完成本頁所有題目才能提交問卷。");
            return;
        }

        setIsSubmitting(true);
        
        const currentUserId = localStorage.getItem('userId');
        const userToken = localStorage.getItem('authToken');

        if (!currentUserId || !userToken) {
            alert("您尚未登入或登入資訊已過期，無法提交問卷。請重新登入。"); 
            setIsSubmitting(false);
            router.push('/login'); 
            return;
        }

        const answersPayload = Object.entries(answers).map(([idString, value]) => {
            const questionId = parseInt(idString, 10); 
            const score = value === '是' ? 100 : 0; 
            
            return {
                questionId: questionId, 
                value: score,
            };
        });
        
        const finalPayload = {
            userId: parseInt(currentUserId, 10),
            questionnaireId: questionnaireId, // ⭐️ 使用传入的 ID
            answers: answersPayload,
        };

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
                const errorData = await response.json();
                alert(`提交失敗: ${errorData.message || '伺服器錯誤'}`);
            }
        } catch (error) {
            console.error('提交錯誤:', error);
            alert("提交過程中發生網路錯誤。");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- 渲染逻辑 (UI 部分) ---

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

    // 渲染主体：不包含 AuthHeader 和 ProtectedLayout
    return (
        <div className="min-h-screen bg-gray-50">
            <main className="pt-8 flex flex-col items-center min-h-[calc(100vh)] px-4">
                <div className="w-full max-w-3xl bg-white p-8 rounded-xl shadow-lg mt-8">
                    {/* 問卷題目 titleA */}
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
                        {questionnaire.title}
                    </h1>

                    {/* 问卷描述 description */}
                    {questionnaire.description && (
                        <p className="text-center text-gray-600 mb-8 italic">{questionnaire.description}</p>
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

                    {/* 当期分頁內容 */}
                    {currentPageData && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center border-b pb-3">
                                {currentPageData.pageTitle}
                            </h2>

                            <div className="space-y-6">
                                {currentPageData.questions.map((q) => (
                                    <div key={q.id} className="p-4 border rounded-lg bg-gray-50">
                                        <p className="font-semibold text-gray-700 mb-3">{q.text}</p>
                                        <div className="flex space-x-6">
                                            {/* 「是」選項 */}
                                            <button
                                                onClick={() => handleAnswer(q.id, '是')}
                                                className={`py-2 px-6 rounded-lg font-medium transition duration-150 
                                                    ${answers[q.id] === '是' 
                                                        ? 'bg-purple-700 text-white shadow-md' 
                                                        : 'bg-white text-gray-800 border hover:bg-purple-50'
                                                    }`}
                                            >
                                                是
                                            </button>
                                            {/* 「否」選項 */}
                                            <button
                                                onClick={() => handleAnswer(q.id, '否')}
                                                className={`py-2 px-6 rounded-lg font-medium transition duration-150 
                                                    ${answers[q.id] === '否' 
                                                        ? 'bg-purple-700 text-white shadow-md' 
                                                        : 'bg-white text-gray-800 border hover:bg-purple-50'
                                                    }`}
                                            >
                                                否
                                            </button>
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