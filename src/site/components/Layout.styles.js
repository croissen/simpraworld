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

  @media (max-width: 768px) { padding: 2rem 1.5rem; }
`

export const NavLogo = styled(Link)`
  font-family: ${theme.mono};
  font-size: 14px;
  color: ${theme.accent};
  letter-spacing: 0.05em;
  text-decoration: none;
  @media (max-width: 768px) { display: none; } /* 모바일은 가운데 버튼이 로고 역할 */
`

export const NavLinks = styled.div`
  display: flex;
  gap: 2rem;
  @media (max-width: 768px) { display: none; } /* 모바일은 가운데 드롭다운으로 대체 */
`

/* 모바일: 가운데 현재 페이지 버튼 → 누르면 리스트 드롭다운 */
export const MobileNav = styled.div`
  display: none;
  @media (max-width: 768px) {
    display: block;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }
`

export const MobileBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: ${(p) => (p.$brand ? theme.mono : 'inherit')};
  font-size: 28px; /* 모바일 전용(MobileNav)이라 두 배로 */
  letter-spacing: 0.05em;
  color: ${(p) => (p.$brand ? theme.accent : theme.text)};
  padding: 4px 8px;
  > .car {
    font-size: 18px;
    color: ${theme.text3};
  }
`

export const MobileMenu = styled.div`
  position: absolute;
  top: 120%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 110;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  background: ${theme.navBg};
  border: 1px solid ${theme.border};
  border-radius: 10px;
  padding: 6px;
  backdrop-filter: blur(12px);
  box-shadow: 0 12px 40px #0009;
`

export const MobileItem = styled(NavLink)`
  font-size: 14px;
  color: ${theme.text2};
  text-decoration: none;
  letter-spacing: 0.05em;
  text-align: center;
  padding: 10px 12px;
  border-radius: 8px;
  &.active { color: ${theme.accent}; }
  &:active { background: #ffffff14; }
`

export const MobileOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 105;
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

/* ---------- 데스크탑: "Other" 드롭다운 (호버로 펼침) ---------- */
export const OtherWrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  &:hover > div,
  &:focus-within > div {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
`

export const OtherBtn = styled.button`
  font-size: 13px;
  color: ${theme.text2};
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  letter-spacing: 0.05em;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: inherit;
  transition: color 0.2s;
  &:hover { color: ${theme.text}; }
  > .car { font-size: 10px; color: ${theme.text3}; }
`

export const OtherPanel = styled.div`
  position: absolute;
  top: calc(100% + 14px);
  right: 0;
  min-width: 210px;
  display: flex;
  flex-direction: column;
  background: ${theme.navBg};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  padding: 6px;
  backdrop-filter: blur(12px);
  box-shadow: 0 16px 40px rgba(9,60,25,0.12);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-6px);
  transition: opacity 0.18s, transform 0.18s, visibility 0.18s;
  z-index: 120;

  /* 버튼↔패널 사이 간격을 덮는 투명 브릿지 (hover 유지) */
  &::before {
    content: '';
    position: absolute;
    top: -14px;
    left: 0;
    right: 0;
    height: 14px;
  }
`

export const OtherItem = styled.a`
  font-size: 13px;
  color: ${theme.text2};
  text-decoration: none;
  padding: 9px 12px;
  border-radius: 8px;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
  &:hover { background: ${theme.bg3}; color: ${theme.accent}; }
`

/* ---------- 모바일: 메뉴 안 "Other" 서브섹션 ---------- */
export const MobileDivider = styled.div`
  height: 1px;
  background: ${theme.border};
  margin: 6px 8px;
`

export const MobileSubLabel = styled.p`
  font-family: ${theme.mono};
  font-size: 10px;
  letter-spacing: 0.15em;
  color: ${theme.text3};
  text-align: center;
  padding: 6px 0 2px;
`

export const MobileSubItem = styled.a`
  font-size: 14px;
  color: ${theme.text2};
  text-decoration: none;
  letter-spacing: 0.05em;
  text-align: center;
  padding: 10px 12px;
  border-radius: 8px;
  &:hover { color: ${theme.accent}; }
  &:active { background: ${theme.bg3}; }
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
