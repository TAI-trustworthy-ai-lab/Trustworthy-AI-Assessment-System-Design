"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from '@/components/Header';

export default function LoginPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null); 

  const router = useRouter(); 

  // 後端API基礎URL (Backend API Base URL)
  const BASE_URL = "http://localhost:3001/api/user";

  // 登入系統 (Login System)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BASE_URL}/login`, {
        method: "POST", 
        headers: {"Content-Type": "application/json",},
        body: JSON.stringify({ email, password }),
       });
       
       // 後端回傳錯誤處理 (Backend error handling)
       if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Login failed with status: ${response.status}`);
      }
      
      // 登入成功！(Login successful!)
      const data = await response.json();
      console.log("Login successful!"); 
      router.push('/admin'); // 跳到home page
    } catch (err) {
      console.error("Login Error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };


  // 註冊新帳號 (Register new account)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json",},
        body: JSON.stringify({ name, email, password }), 
      });

      // 後端回傳錯誤處理 (Backend error handling)
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Registration failed with status: ${response.status}`);
      }

      // 注冊成功！(Registration successful!)
      const data = await response.json();
      console.log("Registration successful! Data:", data);
      setIsRegistering(false); // 切換回登入模式
      setSuccess("Registration successful! Please sign in."); // 提示用戶註冊成功

      // 讓使用者再填多一次
      setName("");
      setEmail("");
      setPassword("");

    } catch (err) {
      console.error("Registration Error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // 界面設計
  const titleLinkTarget = '/';
  return (
  <div className="min-h-screen flex items-center justify-center px-4">
    <Header titleHref={titleLinkTarget}>
      <div className='flex justify-end space-x-5 items-center'></div>
    </Header>
    <div className="max-w-md w-full p-8 space-y-8 bg-white border border-blue-200 rounded-xl shadow-xl">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isRegistering ? "Create your account" : "Sign in to your account"}
        </h2>
      </div>
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )} 
      {success && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm" role="alert">
          <strong>Success:</strong> {success}
        </div>
      )}
      <form
        className="mt-8 space-y-6"
        onSubmit={isRegistering ? handleRegister : handleLogin}
        >
      
        {/* 表單輸入區域 (Form Input Area) */}
        <div className="rounded-md shadow-sm space-y-4">
        {isRegistering && (
          <div>
          <label htmlFor="full-name" className="sr-only">
              Name
          </label>
          <input
              id="full-name"
              name="full-name"
              type="text"
              autoComplete="name"
              required
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Full Name"
              disabled={loading}
              value={name}
              onChange={(e) => setName(e.target.value)}
          />
          </div>
        )}

        <div>
          <label htmlFor="email-address" className="sr-only">
            Email address
          </label>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            placeholder="Email address" 
            disabled={loading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegistering ? "new-password" : "current-password"}
            required
            className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            placeholder="Password"
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
            {loading ? "Processing..." : (isRegistering ? "Register" : "Sign in")}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null); // 切換頁面時清除錯誤
              setSuccess(null); // 切換頁面時清除成功訊息
            }}

            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
            {isRegistering? "Already have an account? Sign in": "Don't have an account? Register"}
          </button>
        </div>
      </form>
    </div>
  </div>
);
}