import { REPORT_API_BASE } from '@/config/apiConfig';

// Universal Fetch Helper with Auth Header
async function fetchApi(url: string, options: RequestInit = {}) {
    // Get auth token from local storage
    const userToken = localStorage.getItem('authToken');

    const headers = {
        'Content-Type': 'application/json',
        ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
        ...options.headers,
    };
    
    // Perform fetch request
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        
        // Throw structured error object
        throw new Error(JSON.stringify({ 
            status: response.status, 
            message: errorData.message || 'API 請求失敗' 
        }));
    }
    
    // Return parsed JSON data
    return response.json();
}

// Fetch Report Data by Response ID
export const fetchReport = async (responseId: number): Promise<any> => {
    const url = `${REPORT_API_BASE}/response/${responseId}`; 
    const result = await fetchApi(url, { method: 'GET' });
    console.log(result)

    const reportData = result.data; 

    // Convert Radar Data scores from 0-1 range to 0-100 range
    if (reportData && reportData.radarData) {
        const convertedRadarData: Record<string, number | string> = {};
        for (const key in reportData.radarData) {
            if (reportData.radarData.hasOwnProperty(key)) {
                const score = reportData.radarData[key];
                // Handle special value -1 (Not Applicable)
                if (score === -1) {
                    convertedRadarData[key] = "不適用"; 
                } else {
                    // Convert score from 0-1 to 0-100
                    convertedRadarData[key] = reportData.radarData[key] * 100;
                }
            }
        }
        reportData.radarData = convertedRadarData;
    }
    
    // Convert Overall Score from 0-1 range to 0-100 range
    if (reportData && typeof reportData.overallScore === 'number') {
        reportData.overallScore = reportData.overallScore * 100;
    }
    // Default overall score to 0 if null/undefined
    reportData.overallScore = reportData.overallScore || 0;

    return reportData;
};
