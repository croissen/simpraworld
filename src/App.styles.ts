import styled from 'styled-components'

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
`

export const Brand = styled.div`
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #9fb4ff;
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
