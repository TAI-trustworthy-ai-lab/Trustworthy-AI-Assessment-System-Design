"use client";

import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';
import ProtectedLayout from '@/components/ProtectedLayout';
import {ProjectData} from '@/app/home/page'
import ResponseViewer, {QuestionnaireData} from './Questionnaire';

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

enum ViewerState{
  loading,
  success,
  fail
}

export default function HistoryPage() {
  const [userId, setUserId] = useState<string | null>(null); 
  const [authToken, setAuthToken] = useState<string | null>(null); 

  const [responseList, setResponseList] = useState<ResponseMeta[]>([]);
  const [curResponse, setCurResponse] = useState<ResponseMeta | null>(null); 
  const [viewerState, setViewerState] = useState<ViewerState>(ViewerState.loading);
  const [viewerData, setViewerData] = useState<{
    response: ResponseData | null,
    questionnaire: QuestionnaireData | null
    }>({response:null,questionnaire:null});

  // reminder: key is response id
  const [fetchList, setFetchList] = useState<Record<
    number,
    {
      response: ResponseData | null,
      questionnaire: QuestionnaireData | null
  }>>({})

  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPositionOriginal, setMenuPositionOriginal] = useState({ x: 0, y: 0 });
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const router = useRouter();
  const menuSize = {x:200, y:270}

  // get userId authToken from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('userId');
      const storedAuthToken = localStorage.getItem('authToken');
      
      setUserId(storedUserId);
      setAuthToken(storedAuthToken);
    }
  }, []);

  // load all response from user id (GET API)
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
      console.error("載入回應列表失敗:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, authToken]);

  // get response and questionnair from response id and qId (GET API)
  const getResponseAndQuestionnaire = async (id: number, qId:number) => {
    fetchList[id] = fetchList[id] || {
      response: null,
      questionnaire: null
    }

    let r: ResponseData | null = null
    let q: QuestionnaireData | null = null

    // response
    if(fetchList[id].response === null){
      if (!userId || userId === 'fallback-user-id' || !authToken) {
        return;
      }
      r = await fetchResponse(userId, authToken, id);
      if(r === null){
        setViewerState(ViewerState.fail)
        throw "fail to get response"
      }
      else{
        fetchList[id].response = r
      }
    }
    else r = fetchList[id].response

    // questionnaire
    if(fetchList[id].questionnaire === null){
      if (!userId || userId === 'fallback-user-id' || !authToken) {
        return;
      }
      q = await fetchQuestionnaire(userId, authToken, qId);
      if(q === null){
        setViewerState(ViewerState.fail)
        throw "fail to get questionnaire"
      }
      else{
        fetchList[id].questionnaire = q
      }
    }
    else q = fetchList[id].questionnaire

    setViewerState(ViewerState.success)
    setViewerData({response: r, questionnaire: q})
  }

  // 2. 當 userId 或 authToken 改變時載入專案
  useEffect(() => {
    if (userId && authToken) {
      console.debug("loadResponses()")
      loadResponses()
    } else if (userId !== null && authToken !== null) {
      setIsLoading(false)
    }
  }, [userId, authToken])

  const handleContextMenu = (e: React.MouseEvent) => {
    const { innerWidth, innerHeight } = window;

    let x = e.clientX;
    let y = e.clientY;

    if (x + menuSize.x > innerWidth) x -= menuSize.x;
    if (y + menuSize.y > innerHeight) y -= menuSize.y;

    setMenuPosition({ x, y });
    setMenuPositionOriginal({ x, y });
    setShowMenu(true);
  }

  useEffect(() => {
    if(!showMenu) return
    const handleResize = () => {
      let x = menuPositionOriginal.x;
      let y = menuPositionOriginal.y;

      if (x + menuSize.x > window.innerWidth) x = window.innerWidth - menuSize.x - 8;
      if (y + menuSize.y > window.innerHeight) y = window.innerHeight - menuSize.y - 8;

      setMenuPosition({ x, y });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [menuPosition]);

  // 載入中狀態顯示
  if (isLoading) return (
    <div className='h-screen items-center justify-center'>
      <LoadingComponent message="載入回應列表中..." />
    </div>
  );
  
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
      
      {/* response window */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-60 bg-black/65 flex items-center justify-center"
          onClick={()=>setIsOpen(false)}
        >
          <div className="
            flex flex-col
            w-full max-w-200 h-150
            mx-20 p-5
            bg-gray-100 rounded-xl shadow-lg"
            onClick={(e) => e.stopPropagation()} // avoid clicking background
          >
            <div className="
              h-[500] mb-5
              bg-gray-50
            ">
              <ResponseWindow state={viewerState} data={viewerData} />
            </div>
            <div className="flex flex-col justify-center items-center">
              <button
                className="
                  px-4 py-2 
                  bg-gray-500 text-white rounded
                  hover:bg-gray-400 active:bg-gray-600"
                onClick={() => setIsOpen(false)}
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* right click menu */}
      {showMenu && (
        <div
          style={{
            top: menuPosition.y,
            left: menuPosition.x,
            width: `${menuSize.x}px`,
            height: `${menuSize.y}px`
          }}
          className={`
            absolute z-40 select-none
            flex flex-col justify-evenly
            text-gray-600 bg-white rounded shadow-[0_0_15px_rgba(0,0,0,0.35)]`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center h-full px-4 py-2 rounded-t text-gray-600 hover:bg-gray-100 cursor-pointer active:bg-gray-200"
            onClick={()=>{
              if(curResponse){
                setViewerState(ViewerState.loading)
                setIsOpen(true)
                setShowMenu(false)

                try{
                  getResponseAndQuestionnaire(curResponse.id, curResponse.versionId)
                }
                catch(e){
                  console.error("取得回應時發生錯誤", e)
                }
            }}}
          >
            開啟
          </div>
          <div className="flex items-center h-full px-4 py-2 text-gray-600 hover:bg-gray-100 cursor-pointer  active:bg-gray-200">
            下載
          </div>
          <div className="flex items-center h-full px-4 py-2 text-gray-600 hover:bg-gray-100 cursor-pointer  active:bg-gray-200">
            編輯
          </div>
          <div className="flex items-center h-full px-4 py-2 text-gray-600 hover:bg-gray-100 cursor-pointer  active:bg-gray-200">
            詳細資訊
          </div>
          <div className="flex items-center h-full px-4 py-2 rounded-b text-red-600 hover:bg-red-100 cursor-pointer active:bg-red-200">
            刪除
          </div>
        </div>
      )}

      <div className="
        p-8 bg-gray-50 min-h-screen font-sans"
        onClick={() => setShowMenu(false)}
      >
        <AuthHeader />
        <h1 className="pt-20 text-center text-4xl font-extrabold mb-8 text-gray-900 pb-2">
          歷史紀錄
        </h1>
        <div className="
            flex justify-center
            w-full
        ">
          <div className="
            w-full
            md:max-w-250
          ">
            <div className="
              w-full h-[50]
              grid grid-cols-[1fr_1.5fr_35px] gap-2 items-center
              mb-2 py-2 px-2
              bg-gray-100 rounded-t-lg

              sm:grid-cols-[1fr_1.5fr_250px_35px]

              md:min-w-150
              md:grid-cols-[1.5fr_60px_2fr_250px_35px]
            ">
              <div className="size-fit text-gray-600">專案名稱</div>
              <div className="hidden size-fit text-gray-600 md:flex">版本</div>
              <div className="size-fit text-gray-600">問卷名稱</div>
              <div className="hidden size-fit text-gray-600 sm:flex md:flex">填寫日期</div>
            </div>

            {/* sorting type? */}
            {responseList.map((data) => {
              const item = <ResponseItem 
                meta={data}
                selected={data===curResponse}
                setCurResponse={()=>setCurResponse(data)}
                showMenu={(e)=>{
                  handleContextMenu(e)
              }}/>
              return (
                <div 
                  key={data.id}
                  onClick={()=>setCurResponse(data)}
                  onDoubleClick={()=>{
                    setViewerState(ViewerState.loading)
                    setIsOpen(true)

                    try{
                      getResponseAndQuestionnaire(data.id, data.versionId)
                    }
                    catch(e){
                      console.error("取得回應時發生錯誤", e)
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setCurResponse(data)
                    handleContextMenu(e)
                  }}
                >
                  {item}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}

export function ResponseItem({meta, selected, setCurResponse, showMenu}: {meta:ResponseMeta, selected:boolean, setCurResponse: () => void, showMenu: (e:React.MouseEvent) => void}){
  
  const myRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`
      w-full h-[50]
      grid grid-cols-[1fr_1.5fr_35px] gap-2 items-center
      select-none
      py-2 px-2
      ${selected ? "bg-[#e7f1ff] hover:bg-blue-100 active:bg-blue-200": "hover:bg-gray-100 active:bg-gray-200"}
      cursor-pointer rounded-lg

      sm:grid-cols-[1fr_1.5fr_250px_35px]

      md:min-w-150
      md:grid-cols-[1.5fr_60px_2fr_250px_35px]
    `}>
      {/* project name */}
      <div className="truncate h-fit text-blue-600 font-bold">{meta.project.name}</div>
      
      {/* response ver */}
      <div className="hidden size-fit text-gray-600 md:flex">{meta.version.id}</div>
      
      {/* response title */}
      <div className="items-center truncate h-fit text-gray-600">{meta.version.title}</div>
      
      {/* response date, with format?*/}
      <div className="hidden size-fit text-gray-600 sm:flex md:flex">{meta.submittedAt}</div>

      {/* ... i copy the icon from google drive */}
      <div ref={myRef}
        className={`
          flex justify-center items-center
          size-[35]  rounded-full
          ${selected ? "hover:bg-blue-200 active:bg-blue-300" : "hover:bg-gray-200 active:bg-gray-300"}`}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          if(myRef.current){
            e.clientX = myRef.current.getBoundingClientRect().left
            e.clientY = myRef.current.getBoundingClientRect().bottom
          }
          setCurResponse()
          showMenu(e)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" focusable="false"><path d="M10 6c.82 0 1.5-.68 1.5-1.5S10.82 3 10 3s-1.5.67-1.5 1.5S9.18 6 10 6zm0 5.5c.82 0 1.5-.68 1.5-1.5s-.68-1.5-1.5-1.5-1.5.68-1.5 1.5.68 1.5 1.5 1.5zm0 5.5c.82 0 1.5-.67 1.5-1.5 0-.82-.68-1.5-1.5-1.5s-1.5.68-1.5 1.5c0 .83.68 1.5 1.5 1.5z"></path></svg>
      </div>
    </div>
  )
}

export function ResponseWindow({state, data}: {state: ViewerState, data:{response: ResponseData | null, questionnaire: QuestionnaireData | null}}){
  if (state === ViewerState.loading) return <LoadingComponent message="載入中..." />;
  if (state === ViewerState.fail
    || (data.response === null || data.questionnaire === null)
  ) return (
    <div className="flex items-center justify-center w-full h-full">
      <h2 className="text-red-600 text-lg font-semibold mb-4">獲取回應失敗</h2>
    </div>
  );

  //console.log(data.response)
  //console.log(data.questionnaire)
  return (
    <div className="flex items-center justify-center w-full h-full">
      <ResponseViewer data={{response:data.response,questionnaire:data.questionnaire}} />
    </div>
  )
}

export function LoadingComponent({message}: {message: string}){
  return (
    <div className="flex items-center justify-center h-full bg-gray-50 text-gray-600">
      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {message}
    </div>
  );
}

export function fetchQuestionnaire(userId: string, authToken: string, id: number){
  if (!userId || userId === 'fallback-user-id') {
    console.warn('用戶 ID 無效，無法獲取回覆。');
    return null;
  }
  const url = `${BASE_URL}/questionnaire/version/${id}`;
  return fetchWithRetry<QuestionnaireData>(url, { method: 'GET' }, authToken);
};

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