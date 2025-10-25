"use client";

import { useRouter } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';
import ProtectedLayout from '@/components/ProtectedLayout';

// 後端 API 基礎 URL
const BASE_URL = "http://localhost:3001/api/user";

export default function HistoryPage() {
  const router = useRouter();
 
  return (
    <ProtectedLayout>
    <div className="min-h-screen bg-gray-50">
      <AuthHeader />
      
      {/* 主要內容區塊，使用 pt-24 確保不被固定 Header 遮擋 */}
      <main className="pt-24 flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-4">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-12">
            歷史紀錄頁面
        </h1>
        <p>需等後端給我們API</p>
        <p>主要功能：用API GET後端資料庫是否有user history。 若沒有顯示沒有歷史記錄</p>
        <p>若有，一筐一筐顯示。使用者點擊想要看的框框，再顯示整個report。（再看若切換至report page會比較方便嗎？）</p>
      </main>
    </div>
    </ProtectedLayout>
  );
}