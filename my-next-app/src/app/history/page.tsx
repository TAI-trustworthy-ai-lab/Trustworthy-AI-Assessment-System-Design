"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';
import ProtectedLayout from '@/components/ProtectedLayout';
import {ProjectData} from '@/app/home/page'

// 後端 API 基礎 URL ************ 待更改API ************
const BASE_URL = "http://localhost:3001/api";

export interface AnswerData{
  id: number,
  responseId: number,
  questionId: number,
  optionId: number,
  value?: number,
  textValue?: string,
  createdAt: string,
  question: {
    id: number,
    text: string,
    category: string,
    type: string
  },
  option: {
    id: number,
    text?: string,
    value?: number
  }
}

export interface ResponseMeta{
  id: number,
  userId: number,
  projectId: number,
  versionId: number,
  submittedAt: string,
  label?: string,
  project: {
    id: number,
    name: string
  },
  version: {
    id: number,
    title: string
  }
}

export interface ResponseData{
  id: number,
  userId: number,
  projectId: number,
  versionId: number,
  submittedAt: string,
  label?: string,
  user: {
    id: number,
    name: string,
    email: string
  },
  project: {
    id: number,
    name: string
  },
  version: {
    id: number,
    title: string
  },
  answers: AnswerData[]
}

export default function HistoryPage() {
  const [userId, setUserId] = useState<string | null>(null); 
  const [authToken, setAuthToken] = useState<string | null>(null); 

  const [responseList, setResponseList] = useState<ResponseMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  // get userId authToken from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('userId');
      const storedAuthToken = localStorage.getItem('authToken');
      
      setUserId(storedUserId);
      setAuthToken(storedAuthToken);
    }
  }, []);

  useEffect(() => {
    console.log("responseList 更新：", responseList);
    // do something
  }, [responseList]);

  // 專門用於獲取專案清單的函式 (GET API)
  const loadResponses = useCallback(async () => {
    if (!userId || userId === 'fallback-user-id' || !authToken) {
      return;
    }
    setIsLoading(true);
    try {
      const data = await fetchResponseList(userId, authToken);
      //const sortedData = (data as ResponseData[]).sort((a, b) => b.id - a.id);
      setResponseList(data);
    } catch (error) {
      console.error("載入專案失敗:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, authToken]);

  // 2. 當 userId 或 authToken 改變時載入專案
  useEffect(() => {
    if (userId && authToken) {
      console.debug("loadResponses()")
      loadResponses()
    } else if (userId !== null && authToken !== null) {
      setIsLoading(false)
    }
  }, [userId, authToken])

  // 載入中狀態顯示
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-600">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        載入專案列表...
      </div>
    );
  }
  
  // 認證失敗/ID 缺失狀態顯示
  if (!userId || !authToken) {
    return (
      <div className="p-8 bg-red-100 min-h-screen font-sans flex items-center justify-center">
        <div className="max-w-md p-6 bg-white rounded-xl shadow-xl border border-red-400">
          <h1 className="text-2xl font-bold mb-4 text-red-700">認證失敗或用戶 ID 缺失</h1>
          <p className="text-red-600">
            無法從瀏覽器的 Local Storage 獲取有效的 `userId` 或 `authToken`。<br />
            請確保您已登入且資料已正確儲存。
          </p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedLayout>
      <div className="p-8 bg-gray-50 min-h-screen font-sans">
        <AuthHeader />
        <h1 className="pt-20 text-center text-4xl font-extrabold mb-8 text-gray-900 pb-2">
            歷史紀錄
        </h1>
        <div className="mt-1">
          <div className="
            w-full grid grid-cols-[3fr_1fr_3fr_2fr]
            mb-2
            py-2 px-2
            bg-gray-100
          ">
            <div className="size-fit text-gray-600">專案名稱</div>
            <div className="size-fit text-gray-600">版本</div>
            <div className="size-fit text-gray-600">問卷名稱</div>
            <div className="size-fit text-gray-600">填寫日期</div>
          </div>
          {/* sorting type? */}
          {responseList.map((data) => responseItem(data))}
        </div>
      </div>
    </ProtectedLayout>
  );
}

export function responseItem(meta: ResponseMeta){
  return (
    <div key={meta.id}
      className="
      w-full grid grid-cols-[3fr_1fr_3fr_2fr]
      py-2 px-2
      hover:bg-blue-50 cursor-pointer rounded-lg transition duration-150
    ">
      {/* project name */}
      <div className="size-fit text-blue-600">
        <span className="mr-2">📄</span>
        {meta.project.name}
      </div>
      
      {/* response ver */}
      <div className="size-fit text-gray-600">{meta.version.id}</div>
      
      {/* response title */}
      <div className="size-fit text-gray-600">{meta.version.title}</div>
      
      {/* response date */}
      <div className="size-fit text-gray-600">{meta.submittedAt}</div>
    </div>
  )
}

export function fetchResponse(userId: string, authToken: string, id: number){
  if (!userId || userId === 'fallback-user-id') {
    console.warn('用戶 ID 無效，無法獲取回覆。');
    return null;
  }
  const url = `${BASE_URL}/response/id/${id}`;
  return fetchWithRetry<ResponseData>(url, { method: 'GET' }, authToken);
};

export async function fetchResponseList(userId: string, authToken: string): Promise<ResponseMeta[]>{
  if (!userId || userId === 'fallback-user-id') {
    console.warn('用戶 ID 無效，無法獲取回覆。');
    return [];
  }
  const url = `${BASE_URL}/response/user/${userId}`;
  return fetchWithRetry<ResponseMeta[]>(url, { method: 'GET' }, authToken);
};

export async function fetchProjects(userId: string, authToken: string): Promise<ProjectData[]>{
  if (!userId || userId === 'fallback-user-id') {
    console.warn('用戶 ID 無效，無法獲取專案。');
    return [];
  }
  const url = `${BASE_URL}/project/user/${userId}`;
  return fetchWithRetry<ProjectData[]>(url, { method: 'GET' }, authToken);
};

export async function fetchWithRetry<T>(url: string, options: RequestInit = {}, authToken: string | null = null): Promise<T>{
  if (!authToken || authToken === 'fallback-auth-token') {
    throw new Error('認證失敗：未提供有效的 authToken。');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const result: { data?: T, error?: string, message?: string } = await response.json();

    if (!response.ok) {
      const errorMessage = result.error || result.message || `HTTP 錯誤! 狀態碼: ${response.status}`;
      throw new Error(errorMessage);
    }

    // 確保回傳的是 data 欄位
    //console.error(result.data as T)
    return result.data as T; 
  } catch (error: any) {
    console.error(`API 請求最終失敗 (${url}):`, error.message);
    throw error; 
  }
}