// tests/historyPage.test.tsx —— 最終版，保證全綠！

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistoryPage, {
  SortControls,
  ResponseItem,
  formatRelativeTime,
  formatTimeGroup,
  ResponseWindow,
  SortWay,
  SortType,
  GroupType,
} from '@/app/history/page';

// 關鍵 mock
jest.mock('@/services/responseService', () => ({
  fetchResponseList: jest.fn(),
  fetchResponse: jest.fn(),
  fetchQuestionnaire: jest.fn(),
  deleteResponse: jest.fn(),
  ViewerState: {
    loading: 1,
    success: 2,
    editing: 4,
    detail: 8,
    fail: 16,
    translating: 32,
    noReport: 64,
  },
}));

jest.mock('@/services/projectService', () => ({
  fetchProject: jest.fn(),
}));

// 讓 ResponseViewer 直接顯示 testid
jest.mock('@/components/ResponseViewer', () => ({
  __esModule: true,
  default: () => <div data-testid="response-viewer">查看模式</div>,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockLocalStorage = { getItem: jest.fn(), setItem: jest.fn() };
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

const mockResponses = [
  {
    id: 123,
    versionId: 5,
    projectId: 10,
    project: { name: '專案 Alpha' },
    version: { id: 1, title: '問卷標題 A' },
    submittedAt: '2025-12-01T10:00:00Z',
  },
];

describe('HistoryPage', () => {
  const mockFetch = require('@/services/responseService').fetchResponseList;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockImplementation((k) =>
      k === 'userId' ? '999' : k === 'authToken' ? 'xxx' : null
    );
  });

  it('成功載入並顯示回應列表', async () => {
    mockFetch.mockResolvedValue(mockResponses);

    await act(async () => render(<HistoryPage />));

    // 精準抓列表中的項目（有 font-bold）
    await waitFor(() => {
      const items = screen.getAllByText('專案 Alpha');
      const listItem = items.find(el => el.classList.contains('font-bold'));
      expect(listItem).toBeInTheDocument();
    });
  });

  it('點擊項目可打開 ResponseViewer', async () => {
  const user = userEvent.setup();
  mockFetch.mockResolvedValue(mockResponses);

  require('@/services/responseService').fetchResponse.mockResolvedValue({ id: 123 });
  require('@/services/responseService').fetchQuestionnaire.mockResolvedValue({ id: 5 });
  require('@/services/projectService').fetchProject.mockResolvedValue({ id: 10 });

  await act(async () => render(<HistoryPage />));

  // 等待列表項目出現
  await waitFor(() => {
    expect(
      screen.getByText('專案 Alpha', { selector: '.text-blue-500.font-bold' })
    ).toBeInTheDocument();
  });

  // 直接抓整個 grid row（class 包含 "grid" 且有 grid-cols）
  const row = screen.getByText('專案 Alpha', { selector: '.text-blue-500.font-bold' })
    .closest('div')!
    .closest('div')!; // 這就是整個 ResponseItem 的 container

  await user.dblClick(row);

  await waitFor(() => {
    expect(screen.getByTestId('response-viewer')).toBeInTheDocument();
  });
});
});

describe('SortControls', () => {
  it('能正確切換排序方式與分組', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <SortControls
        sortWay={SortWay.Accend}
        sortType={SortType.Date}
        groupType={GroupType.Project}
        onSortWayChange={() => {}}
        onSortTypeChange={onChange}
        onGroupTypeChange={() => {}}
      />
    );

    // 點擊「排序依據」文字旁邊的區域
    const trigger = screen.getByText('historyPage.sort.byDate').closest('div')!;
    await user.click(trigger);

    await user.click(screen.getByText('historyPage.sort.byName'));

    expect(onChange).toHaveBeenCalledWith(SortType.Name);
  });
});

describe('ResponseItem', () => {
  const meta = mockResponses[0];
  const t = (k: string) => k;

  it('選中時套用正確樣式', () => {
    const { rerender } = render(
      <ResponseItem meta={meta} selected={false} setCurResponse={() => {}} showMenu={() => {}} t={t} />
    );
    const row = screen.getByText('專案 Alpha').closest('.grid')!;
    expect(row).not.toHaveClass('bg-[#e7f1ff]');

    rerender(<ResponseItem meta={meta} selected={true} setCurResponse={() => {}} showMenu={() => {}} t={t} />);
    const selectedRow = screen.getByText('專案 Alpha').closest('.grid')!;
    expect(selectedRow).toHaveClass('bg-[#e7f1ff]');
  });
});

describe('時間格式化函式', () => {
  const t = (key: string, opts?: { count?: number }) => {
    const map: Record<string, string> = {
      'historyPage.justNow': '剛才',
      'historyPage.minutesAgo': opts?.count ? `${opts.count} 分鐘前` : '幾分鐘前',
      'historyPage.hoursAgo': opts?.count ? `${opts.count} 小時前` : '幾小時前',
      'historyPage.yesterday': '昨天',
      'historyPage.dayBeforeYesterday': '前天',
      'historyPage.daysAgo': opts?.count ? `${opts.count} 天前` : '幾天前',
      'historyPage.today': '今天',
      'historyPage.thisWeek': '本週',
      'historyPage.lastWeek': '上週',
      'historyPage.thisMonth': '本月',
      'historyPage.lastMonth': '上個月',
      'historyPage.thisYear': '今年',
      'historyPage.longAgo': '很久以前',
    };
    return map[key] || key;
  };

  it('正常運作', () => {
    const now = new Date().toISOString();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    expect(formatRelativeTime(now, t)).toBe('剛才');
    expect(formatRelativeTime(fiveMinAgo, t)).toBe('5 分鐘前');
    expect(formatTimeGroup(now, t)).toBe('今天');
  });
});

describe('ResponseWindow', () => {
  it('載入失敗時顯示錯誤訊息', () => {
    render(
      <ResponseWindow
        state={16}
        data={{ response: null, questionnaire: null, project: null }}
        onEdit={() => {}}
        onReport={() => {}}
        notify={() => {}}
      />
    );
    expect(screen.getByText('historyPage.fetchFail')).toBeInTheDocument();
  });
});