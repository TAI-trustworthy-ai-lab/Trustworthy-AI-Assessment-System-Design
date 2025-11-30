import { REPORT_API_BASE } from '@/config/apiConfig';

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
        // 拋出結構化錯誤
        throw new Error(JSON.stringify({ 
            status: response.status, 
            message: errorData.message || 'API 請求失敗' 
        }));
    }
    
    return response.json();
}

// GET get the report from bckend
export const fetchReport = async (responseId: number): Promise<any> => {
    const url = `${REPORT_API_BASE}/response/${responseId}`; 
    const result = await fetchApi(url, { method: 'GET' });
    console.log(result)

    const reportData = result.data; 

    // backend would return 0-1 but we will show 0-100
    if (reportData && reportData.radarData) {
        const convertedRadarData: Record<string, number | string> = {};
        for (const key in reportData.radarData) {
            if (reportData.radarData.hasOwnProperty(key)) {
                const score = reportData.radarData[key];
                if (score === -1) {
                    convertedRadarData[key] = key.toLowerCase();
                } else {
                    convertedRadarData[key] = reportData.radarData[key] * 100;
                }
            }
        }
        reportData.radarData = convertedRadarData;
    }
    
    if (reportData && typeof reportData.overallScore === 'number') {
        reportData.overallScore = reportData.overallScore * 100;
    }
    reportData.overallScore = reportData.overallScore || 0;

    return reportData;
};

// GET get report from bckend
export const generatePdf = async (responseId: number): Promise<Blob> => {
    const userToken = localStorage.getItem('authToken');
    const url = `${REPORT_API_BASE}/generate-pdf/${responseId}`; 

    const headers = {
        ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
    };

    const response = await fetch(url, {
        method: 'GET',
        headers: headers,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(JSON.stringify({
            status: response.status,
            message: errorText || `PDF API 呼叫失敗: ${response.statusText}`,
        }));
    }

    return response.blob();
};
