"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from '@/components/Header';
import { useTranslation } from "react-i18next";
import { login, register } from "@/services/userService";

export default function LoginPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const router = useRouter();
    const { t } = useTranslation();

    // ===================
    //    登入 LOGIN
    // ===================
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const data = await login({ email, password });
            const token = data?.data?.token;
            const user = data?.data?.user;

            // If response.ok, save user info into local storage
            if (token && user && user.id && user.role) {
                localStorage.setItem('authToken', token);
                localStorage.setItem('userId', user.id.toString());
                localStorage.setItem('userRole', user.role);
                router.push('/home');
            } else {
                throw new Error(t('loginPage.login.errorIncomplete'));
            }
        } catch (err) {
            // If !response.ok, output error (as bckend mostly return Obj:Obj , add-in more info in frontend)
            let errorMessage = err instanceof Error ? err.message : t('loginPage.login.errorUnknown');
            let statusCode = 0;
            let backendMessage = '';

            try {
                const errorObj = JSON.parse(errorMessage);
                statusCode = errorObj.status;
                backendMessage = errorObj.message;

                if (statusCode === 401) {
                    errorMessage = t('loginPage.login.error401');
                } else if (statusCode === 500) {
                    errorMessage = t('loginPage.login.error500');
                } else if (statusCode === 404) {
                    if (backendMessage === "User not found") {
                        errorMessage = t('loginPage.login.error404UserNotFound');
                    } else {
                        errorMessage = t('loginPage.login.error404Path');
                    }
                }
            } catch (e) {

            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };


    // ===================
    //    注冊 REGISTER
    // ===================
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            // If response.ok
            await register({ name, email, password }); 
            setIsRegistering(false);
            setSuccess(t('loginPage.register.success'));
            setName("");
            setEmail("");
            setPassword("");
        } catch (err) {
            // If !response.ok
            let errorMessage = err instanceof Error ? err.message : t('loginPage.register.errorUnknown');
            let statusCode = 0;
            let backendMessage = '';

            try {
                const errorObj = JSON.parse(errorMessage);
                statusCode = errorObj.status;
                backendMessage = errorObj.message;
                
                if (statusCode === 409) { 
                    errorMessage = t('loginPage.register.error409');
                } else if (statusCode === 500) {
                    errorMessage = t('loginPage.register.error500');
                } else if (statusCode === 400) {
                    errorMessage = backendMessage || t('loginPage.register.error400');
                }
            } catch (e) {
            
            }

            console.error("Registration Error:", err);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };


    // ===================
    //      UI
    // ===================
    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <Header titleHref="/" />
            <div className="max-w-md w-full p-8 space-y-8 bg-white border border-blue-200 rounded-xl shadow-xl">
                {/* title */}
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {isRegistering ? t('loginPage.register.title') : t('loginPage.login.title')}
                    </h2>
                </div>

                {/* error or success box */}
                {error && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm" role="alert">
                        <strong>{t('loginPage.common.errorLabel')}</strong> {error}
                    </div>
                )}
                {success && (
                    <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm" role="alert">
                        <strong>{t('loginPage.common.successLabel')}</strong> {success}
                    </div>
                )}

                {/* form handling */}
                <form
                    className="mt-8 space-y-6"
                    onSubmit={isRegistering ? handleRegister : handleLogin}
                >
                    <div className="rounded-md shadow-sm space-y-4">
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

                    <div className="flex flex-col space-y-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            {loading ? t('loginPage.common.loading') : (isRegistering ? t('loginPage.register.button') : t('loginPage.login.button'))}
                        </button>
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
