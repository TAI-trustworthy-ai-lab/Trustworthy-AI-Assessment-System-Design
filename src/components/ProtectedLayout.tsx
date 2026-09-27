'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next'; // i18n support

interface ProtectedLayoutProps {
    children: React.ReactNode; // Content to be protected
}

const AUTH_TOKEN_KEY = 'authToken'; // Auth token key

// Layout Component for Protected Routes
export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
    const router = useRouter();
    // UI state for loading
    const [isLoading, setIsLoading] = React.useState(true);
    // Auth status state
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const { t } = useTranslation(); // Translation hook

    // Auth check logic
    useEffect(() => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);

        if (!token) {
            console.log("ProtectedLayout: Token not found, redirecting to /.");
            router.replace('/'); // Redirect to homepage/login
            setIsAuthenticated(false);
        } else {
            setIsAuthenticated(true);
        }

        setIsLoading(false);
    }, [router]);

    // Loading/Redirecting UI
    if (isLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p>{t('auth.verifying')}</p> 
            </div>
        );
    }

    // Render protected content
    return <>{children}</>;
}