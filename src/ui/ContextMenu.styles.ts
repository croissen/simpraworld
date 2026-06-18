import styled from 'styled-components'

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
`

export const Menu = styled.div`
  position: fixed;
  min-width: 184px;
  background: #1c2230;
  border: 1px solid #333c4f;
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 14px 44px #00000088;
  font-size: 13px;
`

export const Item = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: ${(p) => (p.$danger ? '#ff9aa8' : '#dbe3f4')};
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  &:hover { background: ${(p) => (p.$danger ? '#3a1620' : '#2a3346')}; }
`

export const Sep = styled.div`
  height: 1px;
  background: #333c4f;
  margin: 5px 4px;
`
