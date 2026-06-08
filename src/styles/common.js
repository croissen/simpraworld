import styled, { css } from 'styled-components'
import { theme } from './GlobalStyle'

// 공통 버튼
export const Button = styled.a`
  padding: 0.75rem 1.75rem;
  font-family: ${theme.mono};
  font-size: 13px;
  letter-spacing: 0.05em;
  text-decoration: none;
  border-radius: 2px;
  transition: all 0.2s;
  cursor: pointer;
  display: inline-block;
  ${({ $variant }) =>
    $variant === 'outline'
      ? css`
          background: transparent;
          color: ${theme.text};
          border: 1px solid ${theme.border2};
          &:hover { border-color: ${theme.text}; }
        `
      : css`
          background: ${theme.accent};
          color: #0a0a0a;
          font-weight: 700;
          border: none;
          &:hover { background: ${theme.accent2}; }
        `}
`

// 공통 섹션
export const Section = styled.section`
  padding: 6rem 3rem;
  border-bottom: 1px solid ${theme.border};
  @media (max-width: 768px) { padding: 4rem 1.5rem; }
`

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 4rem;
`

export const SectionNum = styled.span`
  font-family: ${theme.mono};
  font-size: 11px;
  color: ${theme.text3};
  letter-spacing: 0.1em;
`

export const SectionTitle = styled.h2`
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.02em;
`
