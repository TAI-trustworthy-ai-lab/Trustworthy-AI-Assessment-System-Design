"use client";

import React from 'react';
import { LogOut, Loader2, Clock } from 'lucide-react'; // 引入 Clock icon
import Header from './Header';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';


// 統一 button 樣式
// 從 baseButtonClasses 中移除 space-x-2
const baseButtonClasses = "flex items-center py-2 px-4 rounded-2xl text-white font-bold transition duration-100 shadow-md";
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
            <div className='flex justify-end sm:space-x-5 items-center'>
                {timeUntilLogout && (
                    <div 
                        className={`
                            flex-col 
                            sm:flex 
                            sm:space-x-2 
                            items-center 
                            ${timerClasses} 
                            ${timerColorClasses}
                        `}
                    >
                        <div className='flex items-center'> 
                            <Clock className="w-4 h-4" />
                            <span>{t('auth.autoLogoutPrefix')}</span>
                        </div>
                        
                        <div className='flex items-center'>
                            <span className='text-center'>{timeUntilLogout}</span>
                            <span>{t('auth.autoLogoutSuffix')}</span> 
                        </div>
                    </div>
                )}
                
                <button
                    onClick={() => handleLogout()}
                    disabled={isLoggingOut}
                    className={`
                        ${baseButtonClasses} 
                        ${logoutButtonClasses}
                        sm:justify-start sm:w-auto sm:h-auto sm:p-3 sm:space-x-3
                    `}
                    title={isLoggingOut ? t('auth.loggingOutTitle') : t('auth.logoutTitle')}
                >
                    {isLoggingOut ? (
                        <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" />
                    ) : (
                        <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
                    )}
                    <span className="hidden sm:inline">
                        {isLoggingOut ? t('auth.loggingOut') : t('auth.logout')}
                    </span>
                </button>
            </div>
        </Header>
    );
}