// 正確登出
"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const AUTH_TOKEN_KEY = 'authToken'; 
const USER_ID_KEY = 'userId'; 
const USER_ROLE_KEY = 'userRole';
const QUESTIONNAIRE_ID_KEY = 'QuestionnaireID';
const CURRENT_PROJECT_ID_KEY = 'currentProjectId';
const RESPONSE_ID_KEY = 'responseId';

// 假設您的後端基礎 URL 和登出 API 端點
const BASE_URL = 'http://localhost:3001/api/user'; 

export const useAuth = () => {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = useCallback(async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);

        // 1. 嘗試從 localStorage 獲取 Token
        let userToken: string | null = null;
        if (typeof window !== 'undefined') {
            userToken = localStorage.getItem(AUTH_TOKEN_KEY);
        }

        try {
            if (userToken) {
                // 2. 呼叫後端登出 API (如果您的後端需要此步驟)
                const response = await fetch(`${BASE_URL}/logout`, { 
                    method: "DELETE", 
                    headers: {
                        'Authorization': `Bearer ${userToken}`, 
                        'Content-Type': 'application/json',
                    },
                });
                
                if (!response.ok) {
                    if (response.status === 401) {
                        console.log("後端登出 API 呼叫失敗，原因：Token 已過期 (401)。視為成功登出。");
                        return; 
                    }

                    let errorDetails: any = { message: '無法解析錯誤細節' };
                    try {
                        const contentType = response.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                             errorDetails = await response.json();
                        } else {
                            // 如果不是 JSON，嘗試讀取文本
                            const errorText = await response.text();
                            errorDetails = { message: errorText.substring(0, 100) };
                        }
                    } catch (e) {
                         // 保持 errorDetails 為預設值
                    }
                    console.error(
                        `登出 API 呼叫失敗 (HTTP 錯誤 ${response.status})`, 
                        errorDetails
                    );
                } else {
                    console.log("後端登出成功");
                }
            }
        } catch (error) {
            console.error("登出 API 呼叫時發生錯誤:", error);
        } finally {
            // 3. 移除前端 Token
            if (typeof window !== 'undefined') {
                localStorage.removeItem(AUTH_TOKEN_KEY);
                localStorage.removeItem(USER_ID_KEY);     
                localStorage.removeItem(USER_ROLE_KEY);
                localStorage.removeItem(QUESTIONNAIRE_ID_KEY);
                localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
                localStorage.removeItem(RESPONSE_ID_KEY);
            }

            // 4. 跳轉到登入頁面 (假設登入頁面是 '/')
            router.replace('/'); 
            setIsLoggingOut(false);
        }
    }, [isLoggingOut, router]);

    return {
        isLoggingOut,
        handleLogout,
        // 可選：方便檢查是否登入
        isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem(AUTH_TOKEN_KEY) : false,
    };
};