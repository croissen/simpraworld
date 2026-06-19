import styled from 'styled-components'

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: #00000099;
  display: flex;
  align-items: center;
  justify-content: center;
`
export const Box = styled.div`
  width: 90%;
  max-width: 320px;
  background: #161b27;
  border: 1px solid #2b3346;
  border-radius: 14px;
  padding: 18px;
`
export const Msg = styled.div`
  color: #e8ecf3;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 16px;
`
export const Input = styled.input`
  width: 100%;
  background: #0f1320;
  border: 1px solid #2b3346;
  color: #e8ecf3;
  border-radius: 8px;
  padding: 9px 11px;
  font-size: 14px;
  margin-bottom: 16px;
  outline: none;
  &:focus {
    border-color: #5b8cff;
  }
`
export const Btns = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`
export const Cancel = styled.button<{ $active?: boolean }>`
  background: #1b2030;
  border: 1px solid ${(p) => (p.$active ? '#5b8cff' : '#2b3346')};
  color: #dbe3f4;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  outline: none;
  box-shadow: ${(p) => (p.$active ? '0 0 0 2px #5b8cff55' : 'none')};
`
export const Ok = styled.button<{ $active?: boolean }>`
  background: #3a1620;
  border: 1px solid ${(p) => (p.$active ? '#ff5b78' : '#6b2030')};
  color: #ffb3c0;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  outline: none;
  box-shadow: ${(p) => (p.$active ? '0 0 0 2px #ff5b7855' : 'none')};
`
