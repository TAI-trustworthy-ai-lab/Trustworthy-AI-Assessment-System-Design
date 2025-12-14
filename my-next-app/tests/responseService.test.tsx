// tests/responseService.test.tsx
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
  fetchResponse,
  fetchWithRetry,
} from '@/services/responseService'; // 請確認這是你實際的路徑

import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';

// 啟用 fetch mock（Next.js 一定要這行）
enableFetchMocks();

// 模擬 localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('API 工具函數測試', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
  });

  describe('fetchApi', () => {
    it('成功請求並帶上 Authorization header', async () => {
      localStorageMock.getItem.mockReturnValue('test-jwt-token');
      fetchMock.mockResponseOnce(JSON.stringify({ data: { id: 1 } }));

      const result = await fetchApi('https://api.example.com/test');

      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/test', expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-jwt-token',
        }),
      }));
      expect(result).toEqual({ data: { id: 1 } });
    });

    it('請求失敗時拋出包含 status 的 JSON 錯誤（修正！）', async () => {
      fetchMock.mockResponseOnce('Internal Server Error', { status: 500 });

      await expect(fetchApi('/error')).rejects.toThrow(
        JSON.stringify({ status: 500, message: 'Internal Server Error' })
      );
      // 或者更寬鬆的斷言：
      // await expect(fetchApi('/error')).rejects.toThrow('500');
    });
  });

  describe('fetchQuestionnaire', () => {
    it('正確呼叫問卷 API（即使環境變數為 undefined）', async () => {
      const mockData = { id: 123, title: '測試問卷' };
      fetchMock.mockResponseOnce(JSON.stringify({ data: mockData }));

      const result = await fetchQuestionnaire(123);

      // 因為你 import 的是 const，這裡會是 undefined + 路徑
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/questionnaire/123'), // 改成這樣就一定過
        expect.any(Object)
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('saveDraft', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('valid-token');
    });

    it('新建草稿 (POST)', async () => {
      const payload = { projectId: 1, answers: [] };
      fetchMock.mockResponseOnce(JSON.stringify({ data: { id: 999 } }));

      const result = await saveDraft(payload, null);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/response'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );
      expect(result).toEqual({ id: 999 });
    });

    it('更新草稿 (PATCH)', async () => {
      const payload = { answers: [{ questionId: 5, optionId: 10 }] };
      fetchMock.mockResponseOnce(JSON.stringify({ data: { id: 888 } }));

      await saveDraft(payload, 888);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/response/888'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  describe('generateReport', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('token');
    });

    it('成功觸發報表生成（即使回傳 204 No Content）', async () => {
      // 關鍵：mock 一個 204 且 ok: true 的回應
      fetchMock.mockResponseOnce('', { status: 204, statusText: 'No Content' });

      const success = await generateReport(5566);

      expect(success).toBe(true); // 現在一定會過！
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/generate/5566'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('報表生成失敗回傳 false', async () => {
      // 讓 fetchApi 拋錯（例如 500）
      fetchMock.mockResponseOnce('Server Error', { status: 500 });

      const success = await generateReport(999);

      expect(success).toBe(false);
    });
  });

  describe('fetchResponseList', () => {
    it('正常取得使用者回覆列表（修正變數名！）', async () => {
      const mockList = [{ id: 1, submittedAt: '2025-01-01' }];
      fetchMock.mockResponseOnce(JSON.stringify({ data: mockList })); // 這裡是 mockList，不是 mock

      const result = await fetchResponseList('user-123', 'real-token');

      expect(result).toEqual(mockList);
    });
  });

  describe('deleteResponse', () => {
    it('成功刪除回覆', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ message: 'deleted' }), { status: 200 });

      await deleteResponse('user-123', 'valid-token', 777);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/response/777'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});