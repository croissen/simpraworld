import styled from 'styled-components'

export const Panel = styled.div`
  position: absolute;
  top: 56px;
  right: 12px;
  z-index: 10;
  width: 220px;
  background: #161b27ee;
  border: 1px solid #2b3346;
  border-radius: 14px;
  padding: 12px;
  backdrop-filter: blur(6px);

  @media (max-width: 640px) {
    width: auto;
    left: 12px;
  }
`

export const Title = styled.div`
  font-size: 11px;
  color: #8b95a8;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 8px;
`

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

export const Box = styled.label`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #0f1320;
  border: 1px solid #2b3346;
  border-radius: 8px;
  padding: 0 9px;

  > span {
    color: #8b95a8;
    font-size: 12px;
    flex: none;
  }
  input {
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    color: #e8ecf3;
    padding: 7px 0;
    font-size: 13px;
    outline: none;
  }
`

export const Refresh = styled.button`
  flex: none;
  width: 34px;
  background: #1b2030;
  border: 1px solid #2b3346;
  color: #dbe3f4;
  border-radius: 8px;
  padding: 6px 0;
  cursor: pointer;
  font-size: 15px;
`
