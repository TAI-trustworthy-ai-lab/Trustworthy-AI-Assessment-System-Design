"use client";

import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';
import ProtectedLayout from '@/components/ProtectedLayout';
import { fetchProject, ProjectData } from '@/services/projectService'
import {
    ResponseMeta,
    ResponseData,
    ViewerState,
    fetchResponseList,
    deleteResponse,
    fetchResponse,
    fetchQuestionnaire
} from '@/services/responseService'

import { useTranslation } from 'react-i18next';
import ResponseViewer, {
  CATEGORY_MAP,
    Option,
    Question,
    QuestionnaireData,
    styleSelected,
    styleUnselected
} from '../../components/ResponseViewer';
import { Info, Edit, FileText, ChevronDown, CircleX } from 'lucide-react'
import { TFunction } from 'i18next';
import { LoadingComponent } from '@/components/LoadingComponent';
//import { Info, Edit, FileText } from 'lucide-react'

export enum SortWay {
    Accend,
    Deccend
}

export enum SortType {
    Name,
    Date,
    Project,
    None,
    Questionnaire,
}

export enum GroupType {
    Project,
    None,
    Date,
    Questionnaire,
}

export interface SortingData{
  sort: {
    type: SortType,
    way: SortWay
  },
  group: {
    type: GroupType,
    way: SortWay
  }
}

export enum InfoState {
  idle,
  in,
  out
}

export class Notification{
  static delay: number

  static setDelay(delay: number){
    Notification.delay = delay
  }

  static notify(onNotify: ()=> void, onTimeout: ()=> void) {
    onNotify()
    setTimeout(()=>onTimeout(), Notification.delay)
  }
}

// ----------------------------------------------------
// 暫存結構：中文原文 & 英文翻譯
// ----------------------------------------------------
const translationCache: {
    zh: Record<string, string>;
    en: Record<string, string>;
} = {
    zh: {},
    en: {},
};

// ----------------------------------------------------
// 翻譯工具函式
// ----------------------------------------------------
const capitalizeFirstLetter = (text: string) => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const translateText = async (text: string, source = "zh-CN", target = "en") => {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, source, target }),
  });

  const data = await res.json();
  return data.translatedText;
};

// ----------------------------------------------------
// TranslatedText Component with cache
// ----------------------------------------------------
const TranslatedText: React.FC<{ text: string; capitalize?: boolean }> = ({
    text,
    capitalize = false,
}) => {
    const { i18n } = useTranslation();
    const [translated, setTranslated] = useState(text);
    
    useEffect(() => {
        let isActive = true; // 標記當前 effect 是否仍有效

        // 中文暫存：始終存原文
        if (!translationCache.zh[text]) {
            translationCache.zh[text] = text;
        }

        if (i18n.language.startsWith("en")) {
            // 英文情境：先檢查暫存
            if (translationCache.en[text]) {
                setTranslated(
                    capitalize ? capitalizeFirstLetter(translationCache.en[text]) : translationCache.en[text]
                );
            } else {
                // 沒有暫存 → 呼叫翻譯 API
                translateText(text, "zh-CN", "en").then((result) => {
                    if (isActive) { // 只有當前 effect 還有效才更新
                        result = result || translationCache.zh[text];//如果翻譯未成功，顯示中文。
                        translationCache.en[text] = result;
                        setTranslated(capitalize ? capitalizeFirstLetter(result) : result);
                    }
                });
            }
        } else {
            // 中文情境：直接用中文暫存
            setTranslated(translationCache.zh[text]);
        }
        // cleanup：切語言時舊的請求結果不再生效
        return () => {
            isActive = false;
        };
    }, [text, i18n.language, capitalize]);

    return <>{translated}</>;
};

export default function HistoryPage() {
  const pathname = usePathname()

  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [responseGroup, setResponseGroup] = useState<{ groupName: string, items: ResponseMeta[] }[]>([]);
  const [responseList, setResponseList] = useState<ResponseMeta[]>([]);
  const [curResponse, setCurResponse] = useState<ResponseMeta | null>(null);
  const [viewerState, setViewerState] = useState<ViewerState>(ViewerState.loading);
  const [viewerData, setViewerData] = useState<{
    response: ResponseData | null,
    questionnaire: QuestionnaireData | null,
    project: ProjectData | null
  }>({ response: null, questionnaire: null, project: null });

  // reminder: key is Questionnaire/ response/ Project id
  // to do: store response/ questionaaire in local (seperated)
  const [fetchQuestionnaireList, setFetchQuestionnaireList] = useState<Record<
    number,
    QuestionnaireData | null
  >>({})
  const [fetchList, setFetchList] = useState<Record<
    number,
    ResponseData | null
  >>({})
  const [fetchProjectList, setFetchProjectList] = useState<Record<
    number,
    ProjectData | null
  >>({})
  const { i18n, t } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState<boolean[]>([])
  const isOpenRef = useRef(isOpen);
  const [isDeleteWindowOpen, setIsDeleteWindowOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPositionOriginal, setMenuPositionOriginal] = useState({ x: 0, y: 0 });
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const [isSortLock, setIsSortLock] = useState(true)
  const [sortWay, setSortWay] = useState(SortWay.Accend)
  const [sortType, setSortType] = useState(SortType.Date)
  const [groupType, setGroupType] = useState(GroupType.Project)

  Notification.setDelay(4000)
  const [infoText, setInfoText] = useState<React.JSX.Element[]>([])
  const [infoNow, setInfoNow] = useState(0)

  const router = useRouter();
  const menuSize = { x: 200, y: 250 }

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // get userId authToken from localStorage
  useEffect(() => {
    console.log("hello")
    const storedUserId = localStorage.getItem('userId');
    const storedAuthToken = localStorage.getItem('authToken');
    setUserId(storedUserId)
    setAuthToken(storedAuthToken)
    settingHandler()
  }, []);

  useEffect(() => {
    settingHandler()
  }, [pathname]);

  const settingHandler = () =>{
    console.log("load setting")
    const fetchListString = localStorage.getItem("myQuestionnaire");
    const fetchProjectListString = localStorage.getItem("myProject");
    const dataQ = fetchListString ? JSON.parse(fetchListString) : {};
    const dataP = fetchProjectListString ? JSON.parse(fetchProjectListString) : {};
    setFetchQuestionnaireList(dataQ)
    setFetchProjectList(dataP)
    console.log(dataQ, dataP)

    setIsSortLock(true)
    const sortingDataString = localStorage.getItem("sortingData");
    const sortingData = sortingDataString ? JSON.parse(sortingDataString) as SortingData :
      {
        sort: {
          type: SortType.Date,
          way: SortWay.Accend
        },
        group: {
          type: GroupType.Project,
          way: SortWay.Accend
        }
      }
    setSortType(sortingData.sort? sortingData.sort.type : SortType.Date)
    setSortWay(sortingData.sort? sortingData.sort.way: SortWay.Accend)
    setGroupType(sortingData.group? sortingData.group.type: GroupType.Project)
    setIsSortLock(false)
  }

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

  /*
  const translateText = async(text: string | null, source = "zh-TW", target = "en") => {
      if (text === null) return ""

      return text;
    await new Promise(resolve => setTimeout(resolve, 430))

    /*
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source, target })
    })
    const data = await res.json()
    return data.translatedText;
    return "this is English, cancel the comment in translateText() to use api"
  }

  const gradualTranslate = async(r:ResponseData, q: QuestionnaireData) => {
    const tanslatedQuestionnaire: QuestionnaireData = {
      id: q.id,
      title: await translateText(q.title),
      description: await translateText(q.description),
      questions: [],
      group: q.group
    }

    for(let i = 0; i < q.questions.length && isOpenRef.current; i++){
      const oldQ = q.questions[i]
      const newQ: Question = {
        id: oldQ.id,
        text: await translateText(oldQ.text),
        category: oldQ.category,
        order: oldQ.order,
        type: oldQ.type, 
        required: oldQ.required,
        options: oldQ.options? await Promise.all(
          oldQ.options.map(async (o) => {
            const newO: Option = {
              id: o.id,
              text: await translateText(o.text),
              value: o.value,
              order: o.order,
            };
          return newO;
        })) : undefined,
      }
      tanslatedQuestionnaire.questions.push(newQ)
      setViewerData({ response: r, questionnaire: tanslatedQuestionnaire })
      setViewerState(ViewerState.translating)
    }
    return tanslatedQuestionnaire
  }*/

  // open
  // get response and questionnair from response id and qId (GET API)
  const getResponseAndQuestionnaire = async (id: number, qId: number, pId: number, locale: string | undefined, finalState: ViewerState) => 
  {
    fetchList[id] = fetchList[id] || null
    fetchQuestionnaireList[qId] = fetchQuestionnaireList[qId] || null
    fetchProjectList[pId] = fetchProjectList[pId] || null

    let r: ResponseData | null = null
    let q: QuestionnaireData | null = null
    let p: ProjectData | null = null
    let rRequest: Promise<ResponseData> | Promise<null> | null = new Promise<null>((resolve)=>{resolve(null)})
    let qRequest: Promise<QuestionnaireData> | Promise<null> | null = new Promise<null>((resolve)=>{resolve(null)})
    let pRequest: Promise<ProjectData> | Promise<null> | null = new Promise<null>((resolve)=>{resolve(null)})

    // response
    if (fetchList[id] === null) {
      console.log("fetch response")
      if (!userId || userId === 'fallback-user-id' || !authToken) {
        return;
      }
      rRequest = fetchResponse(userId, authToken, id)
    }
    else r = fetchList[id]

    const qChecker = (q: QuestionnaireData) => {
      return (
        q.description !== undefined
        && q.group !== undefined
        && q.id !== undefined
        && q.title !== undefined
        && q.questions !== undefined
      )
    }

    // questionnaire
    if (fetchQuestionnaireList[qId] === null
      || qChecker(fetchQuestionnaireList[qId]) === false)
    {
      console.log("not find q in local storage")
      if (!userId || userId === 'fallback-user-id' || !authToken) {
        return;
      }
      qRequest = fetchQuestionnaire(qId)
    }
    else q = fetchQuestionnaireList[qId]

    // project
    if (fetchProjectList[pId] === null)
    {
      console.log("not find p in local storage")
      if (!userId || userId === 'fallback-user-id' || !authToken) {
        return;
      }
      pRequest = fetchProject(userId, authToken, pId)
    }
    else p = fetchProjectList[pId]
    
    // fetch all
    if(r === null || q === null || p === null){
      try{
        const [fetchR, fetchQ, fetchP] = await Promise.all([rRequest, qRequest, pRequest])
        if(fetchR === null || fetchR === undefined){
          setViewerState(ViewerState.fail)
        } else {
          r = fetchR
          setFetchList(prev=>({...prev, [id]: fetchR}))
        }

        if(fetchQ === null || fetchQ === undefined){
          setViewerState(ViewerState.fail)
        } else {
          q = fetchQ
          setFetchQuestionnaireList(prev=>({...prev, [qId]: fetchQ}))
        }

        if(fetchP === null || fetchP === undefined){
          setViewerState(ViewerState.fail)
        } else {
          p = fetchP
          setFetchProjectList(prev=>({...prev, [pId]: fetchP}))
        }

      } catch (e) {
        setViewerState(ViewerState.fail)
        console.error("error while fetchData", e)
      }
    }

    //console.log(locale)
    /*
    try{
      if(locale){
        switch(locale){
          case "en":
            if(fetchList[id].locale?.en){
              q = fetchList[id].locale.en
            } else {
              q = await gradualTranslate(r, q)
              fetchList[id].locale = {
                ...fetchList[id].locale,
                "en": q
              }
            }
            break
          default:
            q = fetchQuestionnaireList[qId]
            break
        }
      }
    } catch {
      setViewerState(ViewerState.fail)
      console.error("翻譯失敗")
    }*/

    // console.log(fetchQuestionnaireList, fetchProjectList)
    localStorage.setItem("myQuestionnaire", JSON.stringify(fetchQuestionnaireList))
    localStorage.setItem("myProject", JSON.stringify(fetchProjectList))
    setViewerData({ response: r, questionnaire: q, project: p })
    setViewerState(finalState)
  }

  // delete
  const delResponse = async (id: number) =>
  {
    const r = responseList.find(value => value.id === id)

    if (r === null || r === undefined) return

    const index = responseList.indexOf(r)
    setResponseList(prev => prev.filter(value => value !== r))

    if (!userId || userId === 'fallback-user-id' || !authToken) {
      return;
    }
    notify(t('historyPage.notify.delete.on'), "default")
    try {
      await deleteResponse(userId, authToken, id);
      notify(t('historyPage.notify.delete.success'), "success")
    } catch (e) {
      setResponseList(prev => {
        const newList = [...prev]
        newList.splice(index, 0, r)
        return newList
      })
      notify(t('historyPage.notify.delete.on'), "error")
      console.error("fail to del response", e)
    }
  }

  const deleteResponseHandler = () => {
    setIsDeleteWindowOpen(false)
    if (curResponse) {
      try {
        delResponse(curResponse.id)
        //setInfoText(t('historyPage.deleteSuccess'))
      } catch (e) {
        //setInfoText(t('historyPage.deleteFail'))
        console.error("刪除回應時發生錯誤", e)
      }
    }
  }

  const sortList = (list: ResponseMeta[], type: SortType, way: SortWay) => {
    const factor = way === SortWay.Accend ? -1 : 1;

    return list.sort((a, b) => {
      if (sortType === SortType.Name)
        return factor * a.project.name.localeCompare(b.project.name);

      if (sortType === SortType.Date)
        return factor * (new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

      return 0;
    });
  }

  function groupBy<T>(
    list: T[],
    method: (item: T) => string
  ): { groupName: string; items: T[] }[] 
  {
    const map = new Map<string, T[]>()

    for (const item of list) {
      const groupKey = method(item)
      if (!map.has(groupKey)) map.set(groupKey, []);
      map.get(groupKey)!.push(item);
    }

    // to array
    return Array.from(map.entries()).map(([groupName, items]) => ({
      groupName,
      items,
    }));
  }

  const groupList = (list: ResponseMeta[], groupType: GroupType) => {
    if (groupType === GroupType.None)
      return groupBy(list, () => "defalt")

    if (groupType === GroupType.Project)
      return groupBy(list, (item: ResponseMeta) => item.project.name)

    if (groupType === GroupType.Date)
      return groupBy(list, (item: ResponseMeta) => formatTimeGroup(item.submittedAt, t));

    if (groupType === GroupType.Questionnaire)
      return groupBy(list, (item: ResponseMeta) => item.versionId.toString());
  }

  function groupOpenSwitch(id: number){
    if(id >= 0 && id < isGroupOpen.length){
      setIsGroupOpen(prev => {
        const newArr = [...prev]
        newArr[id] = !newArr[id]
        return newArr
      })
    }
  }

  function notify(text= "text", type= "default"){
    const colors = {
      success: "bg-green-500",
      error: "bg-red-500",
      warning: "bg-yellow-500",
      default: "bg-blue-500",
    }
    let color = colors.default
    if(type === "success") color = colors.success
    else if(type === "error") color = colors.error
    else if(type === "warning") color = colors.warning

    const item = (
      <div className={`
        flex justify-center items-center
        w-fit h-full p-3
        ${color} text-white font-bold
        whitespace-nowrap`}
      >
        {text}
      </div>
    )
      
    Notification.notify(
      ()=>{
        setInfoText(prev=>{
          const p = [item, ...prev]
          if(p.length > 4) p.pop()
          return p
        })
        setInfoNow(prev => prev<<1|1 )
      },
      ()=>{
        setInfoNow(prev => prev>>1)
      }
    )
  }

  const infoItem = (index: number)=>{
    //if(index === 0) return
    return (
      <div
        key={index}
        className='relative h-[116px]'
      >
        <div
          className={`
            absolute left-[0%]
            w-fit h-[116px]
            bg-white shadow-lg rounded-l-2xl
            
            overflow-hidden
            
            ${((infoNow) & (1 << index)) === 0 ?
              " translate-x-[0%] transform transition duration-200 ease-out":
              "-translate-x-[100%]"
            }
          `}
        >
          {infoText[index]}
        </div>
      </div>
    )
  }

  // 2. 當 userId 或 authToken 改變時載入專案
  useEffect(() => {
    if (userId && authToken) {
      // console.debug("loadResponses()")
      // setIsLoading(false)

      loadResponses()
    } else {
      setIsLoading(false)
      // router.push('/login')
    }
  }, [userId, authToken])

  useEffect(() => {
    if(isSortLock) return

    const newGroupList = groupList(responseList, groupType)
    newGroupList?.forEach((group, id) => {
      group.items = sortList(group.items, sortType, sortWay)
    })
    if (newGroupList){
      setResponseGroup(newGroupList)
      setIsGroupOpen(Array(10).fill(true))
    }

    const data = {
      sort: {
        type: sortType,
        way: sortWay
      },
      group: {
        type: groupType,
        way: SortWay.Accend
      }
    }
    localStorage.setItem("sortingData", JSON.stringify(data))
    //console.log("saved: ", localStorage.getItem("sortingData"))
  }, [sortWay, sortType, groupType, responseList, t])

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
    if (!showMenu) return
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
      {/* notification on left side */}
      <div
        className='
          fixed bottom-0 right-0 z-[70] gap-3
          flex flex-col-reverse justify-start items-end
          w-5 h-full pb-8
          pointer-events-none'
      > 
        {infoItem(0)}
        {infoItem(1)}
        {infoItem(2)}
        {infoItem(3)}
      </div>

      {/* response window */}
      {isOpen && (
        <div
          className="fixed inset-0 z-60 bg-black/65 flex items-center justify-center "
          onClick={() => { setIsOpen(false) }}
        >
          <div
            className=" 
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
              rounded overflow-hidden "
            >
              <div 
                className='absolute top-4 left-4 z-[61] size-fit'
                onClick={() => { setIsOpen(false) }}
              >
                <CircleX
                  size={40}
                  className='
                  text-white hover:text-red-500 cursor-pointer
                    drop-shadow-lg drop-shadow-black/45
                    
                    lg:hidden'
                />
              </div>
              <div className='absolute z-53 size-[100%] rounded shadow-[inset_0_0_5px_rgba(0,0,0,0.15)] pointer-events-none' />
              <ResponseWindow
                state={viewerState}
                data={viewerData}
                onEdit={()=>{
                  // console.log("onEdit")
                  notify(t('historyPage.notify.response.success'), "success")
                  if (curResponse) {
                    setFetchList(prev=>{
                      const p = {...prev}
                      p[curResponse.id] = null
                      return p
                    })
                  }
                }}
                onReport={()=>{
                  console.log("onReport")
                  notify(t('historyPage.notify.report.success'), "success")
                }}
                notify={notify}
              />
            </div>
          </div>
        </div>
      )}

      {isDeleteWindowOpen && (
        <div
          className="fixed inset-0 z-60 bg-black/65 flex items-center justify-center"
          onClick={() => setIsDeleteWindowOpen(false)}
        >
          <div
            className="
              flex flex-col
              w-full max-w-[315] h-[45vh] max-h-[170]
              overflow-hidden rounded-xl"
            onClick={(e) => e.stopPropagation()} // avoid clicking background
          >
            <ComfirmWindow
              text={t('historyPage.deleteConfirm')}
              comfirm={deleteResponseHandler}
              cancel={() => setIsDeleteWindowOpen(false)}
            />
          </div>
        </div>
      )}

      {/* right click menu */}
      {showMenu && (
        <ContextMenuStrip size={menuSize} position={menuPosition}>
          <div
            className="
              flex items-center size-full px-4 py-2
              text-gray-600 hover:bg-gray-100 active:bg-gray-200
              cursor-pointer"
            onClick={() => {
              if (curResponse) {
                setViewerState(ViewerState.loading)
                setIsOpen(true)
                setShowMenu(false)

                try {
                  getResponseAndQuestionnaire(curResponse.id, curResponse.versionId, curResponse.projectId, i18n.language, ViewerState.success)
                } catch (e) {
                  console.error("取得回應時發生錯誤", e)
                }
              }
            }}
          >
            {t('historyPage.open')}
          </div>

          <div
            className="
              flex items-center size-full px-4 py-2
              text-gray-600 hover:bg-gray-100 active:bg-gray-200
              cursor-pointer"
            onClick={() => {
              setShowMenu(false)
              if (curResponse === null || curResponse === undefined) return

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
          {/* 
          <div className="flex items-center size-full px-4 py-2 text-gray-600 hover:bg-gray-100 cursor-pointer active:bg-gray-200">
            {t('historyPage.download')}
          </div>*/}

          
          <div
            className="flex items-center size-full px-4 py-2 text-gray-600 hover:bg-gray-100 cursor-pointer active:bg-gray-200"
            onClick={()=>{
              if (curResponse) {
                setViewerState(ViewerState.loading)
                setIsOpen(true)
                setShowMenu(false)

                try {
                  getResponseAndQuestionnaire(curResponse.id, curResponse.versionId, curResponse.projectId, i18n.language, ViewerState.editing)
                } catch (e) {
                  console.error("取得回應時發生錯誤", e)
                }
              }
            }}
          >
            {t('historyPage.edit')}
          </div>

          <div
            className="
              flex items-center size-full px-4 py-2 
              text-gray-600 hover:bg-gray-100 active:bg-gray-200
              cursor-pointer"
            onClick={() => {
              if (curResponse) {
                setViewerState(ViewerState.loading)
                setIsOpen(true)
                setShowMenu(false)

                try {
                  getResponseAndQuestionnaire(curResponse.id, curResponse.versionId, curResponse.projectId, i18n.language, ViewerState.detail)
                } catch (e) {
                  console.error("取得回應時發生錯誤", e)
                }
              }
            }}
          >
            {t('historyPage.detailInfo')}
          </div>
          <div
            className="flex items-center size-full px-4 py-2 text-red-600 hover:bg-red-100 cursor-pointer active:bg-red-200"
            onClick={() => { setShowMenu(false); setIsDeleteWindowOpen(true) }}
          >
            {t('historyPage.delete')}
          </div>
        </ContextMenuStrip>
      )}

      <div
        className={`
          p-8 bg-gray-50 min-h-screen font-sans `}
        onClick={() => { setShowMenu(false); setCurResponse(null) }}
      >
        <AuthHeader />
        <h1 className="
          pt-20 mb-8
          text-center text-4xl font-extrabold text-gray-900 pb-2"
        >
          {t('historyPage.historyTitle')}
        </h1>

        <div className="
          flex justify-center
          w-full mb-14"
        >
          <div className='
            w-full
            md:max-w-250'
          >
            {responseList.length > 0 && (
              <div className='flex justify-end items-end w-full my-3'>
                <SortControls
                  sortWay={sortWay}
                  sortType={sortType}
                  groupType={groupType}
                  onSortWayChange={setSortWay}
                  onSortTypeChange={setSortType}
                  onGroupTypeChange={setGroupType}
                />
              </div>
            )}

            {/* no history */}           
            {responseList.length <= 0 && (
              <div className='
                flex justify-center
                mt-10 w-full
                italic font-bold text-gray-400 text-center text-xl'
              >
                {t('historyPage.noHistory')}
              </div>
            )}

            {responseList.length > 0 && <>
              <div className="
                w-full h-[50]
                grid grid-cols-[13px_1fr_1.5fr_35px] gap-4 items-center
                mb-2 py-2 px-2
                rounded-t-lg

                sm:grid-cols-[13px_1fr_1.5fr_160px_35px]

                md:min-w-150
                md:grid-cols-[13px_1.5fr_60px_2fr_160px_35px]
              ">
                <div/>
                <div className=" text-gray-600 truncate">{t('historyPage.projectName')}</div>
                <div className="hidden size-fit text-gray-600 md:flex">{t('historyPage.version')}</div>
                <div className=" text-gray-600 truncate">{t('historyPage.questionnaireName')}</div>
                <div className="hidden size-fit text-gray-600 sm:flex md:flex">{t('historyPage.submitDate')}</div>
              </div>

              {responseGroup.map((group, index) => {
                return (
                  <div
                    className='
                      flex flex-col w-full mb-3'
                    key={index}
                  >
                    {groupType !== GroupType.None && (
                      <div
                        className='
                          flex justify-start items-center
                          h-[53] p-2 pl-4 mb-1.5
                          text-white text-lg font-bold bg-blue-300
                          rounded-t-2xl rounded-b-md
                          cursor-pointer select-none
                          
                          hover:bg-blue-400'
                        onClick={()=>{ 
                          //console.log(isGroupOpen[index])
                          groupOpenSwitch(index)
                        }}
                      >
                        {group.groupName}
                      </div>
                    )}

                    {isGroupOpen[index] && group.items.map((data) => {
                      const item = <ResponseItem
                        meta={data}
                        selected={data === curResponse}
                        setCurResponse={() => setCurResponse(data)}
                        showMenu={(e) => {
                            handleContextMenu(e)
                        }}
                        t={t}
                      />
                      return (
                        <div
                          key={data.id}
                          className='flex justify-end gap-4'
                          onClick={(e) => { setCurResponse(data); e.stopPropagation(); setShowMenu(false) }}
                          onDoubleClick={() => {
                            setViewerState(ViewerState.loading)
                            setIsOpen(true)

                            try {
                              getResponseAndQuestionnaire(data.id, data.versionId, data.projectId, i18n.language, ViewerState.success)
                            }
                            catch (e) {
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
                )
              })}
            </>}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}

export function SortControls({ sortWay, sortType, groupType, onSortWayChange, onSortTypeChange, onGroupTypeChange }: {
  sortWay: SortWay;
  sortType: SortType;
  groupType: GroupType;
  onSortWayChange: (v: SortWay) => void;
  onSortTypeChange: (v: SortType) => void;
  onGroupTypeChange: (v: GroupType) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-4">
      <ClickAwaySelect
        label={t("historyPage.sort.label")}
        value={sortWay}
        options={[
          { label: t("historyPage.sort.ascend"), value: SortWay.Accend },
          { label: t("historyPage.sort.descend"), value: SortWay.Deccend },
        ]}
        onChange={onSortWayChange}
      />

      <ClickAwaySelect
        label={t("historyPage.sort.by")}
        value={sortType}
        options={[
          { label: t("historyPage.sort.byDate"), value: SortType.Date },
          { label: t("historyPage.sort.byName"), value: SortType.Name },
        ]}
        onChange={onSortTypeChange}
      />

      <ClickAwaySelect
        label={t("historyPage.group.label")}
        value={groupType}
        options={[
          { label: t("historyPage.group.project"), value: GroupType.Project },
          { label: t("historyPage.group.date"), value: GroupType.Date },
          { label: t("historyPage.group.questionnaire"), value: GroupType.Questionnaire },
          { label: t("historyPage.group.none"), value: GroupType.None },
        ]}
        onChange={onGroupTypeChange}
      />
    </div>
  )
}

export function ClickAwaySelect<T>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 點擊畫面空白收起
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={ref} className="relative w-40 select-none">
      <label className="
        block 
        text-sm font-medium mb-1 text-gray-600"
      >
        {label}
      </label>
      <div
        className="
          flex justify-between items-center 
          px-3 py-2
          rounded-lg border border-gray-300 bg-white shadow-sm 
          cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <span>{options.find((o) => o.value === value)?.label}</span>
        <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>
          <ChevronDown/>
        </span>
      </div>

      {open && (
        <ul className="
          absolute z-40
          mt-1 w-full
          rounded-lg bg-white border border-gray-200 shadow-lg
          overflow-hidden"
        >
          {options.map((o) => {
            const isSelected = o.value === value;
            return (<li
              key={options.indexOf(o)}
              className={`
                px-3 py-2
                cursor-pointer
                ${isSelected ?
                  "bg-[#e7f1ff] hover:bg-blue-100 active:bg-blue-200" :
                  "bg-white hover:bg-gray-50 active:bg-gray-100"
                }
              `}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </li>)
          })}
        </ul>
      )}
    </div>
  )
}

export function ContextMenuStrip({ size, position, children }: {
  size: { x: number, y: number },
  position: { x: number, y: number },
  children: React.JSX.Element[]
}) {

  const childCount = children.length
  const commonStyle = "flex items-center h-full overflow-hidden"

  return (
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
        bg-white rounded shadow-[0_0_15px_rgba(0,0,0,0.35)]`
      }
    >
      {children.map((c, index) => {
        if (index <= 0) {
          return (
            <div key={index} className={`${commonStyle} rounded-t`}>
              {c}
            </div>
          )
        } else if (index >= childCount - 1) {
          return (
            <div key={index} className={`${commonStyle} rounded-b`}>
              {c}
            </div>
          )
        } else {
          return (
            <div key={index} className={`${commonStyle}`}>
              {c}
            </div>
          )
        }
      })}
    </div>
  )
}

export function ComfirmWindow({ text, comfirm, cancel }: {
  text: string,
  comfirm: () => void,
  cancel: () => void })
{
  const { t } = useTranslation();
  return (
    <div className='
      flex flex-col justify-center
      size-full
      bg-white shadow-xl'
    >
      <div className='
        flex justify-center items-end
        h-[50vh] px-4
        text-center'
      >
        {text}
      </div>
      <div className='h-[17vh]'></div>
      <div className='
        flex justify-evenly
        h-fit pt-2 pb-4 px-9'
      >
        <button
          className={`
            px-6 py-2.5 rounded cursor-pointer
            ${styleSelected}
          `}
          onClick={comfirm}
        >
          {t("historyPage.confirm")}
        </button>
        <button
          className={`
            px-6 py-2.5 rounded cursor-pointer
            ${styleUnselected}
          `}
          onClick={cancel}
        >
          {t("historyPage.cancel")}
        </button>
      </div>
    </div>
  )
}

export function ResponseItem({ meta, selected, setCurResponse, showMenu, t }: {
  meta: ResponseMeta,
  selected: boolean,
  setCurResponse: () => void,
  showMenu: (e: React.MouseEvent) => void
  t: TFunction<"translation", undefined>}) 
{
  const myRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`
        grid grid-cols-[13px_1fr_1.5fr_35px] gap-4 items-center
        w-full h-[50] py-2 px-2
        rounded-lg
        select-none cursor-pointer 
        ${selected ? 
          "bg-[#e7f1ff] hover:bg-blue-100 active:bg-blue-200" :
          "hover:bg-gray-100 active:bg-gray-200"
        }
        
        sm:grid-cols-[13px_1fr_1.5fr_160px_35px]

        md:min-w-150
        md:grid-cols-[13px_1.5fr_60px_2fr_160px_35px]`
      }
    >
      <div />

      {/* project name */}
      <div className="truncate h-fit text-blue-500 font-bold">{meta.project.name}</div>

      {/* response ver */}
      <div className="hidden size-fit text-gray-600 md:flex">{meta.version.id}</div>

      {/* response title */}
      <div className="items-center truncate h-fit text-gray-600">{<TranslatedText text={meta.version.title} />}</div>

      {/* response date, with format? "2010-11-19T07:34:39.038Z" */}
      <div className="hidden size-fit text-gray-600 sm:flex md:flex">{formatRelativeTime(meta.submittedAt, t)}</div>

      {/* ... i copy the icon from google drive */}
      <div
        ref={myRef}
        className={`
          flex justify-center items-center
          size-[35] rounded-full
          ${selected ?
            "hover:bg-blue-200 active:bg-blue-300" :
            "hover:bg-gray-200 active:bg-gray-300"
          }`
        }
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          if (myRef.current) {
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

export function formatRelativeTime(
  isoString: string,
  t: TFunction<"translation", undefined>
): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);

  // formated time difference
  if (sec < 60) return t('historyPage.justNow');
  if (min < 60) return t('historyPage.minutesAgo', { count: min });
  if (hr < 24) return t('historyPage.hoursAgo', { count: hr });

  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

  // yesterday / the day before yesterday (or just "2 days ago")
  const target = startOfDay(date)
  const today = startOfDay(now)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const twoDaysAgo = new Date(today)
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  // yesterday
  if (+target === +yesterday) return t('historyPage.yesterday')
  // The day before yesterday
  if (+target === +twoDaysAgo) return t('historyPage.dayBeforeYesterday')

  const diffMs = today.getTime() - target.getTime()
  const dayDiff = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (dayDiff < 7) return t('historyPage.daysAgo', { count: dayDiff });

  // this year "MM/DD", or other format?
  const thisYear = now.getFullYear();
  if (date.getFullYear() === thisYear) {
    return t('historyPage.thisYearDate', { month: date.getMonth() + 1, day: date.getDate() });
  }

  // over one year "YYYY/MM/DD", or other format?
  return t('historyPage.fullDate', { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
}

export function formatTime(isoString: string | undefined): string {
  if (isoString === undefined) return "未知時間"

  const d = new Date(isoString);
  return `
    ${d.getFullYear()
    }/${String(d.getMonth() + 1).padStart(2, '0')
    }/${String(d.getDate()).padStart(2, '0')
    } ${String(d.getHours()).padStart(2, '0')
    }:${String(d.getMinutes()).padStart(2, '0')
    }:${String(d.getSeconds()).padStart(2, '0')
    }
  `
}

export function formatTimeGroup(
  isoString: string,
  t: TFunction<"translation", undefined>
): string {
  const now = new Date();
  const d = new Date(isoString);

  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startOfWeek = (date: Date) => {
    const d = startOfDay(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d;
  };
  const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);

  const today = startOfDay(now);
  const target = startOfDay(d);

  // today
  if (+target === +today) return t('historyPage.today');;

  // yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (+target === +yesterday) return t('historyPage.yesterday');;

  // this week
  const thisWeekStart = startOfWeek(now);
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  if (target >= thisWeekStart && target < nextWeekStart) return t('historyPage.thisWeek');;

  // last week
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  if (target >= lastWeekStart && target < thisWeekStart) return t('historyPage.lastWeek');;

  // this month
  const thisMonthStart = startOfMonth(now);
  const nextMonthStart = new Date(thisMonthStart);
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
  if (target >= thisMonthStart && target < nextMonthStart) return t('historyPage.thisMonth');;

  // last month
  const lastMonthStart = new Date(thisMonthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  if (target >= lastMonthStart && target < thisMonthStart) return t('historyPage.lastMonth');;

  // this year
  const thisYearStart = startOfYear(now);
  const nextYearStart = new Date(thisYearStart);
  nextYearStart.setFullYear(nextYearStart.getFullYear() + 1);
  if (target >= thisYearStart && target < nextYearStart) return t('historyPage.thisYear');;

  // long ago
  return t('historyPage.longAgo');;
}

export function ResponseWindow({ state, data, onEdit, onReport, notify }: {
  state: ViewerState,
  data: { response: ResponseData | null, questionnaire: QuestionnaireData | null, project: ProjectData | null } ,
  onEdit: ()=>void,
  onReport: ()=>void,
  notify: (text:string, type:string)=>void, 
}) {
  const [curState, setCurState] = useState(state)
  const router = useRouter();
  const { i18n, t } = useTranslation();

  // map to corresponding title and content
  const getPageTitle = (category: string): string => CATEGORY_MAP[category.toUpperCase()][i18n.language].title || category
  const getPageContent = (category: string): string => CATEGORY_MAP[category.toUpperCase()][i18n.language].content || ""

  useEffect(() => {
    setCurState(state)
  }, [state])

  //useEffect(()=>console.log(curState.toString(2).padStart(6, '0')), [curState])

  const switchState = (state: ViewerState)=>{
    setCurState(prev => prev ^ state)
  }

  const addState = (state: ViewerState)=>{
    setCurState(prev => prev | state)
  }

  const removeState = (state: ViewerState)=>{
    setCurState(prev => prev & ~(state))
  }

  // loading
  if (curState & ViewerState.loading) return (
    <div className="
      flex items-center justify-center
      w-full h-full"
    >
      <LoadingComponent message={t("historyPage.loading")} />
    </div>
  )

  // fail
  if ((curState & ViewerState.fail)
    || (data.response === null || data.questionnaire === null || data.project === null)
  ) return (
    <div className="
      flex items-center justify-center
      w-full h-full"
    >
      <h2 className="
        mb-4
        text-red-600 text-lg font-semibold"
      >
        {t('historyPage.fetchFail')}
      </h2>
    </div>
  )

  // detail
  const detailPanel = (
    <div className="
      flex flex-col items-center justify-end
      w-full h-fit pt-8 pb-23"
    >
      <div className="
        mb-7
        text-black text-2xl font-semibold"
      >
        {t('historyPage.detailInfo')}
      </div>
      <div
        className={`
          flex flex-col justify-center
          w-full px-3 pb-10 
          overflow-x-auto

          sm:w-fit sm:max-w-[80%]`
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`
          grid grid-cols-[180px_1fr]
          max-w-fit w-[100%] space-y-2
          whitespace-nowrap`}
        >
          <div>{t('historyPage.user')}</div>
          <div>{data.response?.user?.name}</div>

          <div>{t('historyPage.userEmail')}</div>
          <div>{data.response?.user?.email}</div>

          <div>{t('historyPage.projectName')}</div>
          <div>{data.response?.project?.name}</div>

          <div>{t('historyPage.questionnaireName')}</div>
          <div>{<TranslatedText text={data.response?.version?.title} />}</div>

          <div>{t('historyPage.submittedAt')}</div>
          <div>{formatTime(data.response?.submittedAt)}</div>
        </div>
        <div>{t('reportPage.report.indicatorWeights')}</div>
        {data.project?.taiOrders && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full rounded-lg mt-2 ">
            {data.project.taiOrders.map((order, index) => (
              <div key={index} className="flex flex-col items-center bg-white p-3 rounded-lg shadow-sm border border-indigo-200">
                <span className="text-xs font-medium text-gray-500 text-center">
                  {getPageTitle(order.indicator)}
                </span>
                {/* 權重百分比顯示 */}
                <span className="text-lg font-bold text-indigo-700 mt-1">
                  {((order.weight) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const style = {
    orange: {
      border: `border-orange-200`,
      enable: `bg-orange-400 hover:bg-orange-500 active:bg-orange-600 text-[#fff085]`,
      disable: `bg-orange-400/50 hover:bg-orange-500/50 active:bg-orange-600/50 text-[#ffffff]`,
      tip: "bg-orange-400"
    },
    blue: {
      border: `border-blue-200`,
      enable: `bg-blue-400 hover:bg-blue-500 active:bg-blue-600 text-[#fff085]`,
      disable: `bg-blue-400/50 hover:bg-blue-500/50 active:bg-blue-600/50 text-[#ffffff]`,
      tip: "bg-blue-400"
    },
    green: {
      border: `border-green-200`,
      enable: `bg-green-400 hover:bg-green-500 active:bg-green-600 text-[#fff085]`,
      disable: `bg-green-400/50 hover:bg-green-500/50 active:bg-green-600/50 text-[#ffffff]`,
      tip: "bg-green-400"
    }
  }

  const toolComponent = (
    text: string,
    icon: React.JSX.Element,
    color: { border: string, enable: string, disable: string, tip: string },
    state: ViewerState,
    onClick: React.MouseEventHandler<HTMLDivElement> | undefined
  ) => {
    return (
      <div
        className={`
          relative
          flex justify-center items-center
          size-13 rounded-full backdrop-blur-xs
          shadow-black/20 border shadow-md 
          overflow-hidden select-none cursor-pointer pointer-events-auto

          hover:overflow-visible 
          active:shadow-sm
        
          ${color.border}
          ${curState & state  ? color.enable : color.disable}`
        }
        onClick={onClick}
      >
        {icon}
        <div className={`
          absolute -top-8 z-55
          w-fit px-1.5 py-1 
          rounded-full shadow shadow-gray-500
          text-center font-bold text-xs text-white
          whitespace-nowrap

          ${color.tip}`}
        >
          {text}
        </div>
      </div>
    )
  }

  return (<>
    <div
      className="
        relative
        flex flex-col items-center justify-center
        w-full h-full"
      onClick={() => {
        removeState(ViewerState.detail)
      }}
    >
      <div className='
        absolute bottom-0 z-52
        w-[100%] h-[70px]
        bg-gradient-to-t from-black/10 to-transparent
        pointer-events-none'
      />

      <div
        className={`
          absolute z-[58] bottom-0
          flex justify-center items-start space-x-4
          h-[70px] w-fit
          pointer-events-none`
        }
        onClick={(e) => {
          // what?
          if (curState & ViewerState.detail) e.stopPropagation()
        }}
      >
        {/*edit response*/}
        {toolComponent(
          t('historyPage.edit'), 
          (<Edit size={30} />),
          style.orange,
          ViewerState.editing,
          (e)=>{
            e.stopPropagation()
            switchState(ViewerState.editing)
          }
        )}

        {/*detail panel*/}
        {toolComponent(
          t('historyPage.detailInfo'),
          (<Info size={30} />),
          style.blue,
          ViewerState.detail,
          (e) => {
            e.stopPropagation()
            switchState(ViewerState.detail)
          }
        )}

        {/*view report*/}
        {toolComponent(
          t('historyPage.viewReport'),
          (<FileText size={30}/>),
          style.green,
          ViewerState.report,
          (e) => {
            e.stopPropagation()
            if (curState & ViewerState.noReport) {
              notify(t('historyPage.notify.report.on'), "default")
              return
            }
            if (data.response === null || data.response === undefined) return

            localStorage.setItem('responseId', (data.response.id).toString());
            localStorage.setItem('currentProjectId', (data.response.projectId).toString());
            localStorage.setItem('QuestionnaireID', (data.response.versionId).toString());

            //router.push('/report')
            window.open("/report", "_blank")
          }
        )}
      </div>

      <div
        className={`
          absolute top-[100%] z-[52]
          flex flex-col justify-start items-center
          w-[100%] h-[80%]
          rounded-t-2xl border border-white backdrop-blur-xl  shadow-[0_0px_6px_rgba(0,0,0,0.2)]
          overflow-y-auto
          transform transition duration-200 ease-out

          sm:rounded-t-md
          sm:w-[80%]

          ${curState & ViewerState.detail ?
            `-translate-y-[100%] bg-white/70 overflow-hidden` :
            `translate-y-0`
          }`
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`
          relative
          flex justify-center items-center
          w-[100%] h-[6%] `}
        />

        {detailPanel}
      </div>

      <ResponseViewer
        curState={
          curState & ViewerState.editing?
            ViewerState.editing:
            ViewerState.success
          }
        data={{ response: data.response, questionnaire: data.questionnaire }}
        onEdit={()=>{
          onEdit()
          removeState(ViewerState.editing)
          addState(ViewerState.noReport)
        }}
        onReport={()=>{
          onReport()
          removeState(ViewerState.noReport)
        }}
        notify={notify}
      />
    </div>
  </>)
}
