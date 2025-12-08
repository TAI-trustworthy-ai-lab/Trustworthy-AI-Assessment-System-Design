import { QUESTIONNAIRE_API_BASE } from "@/config/apiConfig"; 

const QUESTIONNAIRE_LATEST_URL = `${QUESTIONNAIRE_API_BASE}/group/latest`;
const QUESTIONNAIRE_ALL_URL = `${QUESTIONNAIRE_API_BASE}/all`;


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
        return result.data;
    } catch (error) {
        console.error("獲取最新問卷列表失敗 (Service):", error);
        throw error;
    }
};


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

        // 這裡回傳的是 result.data.items
        return result.data?.items || [];
    } catch (error) {
        console.error("獲取所有問卷列表失敗 (Service):", error);
        throw error;
    }
};

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

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(JSON.stringify({
                status: response.status,
                message: result.error || `HTTP error! Status: ${response.status}`,
            }));
        }

        // 回傳 statusCode
        return response.status;
    } catch (error) {
        console.error("建立問卷失敗 (Service):", error);
        throw error;
    }
};

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

        // 回傳完整物件與 statusCode
        return {
            statusCode: response.status,
            data: result.data,
        };
    } catch (error) {
        console.error("複製問卷版本失敗 (Service):", error);
        throw error;
    }
};

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


// 7. PUT 複製指定問卷版本
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

        // 回傳完整物件與 statusCode
        return {
            statusCode: response.status,
            data: result.data,
        };
    } catch (error) {
        console.error("複製問卷版本失敗 (Service):", error);
        throw error;
    }
};
