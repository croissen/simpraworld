import { Outlet, useLocation, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import * as S from './Layout.styles'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About', end: true },
  { to: '/dayflip', label: 'DayFlip', end: true },
  { to: '/hexapoppop', label: 'HexaPopPop!', end: true },
]

// "Other" 드롭다운 — 내가 만든 나머지 사이트/도구 모음.
//   kind:'route'    → 같은 앱의 SPA 라우트 (react-router Link)
//   kind:'page'     → public/의 정적 HTML (전체 페이지 이동)
//   kind:'external' → 외부 사이트 (새 탭)
// ↓ 새 사이트는 여기 한 줄만 추가하면 데스크탑·모바일 양쪽에 반영됨.
const OTHER = [
  { label: '심프라 유니버스', to: '/my-universe', kind: 'route' },
  { label: '웨이브폼 메이커', to: '/waveform-maker.html', kind: 'page' },
]

// kind에 맞는 앵커 props 생성
function otherProps(it) {
  if (it.kind === 'route') return { as: Link, to: it.to }
  if (it.kind === 'external') return { href: it.to, target: '_blank', rel: 'noreferrer' }
  return { href: it.to } // page
}

export default function Layout() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // 현재 페이지(가장 길게 매칭되는 경로 우선, 못 찾으면 Home)
  const current =
    [...NAV]
      .sort((a, b) => b.to.length - a.to.length)
      .find((it) => (it.to === '/' ? location.pathname === '/' : location.pathname.startsWith(it.to))) ||
    NAV[0]

  // 경로 바뀌면 드롭다운 닫기
  useEffect(() => setMenuOpen(false), [location])

  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.scrollTo(0, 0)
    }
  }, [location])

  const handleTop = (e) => {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <S.Nav>
        <S.NavLogo to="/">SIMPRAWORLD</S.NavLogo>
        <S.NavLinks>
          {NAV.map((it) => (
            <S.NavItem key={it.to} to={it.to} end={it.end}>
              {it.label}
            </S.NavItem>
          ))}
          <S.OtherWrap>
            <S.OtherBtn type="button">
              Other <span className="car">▾</span>
            </S.OtherBtn>
            <S.OtherPanel>
              {OTHER.map((it) => (
                <S.OtherItem key={it.label} {...otherProps(it)}>
                  {it.label}
                </S.OtherItem>
              ))}
            </S.OtherPanel>
          </S.OtherWrap>
        </S.NavLinks>

        <S.MobileNav>
          <S.MobileBtn $brand={current.to === '/'} onClick={() => setMenuOpen((v) => !v)}>
            {current.to === '/' ? 'SIMPRAWORLD' : current.label}
            <span className="car">▾</span>
          </S.MobileBtn>
          {menuOpen && (
            <>
              <S.MobileOverlay onClick={() => setMenuOpen(false)} />
              <S.MobileMenu>
                {NAV.map((it) => (
                  <S.MobileItem key={it.to} to={it.to} end={it.end} onClick={() => setMenuOpen(false)}>
                    {it.label}
                  </S.MobileItem>
                ))}
                <S.MobileDivider />
                <S.MobileSubLabel>OTHER</S.MobileSubLabel>
                {OTHER.map((it) => (
                  <S.MobileSubItem key={it.label} {...otherProps(it)} onClick={() => setMenuOpen(false)}>
                    {it.label}
                  </S.MobileSubItem>
                ))}
              </S.MobileMenu>
            </>
          )}
        </S.MobileNav>
      </S.Nav>

      <Outlet />

      <S.Footer>
        <S.FooterCopy>© 2026 SimpraWorld. ALL RIGHTS RESERVED.</S.FooterCopy>
        <S.FooterBack href="#" onClick={handleTop}>↑ TOP</S.FooterBack>
      </S.Footer>
    </>
  )
}
