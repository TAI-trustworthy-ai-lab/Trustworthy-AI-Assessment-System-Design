"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AuthHeader from '@/components/AuthHeader';
import { useTranslation } from 'react-i18next';
// ✅ 新增：從 next/navigation 引入 useRouter
import { useRouter } from 'next/navigation';
import { createQuestionnaire, deleteQuestionnaire, fetchAllQuestionnaires, duplicateQuestionnaire, updateQuestionnaireVersion } from '@/services/questionnaireService';
import ResponseViewer from "@/app/admin/QuestionnaireEditor";
import { ViewerState } from "@/services/responseService";

// API 常量
const API_BASE_URL = "http://localhost:3001/api";
const USER_LIST_API_URL = `${API_BASE_URL}/user`;
const LOGIN_API_URL = `${API_BASE_URL}/user/login`;

// localStorage Key 常量
const AUTH_TOKEN_KEY = 'authToken';
const USER_ID_KEY = 'userId';
const USER_ROLE_KEY = 'userRole';
const ADMIN_ROLE = 'ADMIN';

// ----------------------------------------------------
// 1. 數據類型定義
// ----------------------------------------------------

interface UserResponse {
    id: number;
    name?: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
}


// ----------------------------------------------------
// 3. 完整儀表板元件
// ----------------------------------------------------

export default function AdminDashboard() {
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [listLoading, setListLoading] = useState<boolean>(true);
    const [listError, setListError] = useState<string | null>(null);
    const { i18n, t } = useTranslation();
    const [questionnaires, setQuestionnaires] = useState<any[]>([]);
    const [qLoading, setQLoading] = useState(false);
    const [qError, setQError] = useState<string | null>(null);
    // ✅ 新增：追蹤初始化狀態
    const [isInitialized, setIsInitialized] = useState(false);
    // ✅ 新增：獲取 router 實例
    const router = useRouter();


    // 格式化日期時間顯示
    const formatDateTime = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('zh-TW');
        } catch (e) {
            return dateString;
        }
    };

    // 獲取當前登入狀態
    const checkLoginStatus = useCallback(() => {
        if (typeof window !== 'undefined') {
            const role = localStorage.getItem(USER_ROLE_KEY);
            setCurrentUserRole(role);
            // ✅ 在檢查完畢後設置為已初始化
            setIsInitialized(true);
        }
        setListLoading(false);
    }, []);

    // 登出處理
    const handleLogout = () => {
        localStorage.clear();
        setCurrentUserRole(null);
        setUsers([]);
        setListLoading(false);
        setListError(null);
        // 通常這裡會用 router.replace('/') 跳轉到登入頁，這裡僅清理狀態
        // ✅ 立即導向登入頁
        router.replace('/login');
    };

    // 獲取所有用戶列表
    const fetchUsers = useCallback(async () => {
        if (currentUserRole !== ADMIN_ROLE) {
            setListError(t('adminPage.notAdminCannotFetchUsers'));
            setListLoading(false);
            return;
        }

        setListLoading(true);
        setListError(null);

        const authToken = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!authToken) {
            setListError(t('adminPage.missingToken'));
            setListLoading(false);
            return;
        }

        try {
            const response = await fetch(USER_LIST_API_URL, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (response.status === 401 || response.status === 403) {
                setListError(t('adminPage.tokenInvalidOrForbidden'));
                handleLogout(); // 失敗則強制登出
                return;
            } else if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || t('adminPage.unknownServerError'));
            } else {
                const responseBody = await response.json();
                const data: UserResponse[] = responseBody.data || [];
                setUsers(data);
                setListLoading(false);
            }
        } catch (err) {
            setListError(`${t('adminPage.networkOrDataError')}: ${err instanceof Error ? err.message : String(err)}`);
            setListLoading(false);
        }
    }, [currentUserRole, router, t]);

    // 初始化：檢查登入狀態
    useEffect(() => {
        checkLoginStatus();
    }, [checkLoginStatus]);

    // 當角色狀態更新時，嘗試獲取用戶列表
    useEffect(() => {
        if (currentUserRole) {
            fetchUsers();
        }
    }, [currentUserRole, fetchUsers]);

    // 抓問卷資料
    const fetchQuestionnaires = async () => {
        setQLoading(true);
        setQError(null);
        try {
            const data = await fetchAllQuestionnaires();
            setQuestionnaires(data || []);
        } catch (err: any) {
            console.error("載入問卷失敗:", err);
            setQError(err.message || "未知錯誤");
        } finally {
            setQLoading(false);
        }
    };

    useEffect(() => {
        if (currentUserRole === ADMIN_ROLE) {
            // ✅ 修正：在呼叫 fetchQuestionnaires 之前，檢查 AUTH_TOKEN_KEY
            const authToken = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
            if (authToken) {
                fetchQuestionnaires();
            }
        }
    }, [currentUserRole]);

    const handleCreateQuestionnaire = async () => {
        const groupName = prompt(t('adminPage.enterGroupName'));
        if (!groupName) return;

        const title = prompt(t('adminPage.enterQuestionnaireTitle'));
        if (!title) return;

        const description = prompt(t('adminPage.enterQuestionnaireDescription')) || "";

        // ✅ 這裡先建立一份空問卷（沒有題目）
        const payload = {
            groupName,
            title,
            description,
            questions: [],
        };

        try {
            const status = await createQuestionnaire(payload);

            if (status === 201 || status === 200) {
                alert(t('adminPage.createSuccess'));
                fetchQuestionnaires(); // ✅ 刷新列表
            } else {
                alert(t('adminPage.createSuccessButStatusUnexpected') + status);
            }
        } catch (err: any) {
            console.error("建立問卷失敗:", err);
            alert(t('adminPage.createFailed') + (err.message || t('adminPage.unknownError')));
        }
    };


    // ------------------- 渲染 -------------------
    const isLoggedIn = !!currentUserRole;
    const isAdmin = currentUserRole === ADMIN_ROLE;
    const authToken = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;

    // ✅ Render Guard 1: 檢查初始化狀態 (仿照 homepage.tsx)
    if (!isInitialized) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-600">
                {t("homePage.loading.initializing")}
            </div>
        );
    }

    // ✅ Render Guard 2: 檢查登入/權限失敗 (仿照 homepage.tsx)
    if (!authToken || !isLoggedIn || !isAdmin) {
        let titleKey, messageKey, isForbidden = false;

        if (!authToken || !isLoggedIn) {
            // 登入訊息認證失敗（無 Token 或未登入）
            titleKey = "homePage.error.authFailedTitle";
            // 假設 adminPage.error.missingToken 是自定義的 i18n key
            messageKey = "adminPage.error.missingToken";
        } else if (!isAdmin) {
            // 管理員權限認證失敗
            titleKey = "adminPage.error.permissionDeniedTitle";
            // 假設 adminPage.error.notAdminCannotView 是自定義的 i18n key
            messageKey = "adminPage.error.notAdminCannotView";
            isForbidden = true;
        }

        return (
            <div className="p-8 bg-red-50 min-h-screen font-sans flex items-center justify-center">
                <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-2xl border border-red-200">
                    <h1 className="text-3xl font-bold mb-4 text-red-600 leading-tight">
                        {titleKey && t(titleKey)}
                    </h1>
                    <p className="text-red-500 text-lg mb-6 leading-relaxed">
                        {messageKey && t(messageKey)}
                    </p>
                    <button
                        onClick={() => router.replace("/login")}
                        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition duration-300 shadow-lg transform hover:scale-[1.01]"
                    >
                        {t("homePage.error.loginButton")}
                    </button>
                    {isForbidden && (
                        <p className="mt-4 text-center text-sm text-gray-500">
                            {t("adminPage.error.accessAttemptLogged")}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // ✅ Render Guard 3: 載入中狀態 (仿照 homepage.tsx)
    if (listLoading && !listError) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-600">
                <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    ></circle>
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                </svg>
                {t("adminPage.loadingDashboard")}
            </div>
        );
    }


    return (
        <div className="min-h-screen flex flex-col items-center bg-gray-100 p-8">
            <AuthHeader />
            <h1 className="pt-20 text-center text-4xl font-extrabold mb-8 text-gray-900 pb-2">
            </h1>
            <div className="w-full max-w-4xl flex justify-between items-center mb-10">
                <h1 className="text-4xl font-extrabold text-indigo-700">{t('adminPage.dashboardTitle')}</h1>
            </div>

            {/* 原本的 isAdmin 判斷可以保留，但外層的 Render Guard 已經處理了非 Admin 的情況 */}
            {isAdmin && (
                <div className="w-full max-w-4xl p-6 bg-white rounded-xl shadow-xl">
                    <h2 className="text-2xl font-bold mb-4 border-b pb-2 text-gray-800">
                        {currentUserRole === ADMIN_ROLE ? t('adminPage.allUsersList') : t('adminPage.permissionDenied')}
                    </h2>

                    {currentUserRole !== ADMIN_ROLE && (
                        <div className="p-4 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg font-medium">
                            {t('adminPage.notAllowedToViewUsers', { role: currentUserRole })}
                        </div>
                    )}

                    {currentUserRole === ADMIN_ROLE && (
                        <>
                            {/* listLoading 的處理已經被上面的 Render Guard 處理，這裡可以移除 listLoading 判斷，只留 listError */}

                            {listError && (
                                <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                                    **{t('adminPage.loadUsersFailed')} ** {listError}
                                </div>
                            )}

                            {!listLoading && !listError && users.length > 0 && (
                                <div className="overflow-x-auto mt-4">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-indigo-600 text-white">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Email</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('adminPage.role')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('adminPage.createdAt')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {users.map((user) => (
                                                <tr key={user.id} className="hover:bg-indigo-50 transition duration-150">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.email}</td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${user.role === ADMIN_ROLE ? 'text-red-600' : 'text-green-600'}`}>
                                                        {user.role}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDateTime(user.createdAt)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {!listLoading && !listError && users.length === 0 && (
                                <p className="p-4 text-center text-gray-500 border border-dashed rounded-lg mt-4">{t('adminPage.noUsersFound')}</p>
                            )}
                        </>
                    )}
                </div>
            )}
            {isAdmin && (
                <div className="w-full max-w-4xl mt-10">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-800">{t('adminPage.questionnaireManagement')}</h2>

                        <button
                            onClick={handleCreateQuestionnaire}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
                        >
                            {t('adminPage.addQuestionnaire')}
                        </button>
                    </div>

                    <QuestionnaireTable questionnaires={questionnaires} onRefresh={fetchQuestionnaires} />
                </div>
            )}

            <p className="mt-8 text-sm text-gray-500">
                {t('adminPage.backendReminder')}
            </p>


        </div>
    );
}

interface QuestionnaireTableProps {
    questionnaires: any[];
    onRefresh: () => void; // 新增一個回呼，用來刷新表格
}

const QuestionnaireTable: React.FC<QuestionnaireTableProps> = ({ questionnaires, onRefresh }) => {
    const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<any | null>(null);
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const { i18n, t } = useTranslation();

    const handleDuplicate = async (q: any) => {
        setLoadingId(q.id);
        try {
            const newTitle = `${q.title}（副本）`;
            const newDesc = `從 v${q.versionNumber} 複製而來的問卷版本`;
            await duplicateQuestionnaire(q.id, { title: newTitle, description: newDesc });
            // 成功後刷新表格
            onRefresh();
        } catch (err: any) {
            console.error("複製問卷失敗:", err);
            alert(err.message || t('adminPage.duplicateFailed'));
        } finally {
            setLoadingId(null);
        }
    };

    const handleDelete = async (q: any) => {
        if (!confirm(t('adminPage.confirmDeleteQuestionnaire', { title: q.title }))) return;

        try {
            await deleteQuestionnaire(q.id);
            alert(t('adminPage.deleteSuccess'));
            onRefresh();
        } catch (err: any) {
            console.error("刪除問卷失敗:", err);
            alert(err.message || t('adminPage.deleteFailed'));
        }
    };

    const handleToggleActive = async (q: any) => {
        const newState = !q.isActive;

        try {
            // PATCH 更新後端
            await updateQuestionnaireVersion(q.id, {
                title: q.title,
                description: q.description,
                isActive: newState,
            });

            alert(newState ? t('adminPage.activated') : t('adminPage.deactivated'));
            onRefresh(); // ✅ 刷新表格
        } catch (err: any) {
            console.error("更新啟用狀態失敗:", err);
            alert(err.message || t('adminPage.updateFailed'));
        }
    };


    return (
        <div className="overflow-x-auto mt-4">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-indigo-600 text-white">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('adminPage.groupName')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('adminPage.versionId')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('adminPage.versionNumber')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('adminPage.title')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('adminPage.activeStatus')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('adminPage.actions')}</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {questionnaires.map((q: any) => (
                        <tr key={q.id} className="hover:bg-indigo-50 transition duration-150">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {q.group?.name || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{q.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">v{q.versionNumber}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{q.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button
                                    onClick={() => handleToggleActive(q)}
                                    className={`px-3 py-1 rounded text-white font-semibold ${q.isActive ? "bg-green-600 hover:bg-green-700" : "bg-gray-500 hover:bg-gray-600"
                                        }`}
                                >
                                    {q.isActive ? t('adminPage.active') : t('adminPage.inactive')}
                                </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                                <button
                                    onClick={() => setSelectedQuestionnaire(q)}
                                    className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                >
                                    {t('adminPage.edit')}
                                </button>

                                <button
                                    onClick={() => handleDuplicate(q)}
                                    disabled={loadingId === q.id}
                                    className={`px-3 py-1 rounded text-white ${loadingId === q.id ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                                        }`}
                                >
                                    {loadingId === q.id ? t('adminPage.duplicating') : t('adminPage.duplicate')}
                                </button>

                                <button
                                    onClick={() => handleDelete(q)}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    {t('adminPage.delete')}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Modal for ResponseViewer */}
            {selectedQuestionnaire && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

                    {/* ✅ 固定在左上角的關閉鍵 */}
                    <button
                        onClick={() => setSelectedQuestionnaire(null)}
                        className="fixed top-4 left-4 px-4 py-2 bg-red-500 text-white rounded shadow-lg hover:bg-red-600 z-[100]"
                    >
                        {t('adminPage.close')}
                    </button>

                    <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-4xl p-6 overflow-y-auto max-h-[90vh] relative">
                        <ResponseViewer
                            curState={ViewerState.detail}
                            data={{
                                questionnaire: selectedQuestionnaire,
                                response: {
                                    answers: [],
                                    id: 0,
                                    userId: 0,
                                    projectId: 0,
                                    versionId: selectedQuestionnaire.id,
                                    submittedAt: "",
                                    user: { id: 0, name: "", email: "" },
                                    project: { id: 0, name: "" },
                                    version: { id: selectedQuestionnaire.id, title: selectedQuestionnaire.title },
                                },
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
