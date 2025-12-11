"use client";

import { useState, useCallback, useEffect, useRef } from 'react'; // 引入 useEffect
import { useRouter } from 'next/navigation';
import { USER_API_BASE, BASE_API_URL, API_PREFIX } from '../config/apiConfig';

const AUTH_TOKEN_KEY = 'authToken';
const AUTH_EXPIRY_KEY = 'authExpiry'; 
const USER_ID_KEY = 'userId';
const USER_ROLE_KEY = 'userRole';
const QUESTIONNAIRE_ID_KEY = 'QuestionnaireID';
const CURRENT_PROJECT_ID_KEY = 'currentProjectId';
const RESPONSE_ID_KEY = 'responseId';


const formatTime = (seconds: number): string => {
    const absSeconds = Math.max(0, seconds);
    const h = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60);
    const s = Math.floor(absSeconds % 60);

    return [h, m, s]
        .map(v => v < 10 ? "0" + v : v)
        .join(":");
}


export const useAuth = () => {
    const router = useRouter();

    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [secondsUntilLogout, setSecondsUntilLogout] = useState<number | null>(null);
    const isLogoutPendingRef = useRef(false);


    const clearLocalStorage = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_EXPIRY_KEY); 
            localStorage.removeItem(USER_ID_KEY); 
            localStorage.removeItem(USER_ROLE_KEY);
            localStorage.removeItem(QUESTIONNAIRE_ID_KEY);
            localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
            localStorage.removeItem(RESPONSE_ID_KEY);
            localStorage.removeItem("myQuestionnaire");
            localStorage.removeItem("myProject");
        }
    }, []);

    // handleLogout 現在接受一個參數 isAutomatic，表示是否為自動登出
    const handleLogout = useCallback(async (isAutomatic = false) => {
        if (isLogoutPendingRef.current) {
            console.log("Logout already in progress, preventing duplicate call.");
            return; 
        }

        isLogoutPendingRef.current = true;
        setIsLoggingOut(true);
        setSecondsUntilLogout(0);

        // 1. 嘗試從 localStorage 獲取 Token
        let userToken: string | null = null;
        if (typeof window !== 'undefined') {
            userToken = localStorage.getItem(AUTH_TOKEN_KEY);
        }

        // 僅在非自動登出時，執行後端 API 呼叫 
        if (!isAutomatic) { 
            try {
                if (userToken) {
                    const response = await fetch(`${BASE_API_URL}${API_PREFIX}/user/logout`, { 
                        method: "DELETE", 
                        headers: {
                            'Authorization': `Bearer ${userToken}`, 
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        
                    } else {
                        console.log("後端登出成功");
                    }
                }
            } catch (error) {
                console.error("登出 API 呼叫時發生錯誤:", error);
            }
        }

        clearLocalStorage();
        router.replace('/'); 

        isLogoutPendingRef.current = false;
        setIsLoggingOut(false);
    }, [clearLocalStorage, router]);

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;

        const checkAuthExpiry = () => {
            if (typeof window === 'undefined') return;

            // 1. 檢查 Token 和 Expiry 是否存在
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const expiryString = localStorage.getItem(AUTH_EXPIRY_KEY);

            if (!token || !expiryString) {
                setSecondsUntilLogout(null);
                return;
            }
            
            // 2. 計算剩餘時間 (秒)
            const expiryTime = parseInt(expiryString, 10); // 假設儲存的是 Unix Timestamp (毫秒)

            if (isNaN(expiryTime) || expiryTime <= 0) {
                 console.log("Auth expiry is invalid or missing, executing auto-logout.");
                 setSecondsUntilLogout(0);
                 handleLogout(true); // 執行自動登出
                 return; // 停止後續計時邏輯
            }
            
            const now = Date.now();
            const remainingSeconds = Math.floor((expiryTime - now) / 1000);

            setSecondsUntilLogout(remainingSeconds);

            // 3. 如果時間到或已過期，則執行登出
            if (remainingSeconds <= 0) {
                console.log("Token 已過期，執行自動登出。");
                handleLogout(true); // 傳入 true 表示是自動登出
                return;
            }
            
            // 4. 設定下一次檢查的時間
            timer = setTimeout(checkAuthExpiry, 1000); 
        };
        
        // 第一次檢查
        checkAuthExpiry();

        // 清理函數：組件卸載時清除定時器
        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, []); 

    

    
    // 返回剩餘時間字串
    const timeUntilLogout = secondsUntilLogout !== null && secondsUntilLogout > 0
        ? formatTime(secondsUntilLogout)
        : null;

    return {
        isLoggingOut,
        handleLogout,
        timeUntilLogout, 
        isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem(AUTH_TOKEN_KEY) : false,
    };
};