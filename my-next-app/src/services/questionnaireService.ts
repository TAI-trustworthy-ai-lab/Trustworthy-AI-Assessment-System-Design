import { QUESTIONNAIRE_API_BASE } from "@/config/apiConfig"; 

// API Endpoints
const QUESTIONNAIRE_LATEST_URL = `${QUESTIONNAIRE_API_BASE}/group/latest`; // Latest versions by group
const QUESTIONNAIRE_ALL_URL = `${QUESTIONNAIRE_API_BASE}/all`; // All questionnaire versions

// 1. Fetch Latest Questionnaires by Group (GET)
export const fetchLatestQuestionnaires = async () => {
    try {
        const response = await fetch(QUESTIONNAIRE_LATEST_URL, { 
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(JSON.stringify({ 
                status: response.status, 
                message: result.error || `HTTP error! Status: ${response.status}` 
            }));
        }
        return result.data; // Returns grouped latest versions
    } catch (error) {
        console.error("獲取最新問卷列表失敗 (Service):", error);
        throw error;
    }
};

// 2. Fetch All Questionnaire Versions (GET)
export const fetchAllQuestionnaires = async () => {
    try {
        const response = await fetch(QUESTIONNAIRE_ALL_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(JSON.stringify({
                status: response.status,
                message: result.error || `HTTP error! Status: ${response.status}`
            }));
        }

        return result.data?.items || []; // Returns all versions/items
    } catch (error) {
        console.error("獲取所有問卷列表失敗 (Service):", error);
        throw error;
    }
};

// 3. Create New Questionnaire (POST)
export const createQuestionnaire = async (payload: {
    groupName: string;
    title: string;
    questions: {
        text: string;
        description?: string;
        category: string;
        order: number;
        type: string;
        options: { text: string; value: number; order: number }[];
    }[];
}) => {
    try {
        const userToken = localStorage.getItem('authToken');
        const response = await fetch(QUESTIONNAIRE_API_BASE, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({})); // Safe JSON parse

        if (!response.ok) {
            throw new Error(JSON.stringify({
                status: response.status,
                message: result.error || `HTTP error! Status: ${response.status}`,
            }));
        }

        return response.status; // Return status code on success
    } catch (error) {
        console.error("建立問卷失敗 (Service):", error);
        throw error;
    }
};

// 4. Duplicate Existing Questionnaire Version (PUT)
export const duplicateQuestionnaire = async (
    id: number,
    payload: {
        title: string;
        description: string;
    }
) => {
    try {
        const userToken = localStorage.getItem('authToken');
        const url = `${QUESTIONNAIRE_API_BASE}/${id}/duplicate`;
        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(JSON.stringify({
                status: response.status,
                message: result.error || `HTTP error! Status: ${response.status}`,
            }));
        }

        // Return status code and new version data
        return {
            statusCode: response.status,
            data: result.data,
        };
    } catch (error) {
        console.error("複製問卷版本失敗 (Service):", error);
        throw error;
    }
};

// 5. Delete Questionnaire Version (DELETE)
export async function deleteQuestionnaire(id: number) {
    const userToken = localStorage.getItem('authToken');
    const url = `${QUESTIONNAIRE_API_BASE}/${id}`;
    const res = await fetch(url, {
        method: "DELETE",
        headers: {
            ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
        },
    });

    if (!res.ok) {
        throw new Error("刪除問卷失敗");
    }

    return res.json();
}

// 6. Update Questionnaire Version Details (PATCH)
export const updateQuestionnaireVersion = async (
    id: number,
    payload: {
        title: string;
        description: string;
        isActive: boolean;
    }
) => {
    try {
        const userToken = localStorage.getItem('authToken');
        const url = `${QUESTIONNAIRE_API_BASE}/${id}`;
        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(JSON.stringify({
                status: response.status,
                message: result.error || `HTTP error! Status: ${response.status}`,
            }));
        }

        // Return status code and updated data
        return {
            statusCode: response.status,
            data: result.data,
        };
    } catch (error) {
        console.error("複製問卷版本失敗 (Service):", error);
        throw error;
    }
};
