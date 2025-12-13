/**
 * @file AdminDashboard.test.tsx
 * @description 測試 AdminDashboard 的核心功能：用戶列表載入、問卷管理操作（複製、刪除、啟用）。
 */

import React from 'react';
// 確保導入所有需要的工具
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminDashboard from '../src/app/admin/page';
import { enableFetchMocks } from 'jest-fetch-mock';

// 啟用 fetch Mock
enableFetchMocks();

// ----------------------------------------------------
// ✅ 修正 2: 針對 ViewerState 數字洩漏問題，Mock 該服務以確保傳遞的是字串 'detail'
// ----------------------------------------------------
jest.mock('@/services/responseService', () => ({
    // 假設 ViewerState 是一個帶有 detail 和 edit 狀態的枚舉或物件
    ViewerState: {
        detail: 'detail',
        edit: 'edit',
    },
}));
// ----------------------------------------------------


// ----------------------------------------------------
// 1. 全域 Mock 
// ----------------------------------------------------
global.alert = jest.fn();
global.prompt = jest.fn();
global.confirm = jest.fn();


// Mock next/navigation 的 useRouter
const mockRouterReplace = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        replace: mockRouterReplace,
        push: jest.fn(),
    }),
}));

// ----------------------------------------------------
// 2. i18n Mock (確保所有中文翻譯鍵值正確，並補上錯誤訊息翻譯)
// ----------------------------------------------------
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const map: { [key: string]: string } = {
                // AdminPage 區段
                'adminPage.allUsersList': '👑 所有用戶列表',
                'adminPage.questionnaireManagement': '📋 問卷管理',
                'adminPage.addQuestionnaire': '➕ 新增問卷',
                'adminPage.edit': '編輯',
                'adminPage.duplicate': '複製',
                'adminPage.delete': '刪除',
                'adminPage.active': '✅ 啟用',
                'adminPage.inactive': '❌ 停用',
                'adminPage.createSuccess': '✅ 問卷建立成功！',
                'adminPage.deleteSuccess': '✅ 刪除成功',
                'adminPage.activated': '✅ 已啟用問卷',
                'adminPage.deactivated': '✅ 已停用問卷',
                'adminPage.close': '關閉',

                // Prompt/Alert Text
                'adminPage.enterGroupName': '請輸入群組名稱：',
                'adminPage.enterQuestionnaireTitle': '請輸入問卷標題：',
                'adminPage.enterQuestionnaireDescription': '請輸入問卷描述：',

                // 補上錯誤訊息翻譯，防止測試因為找不到翻譯鍵而失敗
                'adminPage.loadUsersFailed': '🚨 用戶數據加載失敗:',
                'adminPage.networkOrDataError': '網路或數據錯誤',

                // Other Keys for completeness
                'adminPage.dashboardTitle': '🌐 系統儀表板',
                'adminPage.error.permissionDeniedTitle': '⛔ 權限不足',
                'adminPage.notAdminCannotView': '您當前的角色無權限查看此管理員頁面。',
            };
            return map[key] || key;
        },
        i18n: { language: 'zh-TW' },
    }),
}));
// ----------------------------------------------------


// Mock 外部服務
jest.mock('@/services/questionnaireService', () => ({
    fetchAllQuestionnaires: jest.fn(),
    createQuestionnaire: jest.fn(),
    deleteQuestionnaire: jest.fn(),
    duplicateQuestionnaire: jest.fn(),
    updateQuestionnaireVersion: jest.fn(),
}));

const mockFetchAllQuestionnaires = require('@/services/questionnaireService').fetchAllQuestionnaires as jest.Mock;
const mockCreateQuestionnaire = require('@/services/questionnaireService').createQuestionnaire as jest.Mock;
const mockDeleteQuestionnaire = require('@/services/questionnaireService').deleteQuestionnaire as jest.Mock;
const mockDuplicateQuestionnaire = require('@/services/questionnaireService').duplicateQuestionnaire as jest.Mock;
const mockUpdateQuestionnaireVersion = require('@/services/questionnaireService').updateQuestionnaireVersion as jest.Mock;


// Mock 依賴元件
jest.mock('@/components/AuthHeader', () => () => <div data-testid="AuthHeader">Mock Auth Header</div>);

// QuestionnaireEditor Mock 
// 注意：現在 curState 會是字串 'detail' 或 'edit'
jest.mock('@/app/admin/QuestionnaireEditor', () => ({
    __esModule: true,
    default: jest.fn(({ data, curState }) => (
        <div data-testid="ResponseViewer-Modal">
            <span data-testid="Modal-Content-Text">
                Mock Response Viewer for {data.questionnaire.title} in {curState} mode
            </span>
        </div>
    )),
}));


// 測試資料與常數
const ADMIN_ROLE = 'ADMIN';
const USER_ROLE_KEY = 'userRole';
const AUTH_TOKEN_KEY = 'authToken';

const mockUsers = [
    { id: 1, email: 'admin@test.com', role: 'ADMIN', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
    { id: 2, email: 'user@test.com', role: 'USER', createdAt: '2023-01-02T00:00:00Z', updatedAt: '2023-01-02T00:00:00Z' },
];

const mockQuestionnaires = [
    { id: 101, group: { name: 'A組' }, versionNumber: 1, title: '問卷A', isActive: true, questions: [] },
    { id: 102, group: { name: 'B組' }, versionNumber: 2, title: '問卷B', isActive: false, questions: [] },
];

// ----------------------------------------------------
// 輔助函式：改為異步 (Async Helper Function)
// ----------------------------------------------------
const findActionButton = async (rowText: string, buttonName: string) => {
    // 找到包含特定問卷標題的元素，使用 findByText 確保等待元素出現
    const rowTitleElement = await screen.findByText(rowText);
    // 向上找到其最近的表格行 <tr>
    const row = rowTitleElement.closest('tr');

    if (!row) throw new Error(`找不到包含文字 "${rowText}" 的表格行.`);

    // 在該行內，使用 within 尋找指定的按鈕 (同步)
    return within(row).getByRole('button', { name: buttonName });
};
// ----------------------------------------------------


describe('AdminDashboard - Core Functionality', () => {
    beforeEach(() => {
        fetch.resetMocks();
        localStorage.clear();
        localStorage.setItem(USER_ROLE_KEY, ADMIN_ROLE);
        localStorage.setItem(AUTH_TOKEN_KEY, 'mock-token');

        // ✅ 修正 1: 將 mockResponseOnce 改為 mockResponse，以防元件重新渲染導致二次 fetch 失敗
        fetch.mockResponse(JSON.stringify({ data: mockUsers }), { status: 200 });

        // 預設 Mock：問卷列表成功載入
        mockFetchAllQuestionnaires.mockResolvedValue(mockQuestionnaires);

        // 清除所有 mock 的呼叫記錄
        (global.alert as jest.Mock).mockClear();
        (global.prompt as jest.Mock).mockClear();
        (global.confirm as jest.Mock).mockClear();

        (global.confirm as jest.Mock).mockImplementation(() => false);
        (global.prompt as jest.Mock).mockImplementation(() => null);
    });

    // 測試案例 1: 成功載入用戶列表和問卷列表 
    it('should display user list and questionnaire management table for admin', async () => {
        render(<AdminDashboard />);

        // 1. 檢查用戶列表標題
        await screen.findByText('👑 所有用戶列表');

        // 2. 檢查用戶數據 (Functional Matcher + findByText 異步等待)
        await screen.findByText((content) => {
            // 移除所有空白（包括換行、空格等），然後檢查是否包含完整的電子郵件
            return content.replace(/\s/g, '').includes('admin@test.com');
        }, { timeout: 3000 });

        await screen.findByText((content) => {
            return content.replace(/\s/g, '').includes('user@test.com');
        }, { timeout: 3000 });

        // 3. 檢查問卷管理標題
        expect(screen.getByText('📋 問卷管理')).toBeInTheDocument();
        expect(screen.getByText('➕ 新增問卷')).toBeInTheDocument();

        // 4. 檢查問卷數據
        await screen.findByText('問卷A');
        expect(screen.getByText('問卷B')).toBeInTheDocument();
    });

    // 測試案例 2: 點擊 "新增問卷" 流程
    it('should create a new questionnaire and refresh the list', async () => {

        (global.prompt as jest.Mock)
            .mockImplementationOnce((message) => {
                if (message === '請輸入群組名稱：') return '產品組';
                return null;
            })
            .mockImplementationOnce((message) => {
                if (message === '請輸入問卷標題：') return '新問卷標題';
                return null;
            })
            .mockImplementationOnce((message) => {
                if (message === '請輸入問卷描述：') return '新問卷描述';
                return null;
            });

        mockCreateQuestionnaire.mockResolvedValue(201);

        render(<AdminDashboard />);

        const addButton = await screen.findByRole('button', { name: '➕ 新增問卷' });
        fireEvent.click(addButton);

        await waitFor(() => {
            expect(mockCreateQuestionnaire).toHaveBeenCalledWith({
                groupName: '產品組',
                title: '新問卷標題',
                description: '新問卷描述',
                questions: [],
            });
            expect(global.alert).toHaveBeenCalledWith('✅ 問卷建立成功！');
        });
    }, 5000);

    // 測試案例 3: 點擊 "複製" 問卷
    it('should duplicate a questionnaire and refresh the list', async () => {
        mockDuplicateQuestionnaire.mockResolvedValue({});

        render(<AdminDashboard />);

        // 使用 await findActionButton 鎖定 '問卷A' 所在的行的 '複製' 按鈕
        const duplicateButton = await findActionButton('問卷A', '複製');
        fireEvent.click(duplicateButton);

        await waitFor(() => {
            // 檢查列表是否刷新
            expect(mockFetchAllQuestionnaires).toHaveBeenCalledTimes(2);
        });
    });

    // 測試案例 4: 點擊 "刪除" 問卷
    it('should delete a questionnaire after confirmation and refresh the list', async () => {
        mockDeleteQuestionnaire.mockResolvedValue({});
        (global.confirm as jest.Mock).mockImplementationOnce(() => true);

        render(<AdminDashboard />);

        // 使用 await findActionButton 鎖定 '問卷A' 所在的行的 '刪除' 按鈕
        fireEvent.click(await findActionButton('問卷A', '刪除'));

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith('✅ 刪除成功');
            expect(mockFetchAllQuestionnaires).toHaveBeenCalledTimes(2);
        });
    });

    // 測試案例 5: 點擊 "啟用/停用" 狀態
    it('should toggle the active status of a questionnaire', async () => {
        mockUpdateQuestionnaireVersion.mockResolvedValue({});

        render(<AdminDashboard />);
        await screen.findByText('問卷A'); // 確保問卷行已載入

        // 1. 測試 問卷A (Active) -> Inactive
        const toggleButtonA = screen.getByText('✅ 啟用').closest('button') as HTMLElement;
        fireEvent.click(toggleButtonA);

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith('✅ 已停用問卷');
        });

        // 2. 測試 問卷B (Inactive) -> Active
        const toggleButtonB = screen.getByText('❌ 停用').closest('button') as HTMLElement;
        fireEvent.click(toggleButtonB);

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith('✅ 已啟用問卷');
        });
    });

    // AdminDashboard.test.tsx: around line 301

    // tests/AdminDashboard.test.tsx: around line 306

    // 測試案例 6: 點擊 "編輯" 按鈕，顯示 ResponseViewer Modal
    it('should open ResponseViewer modal in detail mode when "Edit" button is clicked', async () => {
        render(<AdminDashboard />);
        // 確保問卷行已載入
        await screen.findByText('問卷A');

        // 1. 點擊「編輯」按鈕
        const editButton = await findActionButton('問卷A', '編輯');
        fireEvent.click(editButton);

        // 2. ✅ 使用 findByRole 查找「關閉」按鈕，它會自動等待 Modal 出現 (Timeout: 預設 1000ms)
        // 由於您在上一個步驟已經手動設置了 2000ms 的 timeout，這裡使用 findByRole 即可。
        const closeButton = await screen.findByRole(
            'button',
            { name: '關閉' }, // 🎯 移除 exact: true，採用不嚴格匹配
            { timeout: 2000 } // 🎯 明確設定 Timeout，確保有足夠時間等待 Modal 渲染
        );

        // 3. 檢查 Modal 內部內容是否正確渲染
        // 檢查 Modal 容器（page.tsx 中定義的 data-testid="ResponseViewer-Modal"）
        const modalContentText = screen.getByTestId('Modal-Content-Text');
        expect(modalContentText).toHaveTextContent('Mock Response Viewer for 問卷A in detail mode');
        // 4. 點擊關閉按鈕
        fireEvent.click(closeButton);

        // 5. 檢查 Modal 是否關閉
        await waitFor(() => {
            // 檢查 Modal 容器是否已從文件中消失
            expect(screen.queryByTestId('ResponseViewer-Modal')).not.toBeInTheDocument();
        });
    });
});
