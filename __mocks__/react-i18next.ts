// __mocks__/react-i18next.ts
const reactI18next = jest.requireActual('react-i18next');

module.exports = {
  ...reactI18next,
  // 直接 mock useTranslation
  useTranslation: () => {
    return {
      t: (str: string, options?: any) => {
        if (options) return `${str} ${JSON.stringify(options)}`;
        return str;
      },
      i18n: {
        changeLanguage: () => new Promise(() => {}),
        language: 'zh',
        languages: ['zh', 'en'],
      },
    };
  },
  // 防止 initReactI18next 被呼叫導致 crash
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
  // Trans, withTranslation 等也建議 mock
  Trans: ({ children }: { children: React.ReactNode }) => children,
};