"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AuthHeader from '@/components/AuthHeader';
import { useTranslation } from 'react-i18next';

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
// 2. 登入表單元件
// ----------------------------------------------------

const LoginComponent: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(LOGIN_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let defaultMessage = `登入失敗，狀態碼: ${response.status}`;
                
                // 處理常見錯誤
                if (response.status === 401) { defaultMessage = "憑證無效，請檢查電子郵件或密碼。"; } 
                else if (response.status === 404) { defaultMessage = "查無此帳戶或請求路徑錯誤。"; }

                throw new Error(defaultMessage);
            }

            // 登入成功！
            const data = await response.json();
            const token = data?.data?.token;
            const user = data?.data?.user;

            if (token && user?.id && user?.role) {
                // 💥 儲存所有必需資訊到 localStorage
                localStorage.setItem(AUTH_TOKEN_KEY, token);
                localStorage.setItem(USER_ID_KEY, user.id.toString());
                localStorage.setItem(USER_ROLE_KEY, user.role);

                setError(`✅ 登入成功！角色: ${user.role}`);
                setPassword('');
                
                // 通知父元件更新狀態
                onLoginSuccess(); 
            } else {
                throw new Error("登入成功但未收到完整的授權憑證或用戶資訊");
            }
        } catch (err) {
            console.error("登入失敗:", err);
            setError(err instanceof Error ? err.message : "發生未知錯誤");
            localStorage.clear(); // 確保錯誤時清除殘留的登入狀態
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-8 bg-white rounded-xl shadow-2xl border-t-4 border-indigo-600">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">🔐 管理員登入</h2>
            <form onSubmit={handleLogin}>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">電子郵件 (Email)</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="請輸入 Email"
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700">密碼 (Password)</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="請輸入密碼"
                    />
                </div>

                {error && (
                    <p className={`mb-4 p-3 rounded text-sm font-medium ${error.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-lg text-white font-bold transition duration-200 shadow-md ${
                        loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                >
                    {loading ? '驗證中...' : '登入'}
                </button>
            </form>
        </div>
    );
};

// ----------------------------------------------------
// 3. 完整儀表板元件
// ----------------------------------------------------

export default function AdminDashboard() {
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [listLoading, setListLoading] = useState<boolean>(true);
    const [listError, setListError] = useState<string | null>(null);
    const { i18n, t } = useTranslation();
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
    };
    
    // 獲取所有用戶列表
    const fetchUsers = useCallback(async () => {
        if (currentUserRole !== ADMIN_ROLE) {
            setListError("您不是管理員 (ADMIN)，無法獲取用戶列表。");
            setListLoading(false);
            return;
        }

        setListLoading(true);
        setListError(null);
        
        const authToken = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!authToken) {
            setListError("缺少認證 Token，請重新登入。");
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
                setListError('權限錯誤：Token 無效或後端 API 限制訪問 (401/403)。');
                handleLogout(); // 失敗則強制登出
                return;
            } else if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '未知伺服器錯誤');
            } else {
                const responseBody = await response.json();
                const data: UserResponse[] = responseBody.data || [];
                setUsers(data);
                setListLoading(false);
            }
        } catch (err) {
            setListError(`網絡錯誤或資料處理失敗: ${err instanceof Error ? err.message : String(err)}`);
            setListLoading(false);
        }
    }, [currentUserRole]);

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


    // ------------------- 渲染 -------------------
    const isLoggedIn = !!currentUserRole;

    return (
        <div className="min-h-screen flex flex-col items-center bg-gray-100 p-8">
            <AuthHeader />
            <h1 className="pt-20 text-center text-4xl font-extrabold mb-8 text-gray-900 pb-2">
                {t("homePage.dashboard.title")}
            </h1>
            <div className="w-full max-w-4xl flex justify-between items-center mb-10">
                <h1 className="text-4xl font-extrabold text-indigo-700">🌐 系統儀表板</h1>
                {isLoggedIn && (
                    <button
                        onClick={handleLogout}
                        className="px-6 py-2 bg-rose-600 text-white font-bold rounded-lg shadow-md hover:bg-rose-700 transition"
                    >
                        登出 ({currentUserRole})
                    </button>
                )}
            </div>

            {!isLoggedIn && (
                <LoginComponent onLoginSuccess={checkLoginStatus} />
            )}

            {isLoggedIn && (
                <div className="w-full max-w-4xl p-6 bg-white rounded-xl shadow-xl">
                    <h2 className="text-2xl font-bold mb-4 border-b pb-2 text-gray-800">
                        {currentUserRole === ADMIN_ROLE ? '👑 所有用戶列表' : '⚠️ 權限受限'}
                    </h2>
                    
                    {currentUserRole !== ADMIN_ROLE && (
                        <div className="p-4 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg font-medium">
                            抱歉！您當前的身份 ({currentUserRole}) 無權查看此列表。請使用 ADMIN 賬號登入。
                        </div>
                    )}

                    {currentUserRole === ADMIN_ROLE && (
                        <>
                            {listLoading && <p className="text-center text-indigo-600 p-4">正在加載用戶數據...</p>}
                            
                            {listError && (
                                <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                                    **🚨 數據加載失敗:** {listError}
                                </div>
                            )}

                            {!listLoading && !listError && users.length > 0 && (
                                <div className="overflow-x-auto mt-4">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-indigo-600 text-white">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Email</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">角色 (Role)</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">創建日期</th>
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
                                <p className="p-4 text-center text-gray-500 border border-dashed rounded-lg mt-4">目前資料庫中沒有用戶記錄。</p>
                            )}
                        </>
                    )}
                </div>
            )}
            
            <p className="mt-8 text-sm text-gray-500">
                * 請確保後端服務 (http://localhost:3001) 正在運行，Login API 響應格式正確。
            </p>
        </div>
    );
}
