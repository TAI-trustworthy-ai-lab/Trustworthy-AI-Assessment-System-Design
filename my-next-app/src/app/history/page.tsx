"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react'; // 引入 useState
import AuthHeader from '@/components/AuthHeader';

// 後端 API 基礎 URL
const BASE_URL = "http://localhost:3001/api/user";

export default function HistoryPage() {
  const router = useRouter();
 
  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader />
      
      {/* 主要內容區塊，使用 pt-24 確保不被固定 Header 遮擋 */}
      <main className="pt-24 flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-4">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-12">
            歷史紀錄頁面
        </h1>
      </main>
    </div>
  );
}