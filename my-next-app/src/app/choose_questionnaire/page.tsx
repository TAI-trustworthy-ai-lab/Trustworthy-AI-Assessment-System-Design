"use client";

import { useRouter } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';
import ProtectedLayout from '@/components/ProtectedLayout';

const BASE_URL = "http://localhost:3001/api/user";

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

export default function choose_questionnaire_page() {
    const router = useRouter();
    const baseButtonClasses = `
        w-full p-6 text-left border-2 border-gray-200 rounded-xl shadow-lg cursor-pointer
        transition duration-300 ease-in-out transform 
        hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 active:shadow-md
    `;

    // 模擬三個階段的點擊行為
    const handleStageClick = (stage: "before" | "during" | "after") => {
        console.log(`進入 ${stage} 階段`);
        router.push(`/model/${stage}`); // 例如跳轉到 /model/before、/model/during、/model/after
    };

    const StageButton = ({ stageKey }: { stageKey: keyof typeof stages }) => {
        const stage = stages[stageKey];
        
        return (
            <button
                onClick={() => handleStageClick(stageKey)}
                className={`${baseButtonClasses} ${stage.bg} ${stage.hoverBorder}`}
            >
                {/* 按鈕內容佈局：左邊圖標，右邊文字 */}
                <div className="flex items-center space-x-5">
                    
                    {/* 圖標區 - 使用個性化顏色 */}
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
                        </h2>
                        {/* 描述 */}
                        <p className="text-center text-gray-500 text-md mt-1">
                            {stage.description}
                        </p>
                    </div>
                    
                    {/* 右側箭頭 (視覺提示) - 使用個性化顏色 */}
                    <div className="ml-auto flex items-center">
                         <svg className={`w-5 h-5 ${stage.accent} transition duration-300 transform group-hover:translate-x-1`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </div>
                </div>
            </button>
        );
    };

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
