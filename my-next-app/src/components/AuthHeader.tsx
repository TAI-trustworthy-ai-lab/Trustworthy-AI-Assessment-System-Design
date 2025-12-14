"use client";

import React from 'react';
import { LogOut, Loader2, Clock } from 'lucide-react'; // Icons
import Header from './Header';
import { useAuth } from '../hooks/useAuth'; // Auth hook
import { useTranslation } from 'react-i18next';


// Common button styles
const baseButtonClasses = "flex items-center py-2 px-4 rounded-2xl text-white font-bold transition duration-100 shadow-md";
const titleLinkTarget = '/home'; // Home page link

// Auth-protected Header Component
export default function AuthHeader() {
    const { isLoggingOut, handleLogout, timeUntilLogout } = useAuth(); // Auth state/logic
    const { t } = useTranslation();

    // Logout button dynamic styles
    const logoutButtonClasses = isLoggingOut
        ? 'bg-blue-400 cursor-not-allowed'
        : 'bg-blue-500 hover:bg-blue-400 active:bg-blue-600';
    
    // Auto-logout timer styles
    const timerClasses = "text-sm font-semibold p-2 rounded-lg transition duration-100";
    // Highlight timer when near expiry (simulated check)
    const timerColorClasses = timeUntilLogout && 
        ['00:01:00', '00:00:59', '00:00:58', '00:00:01', '00:00:02', '00:00:03'].includes(timeUntilLogout)
        ? 'text-red-600'
        : 'text-gray-700';

    return (
        <Header titleHref={titleLinkTarget}>
            <div className='flex justify-end sm:space-x-5 items-center'>
                {/* Auto-Logout Timer Display */}
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
                        {/* Clock icon and prefix text */}
                        <div className='flex items-center'> 
                            <Clock className="w-4 h-4" />
                            <span>{t('auth.autoLogoutPrefix')}</span>
                        </div>
                        
                        {/* Time countdown and suffix text */}
                        <div className='flex items-center'>
                            <span className='text-center'>{timeUntilLogout}</span>
                            <span>{t('auth.autoLogoutSuffix')}</span> 
                        </div>
                    </div>
                )}
                
                {/* Logout Button */}
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
                    {/* Icon: Loader or LogOut */}
                    {isLoggingOut ? (
                        <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" />
                    ) : (
                        <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
                    )}
                    {/* Text (visible on larger screens) */}
                    <span className="hidden sm:inline">
                        {isLoggingOut ? t('auth.loggingOut') : t('auth.logout')}
                    </span>
                </button>
            </div>
        </Header>
    );
}
