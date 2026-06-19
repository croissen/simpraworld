import styled, { css, keyframes } from 'styled-components'

export const Toolbar = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;

  /* 모바일: 한 줄 가득 차지하고 가로 스크롤(버튼이 줄바꿈으로 깨지지 않게) */
  @media (max-width: 640px) {
    flex: 1 1 100%;
    min-width: 0;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 2px;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }
`

export const Gap = styled.span`
  width: 8px;
  flex: none;
`

/* Undo/Redo 묶음 — 모바일에선 상단 헤더로 옮겨가므로 툴바에서 숨김 */
export const UndoGroup = styled.span`
  display: contents;
  @media (max-width: 640px) {
    display: none;
  }
`

/* 펼침(오버플로) 메뉴 공통: 토글 버튼 + 그 옆으로 좌르륵 펼쳐지는 트레이.
   $align='left'  → 버튼이 왼쪽, 트레이가 오른쪽으로 펼쳐짐 (+, 📄 메뉴)
   $align='right' → 버튼이 오른쪽 고정, 트레이가 왼쪽으로 펼쳐짐 (... 메뉴, 툴바 우측 끝) */
export const Overflow = styled.span<{ $align?: 'left' | 'right' }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  margin-left: ${(p) => (p.$align === 'right' ? 'auto' : '0')};

  @media (max-width: 640px) {
    margin-left: 0;
  }
`

/* 펼쳐지는 트레이 — 닫힘: 폭 0·투명, 열림: 슬라이드+페이드. overflow:hidden으로 폭 전환을 부드럽게 */
export const Tray = styled.div<{ $open: boolean; $align?: 'left' | 'right' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  max-width: ${(p) => (p.$open ? '1000px' : '0')};
  opacity: ${(p) => (p.$open ? 1 : 0)};
  margin-left: ${(p) => (p.$open && p.$align !== 'right' ? '6px' : '0')};
  margin-right: ${(p) => (p.$open && p.$align === 'right' ? '6px' : '0')};
  transition:
    max-width 0.6s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.4s ease,
    margin-left 0.6s cubic-bezier(0.22, 1, 0.36, 1),
    margin-right 0.6s cubic-bezier(0.22, 1, 0.36, 1);
`

/* 각 항목을 시차(stagger)로 슬라이드 — 토글 버튼 쪽 항목부터 차례로 흘러나오게 */
export const TrayItem = styled.span<{ $open: boolean; $i: number; $n: number; $align?: 'left' | 'right' }>`
  flex: none;
  display: inline-flex;
  transform: translateX(${(p) => (p.$open ? '0' : p.$align === 'right' ? '18px' : '-18px')});
  opacity: ${(p) => (p.$open ? 1 : 0)};
  transition:
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.45s ease;
  transition-delay: ${(p) =>
    p.$open ? (p.$align === 'right' ? p.$n - 1 - p.$i : p.$i) * 0.08 : 0}s;
`

/* 저장 성공 시 "..." 버튼이 초록 체크로 팡 떴다가 사라짐 */
export const savedPop = keyframes`
  0%   { transform: scale(0.6); }
  45%  { transform: scale(1.18); }
  100% { transform: scale(1); }
`

export const Button = styled.button<{ $on?: boolean; $danger?: boolean; $saved?: boolean }>`
  background: ${(p) =>
    p.$saved ? '#15391f' : p.$danger ? '#4a2230' : p.$on ? '#1a2440' : '#1b2030'};
  border: 1px solid
    ${(p) => (p.$saved ? '#3ddc7f' : p.$danger ? '#8a3a48' : p.$on ? '#5b8cff' : '#2b3346')};
  color: ${(p) => (p.$saved ? '#7CFFB0' : p.$danger ? '#ffc3cc' : p.$on ? '#cfe0ff' : '#dbe3f4')};
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  flex: none;
  transition: background 0.25s ease, border-color 0.25s ease, color 0.25s ease;
  ${(p) =>
    p.$saved &&
    css`
      animation: ${savedPop} 0.45s ease;
    `}

  @media (max-width: 640px) {
    padding: 7px 9px;
    font-size: 12px;
  }

  &:hover {
    background: ${(p) => (p.$saved ? '#15391f' : p.$danger ? '#5c2a3a' : '#232b41')};
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
  &:disabled:hover {
    background: #1b2030;
  }
`
