import React from 'react';
// ✅ 導入 within 和 waitFor
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuestionnaireEditor from '../src/app/admin/QuestionnaireEditor';

// ----------------------------------------------------------------------
// 1. 【修正】從 QuestionnaireEditor 導入匯出的型別
// ----------------------------------------------------------------------
import {
    Option,
    Question as BaseQuestion, // 導入基礎 Question 型別
    QuestionnaireData,
    AnswerValue // 導入 AnswerValue 型別
} from '../src/app/admin/QuestionnaireEditor';

// 為了維持測試案例 5 (未知類型) 的邏輯，我們擴展導入的 Question 型別
interface Question extends BaseQuestion {
    type: BaseQuestion['type'] | 'INVALID';
}

// AnswerData 和 ResponseData 假設未被匯出，保留本地定義（或從 API 層導入）
interface AnswerData {
    id: number;
    responseId: number;
    questionId: number;
    optionId?: number;
    value?: number;
    textValue?: string;
    createdAt: string;
    question: {
        id: number;
        text: string;
        category: string;
        type: string;
    };
    option?: Option;
}

interface ResponseData {
    id: number;
    userId: number;
    projectId: number;
    versionId: number;
    submittedAt: string;
    label?: string;
    user: { id: number; name: string; email: string };
    project: { id: 1; name: string };
    version: { id: 1; title: string };
    answers: AnswerData[];
}

// ----------------------------------------------------------------------
// 2. 服務與 Hook 模擬 (Mocking)
// ----------------------------------------------------------------------

// Mock: questionnaireService 
jest.mock('@/services/questionnaireService', () => ({
    createQuestionnaire: jest.fn(),
    deleteQuestionnaire: jest.fn(),
}));

const mockService = require('@/services/questionnaireService');

const mockCreateQuestionnaire = mockService.createQuestionnaire as jest.Mock;
const mockDeleteQuestionnaire = mockService.deleteQuestionnaire as jest.Mock;

// Mock: responseService (ViewerState) - 必須存在，否則 curState 無法正確定義
jest.mock('@/services/responseService', () => ({
    ViewerState: {
        detail: 'detail',
        editing: 'edit',
    },
}));

// 取得 ViewerState 供 renderComponent 使用
const { ViewerState } = require('@/services/responseService');


// Mock: react-i18next 的 useTranslation 
const mockT = (key: string, options?: any) => {
    const translations: Record<string, string> = {
        'questionnaireEditor.cancel': '取消更改',
        'questionnaireEditor.save': '儲存更改',
        'questionnaireEditor.unknownQuestionType': '未知問題類型',
        'questionnaire.actions.showDetails': '顯示詳情',
        'questionnaire.actions.hideDetails': '隱藏詳情',

        'questionnaireEditor.descriptionPlaceholder': '輸入題目描述（可留空）',

        'SCALE': '量表題',
        'SINGLE_CHOICE': '單選題',
        'MULTIPLE_CHOICE': '多選題',
        'TEXT': '文字題',

        'ACCURACY': '準確性',
        'RELIABILITY': '可靠性',
        'SAFETY': '安全性',
        'RESILIENCE': '韌性',

        'ACCURACY_CONTENT': 'AI判斷的結果與真實情況相近程度',
    };

    if (key === 'questionnaireEditor.unknownQuestionType' && options?.type) {
        return `未知問題類型: ${options.type}`;
    }

    return translations[key] || key;
};

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: mockT,
        i18n: {
            language: 'zh'
        }
    }),
    TranslatedText: ({ text, textKey }: { text?: string, textKey?: string }) => {
        const content = textKey ? mockT(textKey) : text;
        if (textKey && textKey.endsWith('_CONTENT')) {
            return <span data-testid="translated-category-content">{content}</span>;
        }
        return <span data-testid="translated-text-mock">{content}</span>;
    },
}));


// Mock: Next.js/內部 useRouter 
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

// ----------------------------------------------------------------------
// 3. 模擬數據 (Mock Data) 
// ----------------------------------------------------------------------

const scaleOptions: Option[] = [
    { id: 1, text: '1', value: 1, order: 1 },
    { id: 2, text: '2', value: 2, order: 2 },
    { id: 3, text: '3', value: 3, order: 3 },
    { id: 4, text: '4', value: 4, order: 4 },
    { id: 5, text: '5', value: 5, order: 5 }
];

const mockQuestionnaireData: QuestionnaireData = {
    id: 1,
    title: 'AI 倫理問卷測試',
    description: '這是一個用於測試的問卷描述。',
    group: { id: 10, name: 'AI_GROUP' },
    questions: [
        // Q101: 有描述的題目，用於測試存在與切換，且有預設答案 (使用 unique 標籤)
        { id: 101, text: '準確性量表問題 (有描述)', description: '量表題描述', category: 'ACCURACY', order: 1, type: 'SCALE', required: true, options: scaleOptions },
        // Q106: 沒有描述的題目，用於測試按鈕不存在 (核心修正點)
        { id: 106, text: '準確性量表問題 (無描述)', description: undefined, category: 'ACCURACY', order: 1.5, type: 'SCALE', required: true, options: scaleOptions },

        { id: 102, text: '可靠性單選題', description: '單選題描述', category: 'RELIABILITY', order: 2, type: 'SINGLE_CHOICE', required: true, options: [{ id: 6, text: '選項 A', value: 10, order: 1 }, { id: 7, text: '選項 B', value: 20, order: 2 }] },
        { id: 103, text: '安全性多選題', description: '多選題描述', category: 'SAFETY', order: 3, type: 'MULTIPLE_CHOICE', required: false, options: [{ id: 8, text: '多選 X', value: 5, order: 1 }, { id: 9, text: '多選 Y', value: 15, order: 2 }] },
        { id: 104, text: '韌性文字題', description: '文字題描述', category: 'RESILIENCE', order: 4, type: 'TEXT', required: true },
        { id: 105, text: '未知類型問題', description: '測試未知類型', category: 'ACCURACY', order: 5, type: 'INVALID', required: true },
    ] as Question[],
};

const mockResponseData: ResponseData = {
    id: 99,
    userId: 1,
    projectId: 1,
    versionId: 1,
    submittedAt: '2023-10-27T10:00:00Z',
    label: 'Test Response',
    user: { id: 1, name: 'Test User', email: 'test@example.com' },
    project: { id: 1, name: 'Project Alpha' },
    version: { id: 1, title: 'v1.0' },
    answers: [
        {
            id: 1, responseId: 99, questionId: 101, optionId: 4, value: 4, // Q101 預設答案為 4
            createdAt: '', question: mockQuestionnaireData.questions[0] as any,
            option: mockQuestionnaireData.questions[0].options![3]
        },
    ],
};

// ----------------------------------------------------------------------
// 4. 測試套件
// ----------------------------------------------------------------------

describe('QuestionnaireEditor', () => {
    const mockOnSave = jest.fn();
    const mockOnCancel = jest.fn();
    const mockOnQuestionnaireUpdate = jest.fn();
    const mockOnDeleteQuestionnaire = jest.fn();
    const mockSetEditingQuestionnaireId = jest.fn();

    // 【主要修正處】輔助函數：修改 props 結構以匹配元件期待的 { data, curState }
    const renderComponent = (
        questionnaireData: QuestionnaireData,
        responseData: ResponseData | null,
        isEditable: boolean = true,
        canEditQuestionnaireStructure: boolean = false
    ) => {
        const finalResponse = { id: 0, answers: [], userId: 0, projectId: 0, versionId: 0, submittedAt: '', user: {} as any, project: {} as any, version: {} as any };

        // 根據 isEditable 決定傳入元件的 curState
        const curState = isEditable ? ViewerState.editing : ViewerState.detail;

        return render(
            <QuestionnaireEditor
                data={{
                    questionnaire: questionnaireData,
                    response: finalResponse,
                }}
                curState={curState}
            />
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Test 1: 基本渲染和預設答案 (僅檢查唯讀狀態下的基本顯示)
    test('should render title, description, and group questions with pre-selected answer (SCALE) in detail mode', () => {
        renderComponent(mockQuestionnaireData, mockResponseData, false); // isEditable: false (唯讀模式)

        expect(screen.getByText(mockQuestionnaireData.title)).toBeInTheDocument();
        expect(screen.getByText('這是一個用於測試的問卷描述。')).toBeInTheDocument();

        // 檢查儲存按鈕不存在 (唯讀模式應無儲存按鈕)
        expect(screen.queryByRole('button', { name: '儲存更改' })).not.toBeInTheDocument();
    });

    // Test 2: 互動 - SCALE 量表題（可編輯）
    test('should allow answering a SCALE question and trigger isDirty state', async () => {
        renderComponent(mockQuestionnaireData, null, true); // 編輯模式

        const q101Container = screen.getByText('準確性量表問題 (有描述)').closest('div') as HTMLElement;

        // 1. 點擊量表題：造成 isDirty 狀態 (改變內容)
        fireEvent.click(q101Container);
        const textQuestionInput = await screen.getByDisplayValue('1');

        // 2. 改變內容：觸發 isDirty 狀態
        //    fireEvent.change 的第二個參數是事件物件，其中 target: { value: '新內容' } 是模擬輸入的關鍵
        fireEvent.change(textQuestionInput, { target: { value: '這是一個測試回答' } });

        // 2. 檢查 isDirty 狀態是否觸發：使用 findByRole 等待「儲存更改」按鈕出現
        const saveButton = await screen.findByRole('button', { name: '儲存更改' }, { timeout: 2000 });
        expect(saveButton).toBeInTheDocument();
    });

    // Test 3: 儲存與取消功能
    test('should call onSave when save button is clicked after change', async () => {
        renderComponent(mockQuestionnaireData, mockResponseData, true);

        const q101Container = screen.getByText('準確性量表問題 (有描述)').closest('div') as HTMLElement;

        // 1. 點擊量表題：造成 isDirty 狀態 (改變內容)
        fireEvent.click(q101Container);
        const textQuestionInput = await screen.getByDisplayValue('5');

        // 2. 改變內容：觸發 isDirty 狀態
        //    fireEvent.change 的第二個參數是事件物件，其中 target: { value: '新內容' } 是模擬輸入的關鍵
        fireEvent.change(textQuestionInput, { target: { value: '這是一個測試回答' } });

        // 2. 等待「儲存更改」按鈕出現後，再點擊
        const saveButton = await screen.findByRole('button', { name: '儲存更改' }, { timeout: 2000 });
        fireEvent.click(saveButton);
    });

    // Test 4: 題型渲染器處理未知題型
    test('should display unknown question type message for unsupported type', () => {
        renderComponent(mockQuestionnaireData, mockResponseData, true);

        // 檢查未知類型問題 (ID 105) 的錯誤訊息
        expect(screen.getByText('未知問題類型: INVALID')).toBeInTheDocument();
    });
});
