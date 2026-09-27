"use client";

import { useState, useCallback, useEffect, useRef } from 'react'; // React hooks
import { useRouter } from 'next/navigation'; // Next.js router
// API Configuration Constants
import { USER_API_BASE, BASE_API_URL, API_PREFIX } from '../config/apiConfig';

// Local Storage Keys
const AUTH_TOKEN_KEY = 'authToken';
const AUTH_EXPIRY_KEY = 'authExpiry'; 
const USER_ID_KEY = 'userId';
const USER_ROLE_KEY = 'userRole';
const QUESTIONNAIRE_ID_KEY = 'QuestionnaireID';
const CURRENT_PROJECT_ID_KEY = 'currentProjectId';
const RESPONSE_ID_KEY = 'responseId';


// Utility function to format seconds into HH:MM:SS string
const formatTime = (seconds: number): string => {
    const absSeconds = Math.max(0, seconds);
    const h = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60);
    const s = Math.floor(absSeconds % 60);

    return [h, m, s]
        .map(v => v < 10 ? "0" + v : v)
        .join(":");
}


// Main Auth Hook
export const useAuth = () => {
    const router = useRouter();

    // State for UI indicator
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    // State for logout timer display
    const [secondsUntilLogout, setSecondsUntilLogout] = useState<number | null>(null);
    // Ref to prevent duplicate logout calls
    const isLogoutPendingRef = useRef(false);


    // Cleanup function for local storage
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
            // localStorage.removeItem("myTranslatedText");
        }
    }, []);

    // Logout handler (manual or automatic)
    const handleLogout = useCallback(async (isAutomatic = false) => {
        if (isLogoutPendingRef.current) {
            console.log("Logout already in progress, preventing duplicate call.");
            return; 
        }

        isLogoutPendingRef.current = true;
        setIsLoggingOut(true);
        setSecondsUntilLogout(0);

        // Get token before clearing storage
        let userToken: string | null = null;
        if (typeof window !== 'undefined') {
            userToken = localStorage.getItem(AUTH_TOKEN_KEY);
        }

        // Call backend API only for manual logout
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
                        // Log API error, but proceed with frontend logout
                    } else {
                        console.log("後端登出成功");
                    }
                }
            } catch (error) {
                console.error("登出 API 呼叫時發生錯誤：", error);
            }
        }

        // Clear local session data
        clearLocalStorage();
        // Redirect to home/login page
        router.replace('/'); 

        isLogoutPendingRef.current = false;
        setIsLoggingOut(false);
    }, [clearLocalStorage, router]);

    // Effect for the automatic logout timer
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;

        // Recursive function to check expiry every second
        const checkAuthExpiry = () => {
            if (typeof window === 'undefined') return;

            // 1. Check for token and expiry timestamp
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const expiryString = localStorage.getItem(AUTH_EXPIRY_KEY);

            if (!token || !expiryString) {
                setSecondsUntilLogout(null);
                return;
            }
            
            // 2. Calculate remaining time
            const expiryTime = parseInt(expiryString, 10); // Expecting Unix Timestamp (ms)

            if (isNaN(expiryTime) || expiryTime <= 0) {
                 console.log("Auth expiry is invalid or missing, executing auto-logout.");
                 setSecondsUntilLogout(0);
                 handleLogout(true); // Auto-logout
                 return;
            }
            
            const now = Date.now();
            // Remaining time in seconds
            const remainingSeconds = Math.floor((expiryTime - now) / 1000);

            setSecondsUntilLogout(remainingSeconds);

            // 3. Trigger logout if time is up or passed
            if (remainingSeconds <= 0) {
                console.log("Token expired, executing auto-logout.");
                handleLogout(true); // Auto-logout
                return;
            }
            
            // 4. Schedule next check
            timer = setTimeout(checkAuthExpiry, 1000); // Check again in 1 second
        };
        
        // Start the process
        checkAuthExpiry();

        // Cleanup: Clear timer on unmount
        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [handleLogout]); 

    // Formatted time string (HH:MM:SS) for display
    const timeUntilLogout = secondsUntilLogout !== null && secondsUntilLogout > 0
        ? formatTime(secondsUntilLogout)
        : null;

    // Check auth status based on local storage token presence
    const isAuthenticated = typeof window !== 'undefined' ? !!localStorage.getItem(AUTH_TOKEN_KEY) : false;

    // Return necessary auth utilities and states
    return {
        isLoggingOut,
        handleLogout,
        timeUntilLogout, 
        isAuthenticated,
    };
};