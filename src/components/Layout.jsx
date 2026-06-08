import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import * as S from './Layout.styles'

export default function Layout() {
  const location = useLocation()

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
          <S.NavItem to="/about">About</S.NavItem>
          <S.NavHashLink to="/#projects">Projects</S.NavHashLink>
          <S.NavHashLink to="/#experience">Experience</S.NavHashLink>
          <S.NavHashLink to="/#skills">Skills</S.NavHashLink>
          <S.NavHashLink to="/#contact">Contact</S.NavHashLink>
        </S.NavLinks>
      </S.Nav>

      <Outlet />

      <S.Footer>
        <S.FooterCopy>© 2026 SimpraWorld. ALL RIGHTS RESERVED.</S.FooterCopy>
        <S.FooterBack href="#" onClick={handleTop}>↑ TOP</S.FooterBack>
      </S.Footer>
    </>
  )
}
