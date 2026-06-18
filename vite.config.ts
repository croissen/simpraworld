import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 이 앱이 simpraworld.com 루트를 차지(마케팅 페이지 + /my-universe 캔버스 라우트 단일 배포).
  base: '/',
  plugins: [react()],
  server: { host: true, port: 1123, strictPort: true },
  // styled-components v6 + Vite: React 사본 중복으로 "Invalid hook call" 나는 것 방지
  resolve: {
    dedupe: ['react', 'react-dom', 'styled-components'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'styled-components'],
  },
})
