"use client";

import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';
import ProtectedLayout from '@/components/ProtectedLayout';
import {
  ProjectData,
  fetchProjects
} from '@/services/projectService'
import {
  AnswerData,
  ResponseMeta,
  ResponseData,
  ViewerState,
  fetchResponseList,
  deleteResponse,
  fetchResponse,
  fetchWithRetry,
  fetchQuestionnaire
} from '@/services/responseService'
import { useTranslation } from 'react-i18next';
import ResponseViewer, {QuestionnaireData, styleSelected, styleUnselected} from './ResponseViewer';
import { Info, Edit, FileText } from 'lucide-react'

// 後端 API 基礎 URL ************ 待更改API ************

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
  const [infoText, setInfoText] = useState<string>("")
  const { i18n, t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteWindowOpen, setIsDeleteWindowOpen] = useState(false);
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

  // open
  // get response and questionnair from response id and qId (GET API)
  const getResponseAndQuestionnaire = async (id: number, qId:number, finalState: ViewerState) => {
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

      try{
        r = await fetchResponse(userId, authToken, id)
      } catch(e){
        setViewerState(ViewerState.fail)
        console.error("error while fetchResponse", e)
        throw "fail to get response"
      }

      if(r === null || r === undefined){
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

      try{
        q = await fetchQuestionnaire(qId);
      } catch(e){
        setViewerState(ViewerState.fail)
        console.error("error while fetchResponse", e)
        throw "fail to get response"
      }

      if(q === null || q === undefined){
        setViewerState(ViewerState.fail)
        throw "fail to get questionnaire"
      }
      else{
        fetchList[id].questionnaire = q
      }
    }
    else q = fetchList[id].questionnaire

    //console.log(r, q)

    setViewerState(finalState)
    setViewerData({response: r, questionnaire: q})
  }

  // delete
  const delResponse = async (id: number)=>{
    const r = responseList.find(value => value.id === id)
    
    if(r === null || r === undefined) return

    const index = responseList.indexOf(r)
    setResponseList(prev=>prev.filter(value => value !== r))

    if (!userId || userId === 'fallback-user-id' || !authToken) {
      return;
    }
    try{
      await deleteResponse(userId, authToken, id);
    } catch(e) {
      setResponseList(prev => {
        const newList = [...prev]
        newList.splice(index, 0, r)
        return newList
      })
      console.error("fail to del response", e)
    }
  }

  const deleteResponseHandler = ()=>{
    setIsDeleteWindowOpen(false)
    if(curResponse){
      try{
        delResponse(curResponse.id)
          setInfoText(t('historyPage.deleteSuccess'))
      } catch(e){
          setInfoText(t('historyPage.deleteFail'))
        console.error("刪除回應時發生錯誤", e)
      }
    }
  }

  // 2. 當 userId 或 authToken 改變時載入專案
  useEffect(() => {
    if (userId && authToken) {
      console.debug("loadResponses()")
      //setIsLoading(false)
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
            <LoadingComponent message={t('historyPage.loadingResponses')} />
        </div>
    );
  
    // 認證失敗/ID 缺失狀態顯示
    if (!userId || !authToken) {
        return (
            <div className="p-8 bg-red-100 min-h-screen font-sans flex items-center justify-center">
                <div className="max-w-md p-6 bg-white rounded-xl shadow-xl border border-red-400">
                    <h1 className="text-2xl font-bold mb-4 text-red-700">{t('historyPage.authFailTitle')}</h1>
                    <p className="text-red-600">
                        {t('historyPage.authFailMessage')}
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
          className="fixed inset-0 z-60 bg-black/65 flex items-center justify-center "
          onClick={()=>{setIsOpen(false)}}
        >
          <div className=" 
            absolute flex flex-col top-[3vh]
            w-full h-[90vh] max-h-[680]
            mx-0 p-5
            bg-gray-100 rounded-xl shadow-lg
            
            md:mx-20
            md:max-w-[800]"
            onClick={(e) => e.stopPropagation()} // avoid clicking background
          >
            <div className="
              relative h-full w-full
              bg-gray-50 
              rounded overflow-hidden
            ">
              <div className='absolute z-53 size-[100%] rounded shadow-[inset_0_0_5px_rgba(0,0,0,0.15)] pointer-events-none' />
              <ResponseWindow state={viewerState} data={viewerData} />
            </div>
          </div>
        </div>
      )}

      {
        isDeleteWindowOpen && (
          <div 
            className="fixed inset-0 z-60 bg-black/65 flex items-center justify-center"
            onClick={()=>setIsDeleteWindowOpen(false)}
          >
            <div className="
              flex flex-col
              w-full max-w-[315] h-[45vh] max-h-[170]
              overflow-hidden rounded-xl"

              onClick={(e) => e.stopPropagation()} // avoid clicking background
            >
              <ComfirmWindow
                text={t('historyPage.deleteConfirm')}
                comfirm={deleteResponseHandler}
                cancel={()=>setIsDeleteWindowOpen(false)}/>
            </div>
          </div>
        )
      }

      {/* right click menu */}
      {showMenu && (
        <ContextMenuStrip size={menuSize} position={menuPosition}>
          <div
            className="flex items-center size-full px-4 py-2 text-gray-600 hover:bg-gray-100 cursor-pointer active:bg-gray-200"
            onClick={()=>{
              if(curResponse){
                setViewerState(ViewerState.loading)
                setIsOpen(true)
                setShowMenu(false)

                try{
                  getResponseAndQuestionnaire(curResponse.id, curResponse.versionId, ViewerState.success)
                }
                catch(e){
                  console.error("取得回應時發生錯誤", e)
                }
            }}}
          >
            {t('historyPage.open')}
          </div>
          <div
            className="flex items-center size-full px-4 py-2 text-gray-600 hover:bg-gray-100 cursor-pointer active:bg-gray-200"
            onClick={() => {
              setShowMenu(false)
              if(curResponse === null || curResponse === undefined) return

              //localStorage.setItem('userId', (userId).toString());
              //localStorage.setItem('authToken', (authToken).toString());

              localStorage.setItem('responseId', (curResponse.id).toString());
              localStorage.setItem('currentProjectId', (curResponse.projectId).toString());
              localStorage.setItem('QuestionnaireID', (curResponse.versionId).toString());
              
              window.open("/report", "_blank")
              //router.push('/report')
            }}
          >
                      {t('historyPage.viewReport')}
          </div>
          <div className="flex items-center size-full px-4 py-2 text-gray-600 hover:bg-gray-100 cursor-pointer active:bg-gray-200">
                      {t('historyPage.download')}
          </div>
          {/*
          <div
            className="flex items-center size-full px-4 py-2 text-gray-600 hover:bg-gray-100 cursor-pointer active:bg-gray-200"
            onClick={()=>{
              setShowMenu(false)
              setViewerState(ViewerState.editing)
              setIsOpen(true)
            }}
          >
            編輯
          </div>*/}
          <div className="flex items-center size-full px-4 py-2 text-gray-600 hover:bg-gray-100 cursor-pointer active:bg-gray-200"
            onClick={()=>{
              if(curResponse){
                setViewerState(ViewerState.loading)
                setIsOpen(true)
                setShowMenu(false)

                try{
                  getResponseAndQuestionnaire(curResponse.id, curResponse.versionId, ViewerState.detail)
                }
                catch(e){
                  console.error("取得回應時發生錯誤", e)
                }
            }}}
          >
                      {t('historyPage.detailInfo')}
          </div>
          <div
            className="flex items-center size-full px-4 py-2 text-red-600 hover:bg-red-100 cursor-pointer active:bg-red-200"
            onClick={()=>{setShowMenu(false); setIsDeleteWindowOpen(true)}}
          >
                      {t('historyPage.delete')}
          </div>
        </ContextMenuStrip>
      )}

      <div className="
        p-8 bg-gray-50 min-h-screen font-sans"
        onClick={() => {setShowMenu(false); setCurResponse(null)}}
      >
        <AuthHeader />
        <h1 className="pt-20 text-center text-4xl font-extrabold mb-8 text-gray-900 pb-2">
                  {t('historyPage.historyTitle')}
        </h1>
        <div className="
            flex justify-center
            w-full mb-14
        ">
          <div className="
            w-full
            md:max-w-250
          ">
            
            {
              // no history
              responseList.length <= 0 && (
                <div className='
                  flex justify-center
                  mt-10 w-full
                  italic font-bold text-gray-400 text-center text-xl
                '>
                  {t('historyPage.noHistory')}
                </div>
              )
            }
            {
              // sorting type?
              responseList.length > 0 &&
              <>
              <div className="
                w-full h-[50]
                grid grid-cols-[1fr_1.5fr_35px] gap-4 items-center
                mb-2 py-2 px-2
                bg-gray-100 rounded-t-lg

                sm:grid-cols-[1fr_1.5fr_160px_35px]

                md:min-w-150
                md:grid-cols-[1.5fr_60px_2fr_160px_35px]
              ">
                <div className="size-fit text-gray-600">{t('historyPage.projectName')}</div>
                <div className="hidden size-fit text-gray-600 md:flex">{t('historyPage.version')}</div>
                <div className="size-fit text-gray-600">{t('historyPage.version')}</div>
                <div className="hidden size-fit text-gray-600 sm:flex md:flex">{t('historyPage.version')}</div>
              </div>
              
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
                    onClick={(e)=>{setCurResponse(data); e.stopPropagation(); setShowMenu(false)}}
                    onDoubleClick={()=>{
                      setViewerState(ViewerState.loading)
                      setIsOpen(true)

                      try{
                        getResponseAndQuestionnaire(data.id, data.versionId, ViewerState.success)
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
              </>
            }
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}

export function Notification(){

}

export function ContextMenuStrip({size, position, children}:{
  size: {x:number, y:number},
  position: {x:number, y:number},
  children: React.JSX.Element[]
}){

  const childCount = children.length
  const commonStyle = "flex items-center h-full overflow-hidden"

  return(
    <div
      style={{
        top: position.y,
        left: position.x,
        width: `${size.x}px`,
        height: `${size.y}px`
      }}
      className={`
        fixed z-40 select-none
        flex flex-col justify-evenly
        bg-white rounded shadow-[0_0_15px_rgba(0,0,0,0.35)]`}
    >
      {
        children.map((c, index)=>{
          if(index <= 0){
            return(
              <div key={index} className={`${commonStyle} rounded-t`}>
                {c}
              </div>
          )} else if(index >= childCount-1){
            return(
              <div key={index} className={`${commonStyle} rounded-b`}>
                {c}
              </div>
          )} else{
            return(
              <div key={index} className={`${commonStyle}`}>
                {c}
              </div>
          )}
      })}
    </div>
  )
}

export function ComfirmWindow({text, comfirm, cancel}: {text:string, comfirm: ()=>void, cancel: ()=>void}){
  return (
    <div className='
      flex flex-col justify-center
      size-full
      bg-white shadow-xl
    '>
      <div className='
        flex justify-center items-end text-center h-[50vh]
      '>
        {text}
      </div>
      <div className='h-[17vh]'></div>
      <div className='
        flex justify-evenly
        h-fit pt-2 pb-4 px-9
      '>
        <button
          className={`
            px-6 py-2.5 rounded cursor-pointer
            ${styleSelected}
          `}
          onClick={comfirm}
        >
          確認
        </button>
        <button
          className={`
            px-6 py-2.5 rounded cursor-pointer
            ${styleUnselected}
          `}
          onClick={cancel}
        >
          取消
        </button>
      </div>
    </div>
  )
}

export function ResponseItem({meta, selected, setCurResponse, showMenu}:{
  meta:ResponseMeta,
  selected:boolean,
  setCurResponse: () => void,
  showMenu: (e:React.MouseEvent) => void})
{  
  const myRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`
        w-full h-[50]
        grid grid-cols-[1fr_1.5fr_35px] gap-4 items-center
        select-none
        py-2 px-2
        ${selected ? "bg-[#e7f1ff] hover:bg-blue-100 active:bg-blue-200": "hover:bg-gray-100 active:bg-gray-200"}
        cursor-pointer rounded-lg

        sm:grid-cols-[1fr_1.5fr_160px_35px]

        md:min-w-150
        md:grid-cols-[1.5fr_60px_2fr_160px_35px]`}
    >
      {/* project name */}
      <div className="truncate h-fit text-blue-600 font-bold">{meta.project.name}</div>
      
      {/* response ver */}
      <div className="hidden size-fit text-gray-600 md:flex">{meta.version.id}</div>
      
      {/* response title */}
      <div className="items-center truncate h-fit text-gray-600">{meta.version.title}</div>
      
      {/* response date, with format? "2010-11-19T07:34:39.038Z" */}
      <div className="hidden size-fit text-gray-600 sm:flex md:flex">{formatRelativeTime(meta.submittedAt)}</div>

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

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const { i18n, t } = useTranslation();
  const diff = now.getTime() - date.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr  = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  // formated time difference
    if (sec < 60) return t('historyPage.justNow');
    if (min < 60) return t('historyPage.minutesAgo', { count: min });
    if (hr < 24) return t('historyPage.hoursAgo', { count: hr });

  // yesterday / the day before yesterday (or just "2 days ago")
    if (day === 1) return t('historyPage.yesterday');
    if (day === 2) return t('historyPage.dayBeforeYesterday');
   

  // xx days ago
    if (day < 7) return t('historyPage.daysAgo', { count: day });

  // this year "MM/DD", or other format?
  const thisYear = now.getFullYear();
    if (date.getFullYear() === thisYear) {
        return t('historyPage.thisYearDate', { month: date.getMonth() + 1, day: date.getDate() });
    }

  // over one year "YYYY/MM/DD", or other format?
    return t('historyPage.fullDate', { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
}

export function ResponseWindow({state, data}: {state: ViewerState, data:{response: ResponseData | null, questionnaire: QuestionnaireData | null}}){
  const [curState, setCurState] = useState(state)
  const [transDone, setTransDone] = useState(true)
    const { i18n, t } = useTranslation();
  useEffect(()=>{
    setCurState(state)
  }, [state])
  
  // loading
  if (curState === ViewerState.loading) return (
    <div className="flex items-center justify-center w-full h-full">
      <LoadingComponent message="載入中..." />
    </div>
  )

  // detail
  const detailPanel = (<div
      className="flex flex-col items-center justify-end w-full size-fit"
    >
      <div className="text-black text-2xl font-semibold mb-7">{t('historyPage.detailInfo')}</div>
      <div 
        className={`
          w-full px-3 flex justify-center
          overflow-x-auto

          sm:w-fit`}
        onClick={(e)=>e.stopPropagation()}
      >
        <div
          className={
            `grid grid-cols-[180px_1fr] max-w-fit w-[100%] space-y-2
            whitespace-nowrap`}
        >
          <div>{t('historyPage.user')}</div>
          <div>{data.response?.user?.name}</div>

          <div>{t('historyPage.userEmail')}</div>
          <div>{data.response?.user?.email}</div>

          <div>{t('historyPage.projectName')}</div>
          <div>{data.response?.project?.name}</div>

          <div>{t('historyPage.questionnaireName')}</div>
          <div>{data.response?.version?.title}</div>

          {/* 
          <div>{t('historyPage.label')}</div>
          <div>{data.response?.label}</div>*/}

          <div>{t('historyPage.submittedAt')}</div>
          <div>{data.response?.submittedAt}</div>

        </div>
      </div>
    </div>)

  // fail
  if (curState === ViewerState.fail
    || (data.response === null || data.questionnaire === null)
  ) return (
    <div className="flex items-center justify-center w-full h-full">
          <h2 className="text-red-600 text-lg font-semibold mb-4">{t('historyPage.fetchFail')}</h2>
    </div>
  )

  const toolComponent = (
    text: string,
    icon: React.JSX.Element,
    color: string,
    onClick: React.MouseEventHandler<HTMLDivElement> | undefined) =>
  {
    return(
      <div
        className={`
          relative
          flex justify-center items-center
          size-13 rounded-full backdrop-blur-xs overflow-hidden select-none
          border-${color}-200

          hover:overflow-visible cursor-pointer
          shadow-black/20 border shadow-md active:shadow-sm
          ${
            curState === ViewerState.detail?
            `bg-${color}-400 hover:bg-${color}-500 active:bg-${color}-600`:
            `bg-${color}-400/50 hover:bg-${color}-500/50 active:bg-${color}-600/50`}
        `}
        onClick={onClick}
      >
        {icon}
        <div className={`
          absolute -top-8 w-fit px-1.5 py-1 z-55
          text-center font-bold text-xs text-white whitespace-nowrap
          bg-${color}-400 rounded-full shadow shadow-gray-500`}>
          {text}
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className="relative flex items-center justify-center w-full h-full"
        onClick={() => {setCurState(ViewerState.success)}}
      >
        <div className={`
          absolute bottom-0 z-52 w-[100%] h-[12%]
          bg-gradient-to-t from-black/10 to-transparent pointer-events-none

          ${curState === ViewerState.detail ? 
          "translate-y-0" :
          "translate-y-0"}
        `}/>
        <div
          className={`
            absolute z-[58] bottom-0 h-[12%] w-full
            flex justify-center items-start space-x-4
            `}
          onClick={(e)=>{
            if(curState === ViewerState.detail) e.stopPropagation()
          }}
        >
          {/*toolComponent(
            "編輯", 
            (<Edit size={30} color={`${curState === ViewerState.detail?"#fff085":"#ffffff"}`} />),
            "orange",
            (e)=>{
              e.stopPropagation()
              if(curState === ViewerState.detail)
                setCurState(ViewerState.success)
              else setCurState(ViewerState.detail)
            }
          )*/}
          {toolComponent(
            t('historyPage.detailInfo'), 
            (<Info size={30} color={`${curState === ViewerState.detail?"#fff085":"#ffffff"}`} />),
            "blue",
            (e)=>{
              e.stopPropagation()
              if(curState === ViewerState.detail)
                setCurState(ViewerState.success)
              else setCurState(ViewerState.detail)
            }
          )}
          {toolComponent(
            t('historyPage.viewReport'), 
            (<FileText size={30} color="#ffffff" />),
            "green",
            (e)=>{
              e.stopPropagation()
              if(data.response === null || data.response === undefined) return

              localStorage.setItem('responseId', (data.response.id).toString());
              localStorage.setItem('currentProjectId', (data.response.projectId).toString());
              localStorage.setItem('QuestionnaireID', (data.response.versionId).toString());
              
              window.open("/report", "_blank")
            }
          )}
        </div>

        <div
          className={`
            absolute -bottom-[90%] z-[52]
            w-[100%] h-[87%]
            flex flex-col justify-start items-center
            rounded-t-2xl border border-white backdrop-blur-xl  shadow-[0_0px_6px_rgba(0,0,0,0.2)]
            transform transition duration-200 ease-out

            sm:rounded-t-md
            sm:w-[80%]
            ${curState === ViewerState.detail ? 
              `-translate-y-[100%] bg-white/70
                overflow-hidden` : `translate-y-0` } `}
          onClick={(e)=>e.stopPropagation()}
        >
          <div className={`
            relative
            flex justify-center items-center
            w-[100%] h-[6%]
          `}/>
          {detailPanel}
        </div>
        <ResponseViewer data={{response:data.response, questionnaire:data.questionnaire}} />
      </div>
    </>
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
