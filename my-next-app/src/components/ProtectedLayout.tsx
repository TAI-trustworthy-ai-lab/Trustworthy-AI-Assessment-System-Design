'use client';

import React, { useEffect } from 'react';
// ⚠️ 確保這裡使用 next/navigation
import { useRouter } from 'next/navigation'; 

interface ProtectedLayoutProps {
    children: React.ReactNode;
}

const AUTH_TOKEN_KEY = 'authToken'; // 確保與 useAuth.tsx 中的鍵名一致

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(true);
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);

    useEffect(() => {
        // 這個邏輯只在客戶端 (瀏覽器) 執行
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        
        if (!token) {
            // 1. 如果沒有 Token，執行導航
            console.log("ProtectedLayout: Token not found, redirecting to /.");
            // 假設登入頁面是 '/' 或 '/login'
            router.replace('/'); 
            setIsAuthenticated(false);
        } else {
            // 2. Token 存在，允許渲染內容
            setIsAuthenticated(true);
        }
        
        // 3. 標記檢查結束
        setIsLoading(false);

        // 這裡可以選擇性地添加更複雜的 Token 有效期檢查或 API 驗證

    }, [router]);

    // 狀態 1: 如果還在檢查或未通過驗證，顯示載入畫面
    if (isLoading || !isAuthenticated) {
        // 為了避免內容閃爍，在檢查過程中可以顯示一個全頁載入畫面
        // 即使是導航，也會先顯示這個載入畫面直到跳轉完成
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p>驗證中，請稍候...</p> {/* 或者使用 Loader2 圖標 */}
            </div>
        );
    }
    
    // 狀態 2: 通過驗證，渲染子內容
    return <>{children}</>;
}