"use client";

import { useRouter } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';
import ProtectedLayout from '@/components/ProtectedLayout';

const BASE_URL = "http://localhost:3001/api/user";

export default function choose_questionnaire_page() {
    const router = useRouter();
    const baseButtonClasses = "flex items-center justify-center space-x-2 py-2 px-6 rounded-2xl text-white font-bold transition duration-100 shadow-md";

    // 模擬三個階段的點擊行為
    const handleStageClick = (stage: "before" | "during" | "after") => {
        console.log(`進入 ${stage} 階段`);
        router.push(`/model/${stage}`); // 例如跳轉到 /model/before、/model/during、/model/after
    };

    return (
        <ProtectedLayout>
        <div className="min-h-screen bg-gray-50">
        <AuthHeader />

            {/* 主要內容 */}
            <main className="pt-24 flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-4">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-8">
                    請選擇建模階段
                </h1>

                <div className="flex flex-col space-y-6 w-full max-w-xs">
                    <button
                        onClick={() => handleStageClick("before")}
                        className={`${baseButtonClasses} bg-indigo-300 hover:bg-indigo-200 active:bg-green-600`}
                    >
                        建模前
                    </button>

                    <button
                        onClick={() => handleStageClick("during")}
                        className={`${baseButtonClasses} bg-indigo-500 hover:bg-indigo-400 active:bg-yellow-600`}
                    >
                        建模中
                    </button>

                    <button
                        onClick={() => handleStageClick("after")}
                        className={`${baseButtonClasses} bg-indigo-800 hover:bg-indigo-700 active:bg-purple-600`}
                    >
                        建模後
                    </button>
                </div>
            </main>
        </div>
        </ProtectedLayout>
    );
}
