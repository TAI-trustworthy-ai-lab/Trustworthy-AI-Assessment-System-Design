"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from "next/navigation"
import AuthHeader from '@/components/AuthHeader';
import ProtectedLayout from '@/components/ProtectedLayout';

// =================================================================
// 1. API 配置與通用輔助函式 (API Configuration and Helper)
// =================================================================

const BASE_URL = "http://localhost:3001/api";
const MOCK_USER_ID = typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : 'fallback-user-id'; 
const MOCK_AUTH_TOKEN = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : 'fallback-auth-token'; 

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

const fetchWithRetry = async (url, options = {}, retries = 0) => {
    const currentToken = MOCK_AUTH_TOKEN;

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `HTTP error! Status: ${response.status}`);
        }

        // 請求成功，返回資料
        return result.data; 
    } catch (error) {
        if (retries < MAX_RETRIES) {
            const delay = INITIAL_BACKOFF_MS * Math.pow(2, retries) + Math.floor(Math.random() * 1000);
            console.warn(`API 請求失敗，嘗試第 ${retries + 1} 次重試，延遲 ${delay}ms...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retries + 1);
        }
        console.error(`API 請求在 ${MAX_RETRIES} 次重試後仍然失敗:`, error.message);
        throw error; // 最終失敗後拋出錯誤
    }
};

// GET api/project/user/{userID} ：獲取專案列表
const fetchProjects = async (userId) => {
    // 如果沒有 userId 或 token，則不執行請求
    if (!userId || userId === 'fallback-user-id') {
        console.warn('用戶 ID 無效，無法獲取專案。');
        return [];
    }
    const url = `${BASE_URL}/project/user/${userId}`;
    return fetchWithRetry(url, { method: 'GET' });
};

// POST api/project/ ：建立新專案
const createProject = async (name, userId, description) => {
    if (!userId || userId === 'fallback-user-id') {
        throw new Error('用戶 ID 無效，無法建立專案。');
    }
    const url = `${BASE_URL}/project/`;
    const body = {
        userId: parseInt(userId), 
        name: name,
        description: description, 
    };

    return fetchWithRetry(url, {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

// GET api/project/{projectID}/tai_sort ：檢查專案的 TAI Sort 狀態
const checkTaiSortStatus = async (projectId) => {
    if (!projectId) {
        throw new Error('Project ID is required for status check.');
    }
    const url = `${BASE_URL}/project/${projectId}/tai-priority`;
    
    // 注意：這裡假設後端成功時返回 { success: true, data: [...] }
    // 如果 data 是一個空陣列 []，表示沒有 tai_sort 數據
    const data = await fetchWithRetry(url, { method: 'GET' });
    
    // 返回數據陣列，讓 handleProjectClick 檢查它的長度
    return data; 
};



// =================================================================
// 2. 專案卡片元件 (Project Card Component) 
// =================================================================

const ProjectCard = ({ index, projectName, projectDescription, onClick }) => { 
    // 根據索引決定背景顏色
    const colors = [
        'bg-sky-400', 'bg-cyan-400', 'bg-blue-400', 'bg-indigo-400', 
        'bg-purple-400', 'bg-fuchsia-300', 'bg-pink-300', 'bg-rose-300', 
    ];
    const bgColor = colors[index % colors.length];

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
            {/* 卡片中間顯示數字 (排序) - NEW STRUCTURE */}
            <div className="text-up flex-grow flex items-center justify-center">
                <span className="text-6xl font-extrabold opacity-90">
                    {index}
                </span>
            </div>

            {/* 卡片底部顯示專案名稱和描述 */}
            <div className="text-left w-full border-t border-white/30">
                <p className="text-xl font-bold truncate" title={projectName}>
                    {projectName}
                </p>
                {/* 顯示專案描述，最多兩行 */}
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


// =================================================================
// 3. 新增專案 Modal (Add Project Modal) 
// =================================================================

const AddProjectModal = ({ isModalOpen, closeModal, onAddProject }) => {
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState(''); 
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null); 

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); 
        if (!projectName.trim()) return;

        setIsLoading(true);
        try {
            await onAddProject(projectName.trim(), projectDescription.trim()); 
            setProjectName('');
            setProjectDescription(''); // 清空描述
            closeModal();
        } catch (error) {
            console.error('新增專案失敗 (Modal 捕獲):', error);
            setError(`新增失敗: ${error.message}`); 
        } finally {
            setIsLoading(false);
        }
    };

    if (!isModalOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-100/50 backdrop-blur-sm">
            {/* Modal 內容框 */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-300">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">新增專案</h2>
                <p className="text-sm text-red-500 mb-4">
                    提醒您：專案一旦建立，將無法從此介面刪除。
                </p>
                {/* 錯誤提示 */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* 專案名稱輸入 */}
                    <input
                        type="text"
                        placeholder="請輸入專案名稱..."
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                        disabled={isLoading}
                        required
                    />

                    {/* 專案描述輸入 (新增) */}
                    <textarea
                        rows="3"
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
                            disabled={isLoading || !projectName.trim()}
                        >
                            {isLoading ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : null}
                            確認新增
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// =================================================================
// 4. 主要儀表板元件 (Main Dashboard Component) - 使用實際 API 函式
// =================================================================

const Project = () => {
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const userId = MOCK_USER_ID; 
    const router = useRouter();

    // 專門用於獲取專案清單的函式 (GET API)
    const loadProjects = useCallback(async () => {
        if (!userId || userId === 'fallback-user-id') return;
        
        setIsLoading(true);
        try {
            const data = await fetchProjects(userId);
            setProjects(data);
        } catch (error) {
            console.error("載入專案失敗:", error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // 1. 初始化載入專案
    useEffect(() => {
        if (userId && userId !== 'fallback-user-id') {
            loadProjects();
        } else {
             setIsLoading(false);
             console.warn("無法載入專案：localStorage 中未找到有效的 userId。");
        }
    }, [loadProjects, userId]);

    // 2. 新增專案處理函式 (POST API)
    const handleAddProject = useCallback(async (name, description) => { 
        try {
            const newProject = await createProject(name, userId, description); 
            await loadProjects();
        } catch (error) {
            console.error("handleAddProject 失敗:", error);
            throw error; 
        }
    }, [userId, loadProjects]);

    // 3. 專案卡片點擊處理
    const handleProjectClick = async (project) => {
        const projectId = project.id;
        localStorage.setItem('currentProjectId', projectId);
        try {
            const taiSortData = await checkTaiSortStatus(projectId);
            let targetRoute = '';
            if (!taiSortData || taiSortData.length === 0) {
                router.push('/tai_sort');
            } else {
                router.push('/choose_questionnaire');
            }
        } catch (error) {
            console.error("處理專案點擊失敗，無法檢查 tai_sort 狀態:", error.message);
        }
        
    };

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
    
    if (!userId || userId === 'fallback-user-id') {
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
                我的專案儀表板
            </h1>

            {/* 專案卡片網格佈局 */}
            <div className="grid gap-8 auto-rows-fr grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">

                {/* 1. 新增專案 (+) 框框 (永遠在左上角) */}
                <div
                    className="p-4 h-48 rounded-2xl border-4 border-dashed border-gray-300 hover:border-blue-500 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between items-center text-gray-500 hover:text-blue-600 bg-white"
                    onClick={() => setIsModalOpen(true)}
                >
                    {/* 中央 "+" Icon */}
                    <div className="flex-grow flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    {/* 底部文字 */}
                    <div className="text-center pt-2 border-t border-gray-200 w-full">
                        <p className="text-lg font-semibold">新增專案</p>
                    </div>
                </div>

                {/* 2. 專案清單卡片 */}
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
            {/* 新增專案 Modal */}
            <AddProjectModal
                isModalOpen={isModalOpen}
                closeModal={() => setIsModalOpen(false)}
                onAddProject={handleAddProject}
            />
        </div>
    </ProtectedLayout>
    );
};

export default Project;