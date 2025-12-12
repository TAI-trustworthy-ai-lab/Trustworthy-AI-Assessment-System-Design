import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';

// 修正 Element type is invalid 錯誤：使用 require().default
const QuestionnaireContent = require('../src/components/QuestionnaireContent').default; 

import { 
    fetchQuestionnaire, 
    submitQuestionnaire,
    generateReport,
} from '@/services/responseService';
import { CATEGORY_MAP } from '../src/config/constants';



// =======================================================
// 1. Mock 變數定義 (頂層)
// =======================================================
const mockReplace = jest.fn();
const mockFetchQuestionnaire = fetchQuestionnaire as jest.Mock;
const mockSubmitQuestionnaire = submitQuestionnaire as jest.Mock;
const mockGenerateReport = generateReport as jest.Mock;

// 修正 ReferenceError: fetch is not defined
// Mock 全局 fetch API。注意：這個 Mock 必須是異步的，因為 TranslatedText 會調用它。
global.fetch = jest.fn((url: string, options: RequestInit) => {
    // 這裡使用 Promise.resolve 來確保異步行為正確
    if (url === "/api/translate" && options.body) {
        let originalText = "Translation error";
        try {
            // 嘗試解析 body 以獲取原始文本 (q 欄位)
            const body = JSON.parse(options.body.toString());
            originalText = body.q;
        } catch (e) {
            console.error("Failed to parse fetch body in mock", e);
        }
        
        // ⭐️ 核心修正: 讓 Mock 翻譯返回原始輸入文本，確保頁面標題正確顯示。
        // 如果輸入文本是 Dimension Two: Reliability，就返回 Dimension Two: Reliability。
        // 對於選項/問題文本，我們返回 [EN] 前綴，以匹配測試中的 fireEvent 呼叫。
        const translatedText = originalText.includes('Dimension') || originalText.includes('評估問卷')
            ? originalText // 如果是頁面標題或主標題，直接返回原文 (假設它已是英文或我們需要的文本)
            : `[EN] ${originalText}`; // 否則返回帶 [EN] 前綴的 Mock 結果 (用於選項/問題)

        return Promise.resolve({
            ok: true,
            json: async () => ({ translatedText: translatedText }),
            status: 200,
        } as Response);
    }
    // 預設 fallback
    return Promise.resolve({ ok: false, json: async () => ({}), status: 404 } as Response);
}) as jest.Mock;


// =======================================================
// 2. Mock 模組
// =======================================================

// 2.1 Mock next/navigation (useRouter)
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// 2.2 Mock 服務 (responseService)
jest.mock('@/services/responseService', () => ({
    fetchQuestionnaire: jest.fn(),
    submitQuestionnaire: jest.fn(),
    generateReport: jest.fn(),
}));

// 2.3 Mock i18next (已包含對 TranslatedText 的模擬處理)
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options: Record<string, any> = {}) => {
            const translations: Record<string, string> = {
                'Questionnaire.loading': 'Loading...',
                'Questionnaire.submitting': 'Submitting...',
                'Questionnaire.report.generating': 'Generating Report...',
                'Questionnaire.actions.next': 'Next',
                'Questionnaire.actions.prev': 'Previous',
                'Questionnaire.actions.finishAndSubmit': 'Finish and Submit',
                'Questionnaire.actions.viewReport': 'View Report',
                'Questionnaire.actions.backToHome': 'Back to Home',
                'Questionnaire.submitSuccess': 'Submission Success!',
                'Questionnaire.report.generated': 'Report generated.',
                'Questionnaire.loadFailedOrMissing': 'Failed to load questionnaire.',
                'Questionnaire.overlay.doNotClose': 'Do not close the browser.',
                'Questionnaire.actions.retryLoad': 'Retry Load',
                'Questionnaire.placeholder.answer': 'Your answer here...',
                'Questionnaire.actions.showDetails': 'Show Details', 
                'Questionnaire.actions.hideDetails': 'Hide Details', 
            };
            if (key === 'Questionnaire.progress.page') return `Page ${options.current} of ${options.total}`;
            if (key.startsWith('Questionnaire.error')) return `API Error: ${key}`;
            return translations[key] || key;
        },
        i18n: { language: 'en' }
    })
}));

// 2.4 Mock FloatingChatWindow (避免 react-markdown ESM 錯誤)
jest.mock('@/components/FloatingChatWindow', () => {
    return (props: any) => <div data-testid="floating-chat-mock" data-visible={props.isVisible}>Chat Window Mock</div>;
});

// 2.5 Mock CATEGORY_MAP
jest.mock('../src/config/constants', () => ({
    CATEGORY_MAP: {
        'C1': 'Dimension One: Fairness',
        'C2': 'Dimension Two: Reliability',
    },
}));






// =======================================================
// 3. 測試資料設置
// =======================================================

const MOCK_QUESTIONNAIRE_DATA = {
    id: 1,
    title: '可信賴 AI 評估問卷',
    description: '此問卷用於評估您的 AI 專案的可信賴程度。',
    group: { id: 1, name: 'AI 專案組' },
    questions: [
        { id: 101, text: '模型結果是否對不同使用者群體保持一致？', description: '這是公平性的描述。', category: 'C1', order: 1, type: 'SCALE', required: true, options: [{ id: 1, text: '非常不同意', value: 1, order: 1 }, { id: 5, text: '非常同意', value: 5, order: 5 }] },
        { id: 102, text: '請描述您對公平性的擔憂。', description: null, category: 'C1', order: 2, type: 'TEXT', required: false, options: [] },
        { id: 201, text: '模型是否在邊界條件下仍能保持高準確度？', description: '這是可靠性的描述。', category: 'C2', order: 1, type: 'SINGLE_CHOICE', required: true, options: [{ id: 11, text: '是', value: 1, order: 1 }, { id: 12, text: '否', value: 0, order: 2 }] },
        { id: 202, text: '哪個因素影響了模型的可靠性？', description: null, category: 'C2', order: 2, type: 'MULTIPLE_CHOICE', required: true, options: [{ id: 21, text: '數據偏差', value: 1, order: 1 }, { id: 22, text: '環境變化', value: 1, order: 2 }, { id: 23, text: '模型複雜度', value: 0, order: 3 }] },
    ]
};


// =======================================================
// 4. 測試套件
// =======================================================

describe('QuestionnaireContent - Full Workflow Tests', () => {
    
    // Local Storage Mock 方式 (使用 defineProperty 修正 TypeError)
    const setupLocalStorageMock = (store: Record<string, string> = {}) => {
        const localStorageMock = {
            getItem: jest.fn((key: string) => store[key] || null),
            setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
            removeItem: jest.fn((key: string) => { delete store[key]; }),
            clear: jest.fn(() => { for (const key in store) delete store[key]; }),
        };

        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true, 
            configurable: true, 
        });
        
        return localStorageMock;
    };
    
    beforeEach(() => {
        (useRouter as jest.Mock).mockReturnValue({ 
            push: mockReplace, 
            replace: mockReplace 
        });
        jest.clearAllMocks();
        
        setupLocalStorageMock({
            userId: '100', 
            authToken: 'test-token',
            currentProjectId: '500',
        });
        
        mockFetchQuestionnaire.mockResolvedValue(MOCK_QUESTIONNAIRE_DATA);
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // --------------------------------------------------------------------------------------------------

    describe('Loading and Error States', () => {
        it('should show loading state initially and then render the first page', async () => {
            render(<QuestionnaireContent questionnaireId={1} />);

            // 初始狀態: 顯示加載中
            expect(screen.getByText('Loading...')).toBeInTheDocument();

            // 等待數據 API 呼叫完成
            await waitFor(() => {
                expect(mockFetchQuestionnaire).toHaveBeenCalledWith(1);
            });
            
            // ⭐️ 修正競態條件 1: 等待異步翻譯完成後，頁面標題才出現
            await waitFor(() => {
                 expect(screen.getByText('可信賴 AI 評估問卷')).toBeInTheDocument();
            });

            // 檢查第一頁標題是否出現
            expect(screen.getByText('Dimension One: Fairness')).toBeInTheDocument();
        });

        it('should show error screen if questionnaire loading fails', async () => {
            const errorBody = '{"status":404, "message":"Not Found"}';
            mockFetchQuestionnaire.mockRejectedValueOnce(new Error(errorBody));

            render(<QuestionnaireContent questionnaireId={1} />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load questionnaire.')).toBeInTheDocument();
            });

            expect(screen.getByRole('button', { name: 'Retry Load' })).toBeInTheDocument();
        });
        
        it('should load saved answers and page progress from LocalStorage', async () => {
            // 設置 Local Storage 中有保存的答案和進度 (停留在第二頁)
            setupLocalStorageMock({
                userId: '100',
                authToken: 'test-token',
                currentProjectId: '500',
                questionnaireAnswers: JSON.stringify({ 101: { score: 3, optionIds: [3] } }),
                questionnaireCurrentPage: '1', 
            });

            render(<QuestionnaireContent questionnaireId={1} />);

            // ⭐️ 修正競態條件 2: 等待數據加載完成後，並等待頁面切換和異步翻譯完成
            await waitFor(() => {
                expect(screen.getByText('Dimension Two: Reliability')).toBeInTheDocument(); 
            });

            expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
        });
    });

    // --------------------------------------------------------------------------------------------------
    describe('Pagination and Validation', () => {
        it('should navigate between pages and validate required fields', async () => {
            render(<QuestionnaireContent questionnaireId={1} />);
            await waitFor(() => screen.getByText('Dimension One: Fairness'));

            const nextButton = screen.getByRole('button', { name: 'Next' });
            const prevButton = screen.getByRole('button', { name: 'Previous' });
            
            // 1. 初始狀態
            expect(prevButton).toBeDisabled();
            expect(nextButton).toBeDisabled(); 

            // 2. 回答必填題 (Q101, Scale)
            fireEvent.click(screen.getByText('5')); 
            expect(nextButton).not.toBeDisabled();
            
            // 3. 前進到第二頁 (同步狀態更新)
            fireEvent.click(nextButton);

            // ⭐️ 修正競態條件 3: 等待頁面標題的異步翻譯完成
            await waitFor(() => screen.getByText('Dimension Two: Reliability'));
            
            expect(nextButton).toBeDisabled(); 

            // 4. 回退到第一頁 (同步狀態更新)
            fireEvent.click(prevButton);
            
            // ⭐️ 修正競態條件 4: 等待頁面標題的異步翻譯完成
            await waitFor(() => screen.getByText('Dimension One: Fairness'));
            
            expect(localStorage.setItem).toHaveBeenCalledWith('questionnaireCurrentPage', '0');
        });

        it('should enable submit button when all last page required questions are answered', async () => {
            render(<QuestionnaireContent questionnaireId={1} />);
            await waitFor(() => screen.getByText('Dimension One: Fairness'));

            // 1. 回答第一頁，進入第二頁
            fireEvent.click(screen.getByText('5'));
            fireEvent.click(screen.getByRole('button', { name: 'Next' }));
            await waitFor(() => screen.getByText('Dimension Two: Reliability'));

            const submitButton = screen.getByRole('button', { name: 'Finish and Submit' });
            expect(submitButton).toBeDisabled();

            // 2. 回答 Q201 (Single Choice)
            fireEvent.click(screen.getByText('[EN] 是'));
            expect(submitButton).toBeDisabled(); 

            // 3. 回答 Q202 (Multiple Choice)
            fireEvent.click(screen.getByText('[EN] 數據偏差'));
            expect(submitButton).not.toBeDisabled();
        });
    });

    // --------------------------------------------------------------------------------------------------

    describe('Full Submission Flow', () => {
        it('should successfully submit answers, generate report, and redirect to report page', async () => {
        const MOCK_RESPONSE_ID = 999;
        
        // 創建可控制的 Promise
        let resolveGenerateReport: (value: boolean) => void;
        const generateReportPromise = new Promise<boolean>(resolve => {
            resolveGenerateReport = resolve;
        });

        // Mock APIs
        mockSubmitQuestionnaire.mockResolvedValueOnce({ id: MOCK_RESPONSE_ID });
        mockGenerateReport.mockReturnValueOnce(generateReportPromise);

        render(<QuestionnaireContent questionnaireId={1} />);
        
        // 等待問卷載入完成
        await waitFor(() => {
            expect(screen.getByText('Dimension One: Fairness')).toBeInTheDocument();
        });

        // 填寫第一頁的必填問題
        fireEvent.click(screen.getByText('5'));
        
        // 前往第二頁
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        
        await waitFor(() => {
            expect(screen.getByText('Dimension Two: Reliability')).toBeInTheDocument();
        });

        // 填寫第二頁的必填問題
        fireEvent.click(screen.getByText('[EN] 是'));
        fireEvent.click(screen.getByText('[EN] 數據偏差'));
        
        // 點擊提交按鈕
        const submitButton = screen.getByRole('button', { name: 'Finish and Submit' });
        expect(submitButton).toBeEnabled();
        fireEvent.click(submitButton);

        // 1. 檢查提交 API 被呼叫
        await waitFor(() => {
            expect(mockSubmitQuestionnaire).toHaveBeenCalledTimes(1);
        });

        // 2. 檢查正在生成報告的狀態
        await waitFor(() => {
            expect(screen.getByText('Generating Report...')).toBeInTheDocument();
        });

        // 3. 手動解決 generateReport 的 Promise
        await act(async () => {
            resolveGenerateReport(true);
            // 給 Promise 一個 tick 來解析
            await Promise.resolve();
        });

        // 4. 等待成功 Modal 出現
        await waitFor(() => {
            expect(screen.getByText('Submission Success!')).toBeInTheDocument();
            expect(screen.getByText('Report generated.')).toBeInTheDocument();
        });

        // 5. 檢查 Local Storage 狀態
        expect(localStorage.removeItem).toHaveBeenCalledWith('questionnaireCurrentPage');
        expect(localStorage.setItem).toHaveBeenCalledWith('responseId', MOCK_RESPONSE_ID.toString());

        // 6. 直接檢查 Modal 內的按鈕
        const modal = document.querySelector('.fixed.inset-0.bg-gray-700\\/40'); // 使用更具體的選擇器
        expect(modal).toBeInTheDocument();
        
        // 方法 1: 使用 within 在 Modal 內查找按鈕
        const viewReportButton = screen.getByRole('button', { name: 'View Report' });
        
        // 添加除錯資訊
        console.log('按鈕元素:', viewReportButton);
        console.log('按鈕是否可見:', viewReportButton.getAttribute('aria-hidden'));
        console.log('按鈕父元素:', viewReportButton.parentElement?.className);
        console.log('Modal 層級:', modal?.childNodes.length);
        
        // 確保按鈕沒有被禁用
        expect(viewReportButton).not.toBeDisabled();
        
        // 方法 2: 使用更詳細的點擊序列
        await act(async () => {
            // 先觸發 mouse down
            fireEvent.mouseDown(viewReportButton);
            fireEvent.mouseUp(viewReportButton);
            // 再觸發 click
            fireEvent.click(viewReportButton, { detail: 1 }); // detail: 1 表示單擊
        });

        // 7. 添加一個小的延遲，確保事件被處理
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        // 8. 檢查路由跳轉
        await waitFor(() => {
            expect(mockReplace).toHaveBeenCalledWith('/report');
        }, { 
            timeout: 2000,
            interval: 100,
            onTimeout: (error: Error) => {
                console.error('路由跳轉沒有發生！');
                console.log('當前 mockReplace 呼叫:', mockReplace.mock.calls);
                console.log('Modal 是否仍然顯示:', screen.queryByText('Submission Success!'));
                throw error;
            }
        });
    });
        
        it('should display error when submission API fails', async () => {
            mockSubmitQuestionnaire.mockRejectedValueOnce(new Error('Network error'));
            
            render(<QuestionnaireContent questionnaireId={1} />);
            await waitFor(() => screen.getByText('Dimension One: Fairness'));

            // 模擬填寫所有問題
            fireEvent.click(screen.getByText('5'));
            fireEvent.click(screen.getByRole('button', { name: 'Next' }));
            
            // ⭐️ 修正競態條件 6: 等待頁面跳轉完成
            await waitFor(() => screen.getByText('Dimension Two: Reliability'));
            
            fireEvent.click(screen.getByText('[EN] 是'));
            fireEvent.click(screen.getByText('[EN] 數據偏差'));
            fireEvent.click(screen.getByRole('button', { name: 'Finish and Submit' }));
            
            // 等待提交失敗
            await waitFor(() => {
                expect(mockSubmitQuestionnaire).toHaveBeenCalledTimes(1);
            });

            // 檢查錯誤提示是否顯示 (ErrorAlert 組件會在頂部顯示)
            await waitFor(() => {
                 expect(screen.getByText('提交過程中發生網路錯誤。')).toBeInTheDocument();
            });
            
            expect(mockGenerateReport).not.toHaveBeenCalled();
        });
    });
});