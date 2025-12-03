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
