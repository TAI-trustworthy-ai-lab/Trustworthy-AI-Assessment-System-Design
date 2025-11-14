'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next'; // 引入 i18n

interface ProtectedLayoutProps {
    children: React.ReactNode;
}

const AUTH_TOKEN_KEY = 'authToken'; // 確保與 useAuth.tsx 中的鍵名一致

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(true);
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const { t } = useTranslation(); // 使用 i18n

    useEffect(() => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);

        if (!token) {
            console.log("ProtectedLayout: Token not found, redirecting to /.");
            router.replace('/');
            setIsAuthenticated(false);
        } else {
            setIsAuthenticated(true);
        }

        setIsLoading(false);
    }, [router]);

    if (isLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p>{t('auth.verifying')}</p> {/* 使用 i18n key */}
            </div>
        );
    }

    return <>{children}</>;
}