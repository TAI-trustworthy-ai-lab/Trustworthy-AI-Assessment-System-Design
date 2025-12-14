import { PROJECT_API_BASE } from "@/config/apiConfig";

// ----------------------------------------------------
// Type Definitions
// ----------------------------------------------------
// TAI Priority Order Structure
export interface TaiOrder {
    indicator: string;
    weight: number;
    rank: number;
}
// Main Project Data Structure
export interface ProjectData {
    id: number;
    name: string;
    description: string;
    taiOrders?: TaiOrder[]; // Optional TAI priority settings
    createdAt: string;
    updatedAt: string;
}

// ----------------------------------------------------
// Universal Fetch with Retry Logic
// ----------------------------------------------------
function fetchWithRetry<T>(url: string, options: RequestInit = {}, authToken: string | null = null): Promise<T> {
    // Max attempts (1 initial + 1 retry)
    const MAX_ATTEMPTS = 2;
    
    const attemptFetch = (attempt: number): Promise<T> => {
        return fetch(url, {
            ...options,
            // Add Authorization header
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
        })
            // Parse response body
            .then(response => response.json().then(result => ({ response, result })))
            .then(({ response, result }) => {

                if (!response.ok) {
                    const errorMessage = result.error || result.message || `HTTP Error! Status: ${response.status}`;
                    
                    // Throw structured error
                    const errorToThrow = new Error(JSON.stringify({
                        status: response.status,
                        message: errorMessage
                    }));
                    
                    // Check if retry is allowed
                    if (attempt < MAX_ATTEMPTS) {
                        console.warn(`API 請求失敗 (${url})，嘗試重試 ${attempt + 1}/${MAX_ATTEMPTS}。錯誤: ${errorMessage}`);
                        throw new Error(`RETRY_NEEDED: ${errorMessage}`);
                    }
                    console.error(`API 請求最終失敗 (${url}):`, errorMessage);
                    throw errorToThrow; // Final failure
                }

                return result.data as T; // Return data field on success
            })
            .catch(error => {
                // Retry condition: Network error or explicit RETRY_NEEDED signal
                if (attempt < MAX_ATTEMPTS && (error.message.includes('Failed to fetch') || error.message.includes('RETRY_NEEDED'))) {
                    return attemptFetch(attempt + 1);
                }
                // Re-throw if it's a structured API error or final network error
                if (error.message.includes('{"status"') || attempt === MAX_ATTEMPTS) {
                    throw error;
                }
                console.error(`API 請求最終失敗 (${url}):`, error.message);
                throw error;
            });
    };

    return attemptFetch(1); // Start with attempt 1
}


// ----------------------------------------------------
// Project API Functions
// ----------------------------------------------------

// 1. Fetch User's Project List (GET /project/user/{userId})
export const fetchProjects = async (userId: string, authToken: string): Promise<ProjectData[]> => {
    const url = `${PROJECT_API_BASE}/user/${userId}`;
    return fetchWithRetry<ProjectData[]>(url, { method: 'GET' }, authToken);
};

// 2. Create New Project (POST /project/)
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

// 3. Delete Project (DELETE /project/{projectId})
export const deleteProject = async (projectId: number, authToken: string): Promise<void> => {
    const url = `${PROJECT_API_BASE}/${projectId}`;
    await fetchWithRetry<any>(url, {
        method: 'DELETE',
    }, authToken);
};

// 4. Fetch Single Project Details (GET /project/{id})
export const fetchProject = async (userId: string, authToken: string, id: number): Promise<ProjectData> => {
    const url = `${PROJECT_API_BASE}/${id}`;
    return fetchWithRetry<ProjectData>(url, { method: 'GET' }, authToken);
};
