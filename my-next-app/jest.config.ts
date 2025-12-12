// jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // 指向 Next.js 專案根目錄（通常就是當前目錄）
  dir: './',
})

// 自訂的 Jest 設定
const config: Config = {
  // 這行一定要加，否則 next/jest 會蓋掉你的設定
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  testEnvironment: 'jest-environment-jsdom',

  clearMocks: true,

  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],

  moduleNameMapper: {
    // 路徑別名
    '^@/(.*)$': '<rootDir>/src/$1',

    // CSS 模組 mock
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',

    // 靜態資源 mock
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.ts',
  },

  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
}

// next/jest 會自動處理 babel/ts-jest/swf 等，千萬不要自己加 transform！
export default createJestConfig(config)