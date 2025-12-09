"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ResponseMeta, updateResponse } from '@/services/responseService'
import AuthHeader from '@/components/AuthHeader';
import { ReportRadarChart } from '@/components/ReportRadarChart';
import PdfExportButton from '@/components/PdfExportButton';
import ResponseViewer, {
    Option,
    Question,
    QuestionnaireData,
    styleSelected,
    styleUnselected
} from '../../components/ResponseViewer';
import {
    ResponseData,
    ViewerState,
    fetchResponseList,
    deleteResponse,
    fetchResponse,
    fetchQuestionnaire
} from '@/services/responseService'
import { LoadingComponent } from '@/components/LoadingComponent';

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
// 翻譯工具函式
// ----------------------------------------------------
const capitalizeFirstLetter = (text: string) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const translateText = async (text: string, source = "zh-CN", target = "en") => {
    const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source, target }),
    });

    const data = await res.json();
    return data.translatedText;
};

// ----------------------------------------------------
// TranslatedText Component with cache
// ----------------------------------------------------
const TranslatedText: React.FC<{ text: string; capitalize?: boolean }> = ({
    text,
    capitalize = false,
}) => {
    const { i18n } = useTranslation();
    const [translated, setTranslated] = useState(text);

    useEffect(() => {
        let isActive = true; // 標記當前 effect 是否仍有效

        // 中文暫存：始終存原文
        if (!translationCache.zh[text]) {
            translationCache.zh[text] = text;
        }

        if (i18n.language.startsWith("en")) {
            // 英文情境：先檢查暫存
            if (translationCache.en[text]) {
                setTranslated(
                    capitalize ? capitalizeFirstLetter(translationCache.en[text]) : translationCache.en[text]
                );
            } else {
                // 沒有暫存 → 呼叫翻譯 API
                translateText(text, "zh-CN", "en").then((result) => {
                    if (isActive) { // 只有當前 effect 還有效才更新
                        result = result || translationCache.zh[text];//如果翻譯未成功，顯示中文。
                        translationCache.en[text] = result;
                        setTranslated(capitalize ? capitalizeFirstLetter(result) : result);
                    }
                });
            }
        } else {
            // 中文情境：直接用中文暫存
            setTranslated(translationCache.zh[text]);
        }
        // cleanup：切語言時舊的請求結果不再生效
        return () => {
            isActive = false;
        };
    }, [text, i18n.language, capitalize]);

    return <>{translated}</>;
};



// 暫存結構
const translationCache_Mark: Record<string, string> = {};

const TranslatedMarkdown: React.FC<{ content: string }> = ({ content }) => {
    const { i18n } = useTranslation();
    const [translatedContent, setTranslatedContent] = useState(content);

    useEffect(() => {
        let isActive = true;

        if (i18n.language.startsWith("en")) {
            if (translationCache_Mark[content]) {
                setTranslatedContent(translationCache_Mark[content]);
            } else {
                translateText(content, "zh-CN", "en").then((result) => {
                    if (isActive) {
                        const finalText = result || content; // fallback 中文
                        translationCache_Mark[content] = finalText;
                        setTranslatedContent(finalText);
                    }
                });
            }
        } else {
            setTranslatedContent(content); // 中文直接顯示
        }

        return () => {
            isActive = false;
        };
    }, [content, i18n.language]);

    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {translatedContent}
        </ReactMarkdown>
    );
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

import { fetchReport as fetchReportService } from '@/services/reportService';
import { TAI_INDICATOR_MAP_EN_ZH } from '@/config/constants';
import { CircleX } from 'lucide-react';

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
    taiWeightSnapshot: Record<string, number> | null;
    llmMeta: any | null; //應該沒有使用
    response: (ResponseMeta & {
        project?: { name?: string };
        version?: { title?: string };
        user?: { name?: string };
    }) | null;
    questionStatsText?: Record<string, string>; // ⭐ 新增：後端產出的「各指標填答統計」Markdown 字串
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
// TAI 權重顯示組件
// ----------------------------------------------------
const renderTaiWeights = (taiWeightSnapshot: Record<string, number> | null) => {
    const { t, i18n } = useTranslation();
    if (!taiWeightSnapshot || Object.keys(taiWeightSnapshot).length === 0) {
        return (
            <div className="text-center p-4 text-gray-500 border-t mt-4">
                <p>{t('reportPage.common.noWeightSnapshot')}</p>
            </div>
        );
    }

    // 將物件轉換為陣列並按權重降序排序，方便閱讀
    const sortedWeights = Object.entries(taiWeightSnapshot)
        .map(([key, weight]) => ({
            key,
            title: TAI_INDICATOR_MAP_EN_ZH[key] || key,
            weight,
        }))
        .sort((a, b) => b.weight - a.weight);

    return (
        <div className="w-full text-center margin-center border-t pt-4 mt-6">
            <h3 className="text-xl font-bold text-gray-700 mb-4">{t('reportPage.report.indicatorWeights')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-purple-50 rounded-lg max-w-lg mx-auto">
                {sortedWeights.map(({ title, key, weight }) => (
                    <div key={key} className="flex flex-col items-center bg-white p-3 rounded-lg shadow-sm border border-purple-200">
                        <span className="text-xs font-medium text-gray-500 text-center">
                            {(i18n.language !== "en")
                                ? title
                                : (key.charAt(0).toUpperCase() + key.slice(1).toLowerCase())
                            }
                        </span>
                        {/* 權重百分比顯示 */}
                        <span className="text-lg font-bold text-purple-700 mt-1">
                            {(weight * 100).toFixed(0)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ----------------------------------------------------
// 報告頁面組件
// ----------------------------------------------------
export default function ReportPage() {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const [report, setReport] = useState<ReportData | null>(null);
    const [loadingStatus, setLoadingStatus] = useState<'generating' | 'success' | 'error'>('generating');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [versionTitle, setVersionTitle] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [expandedIndicators, setExpandedIndicators] = useState<{ [key: string]: boolean }>({});

    // state for response viewer
    const [isOpen, setIsOpen] = useState(false);
    const isOpenRef = useRef(isOpen);
    const [viewerState, setViewerState] = useState<ViewerState>(ViewerState.loading);
    const [viewerData, setViewerData] = useState<{
        response: ResponseData | null,
        questionnaire: QuestionnaireData | null
    }>({ response: null, questionnaire: null });

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    // data for response viewer
    const [curResponse, setCurResponse] = useState<ResponseMeta | null>(null);
    const [fetchQuestionnaireList, setFetchQuestionnaireList] = useState<Record<
        number,
        QuestionnaireData | null
    >>({})
    const [fetchList, setFetchList] = useState<Record<
        number,
        ResponseData | null
    >>({})
    useEffect(() => {
        if (typeof window !== 'undefined') {
            //const storedUserId = localStorage.getItem('userId');
            //const storedAuthToken = localStorage.getItem('authToken');
            const fetchListString = localStorage.getItem("myQuestionnaire");
            const data = fetchListString ? JSON.parse(fetchListString) : [];
        
            //setUserId(storedUserId);
            //setAuthToken(storedAuthToken);
            setFetchQuestionnaireList(data)
        
            //setIsSortLock(true)
            //const sortingDataString = localStorage.getItem("sortingData");
            //console.log("loading: ", sortingDataString)
        
            /*const sortingData = sortingDataString ? JSON.parse(sortingDataString) as SortingData :
                {
                sort: {
                    type: SortType.Date,
                    way: SortWay.Accend
                },
                group: {
                    type: GroupType.Project,
                    way: SortWay.Accend
                }
            }*/
            //setSortType(sortingData.sort? sortingData.sort.type : SortType.Date)
            //setSortWay(sortingData.sort? sortingData.sort.way: SortWay.Accend)
            //setGroupType(sortingData.group? sortingData.group.type: GroupType.Project)
            //setIsSortLock(false)
        }
    }, []);

    const { responseId, userId, authToken } = useMemo(() => {
        if (typeof window === 'undefined') return { responseId: null, userId: null, authToken: null };

        const idString = localStorage.getItem('responseId');
        const token = localStorage.getItem('authToken');
        const id = idString ? parseInt(idString, 10) : null;
        const storedUserId = localStorage.getItem('userId');

        return {
            responseId: id,
            userId: storedUserId,
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


    useEffect(() => {
        loadData();
    }, [loadData]);

    // 處理加載/錯誤狀態的渲染
    if (loadingStatus === 'generating') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <AuthHeader />
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
                <AuthHeader />
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

    // 權重顯示邏輯
    const renderTaiWeights = (taiWeightSnapshot: Record<string, number> | null) => {
        if (!taiWeightSnapshot || Object.keys(taiWeightSnapshot).length === 0) {
            return (
                <div className="text-center p-4 text-gray-500 border-t mt-4">
                    <p>{t('reportPage.common.noWeightSnapshot')}</p>
                </div>
            );
        }

        // 權重排序
        const sortedWeights = Object.entries(taiWeightSnapshot)
            .map(([key, weight]) => ({
                key,
                title: TAI_INDICATOR_MAP_EN_ZH[key] || key,
                weight,
            }))
            .sort((a, b) => b.weight - a.weight);

        return (
            <div className="w-full text-center margin-center border-t pt-4 mt-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">{t('reportPage.report.indicatorWeights')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-purple-50 rounded-lg max-w-lg mx-auto">
                    {sortedWeights.map(({ title, key, weight }) => (
                        <div key={key} className="flex flex-col items-center bg-white p-3 rounded-lg shadow-sm border border-purple-200">
                            <span className="text-xs font-medium text-gray-500 text-center">
                                {(i18n.language !== "en")
                                    ? title
                                    : (key.charAt(0).toUpperCase() + key.slice(1).toLowerCase())
                                }
                            </span>
                            {/* 權重百分比顯示 */}
                            <span className="text-lg font-bold text-purple-700 mt-1">
                                {((weight) * 100).toFixed(0)}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const handleRedoQuestionnaire = () => {
        const isConfirmed = window.confirm(
            t('reportPage.confirmation.redo') // 使用 i18n 翻譯的提示訊息
        );

        if (isConfirmed) {
            router.push('/questionnaire');
        }
    };

    // open
    // get response and questionnair from response id and qId (GET API)
    const getResponseAndQuestionnaire = async (id: number, locale: string | undefined, finalState: ViewerState) => 
    {
        fetchList[id] = fetchList[id] || null
    
        let r: ResponseData | null = null
        let q: QuestionnaireData | null = null
    
        // response
        if (fetchList[id] === null) {
            console.log("fetch response")
            if (!userId || userId === 'fallback-user-id' || !authToken) {
                return;
            }
        
            try {
                r = await fetchResponse(userId, authToken, id)
            } catch (e) {
                setViewerState(ViewerState.fail)
                console.error("error while fetchResponse", e)
                throw "fail to get response"
            }
    
            if (r === null || r === undefined) {
                setViewerState(ViewerState.fail)
                throw "fail to get response"
            }
            else {
                fetchList[id] = r
            }
        }
        else r = fetchList[id]
    
        const qChecker = (q: QuestionnaireData) => {
            return (
                q.description !== undefined
                && q.group !== undefined
                && q.id !== undefined
                && q.title !== undefined
                && q.questions !== undefined
            )
        }

        const qId = r.versionId
        fetchQuestionnaireList[qId] = fetchQuestionnaireList[qId] || null
    
        // questionnaire
        if (fetchQuestionnaireList[qId] === null
            || qChecker(fetchQuestionnaireList[qId]) === false)
        {
            console.log("not find q in local storage")
            if (!userId || userId === 'fallback-user-id' || !authToken) {
                return;
            }
        
            try {
                q = await fetchQuestionnaire(qId);
            } catch (e) {
                setViewerState(ViewerState.fail)
                console.error("error while fetchResponse", e)
                throw "fail to get response"
            }
        
            if (q === null || q === undefined) {
                setViewerState(ViewerState.fail)
                throw "fail to get questionnaire"
            }
            else {
                fetchQuestionnaireList[qId] = q
                try {
        
                } catch (e) {
                console.error("fail to translate:", e)
                }
            }
        }
        else q = fetchQuestionnaireList[qId]
    
        localStorage.setItem("myQuestionnaire", JSON.stringify(fetchQuestionnaireList))
        setViewerData({ response: r, questionnaire: q })
        setViewerState(finalState)
    }

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
                            {versionTitle ? <TranslatedText text={versionTitle}></TranslatedText> : t('reportPage.error.missingVersionTitle')}
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
                        {report.taiWeightSnapshot && renderTaiWeights(report.taiWeightSnapshot)}

                        <div className="markdown-content not-prose text-left mt-6 overflow-x-auto">
                            <TranslatedMarkdown content={markdownContent || ""} />
                        </div>
                    </section>

                    {/* 各項指標細節區塊 */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">
                            {t('reportPage.report.detailIndicators')}
                        </h2>

                        <div className="space-y-5">
                            {Object.entries(TAI_INDICATOR_MAP_EN_ZH).map(([key, title]) => {
                            const score = report.radarData[key];
                            if (score === undefined) return null;

                            const isNA = typeof score === 'string';

                            // 後端給的該指標統計 Markdown
                            const axisStatsMd =
                                report.questionStatsText && report.questionStatsText[key]
                                ? report.questionStatsText[key]
                                : "";

                            // 這個指標目前是否展開
                            const isExpanded = !!expandedIndicators[key];

                            const containerClasses = `flex items-center space-x-4 p-3 bg-gray-50 rounded-lg ${
                                isNA ? "opacity-50" : ""
                            }`;
                            const titleWidth = "w-1/3 sm:w-1/5";
                            const contentWidth = "w-2/3 sm:w-4/5";

                            // 點擊時切換展開/收合
                            const handleToggle = () => {
                                setExpandedIndicators((prev) => ({
                                ...prev,
                                [key]: !prev[key],
                                }));
                            };

                            return (
                                <div key={key} className="space-y-2">
                                {/* 上面這塊：標題 + 進度條 + 展開icon（可點擊） */}
                                <button
                                    type="button"
                                    onClick={handleToggle}
                                    className={`${containerClasses} w-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300`}
                                >
                                    <div
                                    className={`${titleWidth} text-sm sm:text-base font-semibold text-gray-700 flex items-center space-x-1`}
                                    >
                                    <span>
                                        {i18n.language !== "en"
                                        ? title
                                        : key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()}
                                    </span>
                                    {/* 小箭頭：展開 / 收合視覺提示 */}
                                    <span className="text-xs text-gray-400">
                                        {isExpanded ? "▲" : "▼"}
                                    </span>
                                    </div>

                                    <div className={`${contentWidth} flex items-center`}>
                                    {isNA ? (
                                        <>
                                        <div className="flex-grow text-sm text-gray-500 italic text-left">
                                            {t("reportPage.common.notAvailable")}
                                        </div>
                                        <span className="ml-3 text-sm font-bold w-12 text-right text-gray-800">
                                            {"-"}
                                        </span>
                                        </>
                                    ) : (
                                        <>
                                        <div className="flex-grow h-3 rounded-full bg-gray-200">
                                            <div
                                            className={`h-3 rounded-full transition-all duration-700 ${getScoreColor(
                                                score as number
                                            )}`}
                                            style={{ width: `${score}%` }}
                                            />
                                        </div>
                                        <span className="ml-3 text-sm font-bold w-10 text-right text-gray-800">
                                            {(score as number).toFixed(2)}
                                        </span>
                                        </>
                                    )}
                                    </div>
                                </button>

                                {/* 下方這塊：只有在展開 & 有 stats 時才顯示 */}
                                {axisStatsMd && isExpanded && (
                                    <div className="ml-2 sm:ml-6 bg-purple-50 border border-purple-100 rounded-lg p-3 text-xs sm:text-sm text-gray-700">
                                    <TranslatedMarkdown content={axisStatsMd} />
                                    </div>
                                )}
                                </div>
                            );
                            })}
                        </div>
                        </section>
                </div>
            </main>

            {/* response window */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-60 bg-black/65 flex items-center justify-center "
                    onClick={() => { setIsOpen(false) }}
                >
                    <div
                        className=" 
                            absolute flex flex-col top-[3vh]
                            w-full h-[90vh] max-h-[680]
                            mx-0 p-5
                            bg-gray-100 rounded-xl shadow-lg
                            
                            md:mx-20
                            md:max-w-[800]"
                        onClick={(e) => e.stopPropagation()} // avoid clicking background
                    >
                        <div className="
                            relative h-full w-full 
                            bg-gray-50 
                            rounded overflow-hidden "
                        >
                        <div 
                            className='absolute top-4 left-4 z-[61] size-fit'
                            onClick={() => { setIsOpen(false) }}
                        >
                            <CircleX
                                size={40}
                                className='
                                text-white hover:text-red-500 cursor-pointer
                                drop-shadow-lg drop-shadow-black/45
                                
                                lg:hidden'
                            />
                        </div>
                        <div className='absolute z-53 size-[100%] rounded shadow-[inset_0_0_5px_rgba(0,0,0,0.15)] pointer-events-none' />
                        <ResponseWindow
                            state={viewerState}
                            data={viewerData}
                        />
                        </div>
                    </div>
                </div>
            )}

            {/* buttons */}
            <div className="flex justify-center mt-10 mb-20 space-x-4 no-print">
                {/* 1. 返回首頁 (Secondary Style) */}
                <button
                    onClick={() => router.push('/home')}
                    className={`
                        w-auto py-3 px-6 text-lg font-semibold rounded-full 
                        bg-white text-gray-700 shadow-2xl border border-gray-300 
                        transition duration-150 ease-in-out 
                        hover:bg-gray-50 active:bg-gray-100
                        focus:outline-none focus:ring-4 focus:ring-gray-300
                        flex items-center space-x-2
                    `}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l-2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6m-6 0h-2M9 17h6" />
                    </svg>
                    <span>{t("reportPage.button.backHome")}</span>
                </button>
                
                <button
                    onClick={async () => {
                        // ... (您的邏輯)
                        if(responseId === null) return
                        setViewerState(ViewerState.loading)
                        setIsOpen(true)      
                        try {
                            getResponseAndQuestionnaire(responseId, i18n.language, ViewerState.success)
                        } catch (e) {
                            console.error("取得回應時發生錯誤", e)
                        }
                    }} 
                    className={`
                        w-auto py-3 px-6 text-lg font-semibold rounded-full 
                        bg-white text-gray-700 shadow-2xl border border-gray-300 
                        transition duration-150 ease-in-out 
                        hover:bg-gray-50 active:bg-gray-100
                        focus:outline-none focus:ring-4 focus:ring-gray-300
                        flex items-center space-x-2
                    `}
                >
                    {/* 新的圖標：文件或列表 */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {/* 圖標路徑：一個帶有內容的文件圖標 (File with Content) */}
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-6-8h6M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0015.586 5H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>填答紀錄</span>
                </button>

                <button
                    onClick={handleRedoQuestionnaire}
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356-2A8.001 8.001 0 004.582 17.5l-1.636 1.636M20 20v-5h-.582a8.001 8.001 0 01-15.356 2.5l1.636-1.636" />
                    </svg>
                    <span>{t("reportPage.button.redo")}</span>
                </button>
                
                <PdfExportButton
                    contentId="report-content"
                    projectName={projectName}
                    modelStage={versionTitle}
                    preparingText={t('reportPage.button.preparingPdf')}
                    generateText={t('reportPage.button.generatePdf')}
                    className={`
                        py-3 px-6 text-lg font-semibold rounded-full 
                        bg-indigo-600 text-white shadow-2xl border border-indigo-700 
                        transition duration-150 ease-in-out 
                        hover:bg-indigo-700 active:bg-indigo-800
                        focus:outline-none focus:ring-4 focus:ring-indigo-300
                        flex items-center space-x-2
                    `}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    }
                />
            </div>
        </div>
    );
}

function ResponseWindow({state, data}:{
    state: ViewerState,
    data: { response: ResponseData | null, questionnaire: QuestionnaireData | null } ,
}){
    const [curState, setCurState] = useState(state)
    const { i18n, t } = useTranslation();
    
    useEffect(() => {
    setCurState(state)
    }, [state])

    const switchState = (state: ViewerState)=>{
    setCurState(prev => prev ^ state)
    }

    const addState = (state: ViewerState)=>{
    setCurState(prev => prev | state)
    }

    const removeState = (state: ViewerState)=>{
    setCurState(prev => prev & ~(state))
    }

    // loading
    if (curState & ViewerState.loading) return (
        <div className="
            flex items-center justify-center
            w-full h-full"
        >
            <LoadingComponent message={t("historyPage.loading")} />
        </div>
    )

    // fail
    if ((curState & ViewerState.fail)
        || (data.response === null || data.questionnaire === null)
    ) return (
    <div className="
        flex items-center justify-center
        w-full h-full"
    >
        <h2 className="
            mb-4
            text-red-600 text-lg font-semibold"
        >
            {t('historyPage.fetchFail')}
        </h2>
    </div>
    )

    return(
        <div className="
            relative
            flex flex-col items-center justify-center
            w-full h-full"
        >
            <div className='
                absolute bottom-0 z-52
                w-[100%] h-full
                bg-gradient-to-t from-black/10 to-transparent
                pointer-events-none'
            />

            <div className={`
                absolute z-[58] bottom-0
                flex justify-center items-start space-x-4
                h-full w-fit`
            }>
                <ResponseViewer
                    curState={ViewerState.success}
                    data={{ response: data.response, questionnaire: data.questionnaire }}
                    onEdit={()=>{}}
                    onReport={()=>{}}
                    notify={()=>{}}
                />
            </div>
        </div>
    )
}
