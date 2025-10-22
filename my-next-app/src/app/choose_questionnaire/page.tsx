"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Header from '@/components/Header';
import { LogOut, Loader2 } from 'lucide-react';

const BASE_URL = "http://localhost:3001/api/user";

export default function choose_questionnaire_page() {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);

        try {
            let userToken = null;
            if (typeof window !== 'undefined') {
                userToken = localStorage.getItem('userToken');
            }

            if (userToken) {
                const response = await fetch(`${BASE_URL}/logout`, {
                    method: "POST",
                    headers: {
                        'Authorization': `Bearer ${userToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Failed to parse error body' }));
                    console.error("登出 API 呼叫失敗 (HTTP 錯誤):", response.status, errorData);
                } else {
                    console.log("後端登出成功");
                }
            }
        } catch (error) {
            console.error("登出 API 呼叫時發生錯誤:", error);
        } finally {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('userToken');
            }

            router.push('/');
            setIsLoggingOut(false);
        }
    };

    const titleLinkTarget = '/home';
    const baseButtonClasses = "flex items-center justify-center space-x-2 py-2 px-6 rounded-2xl text-white font-bold transition duration-100 shadow-md";

    // 模擬三個階段的點擊行為
    const handleStageClick = (stage) => {
        console.log(`進入 ${stage} 階段`);
        router.push(`/model/${stage}`); // 例如跳轉到 /model/before、/model/during、/model/after
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 標頭 */}
            <Header titleHref={titleLinkTarget}>
                <div className='flex justify-end space-x-5 items-center'>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className={`${baseButtonClasses} ${isLoggingOut
                                ? 'bg-blue-400 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-400 active:bg-blue-600'
                            }`}
                        title={isLoggingOut ? "登出中..." : "登出"}
                    >
                        {isLoggingOut ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <LogOut className="w-4 h-4" />
                        )}
                        <span>{isLoggingOut ? "登出中..." : "登出"}</span>
                    </button>
                </div>
            </Header>

            {/* 主要內容 */}
            <main className="pt-24 flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-4">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-8">
                    請選擇建模階段
                </h1>

                <div className="flex flex-col space-y-6 w-full max-w-xs">
                    <button
                        onClick={() => handleStageClick("before")}
                        className={`${baseButtonClasses} bg-green-500 hover:bg-green-400 active:bg-green-600`}
                    >
                        建模前
                    </button>

                    <button
                        onClick={() => handleStageClick("during")}
                        className={`${baseButtonClasses} bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600`}
                    >
                        建模中
                    </button>

                    <button
                        onClick={() => handleStageClick("after")}
                        className={`${baseButtonClasses} bg-purple-500 hover:bg-purple-400 active:bg-purple-600`}
                    >
                        建模後
                    </button>
                </div>
            </main>
        </div>
    );
}
