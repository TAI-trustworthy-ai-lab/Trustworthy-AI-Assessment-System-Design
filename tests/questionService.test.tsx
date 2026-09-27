// questionnaireService.test.ts

import {
    fetchLatestQuestionnaires,
    fetchAllQuestionnaires,
    createQuestionnaire,
    duplicateQuestionnaire,
    deleteQuestionnaire,
    updateQuestionnaireVersion,
} from '@/services/questionnaireService'; // 假設您的檔案名為 questionnaireService.ts

// 模擬整個 fetch 函數
const mockFetch = jest.fn();

// 在所有測試之前，將全局的 fetch 替換為我們的 mock 函數
beforeAll(() => {
    global.fetch = mockFetch as any;
});

// 在每個測試之間，清除 mock 函數的調用記錄
afterEach(() => {
    jest.clearAllMocks();
    jest.spyOn(localStorage, 'getItem').mockRestore(); // 確保 localStorage.getItem 恢復
});

// 在所有測試之後，恢復全局的 fetch 函數
afterAll(() => {
    // 雖然在 Node 環境下通常不用擔心全局污染，但這是良好的實踐
    // 如果您在瀏覽器環境中運行測試，則需要確保恢復
});

// --- Mock 數據 ---
const MOCK_LATEST_DATA = [{ id: 1, title: 'Latest Q' }];
const MOCK_ALL_ITEMS = [{ id: 2, title: 'All Q 1' }, { id: 3, title: 'All Q 2' }];
const MOCK_AUTH_TOKEN = 'test-token-123';
const MOCK_NEW_QUESTIONNAIRE_ID = 99;

// 輔助函數：模擬成功的 API 響應
const mockSuccessResponse = (data: any, status: number = 200) => ({
    ok: true,
    status: status,
    json: async () => ({ data }),
});

// 輔助函數：模擬失敗的 API 響應
const mockErrorResponse = (status: number, errorMessage: string) => ({
    ok: false,
    status: status,
    json: async () => ({ error: errorMessage }),
});


describe('Questionnaire Service', () => {

    describe('fetchLatestQuestionnaires', () => {
        it('應該成功獲取最新問卷列表並返回 data 內容', async () => {
            mockFetch.mockResolvedValue(mockSuccessResponse(MOCK_LATEST_DATA));

            const result = await fetchLatestQuestionnaires();

            expect(result).toEqual(MOCK_LATEST_DATA);
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/group/latest'),
                expect.objectContaining({ method: 'GET' })
            );
        });

        it('當 API 返回非 2xx 狀態碼時，應該拋出錯誤', async () => {
            mockFetch.mockResolvedValue(mockErrorResponse(404, 'Not Found'));

            await expect(fetchLatestQuestionnaires()).rejects.toThrow(
                JSON.stringify({ status: 404, message: 'Not Found' })
            );
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('fetchAllQuestionnaires', () => {
        it('應該成功獲取所有問卷列表並返回 result.data.items 內容', async () => {
            mockFetch.mockResolvedValue(mockSuccessResponse({ items: MOCK_ALL_ITEMS }));

            const result = await fetchAllQuestionnaires();

            expect(result).toEqual(MOCK_ALL_ITEMS);
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/all'),
                expect.objectContaining({ method: 'GET' })
            );
        });

        it('如果 items 不存在，應該返回空數組 []', async () => {
            mockFetch.mockResolvedValue(mockSuccessResponse({ someOtherField: 'data' }));

            const result = await fetchAllQuestionnaires();

            expect(result).toEqual([]);
        });
    });

    describe('createQuestionnaire', () => {
        const payload = {
            groupName: 'TestGroup',
            title: 'New Q',
            questions: [] as any,
        };

        it('有 token 時，應該使用 POST 方法、包含 Auth Header 並返回狀態碼 201', async () => {
            // 模擬 localStorage.getItem 返回 token
            jest.spyOn(localStorage, 'getItem').mockReturnValue(MOCK_AUTH_TOKEN);
            mockFetch.mockResolvedValue(mockSuccessResponse({}, 201)); // 模擬 201 Created

            const result = await createQuestionnaire(payload);

            expect(result).toBe(201);
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${MOCK_AUTH_TOKEN}`,
                    },
                })
            );
        });

        it('無 token 時，POST 請求不應包含 Authorization Header', async () => {
            // 模擬 localStorage.getItem 返回 null
            jest.spyOn(localStorage, 'getItem').mockReturnValue(null);
            mockFetch.mockResolvedValue(mockSuccessResponse({}, 200));

            await createQuestionnaire(payload);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json",
                    },
                })
            );
        });
    });

    describe('duplicateQuestionnaire', () => {
        const id = 10;
        const payload = { title: 'Copy Q', description: 'Desc' };
        const duplicateResponse = { newId: MOCK_NEW_QUESTIONNAIRE_ID, title: payload.title };

        it('應該使用包含 token 的 PUT 方法並返回完整的結果物件', async () => {
            jest.spyOn(localStorage, 'getItem').mockReturnValue(MOCK_AUTH_TOKEN);
            mockFetch.mockResolvedValue(mockSuccessResponse(duplicateResponse, 202)); // 模擬 202 Accepted

            const result = await duplicateQuestionnaire(id, payload);

            expect(result).toEqual({
                statusCode: 202,
                data: duplicateResponse,
            });
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining(`/${id}/duplicate`),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify(payload),
                    headers: expect.objectContaining({
                        "Authorization": `Bearer ${MOCK_AUTH_TOKEN}`,
                    }),
                })
            );
        });
    });

    describe('deleteQuestionnaire', () => {
        const id = 5;

        it('應該使用包含 token 的 DELETE 方法並返回 res.json() 的結果', async () => {
            const mockJsonResult = { message: 'Deleted successfully' };
            jest.spyOn(localStorage, 'getItem').mockReturnValue(MOCK_AUTH_TOKEN);
            
            // 模擬 fetch 響應
            const mockResponse = {
                ok: true,
                json: async () => mockJsonResult,
            };
            mockFetch.mockResolvedValue(mockResponse);

            const result = await deleteQuestionnaire(id);

            expect(result).toEqual(mockJsonResult);
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining(`/${id}`),
                expect.objectContaining({
                    method: 'DELETE',
                    headers: expect.objectContaining({
                        "Authorization": `Bearer ${MOCK_AUTH_TOKEN}`,
                    }),
                })
            );
        });

        it('當刪除失敗時，應該拋出特定的錯誤訊息', async () => {
            jest.spyOn(localStorage, 'getItem').mockReturnValue(MOCK_AUTH_TOKEN);
            mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) });

            await expect(deleteQuestionnaire(id)).rejects.toThrow("刪除問卷失敗");
        });
    });

    describe('updateQuestionnaireVersion', () => {
        const id = 15;
        const payload = { title: 'Updated Title', description: 'New Desc', isActive: true };
        const updateResponse = { id: id, ...payload };

        it('應該使用包含 token 的 PATCH 方法並返回完整的結果物件', async () => {
            jest.spyOn(localStorage, 'getItem').mockReturnValue(MOCK_AUTH_TOKEN);
            mockFetch.mockResolvedValue(mockSuccessResponse(updateResponse, 200));

            const result = await updateQuestionnaireVersion(id, payload);

            expect(result).toEqual({
                statusCode: 200,
                data: updateResponse,
            });
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining(`/${id}`),
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify(payload),
                    headers: expect.objectContaining({
                        "Authorization": `Bearer ${MOCK_AUTH_TOKEN}`,
                    }),
                })
            );
        });
    });
});
