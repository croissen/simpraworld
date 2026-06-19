import styled, { css, keyframes } from 'styled-components'

const pop = keyframes`
  0% { transform: scale(0.92); }
  55% { transform: scale(1.09); }
  100% { transform: scale(1); }
`

export const AppRoot = styled.div`
  position: fixed;
  inset: 0;
`

export const Top = styled.header`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: linear-gradient(#0f1115ee, #0f111500);
  flex-wrap: wrap;

  @media (max-width: 640px) {
    gap: 6px;
    padding: 6px 8px;
  }
`

/* 모바일 전용 상단 (헤더 행 + 액션 툴바 행) */
export const MobileTop = styled.header`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  background: linear-gradient(#0f1115f2, #0f111500);
`

export const MobileTools = styled.div`
  display: flex;
  padding: 0 8px 6px 0;
`

export const Brand = styled.button<{ $armed?: boolean }>`
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  white-space: nowrap;
  padding: 4px 11px;
  border-radius: 999px;
  border: 1px solid ${(p) => (p.$armed ? '#5b8cff' : 'transparent')};
  background: ${(p) => (p.$armed ? '#5b8cff' : 'transparent')};
  color: ${(p) => (p.$armed ? '#fff' : '#9fb4ff')};
  box-shadow: ${(p) => (p.$armed ? '0 0 0 4px #5b8cff33' : 'none')};
  transition: background 0.22s ease, color 0.22s ease, border-color 0.22s ease,
    box-shadow 0.22s ease, padding 0.22s ease;
  ${(p) =>
    p.$armed &&
    css`
      animation: ${pop} 0.25s ease;
    `}
  &:hover {
    color: ${(p) => (p.$armed ? '#fff' : '#c5d2ff')};
  }

  @media (max-width: 640px) {
    font-size: 14px;
    padding: 3px 9px;
  }
`

export const Hint = styled.div`
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9;
  font-size: 12px;
  color: #717a8c;
  background: #161b2799;
  padding: 6px 12px;
  border-radius: 20px;
  white-space: nowrap;
  pointer-events: none;

  @media (max-width: 640px) {
    display: none;
  }
`
