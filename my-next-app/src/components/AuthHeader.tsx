"use client";

import React from 'react';
import { LogOut, Loader2, Clock } from 'lucide-react'; // 引入 Clock icon
import Header from './Header';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';

// 統一 button 樣式
const baseButtonClasses = "flex items-center space-x-2 py-2 px-4 rounded-2xl text-white font-bold transition duration-100 shadow-md";
const titleLinkTarget = '/home';

export default function AuthHeader() {
    const { isLoggingOut, handleLogout, timeUntilLogout } = useAuth();
    const { t } = useTranslation();

    const logoutButtonClasses = isLoggingOut
        ? 'bg-blue-400 cursor-not-allowed'
        : 'bg-blue-500 hover:bg-blue-400 active:bg-blue-600';
    
    const timerClasses = "text-sm font-semibold p-2 rounded-lg transition duration-100";
    const timerColorClasses = timeUntilLogout && 
        ['00:01:00', '00:00:59', '00:00:58', '00:00:01', '00:00:02', '00:00:03'].includes(timeUntilLogout)
        ? 'text-red-600'
        : 'text-gray-700';

    return (
        <Header titleHref={titleLinkTarget}>
            <div className='flex justify-end space-x-5 items-center'>
                {timeUntilLogout && (
                    <div 
                        className={`flex items-center space-x-2 ${timerClasses} ${timerColorClasses}`}
                    >
                        <Clock className="w-4 h-4" />
                        <span>{t('auth.autoLogoutPrefix')}</span> 
                        <span className='w-12 text-center'>{timeUntilLogout}</span>
                        <span>{t('auth.autoLogoutSuffix')}</span> 
                    </div>
                )}
                

                <button
                    onClick={() => handleLogout()} // 確保呼叫時不帶參數
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