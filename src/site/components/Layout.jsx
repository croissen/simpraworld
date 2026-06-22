import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import * as S from './Layout.styles'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About', end: true },
  { to: '/dayflip', label: 'DayFlip', end: true },
  { to: '/portfolio', label: 'Portfolio', end: false },
]

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
