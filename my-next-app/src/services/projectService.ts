import { PROJECT_API_BASE } from "@/config/apiConfig";

// ----------------------------------------------------
//   類型定義 TYPE INITIATE (type from bckend)
// ----------------------------------------------------
export interface TaiOrder {
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
//   統一的 fetch 函式 FETCH FUNCTION
// ----------------------------------------------------
function fetchWithRetry<T>(url: string, options: RequestInit = {}, authToken: string | null = null): Promise<T> {
    // Try 2 times (1 attempt and 1 retry)
    const MAX_ATTEMPTS = 2;
    const attemptFetch = (attempt: number): Promise<T> => {
        return fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
        })

            .then(response => response.json().then(result => ({ response, result })))
            .then(({ response, result }) => {

                if (!response.ok) {
                    const errorMessage = result.error || result.message || `HTTP 錯誤! 狀態碼: ${response.status}`;
                    const errorToThrow = new Error(JSON.stringify({
                        status: response.status,
                        message: errorMessage
                    }));
                    
                    if (attempt < MAX_ATTEMPTS) {
                        console.warn(`API 請求失敗 (${url})，嘗試重試 ${attempt + 1}/${MAX_ATTEMPTS}。錯誤: ${errorMessage}`);
                        throw new Error(`RETRY_NEEDED: ${errorMessage}`);
                    }
                    console.error(`API 請求最終失敗 (${url}):`, errorMessage);
                    throw errorToThrow;
                }

                return result.data as T;
            })
            .catch(error => {
                if (attempt < MAX_ATTEMPTS && (error.message.includes('Failed to fetch') || error.message.includes('RETRY_NEEDED'))) {
                    return attemptFetch(attempt + 1);
                }
                if (error.message.includes('{"status"')) {
                    throw error;
                }
                console.error(`API 請求最終失敗 (${url}):`, error.message);
                throw error;
            });
    };

    return attemptFetch(1);
}


// ----------------------------------------------------
//   API 函數  API FUNCTION FROM BCKEND
// ----------------------------------------------------

// 1. GET project list
export const fetchProjects = async (userId: string, authToken: string): Promise<ProjectData[]> => {
    const url = `${PROJECT_API_BASE}/user/${userId}`;
    return fetchWithRetry<ProjectData[]>(url, { method: 'GET' }, authToken);
};

// 2. POST create new project
export const createProject = async (name: string, userId: string, description: string, authToken: string): Promise<ProjectData> => {
    const url = `${PROJECT_API_BASE}/`;
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

// 3. DELETE delete project
export const deleteProject = async (projectId: number, authToken: string): Promise<void> => {
    const url = `${PROJECT_API_BASE}/${projectId}`;
    await fetchWithRetry<any>(url, {
        method: 'DELETE',
    }, authToken);
};