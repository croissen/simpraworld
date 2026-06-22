import styled, { css, keyframes } from 'styled-components'

export const Toolbar = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;

  /* 모바일: 우측 하단에 동그란 FAB 3개(+, 📄, ⋯)로 고정 */
  @media (max-width: 640px) {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 30;
    flex-direction: column-reverse;
    align-items: flex-end;
    gap: 12px;
    & > button {
      width: 56px;
      height: 56px;
      padding: 0;
      border-radius: 50%;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 18px #0007;
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
  /* $align='right'면 margin-left:auto로 우측 정렬. 모바일 가로스크롤에서도 auto는
     공간이 남으면 오른쪽으로 밀고, 넘치면 0으로 접혀 스크롤이 유지됨(justify-content와 달리). */
  margin-left: ${(p) => (p.$align === 'right' ? 'auto' : '0')};
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

/* 모바일: 메뉴 클릭 시 뜨는 팝업(바텀시트) 리스트 */
export const MobilePopOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
`

export const MobileSheet = styled.div`
  width: 100%;
  max-width: 480px;
  margin: 0 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  background: #161b27f5;
  border: 1px solid #2b3346;
  border-radius: 16px;
  box-shadow: 0 -12px 40px #0009;
  backdrop-filter: blur(8px);

  /* 안의 버튼들은 큼직하게 한 줄씩 */
  & button {
    width: 100%;
    justify-content: flex-start;
    text-align: left;
    font-size: 16px;
    padding: 14px 16px;
    border-radius: 10px;
  }
`

/* 저장 성공 시 "..." 버튼이 초록 체크로 팡 떴다가 사라짐 */
export const savedPop = keyframes`
  0%   { transform: scale(0.6); }
  45%  { transform: scale(1.18); }
  100% { transform: scale(1); }
`

export const Button = styled.button<{ $on?: boolean; $danger?: boolean; $saved?: boolean }>`
  background: ${(p) =>
    p.$saved ? '#15391f' : p.$danger ? '#4a2230' : p.$on ? '#10311f' : '#1b2030'};
  border: 1px solid
    ${(p) => (p.$saved ? '#3ddc7f' : p.$danger ? '#8a3a48' : p.$on ? '#3ddc7f' : '#2b3346')};
  color: ${(p) => (p.$saved ? '#7CFFB0' : p.$danger ? '#ffc3cc' : p.$on ? '#c2f0d4' : '#dbe3f4')};
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
    padding: 11px 15px;
    font-size: 15px;
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
