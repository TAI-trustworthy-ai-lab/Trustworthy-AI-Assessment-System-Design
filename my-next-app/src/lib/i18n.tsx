// lib/i18n.ts
'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en/translation.json';
import zh from '@/locales/zh/translation.json';

const savedLang = typeof window !== "undefined"
    ? localStorage.getItem("preferredLanguage") || "en"
    : "en";

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            zh: { translation: zh },
        },
        lng: savedLang, // 使用儲存的語言
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
