import { createGlobalStyle } from 'styled-components'

export const theme = {
  bg: '#16161c',
  bg2: '#1f1f27',
  bg3: '#2a2a34',
  border: 'rgba(255,255,255,0.09)',
  border2: 'rgba(255,255,255,0.18)',
  text: '#f4f4f7',
  text2: '#a8a8b3',
  text3: '#70707c',
  accent: '#c8f55a',
  accent2: '#a8e040',
  mono: "'Space Mono', monospace",
  sans: "'Pretendard', sans-serif",
}

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    background: ${theme.bg};
    color: ${theme.text};
    font-family: ${theme.sans};
    line-height: 1.6;
    overflow-x: hidden;
  }
  a { color: inherit; }
  ul { list-style: none; }
`
