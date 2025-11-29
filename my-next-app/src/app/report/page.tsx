"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import AuthHeader from '@/components/AuthHeader';
import React, { useState, useEffect, useMemo, useCallback,useRef } from 'react';
import { ResponseMeta } from '@/services/responseService'
import { ReportRadarChart } from '@/components/ReportRadarChart';
import { Loader2, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';


const useRouter = () => {
    return {
        push: (url: string) => {
            if (typeof window !== 'undefined') {
                window.location.href = url;
            }
        },
    };
};

import { fetchReport as fetchReportService } from '@/services/reportService';
import { generatePdf } from '@/services/reportService';
import { REPORT_CATEGORY_MAP_EN } from '@/config/constants';

// ----------------------------------------------------
// 後端回傳資料結構定義
// ----------------------------------------------------
interface ReportData {
    id: number;
    responseId: number;
    overallScore: number;
    generatedAt: string; 
    analysisText: string | null; 
    radarData: Record<string, number>; 
    taiWeightSnapshot: Record<string, number> | null; // 應該沒有使用
    llmMeta: any | null; //應該沒有使用
    response: (ResponseMeta & {
        project?: { name?: string };
        version?: { title?: string };
        user?: { name?: string };
    }) | null;
}

// ----------------------------------------------------
// 分數轉換評級函數
// ----------------------------------------------------
const getGrade = (score: number): 'A+' | 'A' | 'B' | 'C' | 'D' => {
    if (score >= 95) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 50) return 'C';
    return 'D';
};

const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-400';
    if (score >= 80) return 'bg-lime-500';
    if (score >= 70) return 'bg-yellow-400';
    if (score >= 60) return 'bg-orange-300';
    return 'bg-red-400';
};


// ----------------------------------------------------
// 報告頁面組件
// ----------------------------------------------------
export default function ReportPage() {
    const router = useRouter(); 
    const { t } = useTranslation();
    const [report, setReport] = useState<ReportData | null>(null);
    const [loadingStatus, setLoadingStatus] = useState<'generating' | 'success' | 'error'>('generating');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [versionTitle, setVersionTitle] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const { responseId, authToken } = useMemo(() => {
        if (typeof window === 'undefined') return { responseId: null, authToken: null };

        const idString = localStorage.getItem('responseId'); 
        const token = localStorage.getItem('authToken');
        const id = idString ? parseInt(idString, 10) : null;
        
        return { 
            responseId: id, 
            authToken: token,
        };
    }, []);

    // 從 overallScore 計算評級，用於 UI 顯示
    const grade = useMemo(() => {
        return report ? getGrade(report.overallScore) : 'D';
    }, [report]);

    const loadData = useCallback(async () => {
        if (!responseId || !authToken) {
            setLoadingStatus('error');
            setErrorMessage(t('reportPage.error.missingAuthOrId'));
            return;
        }

        setLoadingStatus('generating'); 
        try {
            const reportData = await fetchReportService(responseId); 
            const projName = reportData.response?.project?.name ?? t('reportPage.error.missingProjectName');
            const verTitle = reportData.response?.version?.title ?? t('reportPage.error.missingVersionTitle');
            const uName = reportData.response?.user?.name ?? t('reportPage.error.missingUserName');
            
            // 3. 更新狀態
            setReport(reportData);
            setProjectName(projName);
            setVersionTitle(verTitle);
            setUserName(uName);
            setLoadingStatus('success');
            
        } catch (error) {
            const message = error instanceof Error ? error.message : t('reportPage.error.fetchReport');
            setErrorMessage(`${t('reportPage.error.loadFail')}: ${message}`);
            setLoadingStatus('error');
            console.error("Failed to fetch report:", error);
        }
    }, [responseId, authToken]);

    const handleDownloadPdf = useCallback(async () => {
        if (!responseId || isGeneratingPdf) return;

        setIsGeneratingPdf(true); // 開始下載
        try {
            // 1. 呼叫新的 service 函數獲取 Blob
            const pdfBlob = await generatePdf(responseId);

            // 2. 創建一個 URL 來指向這個 Blob
            const url = window.URL.createObjectURL(pdfBlob);

            // 3. 創建一個隱藏的 A 標籤並觸發下載
            const a = document.createElement('a');
            a.href = url;
            
            // 使用專案名稱和 ID 命名檔案，更具體
            const filename = projectName ? 
                `${projectName.replace(/\s/g, '_')}-Report-${responseId}.pdf` : 
                `report-${responseId}.pdf`;
                
            a.download = filename; 
            document.body.appendChild(a);
            a.click();
            
            // 4. 清理
            window.URL.revokeObjectURL(url);
            a.remove();

        } catch (error) {
            console.error("下載 PDF 失敗:", error);
            // TODO: 在此處顯示一個 Toast 或 Alert 錯誤通知給用戶
            const errMsg = error instanceof Error ? JSON.parse(error.message).message : "下載失敗，請聯繫管理員。";
            alert(`${t("reportPage.report.pdfFailure")}: ${errMsg}`); // 暫時使用 alert
        } finally {
            setIsGeneratingPdf(false); // 結束下載
        }
    }, [responseId, isGeneratingPdf, projectName]); // 依賴於 responseId 和 projectName


    useEffect(() => {
        loadData();
    }, [loadData]);

    // 處理加載/錯誤狀態的渲染
    if (loadingStatus === 'generating') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-xl font-medium text-purple-800 flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('reportPage.loading.report')}
                </p>
            </div>
        );
    }

    if (loadingStatus === 'error' || !report) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="p-8 bg-white rounded-xl shadow-lg text-center max-w-md w-full">
                    <p className="text-xl font-bold text-red-600 mb-4">{t('reportPage.error.title')}</p>
                    <p className="text-gray-600 mb-6">{errorMessage}</p>
                    <button 
                        onClick={() => router.push('/home')} 
                        className="py-2 px-4 bg-purple-800 text-white rounded-lg transition duration-150 hover:bg-purple-700"
                    >
                        {t('reportPage.button.backHome')}
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
    const markdownContent = report.analysisText;
    return (
        <div className="p-8 bg-gray-50 min-h-screen font-sans">
            <AuthHeader />
            <main id="report-content" className="max-w-4xl mx-auto pt-8 mt-7"> 
                <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-2xl">
                    <header className="border-b pb-4 mb-6">
                        <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-2">
                            {t('reportPage.report.title')}
                        </h1>
                        <p className="text-center text-xl font-medium text-indigo-700">
                            {versionTitle || t('reportPage.error.missingVersionTitle')}
                        </p>
                    </header>

                    {/* 基本資訊區塊 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 mb-8 p-4 bg-purple-50 rounded-lg">
                        <p><strong>{t('reportPage.report.projectName')}:</strong> {projectName || 'N/A'}</p>
                        <p><strong>{t('reportPage.report.userName')}:</strong> {userName || 'N/A'}</p>
                        <p><strong>{t('reportPage.report.generatedAt')}:</strong> {formattedDate}</p>
                    </div>

                    {/* 總體評分區塊 */}
                    <section className="text-center mb-10 p-6 bg-white border border-gray-200 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('reportPage.report.result')}</h2>
                        <div className="flex justify-center items-center space-x-8">
                            {/* 總分 */}
                            <div>
                                <p className="text-5xl font-extrabold text-purple-700">{report.overallScore.toFixed(2)}</p> 
                                <p className="text-lg font-medium text-gray-500">{t('reportPage.report.overallScore')}</p>
                            </div>
                            {/* 評級 */}
                            <div className="text-center">
                                <p className="text-4xl font-extrabold text-white inline-block px-4 py-2 rounded-lg shadow-md"
                                   style={{ backgroundColor: grade === 'A+' || grade === 'A' ? '#10B981' : (grade === 'B' ? '#F59E0B' : '#EF4444') }}>
                                    {grade}
                                </p>
                                <p className="text-lg font-medium text-gray-500 mt-1">{t('reportPage.report.grade')}</p>
                            </div>
                        </div>
                        {/* 雷達圖 */}
                        <div className="w-full mb-8 text-center margin-center">
                            <h3 className="text-xl font-bold text-gray-700 mb-4 border-t pt-4">{t('reportPage.report.radarChart')}</h3>

                            <div className="w-full">
                                <ReportRadarChart radarData={report.radarData} />
                            </div>
                        </div>

                        <div className="markdown-content not-prose text-left mt-6 overflow-x-auto">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                            >
                                {markdownContent}
                            </ReactMarkdown>
                        </div>
                    </section>

                    {/* 各項指標細節區塊 */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">{t('reportPage.report.detailIndicators')}</h2>
                        <div className="space-y-4">
                            {/* ⭐️ 迭代 radarData */}
                            {Object.entries(REPORT_CATEGORY_MAP_EN).map(([key, title]) => {
                                const score = report.radarData[key];
                                if (score === undefined) return null; 

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
                                                <span className="ml-3 text-sm font-bold w-10 text-right text-gray-800">{score.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </main>
            <div className="flex justify-center mt-10 mb-20 space-x-4 no-print"> 
                <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className={`
                        w-auto py-3 px-6 text-lg font-semibold rounded-full 
                        bg-purple-800 text-white shadow-2xl hover:bg-purple-700
                        transition duration-150 ease-in-out 
                        focus:outline-none focus:ring-4 focus:ring-purple-300
                        flex items-center space-x-2
                    `}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span> {isGeneratingPdf ? t('reportPage.button.preparingPdf') : t('reportPage.button.generatePdf')} </span>
                </button>

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
                    <span>{ t("reportPage.button.backHome")}</span>
                </button>
            </div>
        </div>
    );
}
