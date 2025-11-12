"use client";

import React, { useState, useEffect, useMemo } from 'react';

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

// ⭐️ 根據 Prisma Schema 更新後的 ReportData 介面
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


// ----------------------------------------------------
// 模擬 API 呼叫 (用於前端開發)
// ----------------------------------------------------

/**
 * 模擬從後端 API 獲取報告數據
 * @param responseId - 問卷回應 ID
 * @returns 模擬的 ReportData
 */
const fetchMockReport = async (responseId: number): Promise<ReportData> => {
    // 模擬網路延遲
    await new Promise(resolve => setTimeout(resolve, 1000)); 

    if (responseId === 404) {
        throw new Error("Report not found for this response.");
    }
    
    // ⭐️ 模擬報告數據，採用新的欄位名稱
    return {
        id: 100,
        responseId: responseId,
        overallScore: 85.5, // 使用 overallScore
        generatedAt: new Date().toISOString(), // 模擬生成時間
        analysisText: "本專案在 AI 倫理與治理評估中表現優秀，尤其在『透明性』和『準確性』方面得分突出，但在『當責性』方面仍有提升空間。建議強化監督機制。", // 使用 analysisText
        radarData: { // 使用 radarData
            "ACCURACY": 95,
            "RELIABILITY": 80,
            "SAFETY": 100,
            "RESILIENCE": 75,
            "TRANSPARENCY": 90,
            "ACCOUNTABILITY": 60,
            "EXPLAINABILITY": 85,
            "AUTONOMY": 90,
            "PRIVACY": 88,
            "FAIRNESS": 82,
            "SECURITY": 85,
        },
        taiWeightSnapshot: null,
        llmMeta: null,
        response: {
            id: responseId,
            user: { id: 123, name: "測試使用者" },
            project: { id: 999, name: "AI 系統專案 V1.0" },
            version: { id: 1, title: "AI 倫理與治理評估問卷" },
        },
    };
};


// ----------------------------------------------------
// 報告頁面組件
// ----------------------------------------------------

// 為了在瀏覽器中運行，我們直接在 URL 參數中模擬 responseId
// 例如: 可以在預覽 URL 後加上 ?responseId=123
export default function ReportPage() {
    // ⭐️ 確保 router 在組件頂部被初始化
    const router = useRouter(); 
    const [report, setReport] = useState<ReportData | null>(null);
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // 模擬從 URL 獲取 responseId
    const responseId = useMemo(() => {
        if (typeof window === 'undefined') return null;
        const params = new URLSearchParams(window.location.search);
        // 默認給一個 ID 123，方便測試
        return parseInt(params.get('responseId') || '123', 10); 
    }, []);

    // 從 overallScore 計算評級，用於 UI 顯示
    const grade = useMemo(() => {
        return report ? getGrade(report.overallScore) : 'D';
    }, [report]);

    useEffect(() => {
        if (!responseId) {
            setLoadingStatus('error');
            setErrorMessage("無法獲取問卷回應 ID。請確認 URL 中包含 responseId 參數。");
            return;
        }

        const loadReport = async () => {
            setLoadingStatus('loading');
            try {
                const data = await fetchMockReport(responseId);
                setReport(data);
                setLoadingStatus('success');
            } catch (error) {
                const message = error instanceof Error ? error.message : "載入報告時發生錯誤。";
                setErrorMessage(`報告載入失敗: ${message}`);
                setLoadingStatus('error');
                console.error("Failed to load report:", error);
            }
        };

        loadReport();
    }, [responseId]);

    // 處理加載/錯誤狀態的渲染
    if (loadingStatus === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-xl font-medium text-purple-800">正在生成報告...</p>
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
    // ⭐️ 移除 ProtectedLayout 和 AuthHeader 
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
                            {report.response.version.title}
                        </p>
                    </header>

                    {/* 基本資訊區塊 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 mb-8 p-4 bg-purple-50 rounded-lg">
                        <p><strong>專案名稱:</strong> {report.response.project.name}</p>
                        <p><strong>評估人員:</strong> {report.response.user.name}</p>
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