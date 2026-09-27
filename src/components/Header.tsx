"use client";
import React from 'react';
import { useEffect } from 'react';
import Link from 'next/link';
import i18n from 'i18next';
import '@/lib/i18n'; // i18n initialization
import { useTranslation } from 'react-i18next';

// Header component props
interface HeaderProps {
    children?: React.ReactNode; // Optional right-side content
    titleHref?: string; // Link target for the title
}

// Main Header Component
export default function Header({ children, titleHref = '/'}: HeaderProps) {
    const { i18n: i18nInstance } = useTranslation();
    const { t } = useTranslation();

    // Effect to load saved language from localStorage on mount
    useEffect(() => {
        const savedLang = localStorage.getItem('preferredLanguage');
        if (savedLang && savedLang !== i18n.language) {
            i18n.changeLanguage(savedLang);
        }
    }, [i18n]);

    // Language change handler
    const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const lang = e.target.value;
        i18nInstance.changeLanguage(lang);
        localStorage.setItem("preferredLanguage", lang);
    };

    return (
        <header className={`
            bg-blue-100/85
            fixed top-0 left-0 w-full 
            z-50
            h-20
        `}>
            <div className='
                flex justify-between items-center
                h-full 
                px-4 sm:px-6 
            '>
                {/* Title Link */}
                <Link 
                    href={titleHref} 
                    className='
                    w-25 sm:w-auto
                    text-sm sm:text-2xl 
                    font-bold text-gray-800 hover:text-blue-600 transition
                '>
                    {t('header.title')}
                </Link>

                {/* Right Side: Language Switch + Children */}
                <div className='
                    flex space-x-2 sm:space-x-5 items-center
                    flex-shrink-0 
                '>
                    {/* Language Selector */}
                    <select
                        value={i18nInstance.language}
                        onChange={changeLanguage}
                        className='
                            border border-gray-300 rounded 
                            px-1 sm:px-2 py-0.5 sm:py-1 text-sm sm:text-base 
                            bg-blue-50 text-gray-700 
                        '
                    >
                        <option value=''>EN</option>
                        <option value='zh'>中</option>
                    </select>
                    {/* Placeholder for custom content (e.g., Logout Button) */}
                    {children}
                </div>
            </div>
        </header>
    );
}
