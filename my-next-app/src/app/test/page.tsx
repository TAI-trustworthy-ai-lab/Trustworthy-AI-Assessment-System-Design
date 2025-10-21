"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react'; // 引入 useState
import Header from '@/components/Header';
import { LogOut, Loader2 } from 'lucide-react'; // 引入 LogOut 和 Loader2

// 後端 API 基礎 URL
const BASE_URL = "http://localhost:3001/api/user";

export default function TestPage() {
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
            method: "POST", 
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
            3個選擇，前中後測試頁面
        </h1>
      </main>
    </div>
  );
}