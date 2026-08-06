// 모바일/데스크톱 앱(Capacitor) 전용 웹 번들 빌드 → dist-app/
// 마케팅 사이트 없이 유니버스(App.tsx)만 담는다. 오프라인 동작 위해 상대경로(base './').
// vite.config.ts(웹 배포용, dedupe 설정)는 건드리지 않고 여기서 인라인 설정으로 빌드.
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { rename, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

await build({
  root,
  base: './', // capacitor://localhost / file:// 스킴에서 자산 로드되게 상대경로
  configFile: false, // vite.config.ts 자동적용 방지(중복 base/input 충돌 회피)
  plugins: [react()],
  // styled-components v6 + Vite: React 사본 중복 "Invalid hook call" 방지(웹과 동일 규칙)
  resolve: { dedupe: ['react', 'react-dom', 'styled-components'] },
  // public/ 전체(dayflip·hexapoppop 등 마케팅 자산 6MB+)를 앱에 넣지 않는다. 필요한 것만 아래서 복사.
  publicDir: false,
  build: {
    outDir: 'dist-app',
    emptyOutDir: true,
    rollupOptions: { input: resolve(root, 'app.html') },
  },
})

// Capacitor WebView는 webDir 루트의 index.html을 로드 → app.html을 index.html로.
await rename(resolve(root, 'dist-app/app.html'), resolve(root, 'dist-app/index.html'))
// 앱 아이콘/파비콘용 로고만 복사(나머지 public 자산은 앱에 불필요).
await copyFile(resolve(root, 'public/logo.png'), resolve(root, 'dist-app/logo.png'))
console.log('\n✅ app build → dist-app/ (entry: index.html)')
