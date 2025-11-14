"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';

// ----------------------------------------------------
// 模擬數據結構 (基於後端 Prisma Report Schema)
// ----------------------------------------------------

// 使用 QuestionnaireContent.jsx 中的 CATEGORY_MAP 確保一致性
const CATEGORY_MAP: Record<string, string> = {
    "ACCURACY": "一、準確性（Accuracy）",
    "RELIABILITY": "二、可靠性（Reliability）",
    "SAFETY": "三、安全性（Safety）",
    "RESILIENCE": "四、韌性（Resilience）",
    "TRANSPARENCY": "五、透明性（Transparency）",
    "ACCOUNTABILITY": "六、當責性（Accountability）",
    "EXPLAINABILITY": "七、可解釋性（Explanability）",
    "AUTONOMY": "八、自主性（Autonomy）",
    "PRIVACY": "九、隱私（Privacy）",
    "FAIRNESS": "十、公平性（Fairness）",
    "SECURITY": "十一、資訊安全性（Security）",
};


interface ReportData {
    id: number;
    responseId: number;
    overallScore: number; // 總體分數 (取代 score)
    generatedAt: string; // 報告生成時間
    analysisText: string | null; // LLM 生成的分析文字 (取代 summary)
    radarData: Record<string, number>; // 各項 TAI 的分數 (取代 categoryResults)
    taiWeightSnapshot: Record<string, number> | null; 
    llmMeta: any | null; 
    
    // 關聯數據 (response.select 查詢結果)
    response: {
        id: number;
        user: { id: number; name: string };
        project: { id: number; name: string };
        version: { id: number; title: string };
    };
    // images: ReportImage[]; // 這裡暫時省略 images
}

// ----------------------------------------------------
// 輔助函數
// ----------------------------------------------------

// 模擬 useRouter 鉤子 (保留此版本以維持功能)
const useRouter = () => {
    return {
        push: (url: string) => {
            if (typeof window !== 'undefined') {
                window.location.href = url;
            }
        },
    };
};

// 根據分數計算評級 (UI 邏輯)
const getGrade = (score: number): 'A+' | 'A' | 'B' | 'C' | 'D' => {
    if (score >= 95) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 50) return 'C';
    return 'D';
};

// ⭐️ 重新定義 getScoreColor 函數到全局輔助函數區塊
const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-400';
    if (score >= 80) return 'bg-lime-400';
    if (score >= 70) return 'bg-yellow-400';
    if (score >= 60) return 'bg-orange-300';
    return 'bg-rose-400';
};


const API_BASE_URL = "http://localhost:3001/api";

// ----------------------------------------------------
// 核心 API 呼叫函數 (修正為 POST /generate)
// ----------------------------------------------------
const generateAndFetchReport = async (responseId: number, authToken: string): Promise<ReportData> => {
    const url = `${API_BASE_URL}/report/generate/${responseId}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
        },
    });

    const result = await response.json();

    if (!response.ok) {
        const errorMessage = result.error || result.message || `HTTP 錯誤! 狀態碼: ${response.status}`;
        throw new Error(errorMessage);
    }

    return result.data as ReportData; 
};

const fetchProjectTitle = async () => {
    const projectId = localStorage.getItem('currentProjectId');
    const authToken = localStorage.getItem('authToken');

    if (!projectId || !authToken) {
        console.error("Project ID 或 Auth Token 缺失。");
        return null;
    }

    const url = `${API_BASE_URL}/project/${projectId}`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
        });

        const result = await response.json();
        if (!response.ok) {
            const errorMessage = result.error || result.message || `HTTP Error: ${response.status}`;
            throw new Error(`獲取專案資料失敗: ${errorMessage}`);
        }
        const projectName = result.data.name; 
        return projectName;

    } catch (error) {
        console.error("API 呼叫失敗:", error);
        return null;
    }
};

// ----------------------------------------------------
// 報告頁面組件
// ----------------------------------------------------
export default function ReportPage() {
    const router = useRouter(); 
    const [report, setReport] = useState<ReportData | null>(null);
    const [loadingStatus, setLoadingStatus] = useState<'generating' | 'success' | 'error'>('generating');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const { responseId, authToken } = useMemo(() => {
        if (typeof window === 'undefined') return { responseId: null, authToken: null };

        const idString = localStorage.getItem('responseId'); 
        const token = localStorage.getItem('authToken');
        const id = idString ? parseInt(idString, 10) : null;
         return { responseId: id, authToken: token };
    }, []);

    // 從 overallScore 計算評級，用於 UI 顯示
    const grade = useMemo(() => {
        return report ? getGrade(report.overallScore) : 'D';
    }, [report]);

    const loadReport = useCallback(async () => {
        if (!responseId || !authToken) {
            setLoadingStatus('error');
            setErrorMessage("認證資訊或問卷回應 ID 缺失。請從問卷頁面重新提交。");
            return;
        }

        setLoadingStatus('generating'); // 顯示生成中狀態
        try {
            // ⭐️ 呼叫生成報告的 POST API 
            const data = await generateAndFetchReport(responseId, authToken); 
            
            setReport(data);
            setLoadingStatus('success');

            // 報告成功生成並載入後，清除 responseId，避免下次意外重複生成
            localStorage.removeItem('last_submitted_response_id'); 
            
        } catch (error) {
            const message = error instanceof Error ? error.message : "生成報告時發生錯誤。";
            setErrorMessage(`報告生成失敗: ${message}`);
            setLoadingStatus('error');
            console.error("Failed to generate report:", error);
        }
    }, [responseId, authToken]);

    useEffect(() => {
        loadReport();
    }, [loadReport]);

    // 處理加載/錯誤狀態的渲染
    if (loadingStatus === 'generating') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                {/* 顯示更明確的狀態 */}
                <p className="text-xl font-medium text-purple-800 flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    正在生成報告，請稍候...
                </p>
            </div>
        );
    }

    if (loadingStatus === 'error' || !report) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="p-8 bg-white rounded-xl shadow-lg text-center max-w-md w-full">
                    <p className="text-xl font-bold text-red-600 mb-4">報告載入失敗</p>
                    <p className="text-gray-600 mb-6">{errorMessage}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="py-2 px-4 bg-purple-800 text-white rounded-lg transition duration-150 hover:bg-purple-700"
                    >
                        重新嘗試
                    </button>
                </div>
            </div>
        );
    }
    
    // 格式化生成時間
    const formattedDate = new Date(report.generatedAt).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    // --- 報告成功載入後的渲染 --- 
    return (
        <div className="p-8 bg-gray-50 min-h-screen font-sans">
            {/* AuthHeader 由於無法使用已被移除 */}
            <main className="max-w-4xl mx-auto pt-8"> {/* pt-17 被替換為標準的 pt-8 */}
                <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-2xl">
                    <header className="border-b pb-4 mb-6">
                        <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-2">
                            可信任AI評估測驗報告
                        </h1>
                        <p className="text-center text-xl font-medium text-indigo-700">
                            {report.response.version?.title || '問卷版本標題缺失'}
                        </p>
                    </header>

                    {/* 基本資訊區塊 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 mb-8 p-4 bg-purple-50 rounded-lg">
                        <p><strong>專案名稱:</strong> {report.response.project?.name || 'N/A'}</p>
                        <p><strong>評估人員:</strong> {report.response.user?.name || 'N/A'}</p>
                        <p><strong>生成時間:</strong> {formattedDate}</p>
                    </div>

                    {/* 總體評分區塊 */}
                    <section className="text-center mb-10 p-6 bg-white border border-gray-200 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">評估結果</h2>
                        <div className="flex justify-center items-center space-x-8">
                            <div>
                                {/* ⭐️ 使用 overallScore */}
                                <p className="text-5xl font-extrabold text-purple-700">{report.overallScore.toFixed(1)}</p> 
                                <p className="text-lg font-medium text-gray-500">總體分數 (滿分 100)</p>
                            </div>
                            <div className="text-center">
                                {/* ⭐️ 使用前端計算的 grade */}
                                <p className="text-4xl font-extrabold text-white inline-block px-4 py-2 rounded-lg shadow-md"
                                   style={{ backgroundColor: grade === 'A+' || grade === 'A' ? '#10B981' : (grade === 'B' ? '#F59E0B' : '#EF4444') }}>
                                    {grade}
                                </p>
                                <p className="text-lg font-medium text-gray-500 mt-1">評級</p>
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-500 max-w-2xl mx-auto">
                            {/* ⭐️ 使用 analysisText */}
                            {report.analysisText} 
                        </p>
                    </section>

                    {/* 各項指標細節區塊 */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">細項指標表現</h2>
                        <div className="space-y-4">
                            {/* ⭐️ 迭代 radarData */}
                            {Object.entries(CATEGORY_MAP).map(([key, title]) => {
                                const score = report.radarData[key];
                                if (score === undefined) return null; // 如果後端沒有提供該類別分數則跳過

                                return (
                                    <div key={key} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                                        <div className="w-1/3 text-sm sm:text-base font-semibold text-gray-700">{title.split('、')[1]}</div>
                                        <div className="w-2/3">
                                            <div className="flex items-center">
                                                <div className="w-full h-3 rounded-full bg-gray-200">
                                                    <div 
                                                        className={`h-3 rounded-full transition-all duration-700 ${getScoreColor(score)}`} 
                                                        style={{ width: `${score}%` }}
                                                    ></div>
                                                </div>
                                                <span className="ml-3 text-sm font-bold w-10 text-right text-gray-800">{score}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </main>
            <div className="flex justify-center mt-10 mb-20"> 
                <button
                    onClick={() => router.push('/home')}
                    className={`
                        w-auto py-3 px-6 text-lg font-semibold rounded-full 
                        bg-white text-indigo-600 shadow-2xl border border-indigo-300 
                        transition duration-150 ease-in-out 
                        hover:bg-indigo-50 active:bg-indigo-100
                        focus:outline-none focus:ring-4 focus:ring-indigo-300
                        flex items-center space-x-2
                    `}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l-2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6m-6 0h-2M9 17h6" />
                    </svg>
                    <span>返回主頁</span>
                </button>
            </div>
        </div>
    );
}