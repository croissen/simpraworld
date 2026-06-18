import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { GlobalStyle } from './site/styles/GlobalStyle'
import Layout from './site/components/Layout'
import Landing from './site/pages/Landing'
import About from './site/pages/About'
import Home from './site/pages/Home'
import Dayflip from './site/pages/Dayflip'
import DayflipPolicy from './site/pages/DayflipPolicy'
import DayflipData from './site/pages/DayflipData'

// 캔버스 앱은 무거우니 /my-universe 진입 때만 로드(code-split)
const Universe = lazy(() => import('./App'))

// 마케팅 페이지 전용 글로벌 스타일(라이트/스크롤). /my-universe 에는 적용 안 됨
// (캔버스는 App 내부에서 자기 다크/풀스크린 GlobalStyle을 렌더 → 스타일 격리).
function SiteFrame() {
  return (
    <>
      <GlobalStyle />
      <Outlet />
    </>
  )
}

export default function Root() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteFrame />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/portfolio" element={<Home />} />
            <Route path="/dayflip" element={<Dayflip />} />
          </Route>
          <Route path="/dayflip/policy" element={<DayflipPolicy />} />
          <Route path="/dayflip/data" element={<DayflipData />} />
        </Route>
        <Route
          path="/my-universe"
          element={
            <Suspense fallback={null}>
              <Universe />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
