import { createGlobalStyle } from 'styled-components'

/**
 * 사이트 전체 색상 — 여기만 바꾸면 전 페이지 톤이 변경됨.
 * 라이트 테마 (Policy 페이지와 동일 톤).
 */
export const theme = {
  bg: '#F7F8FA',                     // 본문 배경
  bg2: '#FFFFFF',                    // 카드/박스 배경
  bg3: '#F0F0F4',                    // 카드 호버 배경
  border: 'rgba(0,0,0,0.08)',        // 옅은 구분선
  border2: 'rgba(0,0,0,0.18)',       // 진한 구분선
  text: '#1C1C1E',                   // 본문 글자
  text2: '#5A5A66',                  // 보조 글자
  text3: '#8E8E96',                  // 옅은 글자 / 라벨
  accent: '#4A6FA5',                 // 포인트 (제목·뱃지·링크)
  accent2: '#3D5A8A',                // 포인트 hover
  accentSoftBg: 'rgba(74,111,165,0.08)',
  accentSoftBorder: 'rgba(74,111,165,0.2)',
  onAccent: '#FFFFFF',               // accent 배경 위의 글자색
  navBg: 'rgba(247,248,250,0.85)',   // nav 배경 (반투명)
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
