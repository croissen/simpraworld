import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

// 모바일/데스크톱 앱 단독 엔트리 — 마케팅 사이트(src/site) 없이 유니버스만 렌더.
// 웹은 Root.tsx(라우터)로 /my-universe에서 App을 로드하지만, 앱에선 App이 곧 전체.
// MemoryRouter: 유니버스 코어의 유일한 라우터 의존(BrandButton의 useNavigate)만
// 만족시키는 껍데기. 앱엔 이동할 사이트가 없어 'Go Main'은 무해한 no-op가 된다.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MemoryRouter>
      <App />
    </MemoryRouter>
  </StrictMode>,
)
