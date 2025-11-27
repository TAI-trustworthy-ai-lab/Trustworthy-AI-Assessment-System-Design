import { 
    QUESTIONNAIRE_API_BASE, 
    RESPONSE_API_BASE, 
    REPORT_API_BASE 
} from '@/config/apiConfig';

// fetch 函數  FETCH FUNCTION
async function fetchApi(url: string, options: RequestInit = {}) {
    const userToken = localStorage.getItem('authToken');

    const headers = {
        'Content-Type': 'application/json',
        ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
        ...options.headers,
    };
    
    const response = await fetch(url, { ...options, headers });
    

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(JSON.stringify({ 
            status: response.status, 
            message: errorData.message || 'API 請求失敗' 
        }));
    }
    
    return response.json();
}

// 1. GET get questionnaire info (questions)
export const fetchQuestionnaire = async (questionnaireId: string | number) => {
    const url = `${QUESTIONNAIRE_API_BASE}/${questionnaireId}`;
    const result = await fetchApi(url, { method: 'GET' });
    return result.data;
};

// 2. POST / PATCH update user's answer
export const saveDraft = async (payload: any, draftId: number | null) => {
    const method = draftId ? 'PATCH' : 'POST';
    const url = draftId 
        ? `${RESPONSE_API_BASE}/${draftId}`
        : RESPONSE_API_BASE; 
    

    const result = await fetchApi(url, {
        method: method,
        body: JSON.stringify(payload),
    });
    return result.data;
};

// 3. GET get the draft from user
export const loadDraft = async (draftId: number) => {
    const url = `${RESPONSE_API_BASE}/${draftId}`;
    const result = await fetchApi(url, { method: 'GET' });
    return result.data;
};

// 4. POST sve the answer back to bckend
export const submitQuestionnaire = async (payload: any) => {
    const url = RESPONSE_API_BASE;
    const result = await fetchApi(url, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return result.data;
};

// 5. POST create report
export const generateReport = async (responseId: number) => {
    const url = `${REPORT_API_BASE}/generate/${responseId}`;
    await fetchApi(url, { method: 'POST' }); 
    return true;
};