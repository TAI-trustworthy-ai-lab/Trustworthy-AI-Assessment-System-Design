"use client"; 

import React from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Link from "next/link"; 

// 假設您的 i18n 翻譯檔中包含以下 key:
// "success.title": "Email 驗證成功！"
// "success.message": "您的帳戶已啟用，現在可以開始登入。"
// "success.button": "前往登入"

export default function VerifySuccess() {
  const { t } = useTranslation();
  
  // 由於這是驗證成功的頁面，我們可以直接將 Header 的連結設為 /login
  const LOGIN_PATH = "/login"; 

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 p-6">
      
      {/* 强制 Header 的 href 指向 /login */}
      <Header titleHref={LOGIN_PATH} /> 

      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 mt-20">
        
        {/* 🎉 標題區 */}
        <div className="text-center mb-6">
          <p className="text-5xl mb-4">🎉</p>
          <h1 className="text-3xl font-extrabold text-green-600">
            {t("success.title")}
          </h1>
        </div>

        <hr className="mb-8 border-gray-100" />

        {/* 訊息區 */}
        <p className="text-center text-lg text-gray-700 mb-10">
          {t("success.message")}
        </p>

        {/* 前往登入按鈕 */}
        <Link 
          href={LOGIN_PATH} 
          className="w-full block text-center py-3 rounded-xl text-white font-bold text-lg 
                     bg-indigo-600 hover:bg-indigo-700 transition duration-200 ease-in-out shadow-md hover:shadow-lg"
        >
          {t("success.button")}
        </Link>
        
      </div>
    </div>
  );
}