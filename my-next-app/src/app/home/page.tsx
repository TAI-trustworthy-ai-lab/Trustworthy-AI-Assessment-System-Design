"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react'; // 引入 useState
import Header from '@/components/Header';
import { LogOut, Loader2 } from 'lucide-react'; // 引入 LogOut 和 Loader2

// 後端 API 基礎 URL
const BASE_URL = "http://localhost:3001/api/user";

export default function HomePage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false); // 登出狀態

  // 登出功能 
  const handleLogout = async () => {
    if (isLoggingOut) return; // 防止重複點擊
    setIsLoggingOut(true);

    // 檢查登出是否有問題
    try {
      // Token的檢查
      let userToken = null;

      if (typeof window !== 'undefined') {
        userToken = localStorage.getItem('userToken');
      }
      if (userToken) {
        const response = await fetch(`${BASE_URL}/logout`, { 
            method: "DELETE", 
            headers: {
                'Authorization': `Bearer ${userToken}`, 
                'Content-Type': 'application/json',
            },
        });
        
        // 後端回傳error
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to parse error body' }));
            console.error("登出 API 呼叫失敗 (HTTP 錯誤):", response.status, errorData);
        } else {
            console.log("後端登出成功");
        }
      }
    } catch (error) {
      console.error("登出 API 呼叫時發生錯誤:", error);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userToken');
      }

      // 跳轉到登入頁面
      router.push('/');
      setIsLoggingOut(false);
    }
  };

  const titleLinkTarget = '/home';

  // 統一button樣式
  const baseButtonClasses = "flex items-center space-x-2 py-2 px-4 rounded-2xl text-white font-bold transition duration-100 shadow-md";

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* 標頭元件，右側傳入登出按鈕 */}
      <Header titleHref={titleLinkTarget}>
        <div className='flex justify-end space-x-5 items-center'>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut} // 登出中禁用按鈕
            className={`${baseButtonClasses} ${
              isLoggingOut 
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-400 active:bg-blue-600'
            }`}
            title={isLoggingOut ? "登出中..." : "登出"}
          >
            {isLoggingOut ? (
              // Loader 圖標
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              // LogOut 圖標
              <LogOut className="w-4 h-4" /> 
            )}
            <span>{isLoggingOut ? "登出中..." : "登出"}</span>
          </button>
        </div>
      </Header>
      
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
            disabled={isLoggingOut} // 登出中禁用
          >
            開始測驗
          </button>

          {/* 按鈕 2: 檢視先前報告 */}
          <button
            onClick={() => router.push('/history')}
            className="w-full py-4 text-xl font-semibold rounded-xl text-blue-600 border-2 border-blue-600 bg-white hover:bg-blue-50 transition-transform transform hover:scale-[1.02] shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300"
            disabled={isLoggingOut} // 登出中禁用
          >
            檢視先前報告
          </button>
          
        </div>
      </main>
    </div>
  );
}
