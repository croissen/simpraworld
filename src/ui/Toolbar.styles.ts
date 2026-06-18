import styled from 'styled-components'

export const Toolbar = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`

export const Gap = styled.span`
  width: 8px;
`

export const Button = styled.button<{ $on?: boolean }>`
  background: ${(p) => (p.$on ? '#1a2440' : '#1b2030')};
  border: 1px solid ${(p) => (p.$on ? '#5b8cff' : '#2b3346')};
  color: ${(p) => (p.$on ? '#cfe0ff' : '#dbe3f4')};
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;

  &:hover {
    background: #232b41;
  }
`
