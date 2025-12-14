import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';

// Component under test
const QuestionnaireContent = require('../src/components/QuestionnaireContent').default; 

// Mocked services
import { 
    fetchQuestionnaire, 
    submitQuestionnaire,
    generateReport,
} from '@/services/responseService';
import { CATEGORY_MAP } from '../src/config/constants';


// =======================================================
// 1. Mock Variable Definitions
// =======================================================
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockFetchQuestionnaire = fetchQuestionnaire as jest.Mock;
const mockSubmitQuestionnaire = submitQuestionnaire as jest.Mock;
const mockGenerateReport = generateReport as jest.Mock;

// Mock Global Fetch API (for Translation API)
global.fetch = jest.fn((url: string, options: RequestInit) => {
    // Logic to handle translation mock
    if (url === "/api/translate" && options.body) {
        let originalText = "Translation error";
        try {
            const body = JSON.parse(options.body.toString());
            originalText = body.q;
        } catch (e) {
            console.error("Failed to parse fetch body in mock", e);
        }
        
        // Return original text for page titles/main titles, and prefixed text for options/questions
        const translatedText = originalText.includes('Dimension') || originalText.includes('評估問卷')
            ? originalText
            : `[EN] ${originalText}`;

        return Promise.resolve({
            ok: true,
            json: async () => ({ translatedText: translatedText }),
            status: 200,
        } as Response);
    }
    // Default fallback
    return Promise.resolve({ ok: false, json: async () => ({}), status: 404 } as Response);
}) as jest.Mock;


// =======================================================
// 2. Mock Modules
// =======================================================

// 2.1 Mock next/navigation (useRouter)
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// 2.2 Mock Services
jest.mock('@/services/responseService', () => ({
    fetchQuestionnaire: jest.fn(),
    submitQuestionnaire: jest.fn(),
    generateReport: jest.fn(),
}));

// 2.3 Mock i18next (Translation strings)
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

// 2.4 Mock FloatingChatWindow
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
// 3. Test Data Setup
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
// 4. Test Suite
// =======================================================

describe('QuestionnaireContent - Full Workflow Tests', () => {
    
    // Local Storage Mock setup
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
        // Mock router push/replace
        (useRouter as jest.Mock).mockReturnValue({ 
            push: mockPush, 
            replace: mockReplace 
        });
        jest.clearAllMocks();
        
        // Setup default Local Storage values
        setupLocalStorageMock({
            userId: '100', 
            authToken: 'test-token',
            currentProjectId: '500',
        });
        
        mockFetchQuestionnaire.mockResolvedValue(MOCK_QUESTIONNAIRE_DATA);
        jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console error output
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // --------------------------------------------------------------------------------------------------

    describe('Loading and Error States', () => {
        it('should show loading state initially and then render the first page', async () => {
            render(<QuestionnaireContent questionnaireId={1} />);

            // Initial state: Loading
            expect(screen.getByText('Loading...')).toBeInTheDocument();

            // Wait for data fetch
            await waitFor(() => {
                expect(mockFetchQuestionnaire).toHaveBeenCalledWith(1);
            });
            
            // Wait for async translation of the main title
            await waitFor(() => {
                expect(screen.getByText('可信賴 AI 評估問卷')).toBeInTheDocument();
            });

            // Check first page title
            expect(screen.getByText('Dimension One: Fairness')).toBeInTheDocument();
        });

        it('should show error screen if questionnaire loading fails', async () => {
            const errorBody = '{"status":404, "message":"Not Found"}';
            mockFetchQuestionnaire.mockRejectedValueOnce(new Error(errorBody));

            render(<QuestionnaireContent questionnaireId={1} />);

            // Wait for error state to render
            await waitFor(() => {
                expect(screen.getByText('Failed to load questionnaire.')).toBeInTheDocument();
            });

            expect(screen.getByRole('button', { name: 'Retry Load' })).toBeInTheDocument();
        });
        
        it('should load saved answers and page progress from LocalStorage', async () => {
            // Setup Local Storage to be on Page 2
            setupLocalStorageMock({
                userId: '100',
                authToken: 'test-token',
                currentProjectId: '500',
                questionnaireAnswers: JSON.stringify({ 101: { score: 3, optionIds: [3] } }),
                questionnaireCurrentPage: '1', 
            });

            render(<QuestionnaireContent questionnaireId={1} />);

            // Wait for data load and page switch/translation
            await waitFor(() => {
                expect(screen.getByText('Dimension Two: Reliability')).toBeInTheDocument(); 
            });

            // Check if progress bar reflects Page 2
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
            
            // 1. Initial State
            expect(prevButton).toBeDisabled();
            expect(nextButton).toBeDisabled(); 

            // 2. Answer required Q101 (Scale)
            fireEvent.click(screen.getByText('5')); 
            expect(nextButton).not.toBeDisabled();
            
            // 3. Navigate to Page 2
            fireEvent.click(nextButton);

            // Wait for Page 2 title translation
            await waitFor(() => screen.getByText('Dimension Two: Reliability'));
            
            // On Page 2, Next is disabled until required Qs are answered
            expect(nextButton).toBeDisabled(); 

            // 4. Navigate back to Page 1
            fireEvent.click(prevButton);
            
            // Wait for Page 1 title translation
            await waitFor(() => screen.getByText('Dimension One: Fairness'));
            
            // Check Local Storage update
            expect(localStorage.setItem).toHaveBeenCalledWith('questionnaireCurrentPage', '0');
        });

        it('should enable submit button when all last page required questions are answered', async () => {
            render(<QuestionnaireContent questionnaireId={1} />);
            await waitFor(() => screen.getByText('Dimension One: Fairness'));

            // 1. Answer Page 1 and move to Page 2
            fireEvent.click(screen.getByText('5'));
            fireEvent.click(screen.getByRole('button', { name: 'Next' }));
            await waitFor(() => screen.getByText('Dimension Two: Reliability'));

            const submitButton = screen.getByRole('button', { name: 'Finish and Submit' });
            expect(submitButton).toBeDisabled();

            // 2. Answer required Q201 (Single Choice)
            fireEvent.click(screen.getByText('[EN] 是'));
            expect(submitButton).toBeDisabled(); // Q202 is also required

            // 3. Answer required Q202 (Multiple Choice)
            fireEvent.click(screen.getByText('[EN] 數據偏差'));
            expect(submitButton).not.toBeDisabled();
        });
    });

    // --------------------------------------------------------------------------------------------------

    describe('Full Submission Flow', () => {
        it('should successfully submit answers, generate report, and redirect to report page', async () => {
        const MOCK_RESPONSE_ID = 999;
        
        // Setup promise control for generateReport
        let resolveGenerateReport: (value: boolean) => void;
        const generateReportPromise = new Promise<boolean>(resolve => {
            resolveGenerateReport = resolve;
        });

        // Mock APIs behavior
        mockSubmitQuestionnaire.mockResolvedValueOnce({ id: MOCK_RESPONSE_ID });
        mockGenerateReport.mockReturnValueOnce(generateReportPromise);

        render(<QuestionnaireContent questionnaireId={1} />);
        
        // Wait for questionnaire load
        await waitFor(() => {
            expect(screen.getByText('Dimension One: Fairness')).toBeInTheDocument();
        });

        // 1. Answer Page 1
        fireEvent.click(screen.getByText('5'));
        
        // 2. Go to Page 2
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        
        await waitFor(() => {
            expect(screen.getByText('Dimension Two: Reliability')).toBeInTheDocument();
        });

        // 3. Answer Page 2
        fireEvent.click(screen.getByText('[EN] 是'));
        fireEvent.click(screen.getByText('[EN] 數據偏差'));
        
        // 4. Click Submit
        const submitButton = screen.getByRole('button', { name: 'Finish and Submit' });
        expect(submitButton).toBeEnabled();
        fireEvent.click(submitButton);

        // 5. Check Submission API called
        await waitFor(() => {
            expect(mockSubmitQuestionnaire).toHaveBeenCalledTimes(1);
        });

        // 6. Check Report Generation Loading Overlay
        await waitFor(() => {
            expect(screen.getByText('Generating Report...')).toBeInTheDocument();
        });

        // 7. Resolve generateReport promise (simulating successful report generation)
        await act(async () => {
            resolveGenerateReport(true);
            await Promise.resolve(); // Wait for promise resolution
        });

        // 8. Wait for Success Modal to appear
        await waitFor(() => {
            expect(screen.getByText('Submission Success!')).toBeInTheDocument();
            expect(screen.getByText('Report generated.')).toBeInTheDocument();
        });

        // 9. Check Local Storage updates
        expect(localStorage.removeItem).toHaveBeenCalledWith('questionnaireCurrentPage');
        expect(localStorage.setItem).toHaveBeenCalledWith('responseId', MOCK_RESPONSE_ID.toString());

        // 10. Click 'View Report' button inside the Modal
        const viewReportButton = screen.getByRole('button', { name: 'View Report' });
        
        await act(async () => {
            // Use fireEvent.click directly on the button element
            fireEvent.click(viewReportButton);
            await Promise.resolve();
        });

        // 11. Check Redirection to '/report'
        expect(mockPush).toHaveBeenCalledWith('/report');
    });
        
        it('should display error when submission API fails', async () => {
            mockSubmitQuestionnaire.mockRejectedValueOnce(new Error('Network error'));
            
            render(<QuestionnaireContent questionnaireId={1} />);
            await waitFor(() => screen.getByText('Dimension One: Fairness'));

            // 1. Simulate answering all required questions
            fireEvent.click(screen.getByText('5'));
            fireEvent.click(screen.getByRole('button', { name: 'Next' }));
            
            await waitFor(() => screen.getByText('Dimension Two: Reliability'));
            
            fireEvent.click(screen.getByText('[EN] 是'));
            fireEvent.click(screen.getByText('[EN] 數據偏差'));
            fireEvent.click(screen.getByRole('button', { name: 'Finish and Submit' }));
            
            // 2. Wait for submission failure
            await waitFor(() => {
                expect(mockSubmitQuestionnaire).toHaveBeenCalledTimes(1);
            });

            // 3. Check if the error alert is displayed
            await waitFor(() => {
                expect(screen.getByText('提交過程中發生網路錯誤。')).toBeInTheDocument();
            });
            
            expect(mockGenerateReport).not.toHaveBeenCalled();
        });
    });
});