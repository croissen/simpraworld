import styled from 'styled-components'

export const Toolbar = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`

export const Gap = styled.span`
  width: 8px;
`

export const Button = styled.button<{ $on?: boolean; $danger?: boolean }>`
  background: ${(p) => (p.$danger ? '#4a2230' : p.$on ? '#1a2440' : '#1b2030')};
  border: 1px solid ${(p) => (p.$danger ? '#8a3a48' : p.$on ? '#5b8cff' : '#2b3346')};
  color: ${(p) => (p.$danger ? '#ffc3cc' : p.$on ? '#cfe0ff' : '#dbe3f4')};
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;

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
