import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  build: {
    // 缩短构建日志：跳过压缩后体积报告（仅影响 CI 输出，不影响产物）
    reportCompressedSize: false,
  },
})
