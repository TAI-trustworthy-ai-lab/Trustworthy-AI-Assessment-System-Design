"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from '@/components/Header';
import { useTranslation } from "react-i18next";
// API services for auth
import { login, register } from "@/services/userService";

// Auth token expiration time (1 hour)
const ONE_HOUR_MS = 60 * 60 * 1000;

// Main Login/Register Page
export default function LoginPage() {
    // Input states
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    // UI states
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    // Error handling states
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [errorKey, setErrorKey] = useState<string | null>(null);

    const router = useRouter();
    const { t } = useTranslation();

    // ===================
    // LOGIN Handler
    // ===================
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null); 
        setErrorKey(null);

        try {
            const data = await login({ email, password });
            const token = data?.data?.token;
            const user = data?.data?.user;
            const estimatedExpiryTimestampMs = Date.now() + ONE_HOUR_MS;

            // Save user info and redirect on success
            if (token && user && user.id && user.role) {
                localStorage.setItem('authToken', token);
                localStorage.setItem('userId', user.id.toString());
                localStorage.setItem('userRole', user.role);
                localStorage.setItem('authExpiry', estimatedExpiryTimestampMs.toString());
                router.push('/home');
            } else {
                throw new Error(t('loginPage.login.errorIncomplete'));
            }
        } catch (err) {
            // Handle and map API errors
            let errorMessage = err instanceof Error ? err.message : t('loginPage.login.errorUnknown');
            let statusCode = 0;
            let backendMessage = '';

            try {
                const errorObj = JSON.parse(errorMessage);
                statusCode = errorObj.status;
                backendMessage = errorObj.message;

                // Map status codes to translation keys
                if (statusCode === 401) {
                    setErrorKey('loginPage.login.error401'); // Invalid credentials
                } else if (statusCode === 500) {
                    setErrorKey('loginPage.login.error500'); // Internal server error
                } else if (statusCode === 404) {
                    setErrorKey('loginPage.login.error404'); // User not found
                } else if (statusCode === 403) {
                    setErrorKey('loginPage.login.error403Generic'); // Unverified account
                } else {
                    setErrorKey('loginPage.login.errorUnknown');
                }
            } catch (e) {
                setErrorKey('loginPage.login.errorUnknown');
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };


    // ===================
    // REGISTER Handler
    // ===================
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        setErrorKey(null);

        try {
            // Register API call
            await register({ name, email, password });
            setSuccess('loginPage.register.success');
            setIsRegistering(false);
            
            // Save email for verification status page
            // localStorage.setItem('verifingEmail', email); 
            // router.push('/verify-pending'); // Redirect to pending verification

            // Reset form fields
            setName("");
            setEmail("");
            setPassword("");
        } catch (err) {
            // Handle and map API errors
            let errorMessage = err instanceof Error ? err.message : t('loginPage.register.errorUnknown');
            let statusCode = 0;
            let backendMessage = '';

            try {
                const errorObj = JSON.parse(errorMessage);
                statusCode = errorObj.status;
                backendMessage = errorObj.message;

                // Map status codes to translation keys
                if (statusCode === 500) {
                    setErrorKey('loginPage.register.error500'); // Internal server error
                } else if (statusCode === 400) {
                    setErrorKey('loginPage.register.error400'); // Excisting account
                } else {
                    setErrorKey('loginPage.register.errorUnknown');
                }
            } catch (e) {
                setErrorKey('loginPage.register.errorUnknown');
            }

            console.error("Registration Error:", err);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };


    // ===================
    // Component UI
    // ===================
    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <Header titleHref="/" />
            <div className="max-w-md w-full p-8 space-y-8 bg-white border border-blue-200 rounded-xl shadow-xl">
                {/* Title */}
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {isRegistering ? t('loginPage.register.title') : t('loginPage.login.title')}
                    </h2>
                </div>

                {/* Error message box */}
                {error && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm" role="alert">
                        <strong>{t('loginPage.common.errorLabel')}</strong> {errorKey ? t(errorKey) : null}
                    </div>
                )}
                {/* Success message box */}
                {success && (
                    <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm" role="status">
                        <strong>{t('loginPage.common.successLabel', 'Success!')}</strong> {t(success)}
                    </div>
                )}

                {/* Main Form */}
                <form
                    className="mt-8 space-y-6"
                    onSubmit={isRegistering ? handleRegister : handleLogin}
                >
                    <div className="rounded-md shadow-sm space-y-4">
                        {/* Name Input (Register only) */}
                        {isRegistering && (
                            <div>
                                <label htmlFor="full-name" className="sr-only">
                                    {t('loginPage.register.fullNameLabel')}
                                </label>
                                <input
                                    id="full-name"
                                    name="full-name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder={t('loginPage.register.fullNamePlaceholder')}
                                    disabled={loading}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Email Input */}
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                {t('loginPage.login.emailLabel')}
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder={t('loginPage.login.emailPlaceholder')}
                                disabled={loading}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="sr-only">
                                {t('loginPage.login.passwordLabel')}
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete={isRegistering ? "new-password" : "current-password"}
                                required
                                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder={t('loginPage.login.passwordPlaceholder')}
                                disabled={loading}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            {loading ? t('loginPage.common.loading') : (isRegistering ? t('loginPage.register.button') : t('loginPage.login.button'))}
                        </button>
                        {/* Toggle Register/Login */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setError(null);
                                setSuccess(null);
                            }}
                            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            {isRegistering ? t('loginPage.register.switchToLogin') : t('loginPage.login.switchToRegister')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
