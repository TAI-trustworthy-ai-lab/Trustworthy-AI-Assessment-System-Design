const config: Config = {
  darkMode: 'class',
  experimental: {
    optimizeUniversalDefaults: true,
    disableColorUsage: true,   // ⬅ 這個最重要，停用 oklab()/lab() 色彩轉換
  },
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: []
}

export default config
