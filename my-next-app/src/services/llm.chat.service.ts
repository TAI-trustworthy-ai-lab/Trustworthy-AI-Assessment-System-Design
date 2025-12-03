// src/services/llm.chat.service.ts

// 根據您的 Docker 映射，後端 API 應運行在 3001 端口
const BACKEND_API_URL = 'http://localhost:3001/api/llm/chat';

// 定義後端成功回應的結構
interface SuccessResponse {
    response: string; // LLM 的完整回答字串
}

// 定義後端錯誤回應的結構
interface ErrorResponse {
    error: string;
    details?: string;
}

/**
 * 負責呼叫後端 LLM 代理 API，並取得完整的文字回應。
 * @param message 使用者輸入的文字
 * @returns 包含 LLM 完整回答字串的 Promise
 */
export async function getLlmResponse(message: string): Promise<string> {
    if (!message.trim()) {
        throw new Error('Message cannot be empty.');
    }

    try {
        const response = await fetch(BACKEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // 傳送給後端的 payload 結構：{ message: "..." }
            body: JSON.stringify({ message: message }),
        });

        const data: SuccessResponse | ErrorResponse = await response.json();

        if (!response.ok) {
            // 處理非 200 狀態碼 (如 400, 500)
            const errorData = data as ErrorResponse;
            // 拋出包含後端錯誤訊息的錯誤
            const errorMsg = errorData.error || 'Unknown error from backend.';
            throw new Error(`LLM Request Failed (${response.status}): ${errorMsg}`);
        }

        // 成功，回傳 LLM 回應字串
        return (data as SuccessResponse).response;

    } catch (error) {
        console.error('Network or Parsing Error:', error);
        // 如果是網路錯誤（例如後端伺服器未運行或地址錯誤）
        throw new Error(`Connection Error: Unable to reach LLM proxy server.`);
    }
}