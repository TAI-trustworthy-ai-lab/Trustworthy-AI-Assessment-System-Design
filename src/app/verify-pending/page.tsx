"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
// Service for resending verification email
import { resend } from "@/services/userService";
import { useRouter } from "next/navigation";


// Verification Pending Page Component
export default function VerifyPending() {
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const [counter, setCounter] = useState(0); // Cooldown countdown in seconds
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(""); // Success/Error messages
    const router = useRouter();

    const COOLDOWN_KEY = "resendCooldownEndTime"; // Local storage key for cooldown end time

    // Initial load: Check email and existing cooldown status
    useEffect(() => {
        const storedEmail = localStorage.getItem("verifingEmail");
        if (storedEmail) setEmail(storedEmail);
        else router.push("/login"); // Redirect if email is missing

        const storedEndTime = localStorage.getItem(COOLDOWN_KEY);
        if (storedEndTime) {
            const now = Date.now();
            const endTime = parseInt(storedEndTime, 10);
            // Calculate remaining time in seconds
            const remainingSeconds = Math.max(0, Math.ceil((endTime - now) / 1000));

            if (remainingSeconds > 0) {
                setCounter(remainingSeconds);
                // Display initial cooldown warning
                setMessage(t("verify.cooldownError", { seconds: remainingSeconds }));
            } else {
                localStorage.removeItem(COOLDOWN_KEY);
            }
        }
    }, [router, t]);

    // Cooldown timer logic
    useEffect(() => {
        if (counter <= 0) return;
        const timer = setInterval(() => {
            setCounter((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer); // Cleanup timer
    }, [counter]);

    // Resend email handler
    const handleResend = async () => {
        setLoading(true);
        setMessage("");
        try {
            await resend( {email} );
            
            // Set new cooldown period (5 minutes = 300 seconds)
            const newCounter = 300;
            const endTime = Date.now() + newCounter * 1000;
            localStorage.setItem(COOLDOWN_KEY, endTime.toString()); 
            
            setMessage(t("verify.resendSuccess"));
            setCounter(newCounter);
        } catch (err) {
            console.error("Resend API failed:", err);
            let remainingSeconds = 0;
            
            // Try to parse error message for specific status/cooldown time
            try {
                if (typeof err === "object" && err !== null && "message" in err && typeof (err as any).message === "string") {
                    const errorJsonString = (err as any).message.match(/\{.*\}/)?.[0];
                    if (errorJsonString) {
                        const errorData = JSON.parse(errorJsonString);
                        
                        if (errorData.status === 429) { // Rate limit error
                            // Extract cooldown time from message
                            const regexMatch = errorData.message.match(/\d+/);
                            if (regexMatch) {
                                remainingSeconds = parseInt(regexMatch[0], 10);
                            }
                        }
                    }
                }
            } catch (parseError) {
                console.error("Error parsing API error message:", parseError);
            }
            
            // Handle cooldown time returned by backend
            if (remainingSeconds > 0) {
                const endTime = Date.now() + remainingSeconds * 1000;
                localStorage.setItem(COOLDOWN_KEY, endTime.toString()); 
                
                setMessage(t("verify.cooldownError", { seconds: remainingSeconds })); 
                setCounter(remainingSeconds); 
            } else {
                // Generic error fallback
                setMessage(t("verify.resendFailed"));
            }
        } finally {
            setLoading(false);
        }
    };

    // Auto-clear transient success/fail messages after 5s
    useEffect(() => {
        const isCooldownError = message.includes(t("verify.cooldownError", { seconds: '' }).replace(/\d/g, ''));

        if (message && !isCooldownError) {
            const timer = setTimeout(() => {
                setMessage("");
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message, t]);

    // Clear cooldown message when counter hits zero
    useEffect(() => {
        if (counter === 0) {
            // Check if the current message is the cooldown message
            if (message.includes(t("verify.cooldownError", { seconds: '' }).replace(/\d/g, ''))) {
                setMessage("");
            }
        }
    }, [counter, t, message]);

    // UI Render
    return (
        <div className="min-h-screen flex flex-col items-center bg-gray-50 p-6">
            <Header titleHref="/login" />
            <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-6 mt-20">
                <h1 className="text-3xl font-extrabold mb-2 text-center text-indigo-700">
                    {t("verify.title")}
                </h1>

                <hr className="mb-6 border-indigo-100" />

                <p className="text-center text-gray-700 mb-2 text-lg">
                    {t("verify.sentTo")}: 
                </p>
                <p className="text-center font-bold text-xl text-gray-800 mb-5">
                    { email }
                </p>

                <p className="text-center text-sm text-gray-500 mb-6 border-b pb-4 border-gray-100">
                    {t("verify.description")}
                </p>

                {/* Status/Error Message Display */}
                {message && (
                    <p className="text-center p-2 rounded-lg font-medium text-orange-700 bg-orange-50">
                    {message}
                    </p>
                )}

                {/* Resend Button */}
                <button
                    onClick={handleResend}
                    disabled={loading || counter > 0}
                    className={`w-full py-3 mt-6 rounded-xl text-white font-bold text-lg transition duration-200 ease-in-out
                    ${counter > 0 ? 
                        "bg-gray-400 cursor-not-allowed" : 
                        "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"}`}
                >
                    {loading ? (
                        t("verify.sending")
                    ) : counter > 0 ? (
                        // Show countdown
                        <div className="flex items-center justify-center">
                            <span className="mr-2">{t("verify.resend")}</span>
                            <span>({counter}{t("verify.timeUnit")})</span>
                        </div>
                    ) : (
                        // Normal button text
                        t("verify.resend")
                    )}
                </button>
            </div>
        </div>
    );
}