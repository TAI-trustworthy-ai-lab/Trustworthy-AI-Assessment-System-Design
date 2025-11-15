"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';
import ProtectedLayout from '@/components/ProtectedLayout';


// ----------------------------------------------------
// 指標從後端英文翻成中文對照表
// ----------------------------------------------------
const TAI_INDICATOR_MAP_EN_ZH: { [key: string]: string } = {
    "ACCURACY": "準確性",
    "RELIABILITY": "可靠性",
    "SAFETY": "安全性",
    "RESILIENCE": "韌性",
    "TRANSPARENCY": "透明性",
    "ACCOUNTABILITY": "當責性",
    "EXPLAINABILITY": "可解釋性",
    "AUTONOMY": "自主性",
    "PRIVACY": "隱私",
    "FAIRNESS": "公平性",
    "SECURITY": "資訊安全",
};


// ----------------------------------------------------
// 後端回傳資料結構
// ----------------------------------------------------
interface TaiOrder {
    indicator: string;
    weight: number;
    rank: number;
}
export interface ProjectData {
    id: number;
    name: string;
    description: string;
    taiOrders?: TaiOrder[];
    createdAt: string;
    updatedAt: string;
}


// ----------------------------------------------------
// API 呼叫後端：假設 userId， authToken 一定存在且有效
// ----------------------------------------------------
const BASE_URL = "http://localhost:3001/api";

// 1. 重複嘗試的 fetch 函式
function fetchWithRetry<T>(url: string, options: RequestInit = {}, authToken: string | null = null): Promise<T> {
    // 總共嘗試 2 次 (1 次初始請求 + 1 次重試)
    const MAX_ATTEMPTS = 2; 
    const attemptFetch = (attempt: number): Promise<T> => {
        // 假設 authToken 一定存在
        return fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                ...(options.headers || {}), 
            },
        })
        // 取得 Response 並解析 JSON 
        .then(response => response.json().then(result => ({ response, result })))
        .then(({ response, result }) => {
            
            if (!response.ok) {
                const errorMessage = result.error || result.message || `HTTP 錯誤! 狀態碼: ${response.status}`;  
                if (attempt < MAX_ATTEMPTS) {
                    console.warn(`API 請求失敗 (${url})，嘗試重試 ${attempt + 1}/${MAX_ATTEMPTS}。錯誤: ${errorMessage}`);
                    throw new Error(`RETRY_NEEDED: ${errorMessage}`); 
                }   
                console.error(`API 請求最終失敗 (${url}):`, errorMessage);
                throw new Error(errorMessage);
            }

            return result.data as T; 
        })
        .catch(error => {
            if (attempt < MAX_ATTEMPTS && (error.message.includes('Failed to fetch') || error.message.includes('RETRY_NEEDED'))) {
                // 遞迴呼叫下一輪嘗試
                return attemptFetch(attempt + 1);
            }
            console.error(`API 請求最終失敗 (${url}):`, error.message);
            throw error;
        });
    };

    return attemptFetch(1);
}

// 1. GET 專案列表
const fetchProjects = async (userId: string, authToken: string): Promise<ProjectData[]> => {
    const url = `${BASE_URL}/project/user/${userId}`;
    return fetchWithRetry<ProjectData[]>(url, { method: 'GET' }, authToken);
};

// 2. POST 建立新專案 
const createProject = async (name: string, userId: string, description: string, authToken: string): Promise<ProjectData> => {
    const url = `${BASE_URL}/project/`;
    const body = {
        userId: parseInt(userId), 
        name: name,
        description: description, 
    };

    return fetchWithRetry<ProjectData>(url, {
        method: 'POST',
        body: JSON.stringify(body),
    }, authToken);
};

// 3. DELETE 刪除專案
const deleteProject = async (projectId: number, authToken: string): Promise<void> => {
    const url = `${BASE_URL}/project/${projectId}`;
    await fetchWithRetry<any>(url, {
        method: 'DELETE',
    }, authToken);
};


// ----------------------------------------------------
// 專案卡片元件處理
// ----------------------------------------------------

interface ProjectCardProps {
    index: number;
    projectName: string;
    projectDescription: string;
    onClick: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ index, projectName, projectDescription, onClick }) => { 
    // 循環使用顏色
    const colors = [
        'bg-sky-400', 'bg-cyan-400', 'bg-blue-400', 'bg-indigo-400', 
        'bg-sky-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 
    ];
    const bgColor = colors[(index - 1) % colors.length]; 

    return (
        <div
            className={`
                p-4 h-48 rounded-2xl shadow-xl cursor-pointer transition-all duration-300
                transform hover:scale-[1.03] hover:shadow-2xl flex flex-col justify-between
                ${bgColor} text-white
                min-w-[150px]
            `}
            onClick={onClick}
        >
            <div className="text-up flex-grow flex items-center justify-center">
                <span className="text-6xl font-extrabold opacity-90">
                    {index}
                </span>
            </div>

            <div className="text-left w-full border-t border-white/30 pt-2">
                <p className="text-xl font-bold truncate" title={projectName}>
                    {projectName}
                </p>
                <p 
                    className="text-sm font-light line-clamp-1 mt-1 opacity-90" 
                    title={projectDescription || '無描述'}
                >
                    {projectDescription || '無描述'}
                </p>
            </div>
        </div>
    );
};


// ----------------------------------------------------
// 新增專案處理
// ----------------------------------------------------

interface AddProjectModalProps {
    isModalOpen: boolean;
    closeModal: () => void;
    onAddProject: (name: string, description: string) => Promise<void>;
    currentProjectCount: number;
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({ 
    isModalOpen, 
    closeModal, 
    onAddProject, 
    currentProjectCount 
}) => {
    const MAX_PROJECTS = 10;
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState(''); 
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null); 

    // 當 Modal 打開時重置狀態
    useEffect(() => {
        if (isModalOpen) {
            setProjectName('');
            setProjectDescription('');
            setError(null);
        }

        if (currentProjectCount >= MAX_PROJECTS) {
            setError(`無法新增專案：已達到系統限制 (最多 ${MAX_PROJECTS} 個)。`);
        }
    }, [isModalOpen, currentProjectCount]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null); 

        if (currentProjectCount >= MAX_PROJECTS) {
            setError(`無法新增專案：已達到系統限制 (最多 ${MAX_PROJECTS} 個)。`);
            return;
        }

        setIsLoading(true);
        try {
            await onAddProject(projectName.trim(), projectDescription.trim()); 
            // 成功後關閉
            closeModal();
        } catch (error: any) {
            console.error('新增專案失敗 (Modal 捕獲):', error.message);
            setError(`新增失敗: ${error.message}`); 
        } finally {
            setIsLoading(false);
        }
    };

    if (!isModalOpen) return null;

    const isLimitReached = currentProjectCount >= MAX_PROJECTS-1;
    const limitTextColor = isLimitReached ? 'text-red-600' : 'text-indigo-600';
    const limitBorderColor = isLimitReached ? 'border-red-400' : 'border-indigo-400';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"> 
            {/* Modal 內容框 */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4 sm:mx-0 animate-in fade-in zoom-in duration-300">
                <h2 className="text-center text-2xl font-bold mb-4 text-gray-800">新增專案</h2>
                
                {/* 提示訊息優化區塊 */}
                <div className="mb-6 space-y-2">
                    <p className={`text-sm ${limitTextColor} border-l-4 ${limitBorderColor} pl-2`}>
                        <b>系統限制：</b> 最多可新增 <b>{MAX_PROJECTS}</b> 個專案 (當前: <b>{currentProjectCount}</b> 個)
                    </p>
                    <p className="text-sm text-amber-600 border-l-4 border-amber-400 pl-2">
                        <b>重要提醒：</b> 專案名稱與描述在建立後將無法變更
                    </p>
                </div>
                
                {/* 錯誤提示 */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* 專案名稱輸入 */}
                    <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-1">專案名稱<span className="text-red-500"> *</span></label>
                    <input
                        id="projectName"
                        type="text"
                        placeholder="請輸入專案名稱..."
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                        disabled={isLoading}
                        required
                    />

                    {/* 專案描述輸入 */}
                    <label htmlFor="projectDescription" className="block text-sm font-medium text-gray-700 mb-1">專案描述</label>
                    <textarea
                        id="projectDescription"
                        rows={3}
                        placeholder="請輸入專案描述..."
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg mb-6 focus:ring-blue-500 focus:border-blue-500 text-gray-800 resize-none"
                        disabled={isLoading}
                    />

                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-150"
                            disabled={isLoading}
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-150 disabled:bg-blue-400 flex items-center"
                            disabled={isLoading || !projectName.trim() || currentProjectCount >= MAX_PROJECTS}
                        >
                            {isLoading ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : null}
                            新增
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// ----------------------------------------------------
// 刪除專案處理
// ----------------------------------------------------

interface ConfirmDeleteModalProps {
    isModalOpen: boolean;
    closeModal: () => void;
    projectName: string;
    onConfirmDelete: () => void;
    isLoading: boolean;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isModalOpen, closeModal, projectName, onConfirmDelete, isLoading }) => {
    if (!isModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-300 border-t-4 border-red-500">
                <h2 className="text-xl font-bold mb-4 text-red-700">確認刪除專案</h2>
                <p className="text-gray-700 mb-6">
                    確定永久刪除「{projectName}」嗎？<br />
                    刪除將同時<b>移除所有相關的評估報告</b>，此操作無法復原。
                </p>

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-150"
                        disabled={isLoading}
                    >
                        取消
                    </button>
                    <button
                        type="button"
                        onClick={onConfirmDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-150 disabled:bg-red-400 flex items-center"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : null}
                        確認刪除
                    </button>
                </div>
            </div>
        </div>
    );
};


// ----------------------------------------------------
// 顯示專案内容處理
// ----------------------------------------------------

interface ViewProjectModalProps {
    isModalOpen: boolean;
    closeModal: () => void;
    projectData: ProjectData | null;
    onConfirm: (project: ProjectData) => void;
    reloadProjects: () => void; 
    authToken: string | null; 
}

const ViewProjectModal: React.FC<ViewProjectModalProps> = ({ isModalOpen, closeModal, projectData, onConfirm, reloadProjects, authToken }) => {
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null); 

    const handleDeleteProject = useCallback(async () => {
        setIsDeleting(true);
        setDeleteError(null);
        
        try {
            if (!projectData || !authToken) {
                throw new Error("專案 / 使用者資料缺失，無法刪除。");
            }
            await deleteProject(projectData.id, authToken);
            // 成功後關閉所有 Modal
            closeModal(); 
            setIsDeleteConfirmOpen(false);
            setTimeout(() => {
                reloadProjects();
            }, 100); 

        } catch (error: any) {
            setDeleteError(`刪除失敗: ${error.message}`);
            setIsDeleting(false);
        }
    }, [projectData, closeModal, reloadProjects, authToken]);

    if (!isModalOpen || !projectData) return null;


    // * 將日期格式化為更易讀的格式
    const formatDate = (dateString: string | null | undefined): string => {
        if (!dateString) return '無日期資訊';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            
            return date.toLocaleString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        } catch (e) {
            return dateString;
        }
    };

    // * 指標排序處理
    const renderTaiOrders = (taiOrders: TaiOrder[] | undefined) => {
        // 1. 還沒排序TAI
        if (!taiOrders || taiOrders.length === 0) {
            return (
                <p className="text-sm text-gray-400">
                    此專案尚未設定 TAI 排序指標。點擊「進入專案」進行排序。
                </p>
            );
        }

        const allWeightsAreZero = taiOrders.every(order => order.weight === 0);

        // 2. 不使用TAI排序
        if (allWeightsAreZero) {
            return (
                <p className="text-sm text-orange-600">
                    此專案不使用 TAI 排序
                </p>
            );
        }

        // 3. 顯示TAI排序
        const sortedIndicators = [...taiOrders].sort((a, b) => a.rank - b.rank);
        const indicatorString = sortedIndicators
            .map(order => {
                const chineseIndicator = TAI_INDICATOR_MAP_EN_ZH[order.indicator] || order.indicator; 
                return chineseIndicator;
            })
            .join(' → ');

        return (
            <div className="text-sm p-3 bg-gray-50 rounded-lg border border-gray-200 overflow-x-auto">
                <p className="whitespace-nowrap font-mono text-gray-700 tracking-wider text-base">
                    {indicatorString}
                </p>
            </div>
        );
    };

    // * 專案描述是否存在判斷
    const hasDescription = projectData.description && projectData.description.trim() !== '';
    const descriptionClassName = hasDescription
        ? "text-sm text-gray-700 whitespace-pre-wrap" 
        : "text-sm text-gray-400";

    return (
        <> 
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4 sm:mx-0 animate-in fade-in zoom-in duration-300">
                    <h2 className="text-3xl font-bold mb-6 text-gray-800 flex items-center justify-center">
                        專案詳細資訊 
                    </h2>

                    <div className="space-y-4 border-t border-b border-blue-200 py-4">
                        {/* 專案名稱 */}
                        <div>
                            <p className="text-md font-semibold text-gray-500">專案名稱:</p>
                            <p className="text-base font-bold text-gray-900">{projectData.name}</p>
                        </div>

                        {/* 專案描述 */}
                        <div>
                            <p className="text-md font-semibold text-gray-500">專案描述:</p>
                            <p className={descriptionClassName}>
                                {projectData.description || '此專案未填寫描述'}
                            </p>
                        </div>

                        {/* TAI 排序指標 */}
                        <div>
                            <p className="text-md font-semibold text-gray-500">TAI 排序指標:</p>
                            {renderTaiOrders(projectData.taiOrders)}
                        </div>

                        {/* 建立日期 */}
                        <div>
                            <p className="text-md font-semibold text-gray-500">建立日期:</p>
                            <p className="text-base text-gray-700">
                                {formatDate(projectData.createdAt)}
                            </p>
                        </div>
                    </div>
                    
                    {/* 刪除：錯誤提示 */}
                    {deleteError && (
                        <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            <span className="block sm:inline">{deleteError}</span>
                        </div>
                    )}
                    
                    <div className="flex justify-between space-x-3 mt-8">
                        {/* 刪除：按鈕 */}
                        <button
                            type="button"
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            className="px-4 py-2 text-red-600 border border-red-400 bg-white rounded-lg hover:bg-red-50 transition duration-150"
                            disabled={isDeleting}
                        >
                            刪除專案
                        </button>
                        
                        {/* 右側按鈕群組 */}
                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-150"
                                disabled={isDeleting}
                            >
                                關閉
                            </button>
                            <button
                                type="button"
                                onClick={() => onConfirm(projectData)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-150 flex items-center"
                                disabled={isDeleting}
                            >
                                進入專案
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDeleteModal
                isModalOpen={isDeleteConfirmOpen}
                closeModal={() => {
                    setIsDeleteConfirmOpen(false);
                    setDeleteError(null);
                }}
                projectName={projectData.name}
                onConfirmDelete={handleDeleteProject}
                isLoading={isDeleting}
            />
        </>
    );
};


// ----------------------------------------------------
// 主頁元件 XD
// ----------------------------------------------------
const Home = () => {
    const [userId, setUserId] = useState<string | null>(null); 
    const [authToken, setAuthToken] = useState<string | null>(null); 
    const [projects, setProjects] = useState<ProjectData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false); 
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);
    const router = useRouter();

    // 取 local storage 裏的資料
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedUserId = localStorage.getItem('userId');
            const storedAuthToken = localStorage.getItem('authToken');

            setUserId(storedUserId);
            setAuthToken(storedAuthToken);
        }
    }, []);

    // 取專案列表
    const loadProjects = useCallback(async () => {
        if (!userId || !authToken) {
            setIsLoading(false);
            return; 
        }

        setIsLoading(true);

        try {
            const data = await fetchProjects(userId, authToken);
            const sortedData = (data as ProjectData[]).sort((a, b) => b.id - a.id);
            setProjects(sortedData);
        } catch (error) {
            console.error("載入專案失敗:", error);
        } finally {
            setIsLoading(false);
        }
    }, [userId, authToken]);

    // 當 userId 或 authToken 改變時，載入專案
    useEffect(() => {
        if (userId && authToken) loadProjects();
        else if (userId !== null && authToken !== null) setIsLoading(false);
    }, [loadProjects, userId, authToken]);

    // 新增專案處理
    const handleAddProject = useCallback(async (name: string, description: string) => { 
        if (!userId || !authToken) {
            throw new Error("認證資訊缺失，請重新登入。");
        }
        try {
            await createProject(name, userId, description, authToken); 
            await loadProjects(); 
        } catch (error) {
            console.error("handleAddProject 失敗:", error);
            throw error; 
        }
    }, [userId, authToken, loadProjects]);

    // 專案卡片點擊處理
    const handleProjectClick = (project: ProjectData) => {
        setCurrentProject(project); 
        setIsViewModalOpen(true); 
    };

    // 確認進入專案頁面處理
    const handleConfirmEnterProject = (project: ProjectData) => {
        const projectId = project.id;
        localStorage.setItem('currentProjectId', projectId.toString()); 
        setIsViewModalOpen(false); 
        setCurrentProject(null);
        router.push('/tai_sort');
    };

    // 載入中狀態顯示
    if (isLoading && userId && authToken) {
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
        <div className="p-8 bg-gray-50 min-h-screen font-sans">
            <AuthHeader />
            <h1 className="pt-20 text-center text-4xl font-extrabold mb-8 text-gray-900 pb-2">
                我的專案儀表板
            </h1>

            <div className="grid gap-6 sm:gap-8 auto-rows-fr grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 max-w-7xl mx-auto">

                {/* 新增專案卡片 */}
                <div
                    className="p-4 h-48 rounded-2xl border-4 border-dashed border-gray-300 hover:border-blue-500 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between items-center text-gray-500 hover:text-blue-600 bg-white"
                    onClick={() => setIsAddModalOpen(true)}
                >
                    <div className="flex-grow flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <div className="text-center pt-2 border-t border-gray-200 w-full">
                        <p className="text-lg font-semibold">新增專案</p>
                    </div>
                </div>

                {/* 專案列表 */}
                {projects.map((project, index) => (
                    <ProjectCard
                        key={project.id}
                        index={projects.length - index}
                        projectName={project.name || `未命名專案 ${index + 1}`}
                        projectDescription={project.description || ''} 
                        onClick={() => handleProjectClick(project)}
                    />
                ))}

            </div>
            
            {/* 底部按鈕 */}
            <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-40 p-4">
                <button
                    onClick={() => router.push('/history')}
                    className={`
                        w-auto py-3 px-6 text-lg font-semibold rounded-full 
                        bg-white text-indigo-600 shadow-2xl border border-indigo-300 
                        transition duration-150 ease-in-out 
                        hover:bg-indigo-50 active:bg-indigo-100
                        focus:outline-none focus:ring-4 focus:ring-indigo-300
                        flex items-center space-x-2
                    `}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-1m3 1v-2m3 2v-3M19 9h-9m0 0a4 4 0 10-8 0 4 4 0 008 0z" />
                    </svg>
                    <span>檢視先前報告</span>
                </button>
            </div>

            {/* 新增專案 Modal */}
            <AddProjectModal
                isModalOpen={isAddModalOpen} 
                closeModal={() => setIsAddModalOpen(false)}
                onAddProject={handleAddProject}
                currentProjectCount={projects.length}
            />

            {/* 查看/編輯專案 Modal */}
            <ViewProjectModal
                isModalOpen={isViewModalOpen}
                closeModal={() => {
                    setIsViewModalOpen(false);
                    setCurrentProject(null);
                }}
                projectData={currentProject}
                onConfirm={handleConfirmEnterProject}
                reloadProjects={loadProjects} 
                authToken={authToken} // 傳遞 token
            />
        </div>
    );
};

export default Home;