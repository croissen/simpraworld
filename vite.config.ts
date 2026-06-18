import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  // 배포: simpraworld.com/my-universe/ 하위에 얹힘(빌드결과를 포트폴리오 public/my-universe로 복사).
  // dev(npm run dev)는 루트(/)로 둬서 localhost:1123 그대로 동작.
  base: command === 'build' ? '/my-universe/' : '/',
  plugins: [react()],
  server: { host: true, port: 1123, strictPort: true },
  // styled-components v6 + Vite: React 사본 중복으로 "Invalid hook call" 나는 것 방지
  resolve: {
    dedupe: ['react', 'react-dom', 'styled-components'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'styled-components'],
  },
}))
