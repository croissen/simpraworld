import styled from 'styled-components'
import { Link, NavLink } from 'react-router-dom'
import { theme } from '../styles/GlobalStyle'

export const Nav = styled.nav`
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  padding: 1.2rem 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${theme.border};
  background: ${theme.navBg};
  backdrop-filter: blur(12px);

  @media (max-width: 768px) { padding: 1rem 1.5rem; }
`

export const NavLogo = styled(Link)`
  font-family: ${theme.mono};
  font-size: 14px;
  color: ${theme.accent};
  letter-spacing: 0.05em;
  text-decoration: none;
`

export const NavLinks = styled.div`
  display: flex;
  gap: 2rem;
  @media (max-width: 768px) { gap: 1rem; }
`

export const NavItem = styled(NavLink)`
  font-size: 13px;
  color: ${theme.text2};
  text-decoration: none;
  letter-spacing: 0.05em;
  transition: color 0.2s;
  &:hover { color: ${theme.text}; }
  &.active { color: ${theme.accent}; }
`

// react-router의 Link로 hash 이동에도 사용
export const NavHashLink = styled(Link)`
  font-size: 13px;
  color: ${theme.text2};
  text-decoration: none;
  letter-spacing: 0.05em;
  transition: color 0.2s;
  &:hover { color: ${theme.text}; }
`

export const Footer = styled.footer`
  padding: 2rem 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 768px) {
    padding: 1.5rem;
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
`

export const FooterCopy = styled.span`
  font-family: ${theme.mono};
  font-size: 12px;
  color: ${theme.text3};
  letter-spacing: 0.05em;
`

export const FooterBack = styled.a`
  font-family: ${theme.mono};
  font-size: 12px;
  color: ${theme.text3};
  text-decoration: none;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: color 0.2s;
  &:hover { color: ${theme.text}; }
`
