// 假設您的 API 服務文件名為 'apiService.ts'
import {
  fetchApi,
} from '@/services/responseService';

// ----------------------------------------------------
// I. Mock 外部依賴
// ----------------------------------------------------

// 1. Mock global.fetch
const mockFetch = jest.fn();
// 由於 TypeScript 嚴格檢查，我們需要使用一個相容的類型斷言
global.fetch = mockFetch as typeof global.fetch; 

// 2. Mock localStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

// ----------------------------------------------------
// II. 測試數據和輔助函數
// ----------------------------------------------------

// 定義一個 Mock 響應的幫助函數，用於創建符合 Response 接口的 Mock 物件
// 修正了 'is not assignable to parameter of type Response' 的類型錯誤
const createMockResponse = (
    status: number,
    data: any, // 使用 any 確保可以傳遞 JSON 或錯誤物件
    ok: boolean = true,
    statusText: string = 'OK'
): Response => ({
    ok: ok,
    status: status,
    statusText: statusText,
    json: async () => data,
    text: async () => JSON.stringify(data),
    
    // 滿足 Response 接口要求的其他屬性
    headers: new Headers(),
    redirected: false,
    url: 'http://mock.url',
    type: 'default' as ResponseType,
    body: null,
    bodyUsed: false,
    clone: () => createMockResponse(status, data, ok, statusText) as unknown as Response,
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    formData: jest.fn(),
    trailer: Promise.resolve(new Headers()),
});

const mockData = { id: 1, name: 'Test Data' };
const mockToken = 'mock-auth-token-123';
const mockUrl = 'http://example.com/api/data';


describe('fetchApi', () => {
    
    // 在每個測試前清除 Mock 狀態和 localStorage
    beforeEach(() => {
        mockFetch.mockClear();
        mockLocalStorage.getItem.mockClear();
    });

    // ----------------------------------------------------
    // 成功測試案例
    // ----------------------------------------------------

    test('如果沒有 authToken 應該成功發送請求並返回 JSON 數據', async () => {
        // 模擬 localStorage 沒有 token
        mockLocalStorage.getItem.mockReturnValue(null);
        // 模擬 fetch 成功響應
        mockFetch.mockResolvedValueOnce(createMockResponse(200, mockData));
        
        const result = await fetchApi(mockUrl, { method: 'GET' });
        
        // 1. 檢查返回結果
        expect(result).toEqual(mockData);
        
        // 2. 檢查 fetch 是否被正確呼叫
        expect(mockFetch).toHaveBeenCalledWith(mockUrl, {
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'GET',
        });
    });

    test('如果存在 authToken 應該在 Header 中添加 Authorization', async () => {
        // 模擬 localStorage 返回 token
        mockLocalStorage.getItem.mockReturnValue(mockToken);
        // 模擬 fetch 成功響應
        mockFetch.mockResolvedValueOnce(createMockResponse(200, mockData));
        
        await fetchApi(mockUrl, { method: 'POST', body: JSON.stringify(mockData) });
        
        // 檢查 fetch 是否被呼叫，且包含正確的 Authorization Header
        expect(mockFetch).toHaveBeenCalledWith(mockUrl, {
            method: 'POST',
            body: JSON.stringify(mockData),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mockToken}`, // 驗證 Token 是否被添加
            },
        });
    });

    test('應該覆蓋默認的 Content-Type Header', async () => {
        mockLocalStorage.getItem.mockReturnValue(null);
        mockFetch.mockResolvedValueOnce(createMockResponse(200, mockData));
        
        const customHeader = { 'Content-Type': 'text/xml' };

        await fetchApi(mockUrl, { method: 'PUT', headers: customHeader });
        
        // 檢查 fetch 是否被呼叫，且 Content-Type 被覆蓋
        expect(mockFetch).toHaveBeenCalledWith(mockUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'text/xml', // 驗證 Content-Type 被覆蓋
            },
        });
    });

    // ----------------------------------------------------
    // 錯誤處理測試案例
    // ----------------------------------------------------

    test('當響應狀態碼為 401 時，應該拋出包含狀態碼和訊息的錯誤', async () => {
        const errorResponseBody = { message: 'Unauthorized access' };
        const expectedError = { status: 401, message: 'Unauthorized access' };

        // 模擬 fetch 失敗響應 (401)
        mockFetch.mockResolvedValueOnce(createMockResponse(401, errorResponseBody, false, 'Unauthorized'));

        // 檢查是否拋出錯誤
        await expect(fetchApi(mockUrl)).rejects.toThrow(JSON.stringify(expectedError));
    });

    test('當響應狀態碼為 500 且無錯誤體時，應該使用 statusText 作為錯誤訊息', async () => {
        const expectedError = { status: 500, message: 'Internal Server Error' };

        // 模擬 fetch 失敗響應 (500)
        // 這裡我們讓 response.json() 拋出錯誤 (模擬沒有 JSON 響應體)
        const mockResponseWithoutBody: Response = {
            ...createMockResponse(500, {}, false, 'Internal Server Error'),
            json: jest.fn().mockRejectedValue(new Error('no body')),
        } as unknown as Response; // 確保類型相容

        mockFetch.mockResolvedValueOnce(mockResponseWithoutBody);

        // 檢查是否拋出錯誤，且錯誤訊息是 statusText
        await expect(fetchApi(mockUrl)).rejects.toThrow(JSON.stringify(expectedError));
    });

    test('當響應狀態碼為 404 且錯誤體沒有 message 屬性時，應該使用默認錯誤訊息', async () => {
        const errorResponseBody = { code: 'NOT_FOUND' };
        const expectedError = { status: 404, message: 'API 請求失敗' };

        // 模擬 fetch 失敗響應 (404)
        mockFetch.mockResolvedValueOnce(createMockResponse(404, errorResponseBody, false, 'Not Found'));

        // 檢查是否拋出錯誤，且錯誤訊息是默認值
        await expect(fetchApi(mockUrl)).rejects.toThrow(JSON.stringify(expectedError));
    });
});