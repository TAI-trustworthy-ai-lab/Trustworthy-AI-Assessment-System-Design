// __tests__/HistoryPage.test.tsx
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import HistoryPage, {
  SortControls,
  ResponseItem,
  formatRelativeTime,
  formatTimeGroup,
  ResponseWindow,
} from '@/app/history/page'; // 請依實際路徑調整

// Mock 必要的模組
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/services/responseService', () => ({
  fetchResponseList: jest.fn(),
  fetchResponse: jest.fn(),
  fetchQuestionnaire: jest.fn(),
  deleteResponse: jest.fn(),
}));

jest.mock('@/services/projectService', () => ({
  fetchProject: jest.fn(),
}));

jest.mock('@/components/ResponseViewer', () => ({
  __esModule: true,
  default: ({ curState, data }: any) => (
    <div data-testid="response-viewer">
      {curState === 4 ? 'Editing Mode' : 'View Mode'} - {data.response?.id || 'no data'}
    </div>
  ),
}));

// 全局 mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// 測試資料
const mockResponses: any[] = [
  {
    id: 123,
    versionId: 5,
    projectId: 10,
    project: { name: '專案 Alpha' },
    version: { id: 1, title: '問卷標題 A' },
    submittedAt: '2025-12-01T10:00:00Z',
  },
  {
    id: 456,
    versionId: 6,
    projectId: 11,
    project: { name: 'Beta Project' },
    version: { id: 2, title: 'Survey B' },
    submittedAt: '2025-11-20T08:30:00Z',
  },
];

describe('HistoryPage', () => {
  const pushMock = jest.fn();
  const mockFetchResponseList = require('@/services/responseService').fetchResponseList;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    (useRouter as jest.Mock).mockReturnValue({ push: pushMock });

    mockLocalStorage.setItem('userId', 'user-999');
    mockLocalStorage.setItem('authToken', 'fake-jwt-token');
  });

  it('顯示載入中狀態', () => {
    mockFetchResponseList.mockImplementation(() => new Promise(() => {})); // 永遠 pending

    render(<HistoryPage />);

    expect(screen.getByText(/historyPage.loadingResponses/)).toBeInTheDocument();
  });

  it('無回應時顯示「無歷史紀錄」', async () => {
    mockFetchResponseList.mockResolvedValue([]);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('historyPage.noHistory')).toBeInTheDocument();
    });
  });

  it('成功載入並顯示回應列表', async () => {
    mockFetchResponseList.mockResolvedValue(mockResponses);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('專案 Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta Project')).toBeInTheDocument();
    });
  });

  it('點擊項目可打開 ResponseViewer', async () => {
    const user = userEvent.setup();
    mockFetchResponseList.mockResolvedValue([mockResponses[0]]);
    require('@/services/responseService').fetchResponse.mockResolvedValue({ id: 123 });
    require('@/services/responseService').fetchQuestionnaire.mockResolvedValue({ id: 5, title: '問卷標題 A' });
    require('@/services/projectService').fetchProject.mockResolvedValue({ id: 10, name: '專案 Alpha' });

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => screen.getByText('專案 Alpha'));

    const item = screen.getByText('專案 Alpha').closest('div[role="row"]') || screen.getByText('專案 Alpha');
    await user.dblClick(item);

    await waitFor(() => {
      expect(screen.getByTestId('response-viewer')).toBeInTheDocument();
    });
  });

  it('右鍵選單功能正常（打開、編輯、刪除等）', async () => {
    const user = userEvent.setup();
    mockFetchResponseList.mockResolvedValue([mockResponses[0]]);

    await act(async () => render(<HistoryPage />));

    await waitFor(() => screen.getByText('專案 Alpha'));

    const moreBtn = screen.getByRole('button', { name: /more/i }); // SVG 點點按鈕

    await user.click(moreBtn);

    expect(screen.getByText('historyPage.open')).toBeInTheDocument();
    expect(screen.getByText('historyPage.edit')).toBeInTheDocument();
    expect(screen.getByText('historyPage.delete')).toBeInTheDocument();
  });
});

describe('SortControls', () => {
  it('能正確切換排序方式與分組', async () => {
    const user = userEvent.setup();
    const onSortWayChange = jest.fn();
    const onSortTypeChange = jest.fn();
    const onGroupTypeChange = jest.fn();

    render(
      <SortControls
        sortWay={0}
        sortType={1}
        groupType={0}
        onSortWayChange={onSortWayChange}
        onSortTypeChange={onSortTypeChange}
        onGroupTypeChange={onGroupTypeChange}
      />
    );

    const sortBySelect = screen.getAllByRole('button')[1]; // 第二個下拉選單
    await user.click(sortBySelect);
    await user.click(screen.getByText('historyPage.sort.byName'));

    expect(onSortTypeChange).toHaveBeenCalledWith(0); // SortType.Name
  });
});

describe('ResponseItem', () => {
  const meta = mockResponses[0];
  const t = (key: string) => key;

  it('顯示正確的專案名稱與問卷標題（含 TranslatedText）', () => {
    render(
      <ResponseItem
        meta={meta}
        selected={false}
        setCurResponse={() => {}}
        showMenu={() => {}}
        t={t}
      />
    );

    expect(screen.getByText('專案 Alpha')).toBeInTheDocument();
    expect(screen.getByText('問卷標題 A')).toBeInTheDocument();
  });

  it('選中時套用正確樣式', () => {
    const { rerender } = render(
      <ResponseItem meta={meta} selected={false} setCurResponse={() => {}} showMenu={() => {}} t={t} />
    );

    expect(screen.getByText('專案 Alpha').closest('div')).not.toHaveClass('bg-[#e7f1ff]');

    rerender(
      <ResponseItem meta={meta} selected={true} setCurResponse={() => {}} showMenu={() => {}} t={t} />
    );

    expect(screen.getByText('專案 Alpha').closest('div')).toHaveClass('bg-[#e7f1ff]');
  });
});

describe('時間格式化函式', () => {
  // 自己寫一個假的 t 函式
  const t = (key: string, options?: { count?: number }) => {
    if (key === 'historyPage.justNow') return '剛才';
    if (key === 'historyPage.minutesAgo' && options?.count) return `${options.count} 分鐘前`;
    if (key === 'historyPage.hoursAgo') return `${options.count} 小時前`;
    if (key === 'historyPage.yesterday') return '昨天';
    if (key === 'historyPage.dayBeforeYesterday') return '前天';
    if (key === 'historyPage.daysAgo') return `${options?.count} 天前`;
    if (key === 'historyPage.today') return '今天';
    if (key === 'historyPage.thisWeek') return '本週';
    if (key === 'historyPage.lastWeek') return '上週';
    return key;
  };

  it('formatRelativeTime 正確顯示「剛才」、「幾分鐘前」等', () => {
    const now = new Date().toISOString();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    expect(formatRelativeTime(now, t)).toBe('剛才');
    expect(formatRelativeTime(fiveMinAgo, t)).toBe('5 分鐘前');
    expect(formatRelativeTime(twoHoursAgo, t)).toBe('2 小時前');
  });

  it('formatTimeGroup 正確分組標籤', () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();

    expect(formatTimeGroup(today, t)).toBe('今天');
    expect(formatTimeGroup(yesterday, t)).toBe('昨天');
    expect(formatTimeGroup(lastWeek, t)).toBe('上週');
  });
});

describe('ResponseWindow', () => {
  it('載入失敗時顯示錯誤訊息', () => {
    render(
      <ResponseWindow
        state={8} // ViewerState.fail
        data={{ response: null, questionnaire: null, project: null }}
        onEdit={() => {}}
        onReport={() => {}}
        notify={() => {}}
      />
    );

    expect(screen.getByText('historyPage.fetchFail')).toBeInTheDocument();
  });

  it('顯示 detail panel 與工具列按鈕', async () => {
    const user = userEvent.setup();

    render(
      <ResponseWindow
        state={1} // success
        data={{
          response: { id: 123, user: { name: 'John' }, project: { name: 'Test' }, version: { title: 'Test Q' }, submittedAt: new Date().toISOString() },
          questionnaire: { id: 5, title: 'Test Q' },
          project: { id: 10, name: 'Test', taiOrders: [{ indicator: 'A', weight: 0.4 }] },
        }}
        onEdit={() => {}}
        onReport={() => {}}
        notify={() => {}}
      />
    );

    await user.click(screen.getByTitle('historyPage.detailInfo')); // Info 按鈕

    expect(screen.getByText('historyPage.detailInfo')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument(); // TAI 權重
  });
});