import styled from 'styled-components'
import { theme } from '../styles/GlobalStyle'

// 첫 진입 랜딩 — 한 화면을 꽉 채우는 히어로. nav/footer 높이를 빼고 가운데 정렬.
export const Hero = styled.section`
  min-height: calc(100vh - 64px);
  padding: 6rem 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;

  @media (max-width: 768px) { padding: 5rem 1.5rem; }
`

export const Tag = styled.p`
  font-family: ${theme.mono};
  font-size: 12px;
  color: ${theme.accent};
  letter-spacing: 0.2em;
  margin-bottom: 2rem;
`

export const Title = styled.h1`
  font-size: clamp(2.5rem, 7vw, 6rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.04em;
  span { color: ${theme.accent}; }
`

export const Sub = styled.p`
  margin-top: 1.5rem;
  font-size: clamp(1.1rem, 2.5vw, 1.6rem);
  font-weight: 500;
  color: ${theme.text2};
`

export const StartBtn = styled.a`
  margin-top: 3.5rem;
  padding: 1rem 3.5rem;
  background: ${theme.accent};
  color: ${theme.onAccent};
  font-family: ${theme.mono};
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-decoration: none;
  border-radius: 3px;
  transition: all 0.2s;
  &:hover { background: ${theme.accent2}; transform: translateY(-2px); }
`
