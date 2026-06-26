import styled from 'styled-components'

export const Panel = styled.aside`
  position: absolute;
  top: 56px;
  left: 12px;
  bottom: 12px;
  width: 290px;
  z-index: 31;
  background: #161b27ee;
  border: 1px solid #2b3346;
  border-radius: 14px;
  padding: 12px;
  overflow: hidden;
  backdrop-filter: blur(6px);
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (max-width: 640px) {
    width: auto;
    right: 12px;
    top: 50%; /* 모바일: 아래 절반만 채움 */
  }
`

export const Header = styled.div`
  color: #e8ecf3;
  font-weight: 600;
`

export const CloseX = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  width: 26px;
  height: 26px;
  background: #1b2030;
  border: 1px solid #2b3346;
  color: #aeb8cc;
  border-radius: 7px;
  cursor: pointer;
  font-size: 13px;
  &:hover {
    color: #fff;
    border-color: #41506e;
  }
`

export const Search = styled.input.attrs({ spellCheck: false })`
  flex: none;
  width: 100%;
  background: #0f1320;
  border: 1px solid #2b3346;
  color: #e8ecf3;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  outline: none;
  &:focus {
    border-color: #3ddc7f;
  }
`

export const Tree = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`

export const Row = styled.div<{ $depth?: number; $stored?: boolean; $current?: boolean }>`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 6px;
  padding-left: ${(p) => (p.$depth || 0) * 14 + 6}px;
  border-radius: 7px;
  cursor: default;
  opacity: ${(p) => (p.$stored ? 0.6 : 1)};
  background: ${(p) => (p.$current ? '#10311f' : 'transparent')};
  &:hover {
    background: #1d2436;
  }
`

export const Caret = styled.button`
  flex: none;
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  color: #8b95a8;
  cursor: pointer;
  font-size: 10px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`

export const Icon = styled.span`
  flex: none;
  font-size: 13px;
`

export const Name = styled.span`
  flex: 1;
  min-width: 0;
  color: #dbe3f4;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const PathLabel = styled.span`
  flex: none;
  color: #6f7991;
  font-size: 11px;
  max-width: 90px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const Badge = styled.span<{ $exposed?: boolean }>`
  flex: none;
  font-size: ${(p) => (p.$exposed ? '8px' : '12px')};
  color: ${(p) => (p.$exposed ? '#34c98a' : '#c9a227')};
`

export const UseBtn = styled.button`
  flex: none;
  background: #10311f;
  border: 1px solid #41506e;
  color: #c2f0d4;
  border-radius: 7px;
  padding: 2px 8px;
  font-size: 11px;
  cursor: pointer;
  &:hover {
    border-color: #3ddc7f;
  }
`

export const Empty = styled.div`
  font-size: 12px;
  color: #8b95a8;
  padding: 8px 4px;
  line-height: 1.5;
`

export const Hint = styled.div`
  flex: none;
  font-size: 11px;
  color: #6f7991;
  line-height: 1.4;
`
