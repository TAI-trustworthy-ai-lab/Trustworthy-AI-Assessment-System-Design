"use client";

import React from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import Header from './Header'; // 引入基礎 Header
import { useAuth } from '../hooks/useAuth'; // 引入 Hook

// 統一 button 樣式
const baseButtonClasses = "flex items-center space-x-2 py-2 px-4 rounded-2xl text-white font-bold transition duration-100 shadow-md";
const titleLinkTarget = '/home'; // 登入後，點擊標題固定連到 /home

export default function AuthHeader() {
    // 使用 Hook 獲取登出狀態和處理函式
    const { isLoggingOut, handleLogout } = useAuth(); 

    // 登出按鈕的動態樣式
    const logoutButtonClasses = isLoggingOut
        ? 'bg-blue-400 cursor-not-allowed'
        : 'bg-blue-500 hover:bg-blue-400 active:bg-blue-600';

    return (
        // 使用基礎 Header 作為骨架
        <Header titleHref={titleLinkTarget}>
            {/* 這裡就是傳給 Header 的 children 內容 */}
            <div className='flex justify-end space-x-5 items-center'>
                {/* 可選：在這裡加上語言切換按鈕 */}
                
                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut} 
                    className={`${baseButtonClasses} ${logoutButtonClasses}`}
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
    );
}