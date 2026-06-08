import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Dayflip from './pages/Dayflip.jsx'
import DayflipPolicy from './pages/DayflipPolicy.jsx'
import DayflipData from './pages/DayflipData.jsx'
import { GlobalStyle } from './styles/GlobalStyle.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalStyle />
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* / : 랜딩(SimpraWorld 세계관 소개) */}
          <Route path="/" element={<About />} />
          {/* /portfolio : 곽승민 포트폴리오 (프로젝트/경력/스킬/연락처) */}
          <Route path="/portfolio" element={<Home />} />
          <Route path="/dayflip" element={<Dayflip />} />
        </Route>
        <Route path="/dayflip/policy" element={<DayflipPolicy />} />
        <Route path="/dayflip/data" element={<DayflipData />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
