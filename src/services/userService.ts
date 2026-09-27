import { USER_API_BASE } from "@/config/apiConfig"; 

// ----------------------------------------------------
// Payload Type Definitions
// ----------------------------------------------------
interface LoginPayload {
    email: string;
    password: string;
}

interface RegisterPayload extends LoginPayload {
    name: string;
}

interface ResendPayload {
    email: string;
}


// ----------------------------------------------------
// Universal Fetch API Utility
// Handles headers, response check, and structured error throwing.
// ----------------------------------------------------
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
        // Attempt to read structured error message
        const errorData = await response.json();
        // Throw structured error object
        throw new Error(JSON.stringify({ 
            status: response.status, 
            message: errorData?.error?.message || 'Unknown API Error' 
        }));
    }

    console.log(response);
    return response.json(); // Return parsed JSON data
}

// ----------------------------------------------------
// User API Functions
// ----------------------------------------------------

// 1. User Login (POST /login)
export async function login(payload: LoginPayload) {
    return apiFetch("/login", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

// 2. User Registration (POST /register)
export async function register(payload: RegisterPayload) {
    return apiFetch("/register", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

// 3. Resend Verification Email (POST /resend-verification)
export async function resend(payload: ResendPayload) {
    return apiFetch("/resend-verification", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}