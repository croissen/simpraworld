import styled from 'styled-components'
import { theme } from '../styles/GlobalStyle'

export const Hero = styled.div`
  min-height: 90vh;
  padding: 10rem 3rem 6rem;
  border-bottom: 1px solid ${theme.border};
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;

  @media (max-width: 768px) { padding: 8rem 1.5rem 4rem; }
`

export const Tag = styled.p`
  font-family: ${theme.mono};
  font-size: 12px;
  color: ${theme.accent};
  letter-spacing: 0.15em;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  &::before { content: ''; width: 32px; height: 1px; background: ${theme.accent}; }
`

export const Title = styled.h1`
  font-size: clamp(3rem, 9vw, 8rem);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.04em;
  margin-bottom: 1.5rem;
  span { color: ${theme.accent}; }
`

export const Lead = styled.p`
  max-width: 670px;
  font-size: 18px;
  color: ${theme.text2};
  line-height: 1.75;
  margin-top: 1rem;
  strong { color: ${theme.text}; font-weight: 600; }
`

/* Motto */
export const MottoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1px;
  border: 1px solid ${theme.border};
`

export const MottoCardBox = styled.div`
  background: ${theme.bg2};
  padding: 2.5rem 2rem;
  transition: background 0.3s;
  &:hover { background: ${theme.bg3}; }
`

export const MottoNum = styled.p`
  font-family: ${theme.mono};
  font-size: 11px;
  color: ${theme.accent};
  letter-spacing: 0.1em;
  margin-bottom: 1.5rem;
`

export const MottoKeyword = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
  .en {
    color: ${theme.text3};
    font-family: ${theme.mono};
    font-size: 0.75em;
    font-weight: 400;
    margin-left: 0.5rem;
  }
`

export const MottoDesc = styled.p`
  font-size: 14px;
  color: ${theme.text2};
  line-height: 1.7;
  margin-top: 1rem;
`

/* Story */
export const StoryWrap = styled.div`
  max-width: 760px;
  margin: 0 auto;
`

export const StoryBlockBox = styled.div`
  margin-bottom: 3rem;
  &:last-child { margin-bottom: 0; }
`

export const StoryQ = styled.p`
  font-family: ${theme.mono};
  font-size: 12px;
  color: ${theme.accent};
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
`

export const StoryH = styled.h3`
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-bottom: 1.25rem;
  line-height: 1.3;
`

export const StoryP = styled.p`
  font-size: 16px;
  color: ${theme.text2};
  line-height: 1.85;
  margin-bottom: 1rem;
  strong { color: ${theme.text}; font-weight: 500; }
`

export const Quote = styled.div`
  padding: 3rem 2rem;
  border-left: 2px solid ${theme.accent};
  background: ${theme.bg2};
  margin: 5rem 0;
`

export const QuoteText = styled.p`
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.01em;
  color: ${theme.text};
  .accent { color: ${theme.accent}; }
`

/* CTA */
export const CtaWrap = styled.div`
  text-align: center;
  padding: 6rem 3rem;
  @media (max-width: 768px) { padding: 4rem 1.5rem; }
`

export const CtaTitle = styled.h2`
  font-size: clamp(1.75rem, 3.5vw, 2.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 1.5rem;
`

export const CtaDesc = styled.p`
  color: ${theme.text2};
  margin-bottom: 2.5rem;
`
