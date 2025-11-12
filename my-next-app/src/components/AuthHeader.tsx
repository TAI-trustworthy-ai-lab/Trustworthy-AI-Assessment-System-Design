"use client";

import React from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import Header from './Header';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next'; // 引入 i18n Hook

// 統一 button 樣式
const baseButtonClasses = "flex items-center space-x-2 py-2 px-4 rounded-2xl text-white font-bold transition duration-100 shadow-md";
const titleLinkTarget = '/home'; // 登入後，點擊標題固定連到 /home

export default function AuthHeader() {
    const { isLoggingOut, handleLogout } = useAuth();
    const { t } = useTranslation(); // 使用 i18n

    const logoutButtonClasses = isLoggingOut
        ? 'bg-blue-400 cursor-not-allowed'
        : 'bg-blue-500 hover:bg-blue-400 active:bg-blue-600';

    return (
        <Header titleHref={titleLinkTarget}>
            <div className='flex justify-end space-x-5 items-center'>
                {/* 可選：在這裡加上語言切換按鈕 */}

                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={`${baseButtonClasses} ${logoutButtonClasses}`}
                    title={isLoggingOut ? t('auth.loggingOutTitle') : t('auth.logoutTitle')}
                >
                    {isLoggingOut ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <LogOut className="w-4 h-4" />
                    )}
                    <span>{isLoggingOut ? t('auth.loggingOut') : t('auth.logout')}</span>
                </button>
            </div>
        </Header>
    );
}
