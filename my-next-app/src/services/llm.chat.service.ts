// src/services/llm.chat.service.ts

// 根據您的 Docker 映射，後端 API 應運行在 3001 端口
const BACKEND_API_URL = 'http://localhost:3001/api/llm/chat';

interface SuccessResponse {
    response: string; 
}

interface ErrorResponse {
    error: string;
    details?: string;
}

// 定義前端傳送給後端的歷史訊息格式
export interface FrontendChatHistory {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * 呼叫後端 LLM 代理 API
 * @param message 使用者輸入的文字
 * @param history (新增) 對話歷史紀錄
 */
export async function getLlmResponse(
    message: string, 
    history: FrontendChatHistory[] = [] // <--- 新增參數
): Promise<string> {
    if (!message.trim()) {
        throw new Error('Message cannot be empty.');
    }

    try {
        const response = await fetch(BACKEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // 傳送 payload：包含 message 和 history
            body: JSON.stringify({ 
                message: message,
                history: history 
            }),
        });

        const data: SuccessResponse | ErrorResponse = await response.json();

        if (!response.ok) {
            const errorData = data as ErrorResponse;
            const errorMsg = errorData.error || 'Unknown error from backend.';
            throw new Error(`LLM Request Failed (${response.status}): ${errorMsg}`);
        }

        return (data as SuccessResponse).response;

    } catch (error) {
        console.error('Network or Parsing Error:', error);
        throw new Error(`Connection Error: Unable to reach LLM proxy server.`);
    }
}