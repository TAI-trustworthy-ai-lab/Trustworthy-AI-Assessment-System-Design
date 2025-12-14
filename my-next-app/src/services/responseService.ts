import { 
    QUESTIONNAIRE_API_BASE, 
    RESPONSE_API_BASE, 
    REPORT_API_BASE 
} from '@/config/apiConfig';

// reminder: for those answers that have multiple option
// the AnswerData is seperated
export interface AnswerData{
  id: number,
  responseId: number,
  questionId: number,
  optionId: number,
  value?: number,
  textValue?: string,
  createdAt: string,
  question: {
    id: number,
    text: string,
    category: string,
    type: string
  },
  option: {
    id: number,
    text?: string,
    value?: number
  }
}

export interface ResponseMeta{
  id: number,
  userId: number,
  projectId: number,
  versionId: number,
  submittedAt: string,
  label?: string,
  project: {
    id: number,
    name: string
  },
  version: {
    id: number,
    title: string
  }
}

export interface ResponseData{
  id: number,
  userId: number,
  projectId: number,
  versionId: number,
  submittedAt: string,
  label?: string,
  user: {
    id: number,
    name: string,
    email: string
  },
  project: {
    id: number,
    name: string
  },
  version: {
    id: number,
    title: string
  },
  answers: AnswerData[]
}

export enum ViewerState{
  loading     = 1 << 0,
  fail        = 1 << 1,
  success     = 1 << 2,
  editing     = 1 << 3,
  dirty       = 1 << 4,
  detail      = 1 << 5,
  noReport    = 1 << 6,
  report      = 1 << 7,
  translating = 1 << 8,
}

// fetch 函數  FETCH FUNCTION
export async function fetchApi(url: string, options: RequestInit = {}) {
    const userToken = localStorage.getItem('authToken');

    const headers = {
        'Content-Type': 'application/json',
        ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
        ...options.headers,
    };
    
    const response = await fetch(url, { ...options, headers });
    
    // 關鍵修改：允許 204 通過！（204 是合法成功）
    const isSuccess = response.ok || response.status === 204;

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(JSON.stringify({ 
            status: response.status, 
            message: errorData.message || 'API 請求失敗' 
        }));
    }

    // 204 通常沒有 body，直接回傳空物件或 null 即可
    if (response.status === 204) {
        return {};
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
export const saveDraft = async (payload: unknown, draftId: number | null) => {
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
export const submitQuestionnaire = async (payload: unknown) => {
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
    try {
        await fetchApi(url, { method: 'POST' });
        return true;
    } catch (error) {
        console.error('Error generating report:', error);
        return false;
    }
};

export async function fetchResponseList(userId: string, authToken: string): Promise<ResponseMeta[]>{
  if (!userId || userId === 'fallback-user-id') {
    console.warn('用戶 ID 無效，無法獲取回覆。');
    return [];
  }
  const url = `${RESPONSE_API_BASE}/user/${userId}`;
  return fetchWithRetry<ResponseMeta[]>(url, { method: 'GET' }, authToken);
};

export async function deleteResponse(userId: string, authToken: string, id: number){
  if (!userId || userId === 'fallback-user-id') {
    console.warn('用戶 ID 無效，無法獲取回覆。');
    return;
  }
  if (!authToken || authToken === 'fallback-auth-token') {
    throw new Error('認證失敗：未提供有效的 authToken。');
  }
  const url = `${RESPONSE_API_BASE}/${id}`;
  const options = { method: 'DELETE' }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    const result: { error?: string, message?: string } = await response.json();

    if (!response.ok) {
      const errorMessage = result.error || result.message || `HTTP 錯誤! 狀態碼: ${response.status}`;
      throw errorMessage;
    }
  } catch (e) {
    console.error(`API 請求最終失敗 (${url}):`, e); 
    throw e
  }
};

export async function updateResponse(id: number, updatePayload: { answers: unknown }) {
    const authToken = localStorage.getItem('authToken');

    if (!authToken || authToken === 'fallback-auth-token') {
        throw new Error('認證失敗：未提供有效的 authToken。請重新登入。');
    }
    
    // 2. 構建 URL
    const url = `${RESPONSE_API_BASE}/${id}`;
    const options = { method: 'PATCH' }
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatePayload) 
        });

        const result: { id?: number, error?: string, message?: string } = await response.json();

        if (!response.ok) {
            const errorMessage = result.error || result.message || `HTTP 錯誤! 狀態碼: ${response.status}`;
            throw errorMessage;
        }
        return result; 
        
    } catch (e) {
        console.error(`API 請求最終失敗 (${url}):`, e); 
        throw e
    }
};

export function fetchResponse(userId: string, authToken: string, id: number){
  if (!userId || userId === 'fallback-user-id') {
    console.warn('用戶 ID 無效，無法獲取回覆。');
    return null;
  }
  const url = `${RESPONSE_API_BASE}/id/${id}`;
  return fetchWithRetry<ResponseData>(url, { method: 'GET' }, authToken);
};

export async function fetchWithRetry<T>(url: string, options: RequestInit = {}, authToken: string | null = null): Promise<T>{
  if (!authToken || authToken === 'fallback-auth-token') {
    throw new Error('認證失敗：未提供有效的 authToken。');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const result: { data?: T, error?: string, message?: string } = await response.json();

    if (!response.ok) {
      const errorMessage = result.error || result.message || `HTTP 錯誤! 狀態碼: ${response.status}`;
      throw new Error(errorMessage);
    }

    // 確保回傳的是 data 欄位
    //console.error(result.data as T)
    return result.data as T; 
  } catch (error) {
    console.error(`API 請求最終失敗 (${url}):`, error);
    throw error; 
  }
}