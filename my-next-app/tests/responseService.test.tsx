// 假設您的 API 服務文件名為 'apiService.ts'
import {
  fetchApi,
  fetchQuestionnaire,
  saveDraft,
  loadDraft,
  submitQuestionnaire,
  generateReport,
  fetchResponseList,
  deleteResponse,
  updateResponse,
} from '@/services/responseService'; // 請根據您的文件路徑修改
import { ResponseData, ResponseMeta, ViewerState } from '@/services/responseService'; // 導入必要的類型/枚舉
import { QuestionnaireData } from '@/components/ResponseViewer';
import { TFunction } from 'i18next';
import { ProjectData } from '@/services/projectService';

// --- Mock 設置 ---

// Mock 全局的 fetch 函數

// 假設您在 Node 環境下使用 jest-fetch-mock 或類似工具
// 如果在瀏覽器環境下測試，可能需要手動將 global.fetch 設置為 mockFetch
// HistoryPage.test.tsx (頂部附近)

// ...

// Mock 瀏覽器 API
// ...

// 確保 mockFetch 類型正確 (使用 typeof window.fetch)
// ⚠️ 注意: 這裡的 mockFetch 應該是對應 translateText 中使用的 fetch 
const mockFetch = jest.fn(async () => {
    // 模擬成功的翻譯響應
    return {
        ok: true,
        json: async () => ({ translatedText: "Mocked Translation" }),
        text: async () => JSON.stringify({ translatedText: "Mocked Translation" }),
        // ... 添加其他需要的屬性以滿足 Response 介面
    } as Response; // 這裡斷言為 Response
});

// 使用 typeof window.fetch 類型斷言，這通常比 as any 更有說服力
global.fetch = mockFetch as typeof window.fetch;

// ...

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
});

// Mock 常量 (請根據您的實際值或測試值進行定義)
const QUESTIONNAIRE_API_BASE = '/api/questionnaires';
const RESPONSE_API_BASE = '/api/responses';
const REPORT_API_BASE = '/api/reports';

// 在測試文件中定義這些常量，以便於測試
// 實際應用中，您可能需要通過 mock 或注入方式將這些值帶入被測試的模塊中。
// 這裡假設它們可以被您的 apiService.ts 訪問到（例如通過環境變量或在同一個文件中）。

// 為了讓測試能運行，我們需要 Mock fetchWithRetry 的實現
// 由於 fetchWithRetry 在您的代碼中調用 fetch，我們可以直接 Mock fetch。
// 但是，為了簡化，我們可以在測試代碼中 Mock fetchWithRetry 的行為。
// 為了避免複雜的依賴問題，我們在這裡假設 apiService.ts 中所有使用 fetchWithRetry 的函數（fetchResponseList, fetchResponse）都可以被獨立測試。

// 如果 fetchWithRetry 是一個導出的函數：
jest.mock('./apiService', () => {
  const originalModule = jest.requireActual('./apiService');
  return {
    ...originalModule,
    // 這裡我們只 Mock fetchWithRetry，讓它在調用時使用我們控制的 fetch
    fetchWithRetry: jest.fn(async (url, options, authToken) => {
      // 這是 fetchWithRetry 的 Mock 實現
      if (!authToken || authToken === 'fallback-auth-token') {
        throw new Error('認證失敗：未提供有效的 authToken。');
      }

      // 由於我們已經 Mock 了 global.fetch，這裡直接調用 fetch 即可
      const response = await originalModule.fetchWithRetry(url, options, authToken);
      return response;
    }),
    // 為了讓其他函數能運行，我們需要 Mock 這些常量 (如果它們是在外部定義的)
    QUESTIONNAIRE_API_BASE: '/api/questionnaires',
    RESPONSE_API_BASE: '/api/responses',
    REPORT_API_BASE: '/api/reports',
  };
});

// 為了讓 `fetchWithRetry` 能夠正確 Mock，我們需要重新導入
// 如果您遇到循環依賴或其他問題，可能需要更精細的 Mock。
// 為了簡潔，這裡我們假設 `fetchWithRetry` 的 Mock 位於 `api.test.ts` 中。

// 重置 fetch Mock，確保每次測試都是乾淨的狀態
beforeEach(() => {
  mockFetch.mockClear();
  mockLocalStorage.clear();
});

// --- 輔助函數 ---

// 創建一個 Mock Response 對象
// 定義一個 Mock 響應的幫助函數
const createMockResponse = (
    status: number,
    data: ResponseData,
    ok: boolean = true,
    statusText: string = 'OK',
): Response => ({
    ok: ok,
    status: status,
    statusText: statusText,
    json: async () => data,

    // --- 新增: 滿足 Response 介面要求的缺失屬性 ---
    headers: new Headers(),
    redirected: false,
    url: '',
    type: 'default',
    body: null,
    bodyUsed: false,
    // 模擬 text() 方法，用於某些 API 錯誤或非 JSON 響應
    text: async () => JSON.stringify(data),

    // 模擬 clone() 方法，這是 Response 類型所必需的
    clone: () => createMockResponse(status, data, ok, statusText) as unknown as Response,
    arrayBuffer: function (): Promise<ArrayBuffer> {
        throw new Error('Function not implemented.');
    },
    blob: function (): Promise<Blob> {
        throw new Error('Function not implemented.');
    },
    bytes: function (): Promise<Uint8Array<ArrayBuffer>> {
        throw new Error('Function not implemented.');
    },
    formData: function (): Promise<FormData> {
        throw new Error('Function not implemented.');
    }
});

// --- 測試套件 ---

describe('API 服務測試', () => {
  // --- fetchApi 函數測試 ---
  describe('fetchApi', () => {
    const url = '/test-endpoint';
    const mockData:ResponseData = {
        id: 0,
      userId: 0,
      projectId: 0,
      versionId: 0,
      submittedAt: "",
      user: {
        id: 0,
        name: "string",
        email: "string"
      },
      project: {
        id: 3,
        name: "string"
      },
      version: {
        id: 2,
        title: "string"
      },
      answers: [] };

    test('應該成功發送請求並返回 JSON 數據 (無 token)', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockData));
      
      const result = await fetchApi(url, { method: 'GET' });
      
      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(url, {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'GET',
      });
    });

    test('應該包含 Authorization Bearer token (有 token)', async () => {
      const token = 'test-auth-token';
      localStorage.setItem('authToken', token);
      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockData));
      
      await fetchApi(url, { method: 'GET' });
      
      expect(mockFetch).toHaveBeenCalledWith(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        method: 'GET',
      });
    });

    test('應該在請求失敗時拋出錯誤 (404 帶有錯誤信息)', async () => {
      const errorData :ResponseData = {
        id: 0,
      userId: 0,
      projectId: 0,
      versionId: 0,
      submittedAt: "",
      user: {
        id: 0,
        name: "string",
        email: "string"
      },
      project: {
        id: 3,
        name: "string"
      },
      version: {
        id: 2,
        title: "string"
      },
      answers: [] };
      mockFetch.mockResolvedValueOnce(
        createMockResponse(404, errorData, false, 'Not Found')
      );

      await expect(fetchApi(url)).rejects.toThrow(
        JSON.stringify({
          status: 404,
          message: "errorData.message",
        })
      );
    });

    test('應該在請求失敗時拋出錯誤 (500 無法解析 body)', async () => {
      // 模擬一個無法解析 JSON 的響應
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      await expect(fetchApi(url)).rejects.toThrow(
        JSON.stringify({
          status: 500,
          message: 'Internal Server Error', // 使用 statusText 作為 fallback
        })
      );
    });
  });

  // --- fetchQuestionnaire 測試 ---
  describe('fetchQuestionnaire', () => {
    const questionnaireId = 123;
    const mockResult = { data: { id: questionnaireId, title: 'Test Q' } };

    // 這裡我們直接 Mock fetchApi 的結果
    // 更好的做法是 Mock global.fetch，但為了簡化對上層函數的測試，可以 Mock fetchApi
    const fetchApiSpy = jest.spyOn(
      require('./apiService'), // 再次引入以獲取 Mock 的模塊
      'fetchApi'
    ).mockResolvedValue(mockResult);

    afterAll(() => {
        fetchApiSpy.mockRestore(); // 恢復原始函數
    });

    test('應該使用 GET 方法調用 fetchApi 並返回 data', async () => {
      const result = await fetchQuestionnaire(questionnaireId);

      expect(fetchApiSpy).toHaveBeenCalledWith(
        `${QUESTIONNAIRE_API_BASE}/${questionnaireId}`,
        { method: 'GET' }
      );
      expect(result).toEqual(mockResult.data);
    });
  });

  // --- saveDraft 測試 ---
  describe('saveDraft', () => {
    const payload = { answers: ['a', 'b'] };
    const mockResult = { data: { id: 1, ...payload } };

    const fetchApiSpy = jest.spyOn(
        require('./apiService'),
        'fetchApi'
    ).mockResolvedValue(mockResult);

    afterAll(() => {
        fetchApiSpy.mockRestore();
    });

    test('無 draftId 時，應使用 POST 方法', async () => {
      await saveDraft(payload, null);

      expect(fetchApiSpy).toHaveBeenCalledWith(RESPONSE_API_BASE, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    });

    test('有 draftId 時，應使用 PATCH 方法', async () => {
      const draftId = 456;
      await saveDraft(payload, draftId);

      expect(fetchApiSpy).toHaveBeenCalledWith(
        `${RESPONSE_API_BASE}/${draftId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      );
    });
  });

  // --- loadDraft 測試 ---
  describe('loadDraft', () => {
    const draftId = 789;
    const mockResult = { data: { id: draftId, answers: ['x', 'y'] } };
    
    const fetchApiSpy = jest.spyOn(
        require('./apiService'),
        'fetchApi'
    ).mockResolvedValue(mockResult);

    afterAll(() => {
        fetchApiSpy.mockRestore();
    });

    test('應該使用 GET 方法調用 fetchApi 並返回 data', async () => {
      const result = await loadDraft(draftId);

      expect(fetchApiSpy).toHaveBeenCalledWith(
        `${RESPONSE_API_BASE}/${draftId}`,
        { method: 'GET' }
      );
      expect(result).toEqual(mockResult.data);
    });
  });

  // --- submitQuestionnaire 測試 ---
  describe('submitQuestionnaire', () => {
    const payload = { finalAnswer: 'yes' };
    const mockResult = { data: { id: 101, ...payload } };

    const fetchApiSpy = jest.spyOn(
        require('./apiService'),
        'fetchApi'
    ).mockResolvedValue(mockResult);

    afterAll(() => {
        fetchApiSpy.mockRestore();
    });

    test('應該使用 POST 方法調用 fetchApi 並返回 data', async () => {
      const result = await submitQuestionnaire(payload);

      expect(fetchApiSpy).toHaveBeenCalledWith(RESPONSE_API_BASE, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(mockResult.data);
    });
  });

  // --- generateReport 測試 ---
  describe('generateReport', () => {
    const responseId = 202;
    const fetchApiSpy = jest.spyOn(
        require('./apiService'),
        'fetchApi'
    );

    afterAll(() => {
        fetchApiSpy.mockRestore();
    });

    test('請求成功時，應返回 true', async () => {
      fetchApiSpy.mockResolvedValueOnce({});
      const result = await generateReport(responseId);

      expect(fetchApiSpy).toHaveBeenCalledWith(
        `${REPORT_API_BASE}/generate/${responseId}`,
        { method: 'POST' }
      );
      expect(result).toBe(true);
    });

    test('請求失敗時，應返回 false 並輸出錯誤', async () => {
      // Mock console.error 避免測試時輸出干擾
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      fetchApiSpy.mockRejectedValueOnce(new Error('API Error'));
      const result = await generateReport(responseId);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error generating report:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });

  // --- fetchResponseList 測試 (依賴 fetchWithRetry) ---
  describe('fetchResponseList', () => {
    const userId = 'user-123';
    const authToken = 'valid-token';
    const mockData = [{ id: 0,
      userId: 0,
      projectId: 0,
      versionId: 0,
      submittedAt: "",
      user: {
        id: 0,
        name: "string",
        email: "string"
      },
      project: {
        id: 3,
        name: "string"
      },
      version: {
        id: 2,
        title: "string"
      },
      answers: [] }]; 

    // Mock fetchWithRetry 的結果
    const fetchWithRetrySpy = jest.spyOn(
        require('./apiService'),
        'fetchWithRetry'
    ).mockResolvedValue(mockData as ResponseData[]);

    afterAll(() => {
        fetchWithRetrySpy.mockRestore();
    });

    test('應使用有效的 userId 和 authToken 獲取列表', async () => {
      const result = await fetchResponseList(userId, authToken);

      expect(fetchWithRetrySpy).toHaveBeenCalledWith(
        `${RESPONSE_API_BASE}/user/${userId}`,
        { method: 'GET' },
        authToken
      );
      expect(result).toEqual(mockData);
    });

    test('使用無效 userId 時，應返回空數組並發出警告', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await fetchResponseList('fallback-user-id', authToken);

      expect(result).toEqual([]);
      expect(fetchWithRetrySpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith('用戶 ID 無效，無法獲取回覆。');
      consoleWarnSpy.mockRestore();
    });
  });

  // --- deleteResponse 測試 ---
  describe('deleteResponse', () => {
    const userId = 'user-123';
    const authToken = 'valid-token';
    const responseId = 303;

    test('刪除成功時，不應拋出錯誤', async () => {
      // 成功響應：200 OK 且 body 包含 message
      mockFetch.mockResolvedValueOnce(createMockResponse(200, {id: 0,
      userId: 0,
      projectId: 0,
      versionId: 0,
      submittedAt: "",
      user: {
        id: 0,
        name: "string",
        email: "string"
      },
      project: {
        id: 3,
        name: "string"
      },
      version: {
        id: 2,
        title: "string"
      },
      answers: [] }));

      await expect(deleteResponse(userId, authToken, responseId)).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(`${RESPONSE_API_BASE}/${responseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
    });
    
    test('無效的 authToken 時，應拋出錯誤', async () => {
      await expect(deleteResponse(userId, 'fallback-auth-token', responseId)).rejects.toThrow(
        '認證失敗：未提供有效的 authToken。'
      );
    });

    test('API 錯誤時 (400)，應拋出錯誤', async () => {
      const errorResponse = {id: 0,
      userId: 0,
      projectId: 0,
      versionId: 0,
      submittedAt: "",
      user: {
        id: 0,
        name: "string",
        email: "string"
      },
      project: {
        id: 3,
        name: "string"
      },
      version: {
        id: 2,
        title: "string"
      },
      answers: [] };
      mockFetch.mockResolvedValueOnce(createMockResponse(400, errorResponse, false, 'Bad Request'));

      await expect(deleteResponse(userId, authToken, responseId)).rejects.toThrow('Bad Request');
    });
  });

  // --- updateResponse 測試 ---
  describe('updateResponse', () => {
    const responseId = 404;
    const payload = { answers: { q1: 'new_a' } };
    const mockResult = { id: 0,
      userId: 0,
      projectId: 0,
      versionId: 0,
      submittedAt: "",
      user: {
        id: 0,
        name: "string",
        email: "string"
      },
      project: {
        id: 3,
        name: "string"
      },
      version: {
        id: 2,
        title: "string"
      },
      answers: [] };
    const authToken = 'test-token-404';

    beforeEach(() => {
      localStorage.setItem('authToken', authToken);
    });

    test('更新成功時，應返回結果對象', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockResult));

      const result = await updateResponse(responseId, payload);

      expect(result).toEqual(mockResult);
      expect(mockFetch).toHaveBeenCalledWith(`${RESPONSE_API_BASE}/${responseId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    });

    test('無效的 authToken 時，應拋出錯誤', async () => {
      localStorage.removeItem('authToken');
      await expect(updateResponse(responseId, payload)).rejects.toThrow(
        '認證失敗：未提供有效的 authToken。請重新登入。'
      );
    });
  });
});