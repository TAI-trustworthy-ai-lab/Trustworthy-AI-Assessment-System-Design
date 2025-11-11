'use client';
import React from 'react';
import Link from 'next/link';
import i18n from 'i18next';
import '@/lib/i18n'; // 確保初始化一次
import { useTranslation } from 'react-i18next';
interface HeaderProps {
    children?: React.ReactNode;
    titleHref?: string;
}

export default function Header({ children, titleHref = '/' }: HeaderProps) {
    const { i18n: i18nInstance } = useTranslation();
    const { t } = useTranslation();
    const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const lang = e.target.value;
        i18nInstance.changeLanguage(lang);
        //alert(JSON.stringify(i18nInstance.store.data, null, 2));
    };

    return (
        <header className='
      bg-blue-100/85
      fixed top-0 left-0 w-full 
      z-50
      h-20
    '>
            <div className='
          flex justify-between items-center
          h-full 
          px-6
      '>
                <Link href={titleHref} className='
          text-2xl font-bold text-gray-800 hover:text-blue-600 transition
        '>
                    {t('header.title')}
                </Link>

                {/* 右側：客製化的內容 */}
                <div className='flex space-x-5 items-center'>
                    {/* 在這裏加上語言切換按鈕 */}
                    <select
                        value={i18nInstance.language}
                        onChange={changeLanguage}
                        className='border rounded px-2 py-1 bg-white text-gray-800'
                    >
                        <option value='en'>{t('header.language.en')}</option>
                        <option value='zh'>{t('header.language.zh')}</option>
                    </select>
                    {children}
                </div>
            </div>
        </header>
    );
}
