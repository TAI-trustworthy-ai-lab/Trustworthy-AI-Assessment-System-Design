import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTranslation } from 'react-i18next';
import ResponseViewer, { ClickAwaySelect } from '@/components/ResponseViewer'; // 調整路徑
import { ViewerState } from '@/services/responseService';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'zh',
      changeLanguage: jest.fn(),
    },
  }),
}));

// Mock fetch for translation
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ translatedText: 'Translated Text' }),
  } as Response)
);

// 簡單的 mock data
const mockQuestionnaire = {
  id: 1,
  title: 'AI 評估問卷',
  description: '這是一份測試問卷',
  questions: [
    {
      id: 1,
      text: '準確性問題',
      category: 'ACCURACY',
      description: '這是說明',
      order: 1,
      type: 'SCALE' as const,
      required: true,
      options: [
        { id: 10, text: '1', value: 1, order: 1 },
        { id: 11, text: '2', value: 2, order: 2 },
        { id: 12, text: '3', value: 3, order: 3 },
      ],
    },
    {
      id: 2,
      text: '單選問題',
      category: 'RELIABILITY',
      description: '',
      order: 1,
      type: 'SINGLE_CHOICE' as const,
      required: false,
      options: [
        { id: 20, text: '是', value: 10, order: 1 },
        { id: 21, text: '否', value: 0, order: 2 },
      ],
    },
    {
      id: 3,
      text: '多選問題',
      category: 'SAFETY',
      description: '',
      order: 1,
      type: 'MULTIPLE_CHOICE' as const,
      required: true,
      options: [
        { id: 30, text: '選項A', value: 5, order: 1 },
        { id: 31, text: '選項B', value: 10, order: 2 },
      ],
    },
    {
      id: 4,
      text: '文字問題',
      category: 'PRIVACY',
      description: '',
      order: 1,
      type: 'TEXT' as const,
      required: false,
    },
  ],
  group: { id: 1, name: '測試群組' },
};

const mockResponse = {
  id: 100,
  answers: [
    { questionId: 1, value: 2, optionId: 11, textValue: null, question: { id: 1, type: 'SCALE' } },
    { questionId: 2, value: 10, optionId: 20, textValue: null, question: { id: 2, type: 'SINGLE_CHOICE' } },
    { questionId: 3, value: 5, optionId: 30, textValue: null, question: { id: 3, type: 'MULTIPLE_CHOICE' } },
    { questionId: 3, value: 10, optionId: 31, textValue: null, question: { id: 3, type: 'MULTIPLE_CHOICE' } },
    { questionId: 4, value: null, optionId: null, textValue: '原始文字', question: { id: 4, type: 'TEXT' } },
  ],
};

const mockData = {
  response: mockResponse,
  questionnaire: mockQuestionnaire,
};

const defaultProps = {
  curState: ViewerState.success,
  data: mockData,
  onEdit: jest.fn(),
  onReport: jest.fn(),
  notify: jest.fn(),
};

describe('ResponseViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders questionnaire title and description', () => {
    render(<ResponseViewer {...defaultProps} />);

    expect(screen.getByText('AI 評估問卷')).toBeInTheDocument();
    expect(screen.getByText('這是一份測試問卷')).toBeInTheDocument();
  });

  it('groups questions by category and displays category titles', () => {
    render(<ResponseViewer {...defaultProps} />);

    // 直接用 heading role 找主要分類標題
    expect(screen.getByRole('heading', { name: '準確性' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '可靠性' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '安全性' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '隱私' })).toBeInTheDocument();
  });

  it('renders SCALE question with correct selected button', () => {
    render(<ResponseViewer {...defaultProps} />);

    const buttons = screen.getAllByRole('button', { name: /^[123]$/ });
    expect(buttons).toHaveLength(3);

    // 預設選 2 (value=2)
    const selectedButton = buttons.find(btn => btn.classList.contains('bg-indigo-500'));
    expect(selectedButton).toHaveTextContent('2');
  });

  it('renders SINGLE_CHOICE question with correct selection', () => {
    render(<ResponseViewer {...defaultProps} />);

    expect(screen.getByRole('button', { name: '是' })).toHaveClass('bg-indigo-500');
    expect(screen.getByRole('button', { name: '否' })).not.toHaveClass('bg-indigo-500');
  });

  it('renders TEXT question with existing answer', () => {
    render(<ResponseViewer {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('請在此輸入您的回答...');
    expect(textarea).toHaveValue('原始文字');
  });

  it('shows required indicator (*) for required questions', () => {
    render(<ResponseViewer {...defaultProps} />);

    const requiredStars = screen.getAllByText('*');
    expect(requiredStars.length).toBeGreaterThan(0);
  });

  it('allows editing when in editing mode and updates answers', async () => {
    const user = userEvent.setup();

    render(
      <ResponseViewer
        {...defaultProps}
        curState={ViewerState.editing}
      />
    );

    // 切換到 SCALE 題目選 3
    const scaleButtons = screen.getAllByRole('button', { name: /^[123]$/ });
    await user.click(scaleButtons[2]); // 點選 3

    // 檢查背景變成藍色
    expect(scaleButtons[2]).toHaveClass('bg-indigo-500');
  });

  it('shows finish button only in editing mode', () => {
    const { rerender } = render(<ResponseViewer {...defaultProps} curState={ViewerState.viewing} />);
    expect(screen.queryByText('Questionnaire.actions.finishAndSubmit')).not.toBeInTheDocument();

    rerender(<ResponseViewer {...defaultProps} curState={ViewerState.editing} />);
    expect(screen.getByText('Questionnaire.actions.finishAndSubmit')).toBeInTheDocument();
  });

  it('highlights modified questions in yellow/red based on completion', async () => {
    const user = userEvent.setup();

    render(<ResponseViewer {...defaultProps} curState={ViewerState.editing} />);

    // 找到多選題的選項按鈕
    const optionA = screen.getByRole('button', { name: '選項A' });
    const optionB = screen.getByRole('button', { name: '選項B' });

    // 初始應選中（藍色），卡片是白或黃？初始未修改應白
    expect(optionA).toHaveClass('bg-indigo-500');
    expect(optionB).toHaveClass('bg-indigo-500');

    // 取消選項A
    await user.click(optionA);
    // 現在只剩B → 已修改 + 仍完成（因必填但有1個）→ 應黃
    const questionCard = optionA.closest('div[class*="p-4"]');
    expect(questionCard).toHaveClass('bg-yellow-100');

    // 再取消選項B
    await user.click(optionB);
    // 現在空 → 已修改 + 未完成 → 應紅
    await waitFor(() => {
      expect(questionCard).toHaveClass('bg-red-100');
    });

    // 再選回A → 應變回黃
    await user.click(optionA);
    await waitFor(() => {
      expect(questionCard).toHaveClass('bg-yellow-100');
    });
  });
});

describe('ClickAwaySelect', () => {
  const options = [
    { label: '準確性', value: 0 },
    { label: '可靠性', value: 1 },
    { label: '安全性', value: 2 },
  ];

  it('renders current value and opens dropdown on click', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <ClickAwaySelect value={1} options={options} onChange={onChange} />
    );

    expect(screen.getByText('可靠性')).toBeInTheDocument();

    await user.click(screen.getByRole('button')); // 點開

    expect(screen.getByText('準確性')).toBeVisible();
    expect(screen.getByText('安全性')).toBeVisible();

    await user.click(screen.getByText('準確性'));

    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();

    render(
      <>
        <ClickAwaySelect value={0} options={options} onChange={jest.fn()} />
        <div data-testid="outside">Outside</div>
      </>
    );

    // 打開選單
    await user.click(screen.getByRole('button'));

    // 確認選單打開（選項可見）
    const reliabilityOption = screen.getByText('可靠性');
    const safetyOption = screen.getByText('安全性');
    expect(reliabilityOption).toBeVisible();
    expect(safetyOption).toBeVisible();

    // 點擊外部
    await user.click(screen.getByTestId('outside'));

    // 確認選單關閉（選項消失）
    await waitFor(() => {
      expect(reliabilityOption).not.toBeInTheDocument();
      expect(safetyOption).not.toBeInTheDocument();
    });
  });
});