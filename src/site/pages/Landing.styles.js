import styled, { keyframes } from 'styled-components'
import { theme } from '../styles/GlobalStyle'

const floaty = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-14px); }
`

// 첫 진입 랜딩 — 밝은 배경의 히어로. 부드러운 그린 글로우로 포인트.
export const Hero = styled.section`
  position: relative;
  min-height: 100vh;
  padding: 8rem 3rem 6rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
  background:
    radial-gradient(60% 55% at 50% 18%, ${theme.glow} 0%, transparent 70%),
    linear-gradient(180deg, ${theme.bg2} 0%, ${theme.bg} 100%);

  @media (max-width: 768px) { padding: 7rem 1.5rem 4rem; }
`

// 은은한 배경 점 그리드 (매트릭스의 잔향 — 라이트 버전)
export const Grid = styled.div`
  position: absolute;
  inset: 0;
  background-image: radial-gradient(${theme.border2} 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: radial-gradient(70% 60% at 50% 40%, #000 0%, transparent 75%);
  -webkit-mask-image: radial-gradient(70% 60% at 50% 40%, #000 0%, transparent 75%);
  pointer-events: none;
`

// 떠다니는 육각형 장식 (HexaPopPop 연상 + 생동감)
export const Blob = styled.span`
  position: absolute;
  width: ${(p) => p.$size || 120}px;
  height: ${(p) => p.$size || 120}px;
  top: ${(p) => p.$top};
  left: ${(p) => p.$left};
  right: ${(p) => p.$right};
  background: ${theme.accentGrad};
  opacity: 0.12;
  clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%);
  filter: blur(1px);
  animation: ${floaty} ${(p) => p.$dur || 7}s ease-in-out infinite;
  animation-delay: ${(p) => p.$delay || '0s'};
  pointer-events: none;
  @media (max-width: 768px) { display: none; }
`

export const Inner = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
`

export const Tag = styled.p`
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  color: ${theme.accent};
  letter-spacing: 0.28em;
  margin-bottom: 1.6rem;
  padding: 0.4rem 1rem;
  border: 1px solid ${theme.border2};
  border-radius: 999px;
  background: ${theme.bg2};
`

export const Title = styled.h1`
  font-size: clamp(2.8rem, 8vw, 6.5rem);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.045em;
  color: ${theme.text};
  span {
    background: ${theme.accentGrad};
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }
`

export const Sub = styled.p`
  margin-top: 1.6rem;
  font-size: clamp(1.05rem, 2.4vw, 1.5rem);
  font-weight: 500;
  color: ${theme.text2};
  max-width: 40ch;
  word-break: keep-all;   /* 한글이 단어(어절) 중간에서 안 깨지게 */
  line-break: strict;
`

export const BtnRow = styled.div`
  margin-top: 3rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`

export const StartBtn = styled.a`
  padding: 1rem 2.4rem;
  background: ${theme.accentGrad};
  color: #ffffff;
  font-family: 'Space Mono', monospace;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-decoration: none;
  border-radius: 10px;
  transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
  border: 1px solid transparent;
  box-shadow: 0 8px 24px ${theme.glow};
  &:hover {
    filter: brightness(1.05);
    transform: translateY(-2px);
    box-shadow: 0 12px 30px ${theme.glow};
  }

  ${({ $variant }) =>
    $variant === 'outline' &&
    `
      background: ${theme.bg2};
      color: ${theme.text};
      border: 1px solid ${theme.border2};
      box-shadow: none;
      &:hover {
        filter: none;
        background: ${theme.bg2};
        border-color: ${theme.accent};
        color: ${theme.accent};
        transform: translateY(-2px);
        box-shadow: 0 8px 24px ${theme.glow};
      }
    `}
`
