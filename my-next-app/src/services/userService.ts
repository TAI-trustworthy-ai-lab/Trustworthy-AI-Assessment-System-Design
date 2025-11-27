import { USER_API_BASE } from "@/config/apiConfig"; 

interface LoginPayload {
    email: string;
    password: string;
}

interface RegisterPayload extends LoginPayload {
    name: string;
}

// 統一的 fetch 函數（可選，用於處理通用標頭、錯誤處理等）
async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const url = `${USER_API_BASE}${endpoint}`;
    
    const defaultHeaders = {
        "Content-Type": "application/json",
    };
    
    const response = await fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify({ 
            status: response.status, 
            message: errorData?.error?.message || 'Unknown API Error' 
        }));
    }

    return response.json();
}

// 1. 登入 API 函數
export async function login(payload: LoginPayload) {
    return apiFetch("/login", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

// 2. 註冊 API 函數
export async function register(payload: RegisterPayload) {
    return apiFetch("/signup", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}