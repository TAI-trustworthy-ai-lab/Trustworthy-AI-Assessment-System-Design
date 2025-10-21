"use client";

import { useState, useEffect, useCallback } from "react";
import Header from '@/components/Header'; // 假設你依然需要 Header

// 定義使用者資料的類型，假設後端返回的資料包含 id, name, email
interface User {
  _id: string; // 假設你的 MongoDB ID 是 _id
  name: string;
  email: string;
  // 可以根據你的後端資料結構添加其他欄位
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 後端API基礎URL
  const BASE_URL = "http://localhost:3001/api/user";

  /**
   * 取得所有使用者資料 (Read)
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 根據你的 API 列表，GET /api/user 取得所有使用者
      const response = await fetch(BASE_URL); 

      if (!response.ok) {
        // 如果後端返回錯誤，嘗試解析錯誤訊息
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch users with status: ${response.status}`);
      }
      
      const data = await response.json();
      // 假設後端返回的是一個包含使用者陣列的物件，例如 { users: [...] }
      // 如果後端直接返回陣列，請使用 setUsers(data);
      setUsers(data.users || data); 
      setLoading(false);

    } catch (err) {
      console.error("Fetch Users Error:", err);
      setError(err instanceof Error ? err.message : "Failed to load user data.");
      setLoading(false);
    }
  }, []);

  // 組件載入時執行一次，取得使用者列表
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * 刪除使用者 (Delete)
   * @param id 要刪除的使用者 ID
   */
  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete user ID: ${id}?`)) {
      return;
    }
    
    setDeletingId(id); // 標記正在刪除的 ID
    setSuccess(null);
    setError(null);

    try {
      // 根據你的 API 列表，DELETE /api/user/{id} 刪除使用者
      const response = await fetch(`${BASE_URL}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete user with status: ${response.status}`);
      }

      // 刪除成功後，重新取得資料庫列表來更新表格
      setSuccess(`User with ID ${id} successfully deleted!`);
      await fetchUsers(); 

    } catch (err) {
      console.error("Delete Error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during deletion");
    } finally {
      setDeletingId(null);
    }
  };


  // 界面設計
  const titleLinkTarget = '/'; // 這裡可能要改成你的 Admin 頁面主目錄
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <Header titleHref={titleLinkTarget}>
        <div className='flex justify-end space-x-5 items-center'>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </Header>
      <div className="max-w-7xl mx-auto mt-20"> 
        <h1 className="text-3xl font-bold text-gray-900 mb-6">User Database Management</h1>

        {/* 訊息區塊 */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm" role="alert">
            <strong>Error:</strong> {error} 
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm" role="alert">
            <strong>Success:</strong> {success}
          </div>
        )}

        {/* 使用者表格 */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          {loading && users.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Loading user data...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length > 0 ? users.map((user) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user._id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {/* TODO: 這裡未來可以加入編輯 (Update) 按鈕 */}
                      <button
                        onClick={() => handleDelete(user._id)}
                        disabled={deletingId === user._id || loading}
                        className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {deletingId === user._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                )) : (
                    <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                            No users found in the database.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {/* 你提到你想要用來刪減增加賬號，所以這裡提供一個快速跳轉到註冊頁面的連結 */}
        <div className="mt-8 text-center">
             <a href="/" className="text-blue-600 hover:text-blue-800 font-medium">
                Go to Registration/Login Page to Create Account
             </a>
        </div>

      </div>
    </div>
  );
}