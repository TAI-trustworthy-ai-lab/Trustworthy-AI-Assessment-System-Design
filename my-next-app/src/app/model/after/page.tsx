"use client";

import { useRouter } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';
import ProtectedLayout from '@/components/ProtectedLayout';

// 後端 API 基礎 URL ************ 待更改API ************
const BASE_URL = "http://localhost:3001/api/";

export default function AfterPage() {
  const router = useRouter();
 
  return (
    <ProtectedLayout>
    <div className="min-h-screen bg-gray-50">
      <AuthHeader />
      
      {/* 主要內容區塊，使用 pt-24 確保不被固定 Header 遮擋 */}
      <main className="pt-24 flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-4">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-12">
            AFTER PAGE
        </h1>
        <p>暫無資料（先把before的模板做出來）</p>
      </main>
    </div>
    </ProtectedLayout>
  );
}