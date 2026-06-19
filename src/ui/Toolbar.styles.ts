import styled from 'styled-components'

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

export const Button = styled.button<{ $on?: boolean; $danger?: boolean }>`
  background: ${(p) => (p.$danger ? '#4a2230' : p.$on ? '#1a2440' : '#1b2030')};
  border: 1px solid ${(p) => (p.$danger ? '#8a3a48' : p.$on ? '#5b8cff' : '#2b3346')};
  color: ${(p) => (p.$danger ? '#ffc3cc' : p.$on ? '#cfe0ff' : '#dbe3f4')};
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  flex: none;

  @media (max-width: 640px) {
    padding: 7px 9px;
    font-size: 12px;
  }

  &:hover {
    background: ${(p) => (p.$danger ? '#5c2a3a' : '#232b41')};
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
  &:disabled:hover {
    background: #1b2030;
  }
`
