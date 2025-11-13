"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';
import ProtectedLayout from '@/components/ProtectedLayout';

const QUESTIONNAIRE_API_URL = `http://localhost:3001/api/questionnaire/group/latest`;

const STAGE_ID_MAP: { [key: number]: 'before' | 'during' | 'after' } = {
    1: 'before', 
    2: 'during',
    3: 'after',
};

const stages = {
    before: {
        title: "建模前",
        description: "專注於需求分析、資料準備和目標設定。",
        iconPath: "M13 10V3L4 14h7v7l9-11h-7z",
        accent: "text-indigo-700",
        iconBg: "bg-gray-100",
        bg: "bg-indigo-200",
        hoverBorder: "hover:border-blue-400",
    },
    during: {
        title: "建模中",
        description: "專注於模型選擇、訓練過程中的監控及參數調整。",
        iconPath: "M9.75 17L12 19.25M14.25 17L12 19.25M12 19.25V5.75M5.75 12H19.25", 
        accent: "text-purple-700",
        iconBg: "bg-gray-100",
        bg: "bg-purple-100",
        hoverBorder: "hover:border-purple-400",
    },
    after: {
        title: "建模後",
        description: "專注於模型評估、部署準備和結果回顧。",
        iconPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", 
        accent: "text-blue-700",
        iconBg: "bg-gray-100",
        bg: "bg-blue-100",
        hoverBorder: "hover:border-indigo-500",
    },
};

const fetchLatestQuestionnaires = async () => {
    try {
        const response = await fetch(QUESTIONNAIRE_API_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP error! Status: ${response.status}`);
        }
        return result.data;
    } catch (error) {
        console.error("獲取最新問卷列表失敗:", error);
        throw error;
    }
};


export default function ChooseQuestionnairePage() {
    const router = useRouter();
    const [questionnaireMap, setQuestionnaireMap] = useState({}); // 用來儲存 {stageKey: versionId}
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadQuestionnaireData = async () => {
            try {
                const data = await fetchLatestQuestionnaires();
                
                const newMap = {};
                
                // 截取最新版本問卷 ID
                data.forEach((group: any) => {
                    const groupId = group.id; 
                    const latestVersion = group.versions?.[0]; 
                    
                    const stageKey = STAGE_ID_MAP[groupId]; 

                    // 找到對應階段並存入 map
                    if (stageKey && latestVersion) {
                        newMap[stageKey] = latestVersion.id;
                    }
                });
                
                setQuestionnaireMap(newMap);
            } catch (error) {
                console.error("問卷資料初始化失敗:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadQuestionnaireData();
    }, []);

    const baseButtonClasses = `
        w-full p-6 text-left border-2 border-gray-200 rounded-xl shadow-lg cursor-pointer
        transition duration-300 ease-in-out transform 
        hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 active:shadow-md
    `;

    // 模擬三個階段的點擊行為
    const handleStageClick = (stage: "before" | "during" | "after") => {
        const versionId = questionnaireMap[stage];
        
        if (!versionId) {
            alert(`錯誤：找不到 ${stages[stage].title} 階段對應的最新問卷版本。`);
            console.error(`Missing QuestionnaireID for stage: ${stage}`);
            return;
        }

        console.log(`進入 ${stage} 階段，VersionID: ${versionId}`);
        localStorage.setItem("QuestionnaireID", versionId);

        router.push(`/model/${stage}`); 
    };

    const StageButton = ({ stageKey }: { stageKey: keyof typeof stages }) => {
        const stage = stages[stageKey];
        const isDisabled = isLoading || !questionnaireMap[stageKey];
        
        return (
            <button
                onClick={() => handleStageClick(stageKey)}
                className={`${baseButtonClasses} ${stage.bg} ${stage.hoverBorder} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'group'}`}
                disabled={isDisabled}
            >
                {/* 按鈕內容佈局 */}
                <div className="flex items-center space-x-5">
                    
                    {/* 圖標區 */}
                    <div className={`p-3 rounded-xl ${stage.iconBg} ${stage.accent}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stage.iconPath}></path>
                        </svg>
                    </div>

                    {/* 文字區 */}
                    <div className="flex-1">
                        {/* 標題 */}
                        <h2 className="text-center text-2xl font-bold text-gray-800">
                            {stage.title}
                            {isDisabled && !isLoading && <span className="ml-2 text-sm text-red-500 font-normal">(問卷缺失)</span>}
                        </h2>
                        {/* 描述 */}
                        <p className="text-center text-gray-500 text-md mt-1">
                            {stage.description}
                        </p>
                    </div>
                    
                    {/* 右側箭頭 */}
                    <div className="ml-auto flex items-center">
                         <svg className={`w-5 h-5 ${stage.accent} transition duration-300 transform group-hover:translate-x-1`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </div>
                </div>
            </button>
        );
    };

    if (isLoading) {
        return (
            <ProtectedLayout>
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600">正在載入問卷資料...</p>
                </div>
            </ProtectedLayout>
        );
    }

    return (
        <ProtectedLayout>
        <div className="min-h-screen bg-gray-50">
        <AuthHeader />

            {/* 主要內容 */}
            <main className="pt-30 flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-4">
                <div className="max-w-xl text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
                    選擇建模階段
                    </h1>
                    <p className="text-xl text-gray-600">
                        請選擇您目前進行到的階段，以開始填寫相應的量化評估問卷。
                    </p>
                </div>
                
                {/* 按鈕列表 (垂直堆疊) - 直接呼叫 StageButton 組件 */}
                <div className="flex flex-col space-y-6 w-full max-w-lg">
                    
                    <StageButton stageKey="before" />
                    <StageButton stageKey="during" />
                    <StageButton stageKey="after" />

                </div>
            </main>
        </div>
        </ProtectedLayout>
    );
}
