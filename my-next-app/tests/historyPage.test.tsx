// HistoryPage.test.tsx

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HistoryPage from '@/app/history/page'; // 假設您的組件導出
import { ViewerState } from '@/services/responseService'; // 導入必要的類型/枚舉

// --- 1. Mock 外部依賴 ---

// Mock Next.js 導航 (useRouter)
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

// Mock i18n
const mockT = jest.fn((key) => key); // 簡單地返回 key 作為翻譯結果
const mockI18n = { language: 'zh' };
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: mockT,
        i18n: mockI18n,
    }),
}));

// Mock API 服務
const mockFetchResponseList = jest.fn();
const mockDeleteResponse = jest.fn();
const mockFetchResponse = jest.fn();
const mockFetchQuestionnaire = jest.fn();
const mockFetchProject = jest.fn();

jest.mock('@/services/responseService', () => ({
    fetchResponseList: mockFetchResponseList,
    deleteResponse: mockDeleteResponse,
    fetchResponse: mockFetchResponse,
    fetchQuestionnaire: mockFetchQuestionnaire,
    ViewerState: {
        loading: 'loading',
        success: 'success',
        editing: 'editing',
        detail: 'detail',
        fail: 'fail',
        // 確保枚舉值被正確導出
    },
    // Mock 類型，雖然在測試中不直接使用，但有助於 TypeScript 環境
    // ResponseMeta: {}, 
    // ResponseData: {},
    // QuestionnaireData: {},
}));

jest.mock('@/services/projectService', () => ({
    fetchProject: mockFetchProject,
}));

// Mock 輔助組件 (避免渲染複雜的 UI 或依賴)
jest.mock('@/components/AuthHeader', () => () => <div data-testid="AuthHeader" />);
jest.mock('@/components/ProtectedLayout', () => ({ children }: { children: React.ReactNode }) => <div data-testid="ProtectedLayout">{children}</div>);
jest.mock('@/components/LoadingComponent', () => ({ message }: { message: string }) => <div data-testid="LoadingComponent">{message}</div>);
jest.mock('../../components/ResponseViewer', () => ({
    __esModule: true,
    default: ({ state }: { state: string }) => <div data-testid={`ResponseViewer-${state}`} />,
    // Mock 導出類型和常量
    ViewerState: {
        loading: 'loading',
        success: 'success',
        editing: 'editing',
        detail: 'detail',
        fail: 'fail',
    },
    CATEGORY_MAP: {},
    styleSelected: 'style-selected',
    styleUnselected: 'style-unselected',
}));

// Mock 其他未提供的組件/函數
jest.mock('../../components/ResponseViewer', () => ({
    __esModule: true,
    default: ({ state, data }: any) => <div data-testid={`ResponseViewer-${state}`}>{data?.response?.id}</div>,
    ViewerState: { loading: 'loading', success: 'success', editing: 'editing', detail: 'detail', fail: 'fail' },
    // ... 其他 ResponseViewer 導出
}));
jest.mock('../../components/ResponseViewer', () => ({
    __esModule: true,
    default: ({ state, data }: any) => <div data-testid={`ResponseViewer-${state}`}>{data?.response?.id}</div>,
    ViewerState: { loading: 'loading', success: 'success', editing: 'editing', detail: 'detail', fail: 'fail' },
    // ... 其他 ResponseViewer 導出
}));
jest.mock('../../components/ComfirmWindow', () => ({ comfirm, cancel }: any) => (
    <div data-testid="ComfirmWindow">
        <button onClick={comfirm} data-testid="confirm-btn">Confirm</button>
        <button onClick={cancel} data-testid="cancel-btn">Cancel</button>
    </div>
));
jest.mock('../../components/ContextMenuStrip', () => ({ children, position }: any) => (
    <div data-testid="ContextMenuStrip" style={{ left: position.x, top: position.y }}>{children}</div>
));
jest.mock('../../components/ResponseItem', () => ({ meta, selected, setCurResponse, showMenu, t }: any) => (
    <div
        data-testid={`ResponseItem-${meta.id}`}
        className={selected ? 'selected' : 'unselected'}
        onClick={setCurResponse}
        onContextMenu={showMenu}
    >
        {meta.project.name} - {meta.submittedAt}
    </div>
));
jest.mock('../../components/SortControls', () => (props: any) => (
    <div data-testid="SortControls">
        <button onClick={() => props.onSortTypeChange(0)}>SortName</button>
        <button onClick={() => props.onGroupTypeChange(0)}>GroupProject</button>
    </div>
));

// Mock `translateText` (翻譯工具函式) - 模擬 API 呼叫
const mockTranslateText = jest.fn(async (text: string) => `Translated(${text})`);
jest.mock('../../components/TranslatedText', () => {
    // 這裡我們需要 Mock 整個模塊，因為它是一個組件
    return {
        __esModule: true,
        capitalizeFirstLetter: (text: string) => text.charAt(0).toUpperCase() + text.slice(1),
        translateText: mockTranslateText,
        // Mock TranslatedText 組件
        TranslatedText: ({ text, capitalize }: { text: string; capitalize?: boolean }) => {
            const display = capitalize ? text.charAt(0).toUpperCase() + text.slice(1) : text;
            return <span data-testid="TranslatedText">{display}</span>;
        }
    }
});


// Mock 瀏覽器 API
const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(global, 'window', {
    value: {
        ...global.window,
        innerWidth: 1024,
        innerHeight: 768,
        open: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    },
});


// Mock Notification 類的 delay 設置
jest.spyOn(global, 'setTimeout'); // 監聽 setTimeout

// --- 2. 測試數據準備 ---

const MOCK_USER_ID = 'user-123';
const MOCK_AUTH_TOKEN = 'token-xyz';
const MOCK_RESPONSE_LIST = [
    {
        id: 1,
        versionId: 101,
        projectId: 1,
        project: { name: 'Project A' },
        submittedAt: '2023-10-05T10:00:00Z',
    },
    {
        id: 2,
        versionId: 102,
        projectId: 2,
        project: { name: 'Project B' },
        submittedAt: '2023-10-06T11:00:00Z',
    },
    {
        id: 3,
        versionId: 101,
        projectId: 1,
        project: { name: 'Project A' },
        submittedAt: '2023-10-04T09:00:00Z',
    },
] as any[];

const MOCK_RESPONSE_DATA = { id: 1, answers: {} } as any;
const MOCK_QUESTIONNAIRE_DATA = { id: 101, title: 'Q Title', questions: [] } as any;
const MOCK_PROJECT_DATA = { id: 1, name: 'Project A' } as any;

// --- 3. 測試套件 ---

describe('HistoryPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.clear();

        // 設置成功的 API 響應默認值
        mockFetchResponseList.mockResolvedValue(MOCK_RESPONSE_LIST);
        mockFetchResponse.mockResolvedValue({ data: MOCK_RESPONSE_DATA });
        mockFetchQuestionnaire.mockResolvedValue({ data: MOCK_QUESTIONNAIRE_DATA });
        mockFetchProject.mockResolvedValue({ data: MOCK_PROJECT_DATA });

        // 設置本地儲存的用戶信息
        localStorage.setItem('userId', MOCK_USER_ID);
        localStorage.setItem('authToken', MOCK_AUTH_TOKEN);
    });

    test('初始化時應顯示 LoadingComponent，然後載入回應列表', async () => {
        // 第一次渲染時，應該是 loading 狀態
        render(<HistoryPage />);
        expect(screen.getByTestId('LoadingComponent')).toHaveTextContent('historyPage.loadingResponses');

        // 等待 useEffect 完成數據加載
        await waitFor(() => {
            expect(mockFetchResponseList).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_AUTH_TOKEN);
        });

        // 檢查回應列表是否渲染（通過 ResponseItem）
        expect(screen.getByText('Project A - 2023-10-05T10:00:00Z')).toBeInTheDocument();
        expect(screen.getByText('Project B - 2023-10-06T11:00:00Z')).toBeInTheDocument();
        // 默認是按 Project 分組
        expect(screen.getByText('Project A')).toBeInTheDocument(); 
        expect(screen.getByText('Project B')).toBeInTheDocument();
    });

    test('如果 localStorage 中缺少 userId 或 authToken，應顯示認證失敗訊息', async () => {
        localStorage.clear();
        localStorage.setItem('userId', 'fallback-user-id'); // 測試無效 ID
        
        render(<HistoryPage />);
        
        // 等待 useEffect 執行完畢
        await waitFor(() => {
            expect(mockFetchResponseList).not.toHaveBeenCalled();
        });

        // 檢查是否顯示認證失敗訊息
        expect(screen.getByText('historyPage.authFailTitle')).toBeInTheDocument();
        expect(screen.getByText('historyPage.authFailMessage')).toBeInTheDocument();
    });

    test('如果沒有回應，應顯示無歷史記錄訊息', async () => {
        mockFetchResponseList.mockResolvedValue([]);
        render(<HistoryPage />);

        await waitFor(() => {
            expect(mockFetchResponseList).toHaveBeenCalled();
        });

        expect(screen.getByText('historyPage.noHistory')).toBeInTheDocument();
    });

    // --- 排序和分組測試 ---
    test('應根據默認設置 (Date) 進行排序和分組 (Project)', async () => {
        render(<HistoryPage />);
        await waitFor(() => expect(mockFetchResponseList).toHaveBeenCalled());

        // 檢查組別名稱（默認按 Project 分組）
        // 在組件內部，組名是 item.project.name
        expect(screen.getByText('Project A')).toBeInTheDocument();
        expect(screen.getByText('Project B')).toBeInTheDocument();
        
        // 檢查 responseList 載入後，組件內部的排序和分組是否正確執行
        // 由於我們 Mock 了 ResponseItem，很難直接驗證順序，
        // 這裡我們通過觸發 SortControls 的改變來測試 useEffect 中的邏輯
        
        // 假設我們切換到按 Name 排序 (SortType.Name = 0)
        fireEvent.click(screen.getByText('SortName'));
        
        // 期望：Project A (id 3) 應在 Project A (id 1) 之前，因為名稱排序後，內部組會按日期升序 (Accend: -1) 排序
        // 由於我們 Mock 了 ResponseItem，並且沒有渲染實際的順序，這部分測試更適合針對 sortList/groupList 函數進行獨立單元測試。
        // 在組件測試中，我們只能驗證控制項的交互和狀態的改變。
        await waitFor(() => {
            expect(localStorage.getItem('sortingData')).toContain('"type":0'); // SortType.Name = 0
        });
    });

    // --- 核心交互測試：打開/查看回應 ---
    test('雙擊回應項目應打開 ResponseViewer 處於 success 狀態', async () => {
        render(<HistoryPage />);
        await waitFor(() => expect(mockFetchResponseList).toHaveBeenCalled());

        // 雙擊第一個回應項目 (id=1)
        const responseItem1 = screen.getByTestId('ResponseItem-1');
        fireEvent.doubleClick(responseItem1);

        // 期望：打開 ResponseViewer，並處於 loading 狀態
        expect(screen.getByTestId('ResponseViewer-loading')).toBeInTheDocument();

        // 等待 API 請求完成
        await waitFor(() => {
            expect(mockFetchResponse).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_AUTH_TOKEN, 1);
            expect(mockFetchQuestionnaire).toHaveBeenCalledWith(101);
            expect(mockFetchProject).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_AUTH_TOKEN, 1);
        });

        // 期望：ResponseViewer 進入 success 狀態
        expect(screen.getByTestId('ResponseViewer-success')).toBeInTheDocument();
    });

    test('點擊右鍵菜單的 "Open" 選項應打開 ResponseViewer 處於 success 狀態', async () => {
        render(<HistoryPage />);
        await waitFor(() => expect(mockFetchResponseList).toHaveBeenCalled());

        // 模擬右鍵點擊 (ResponseItem-1)
        const responseItem1 = screen.getByTestId('ResponseItem-1');
        fireEvent.contextMenu(responseItem1);

        // 檢查菜單是否顯示
        const contextMenu = screen.getByTestId('ContextMenuStrip');
        expect(contextMenu).toBeInTheDocument();

        // 點擊 "historyPage.open" (在 MockT 中，它返回 key)
        fireEvent.click(screen.getByText('historyPage.open'));

        // 期望：ResponseViewer 進入 success 狀態
        await waitFor(() => {
            expect(screen.getByTestId('ResponseViewer-success')).toBeInTheDocument();
        });
    });
    
    test('點擊右鍵菜單的 "Edit" 選項應打開 ResponseViewer 處於 editing 狀態', async () => {
        render(<HistoryPage />);
        await waitFor(() => expect(mockFetchResponseList).toHaveBeenCalled());

        // 模擬右鍵點擊 (ResponseItem-1)
        const responseItem1 = screen.getByTestId('ResponseItem-1');
        fireEvent.contextMenu(responseItem1);

        // 點擊 "historyPage.edit"
        fireEvent.click(screen.getByText('historyPage.edit'));

        // 期望：ResponseViewer 進入 editing 狀態
        await waitFor(() => {
            expect(screen.getByTestId('ResponseViewer-editing')).toBeInTheDocument();
        });
    });

    test('點擊右鍵菜單的 "Detail Info" 選項應打開 ResponseViewer 處於 detail 狀態', async () => {
        render(<HistoryPage />);
        await waitFor(() => expect(mockFetchResponseList).toHaveBeenCalled());

        // 模擬右鍵點擊 (ResponseItem-1)
        const responseItem1 = screen.getByTestId('ResponseItem-1');
        fireEvent.contextMenu(responseItem1);

        // 點擊 "historyPage.detailInfo"
        fireEvent.click(screen.getByText('historyPage.detailInfo'));

        // 期望：ResponseViewer 進入 detail 狀態
        await waitFor(() => {
            expect(screen.getByTestId('ResponseViewer-detail')).toBeInTheDocument();
        });
    });

    test('點擊右鍵菜單的 "View Report" 選項應打開新視窗並設置 localStorage', async () => {
        render(<HistoryPage />);
        await waitFor(() => expect(mockFetchResponseList).toHaveBeenCalled());

        // 模擬右鍵點擊 (ResponseItem-1)
        const responseItem1 = screen.getByTestId('ResponseItem-1');
        fireEvent.contextMenu(responseItem1);

        // 點擊 "historyPage.viewReport"
        fireEvent.click(screen.getByText('historyPage.viewReport'));

        // 期望：設置 localStorage
        expect(localStorage.getItem('responseId')).toBe('1');
        expect(localStorage.getItem('currentProjectId')).toBe('1');
        expect(localStorage.getItem('QuestionnaireID')).toBe('101');
        
        // 期望：調用 window.open
        expect(window.open).toHaveBeenCalledWith("/report", "_blank");
    });
    
    // --- 刪除功能測試 ---
    test('點擊右鍵菜單的 "Delete" 選項並確認後，應調用 deleteResponse', async () => {
        mockDeleteResponse.mockResolvedValue(undefined); // 模擬刪除成功
        
        render(<HistoryPage />);
        await waitFor(() => expect(mockFetchResponseList).toHaveBeenCalled());

        // 1. 右鍵點擊 ResponseItem-1
        const responseItem1 = screen.getByTestId('ResponseItem-1');
        fireEvent.contextMenu(responseItem1);

        // 2. 點擊 "historyPage.delete"
        fireEvent.click(screen.getByText('historyPage.delete'));
        
        // 3. 檢查確認窗口是否彈出
        const confirmWindow = screen.getByTestId('ComfirmWindow');
        expect(confirmWindow).toBeInTheDocument();
        
        // 4. 點擊確認按鈕
        fireEvent.click(screen.getByTestId('confirm-btn'));

        // 5. 期望：調用刪除 API
        await waitFor(() => {
            expect(mockDeleteResponse).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_AUTH_TOKEN, 1);
        });

        // 6. 期望：ResponseItem-1 從列表中消失
        expect(screen.queryByTestId('ResponseItem-1')).not.toBeInTheDocument();
        
        // 7. 檢查通知是否被調用 (historyPage.notify.delete.on -> success)
        // 由於 notify 邏輯涉及狀態和 setTimeout，這裡只檢查 API 調用，
        // 完整的通知測試應在 Notification 類上進行單獨測試。
        expect(setTimeout).toHaveBeenCalled();
    });
    
    test('刪除失敗時，應恢復列表並顯示錯誤通知', async () => {
        mockDeleteResponse.mockRejectedValue(new Error('Delete Failed')); // 模擬刪除失敗
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        render(<HistoryPage />);
        await waitFor(() => expect(mockFetchResponseList).toHaveBeenCalled());
        
        // 確保列表在刪除前有 3 個項目
        expect(screen.queryAllByTestId(/ResponseItem/)).toHaveLength(3);

        // 執行刪除操作 (ResponseItem-1)
        fireEvent.contextMenu(screen.getByTestId('ResponseItem-1'));
        fireEvent.click(screen.getByText('historyPage.delete'));
        fireEvent.click(screen.getByTestId('confirm-btn'));

        // 等待 API 請求失敗
        await waitFor(() => {
            expect(mockDeleteResponse).toHaveBeenCalled();
        });

        // 期望：列表應恢復到 3 個項目 (回滾)
        expect(screen.queryAllByTestId(/ResponseItem/)).toHaveLength(3);
        expect(consoleErrorSpy).toHaveBeenCalledWith('fail to del response', expect.any(Error));
        
        consoleErrorSpy.mockRestore();
    });
});