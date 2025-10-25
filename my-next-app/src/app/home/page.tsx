"use client";

import { useRouter } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';

// 後端 API 基礎 URL
const BASE_URL = "http://localhost:3001/api/user";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader />
      
      {/* 主要內容區塊，使用 pt-24 確保不被固定 Header 遮擋 */}
      <main className="pt-24 flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-4">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-12">
          AI評估系統主頁
        </h1>
        
        <div className="flex flex-col space-y-8 w-full max-w-md">
          
          {/* 按鈕 1: 開始測驗 */}
          <button
            onClick={() => router.push('/tai_sort')}
            className="w-full py-4 text-xl font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-transform transform hover:scale-[1.02] shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            開始測驗
          </button>

          {/* 按鈕 2: 檢視先前報告 */}
          <button
            onClick={() => router.push('/history')}
            className="w-full py-4 text-xl font-semibold rounded-xl text-blue-600 border-2 border-blue-600 bg-white hover:bg-blue-50 transition-transform transform hover:scale-[1.02] shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            檢視先前報告
          </button>
          
        </div>
      </main>
    </div>
  );
}
