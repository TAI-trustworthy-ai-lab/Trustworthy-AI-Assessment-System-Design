// 正確登出

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// 假設您的 Token 儲存鍵是 'authToken'
const AUTH_TOKEN_KEY = 'authToken'; 

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
                    // 即使 API 呼叫失敗，我們仍要移除前端 Token 並登出
                    const errorData = await response.json().catch(() => ({ message: 'Failed to parse error body' }));
                    console.error("登出 API 呼叫失敗 (HTTP 錯誤):", response.status, errorData);
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