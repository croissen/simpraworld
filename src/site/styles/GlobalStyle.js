import { createGlobalStyle } from 'styled-components'

/**
 * 사이트 전체 색상 — 여기만 바꾸면 전 페이지 톤이 변경됨.
 * 매트릭스 테마 (검은 배경 · 초록 포인트 · 흰 본문).
 */
export const theme = {
  bg: '#000000',                     // 본문 배경 (검정)
  bg2: '#0A0F0A',                    // 카드/박스 배경
  bg3: '#101810',                    // 카드 호버 배경
  border: 'rgba(0,255,65,0.16)',     // 옅은 구분선 (초록 틴트)
  border2: 'rgba(0,255,65,0.32)',    // 진한 구분선
  text: '#FFFFFF',                   // 본문 글자 (흰색)
  text2: '#A8C8A8',                  // 보조 글자 (옅은 초록빛)
  text3: '#5C7A5C',                  // 옅은 글자 / 라벨
  accent: '#00FF41',                 // 포인트 (제목·뱃지·링크) — 매트릭스 그린
  accent2: '#33FF66',                // 포인트 hover
  accentSoftBg: 'rgba(0,255,65,0.08)',
  accentSoftBorder: 'rgba(0,255,65,0.25)',
  onAccent: '#000000',               // accent(밝은 초록) 배경 위의 글자색 = 검정
  navBg: 'rgba(0,0,0,0.85)',         // nav 배경 (반투명 검정)
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
