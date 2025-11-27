import { PROJECT_API_BASE } from "@/config/apiConfig";

interface TaiPriorityPayload {
    indicator: string;
    rank: number;
    weight: number;
}

// GET check whether have already done tai-sorting
export async function checkTaiStatus(projectId: string): Promise<any> {
    const url = `${PROJECT_API_BASE}/${projectId}/tai-priority?t=${Date.now()}`;
    
    const response = await fetch(url, { 
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(JSON.stringify({ 
            status: response.status, 
            message: errorData.message || `檢查 TAI 狀態失敗，狀態碼: ${response.status}`
        }));
    }
    
    return response.json();
}

// PUT create tai-sorting for this project
export async function saveTaiPriority(projectId: string, payload: TaiPriorityPayload[]): Promise<void> {
    const apiUrl = `${PROJECT_API_BASE}/${projectId}/tai-priority`;
    
    const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(JSON.stringify({ 
            status: response.status, 
            message: errorData.message || '請檢查後端日誌。' 
        }));
    }
    // 成功不返回 body !
}