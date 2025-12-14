import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint:{
    // 部署階段先略過 ESLint 錯誤
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 部署階段先略過 TypeScript 型別錯誤
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
