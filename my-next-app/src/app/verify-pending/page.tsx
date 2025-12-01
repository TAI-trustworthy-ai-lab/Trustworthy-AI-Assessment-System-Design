"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import { resend } from "@/services/userService";
import { useRouter } from "next/navigation";

/*
{
  "verify": {
    "title": "驗證電子郵件",
    "sentTo": "驗證連結已發送至",
    "description": "請檢查您的收件箱 (也請檢查垃圾郵件)。點擊信中的連結以啟用您的帳戶。",
    "resendSuccess": "新的驗證連結已成功發送。",
    "resendFailed": "發送驗證連結失敗，請稍後再試。",
    "cooldownError": "發送頻率過高，請等待 {{seconds}} 秒後重試。",
    "countdownRemaining": "冷卻期剩餘時間",
    "timeUnit": "秒",
    "sending": "正在發送...",
    "resend": "重發驗證信"
  },
}
*/

export default function VerifyPending() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [counter, setCounter] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const COOLDOWN_KEY = "resendCooldownEndTime";

  useEffect(() => {
    const storedEmail = localStorage.getItem("verifingEmail");
    if (storedEmail) setEmail(storedEmail);
    else router.push("/login");

    const storedEndTime = localStorage.getItem(COOLDOWN_KEY);
    if (storedEndTime) {
        const now = Date.now();
        const endTime = parseInt(storedEndTime, 10);
        const remainingSeconds = Math.max(0, Math.ceil((endTime - now) / 1000));

        if (remainingSeconds > 0) {
            setCounter(remainingSeconds);
            setMessage(t("verify.cooldownError", { seconds: remainingSeconds })); // 可選：提示使用者
        } else {
            localStorage.removeItem(COOLDOWN_KEY);
        }
    }
  }, [router, t]);

  useEffect(() => {
    if (counter <= 0) return;
    const timer = setInterval(() => {
      setCounter((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [counter]);

  const handleResend = async () => {
    setLoading(true);
    setMessage("");
    try {
      await resend( {email} );
      const newCounter = 300;
    const endTime = Date.now() + newCounter * 1000;
    localStorage.setItem(COOLDOWN_KEY, endTime.toString()); // 儲存截止時間
    
    setMessage(t("verify.resendSuccess"));
    setCounter(newCounter);
    } catch (err) {
        console.error("Resend API failed:", err);
        let remainingSeconds = 0;
    try {
        if (typeof err === "object" && err !== null && "message" in err && typeof (err as any).message === "string") {
            const errorJsonString = (err as any).message.match(/\{.*\}/)?.[0];
            if (errorJsonString) {
                const errorData = JSON.parse(errorJsonString);
                
                if (errorData.status === 429) {
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
    
    // 4. 根據 remainingSeconds 決定前端行為
    if (remainingSeconds > 0) {
        // 後端返回冷卻時間，計算並儲存截止時間
        const endTime = Date.now() + remainingSeconds * 1000;
        localStorage.setItem(COOLDOWN_KEY, endTime.toString()); // 儲存截止時間
        
        setMessage(t("verify.cooldownError", { seconds: remainingSeconds })); 
        setCounter(remainingSeconds); 
    } else {
        // 其他錯誤 (或解析失敗)
        setMessage(t("verify.resendFailed"));
        }
    } finally {
        setLoading(false);
    }
  };

useEffect(() => {
    if (counter === 0) {
        if (message.includes(t("verify.cooldownError", { seconds: '' }).replace(/\d/g, ''))) {
            setMessage("");
        }
    }
}, [counter, t, message]);

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

        {message && (
            <p className={`text-center mb-4 p-2 rounded-lg font-medium 
                        ${counter > 0 && !loading ? 'text-red-700 bg-red-50' : 'text-purple-700 bg-purple-50'}`}>
            {message}
            </p>
        )}

        {counter > 0 && (
            <div className="text-center my-4">
            <p className="text-base font-bold text-red-600">
                {t("verify.countdownRemaining")}
            </p>
            <p className="text-3xl font-extrabold text-red-600 mt-1">
                { counter } 
                <span className="text-xl font-semibold ml-1">{t("verify.timeUnit")}</span>
            </p>
            </div>
        )}

        <button
            onClick={handleResend}
            disabled={loading || counter > 0}
            className={`w-full py-3 mt-6 rounded-xl text-white font-bold text-lg transition duration-200 ease-in-out
            ${counter > 0 ? 
                "bg-gray-400 cursor-not-allowed" : 
                "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"}`}
        >
            {loading ? t("verify.sending") : t("verify.resend")}
        </button>
      </div>
    </div>
  );
}
