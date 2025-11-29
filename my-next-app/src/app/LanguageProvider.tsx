// app/LanguageProvider.tsx
'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
    const { i18n } = useTranslation();

    useEffect(() => {
        const savedLang = localStorage.getItem('preferredLanguage');
        if (savedLang && savedLang !== i18n.language) {
            i18n.changeLanguage(savedLang);
        }
    }, [i18n]);

    return <>{children}</>;
}
