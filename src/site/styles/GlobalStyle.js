import { createGlobalStyle } from 'styled-components'

/**
 * 사이트 전체 색상 — 여기만 바꾸면 전 페이지 톤이 변경됨.
 * 라이트 테마 (밝은 배경 · 매트릭스 그린 포인트 · 진한 본문).
 * ※ 캔버스 앱(/my-universe)은 이 theme을 쓰지 않고 App 내부에서
 *   자기 다크 GlobalStyle을 따로 렌더하므로 여기 변경의 영향 없음.
 */
export const theme = {
  bg: '#F6FBF7',                     // 본문 배경 (살짝 민트빛 흰색)
  bg2: '#FFFFFF',                    // 카드/박스 배경
  bg3: '#EEF7F0',                    // 카드 호버 배경
  border: 'rgba(9,120,45,0.14)',     // 옅은 구분선 (초록 틴트)
  border2: 'rgba(9,120,45,0.30)',    // 진한 구분선
  text: '#0C1A0F',                   // 본문 글자 (진초록빛 블랙)
  text2: '#41584A',                  // 보조 글자
  text3: '#7C8F81',                  // 옅은 글자 / 라벨
  accent: '#0A8A30',                 // 포인트 (제목·뱃지·링크·버튼) — 읽히는 매트릭스 그린
  accent2: '#0BA636',                // 포인트 hover (조금 밝게)
  accentSoftBg: 'rgba(18,188,67,0.10)',
  accentSoftBorder: 'rgba(9,120,45,0.30)',
  accentGrad: 'linear-gradient(120deg, #0AA23C 0%, #18C851 100%)', // 히어로 강조용
  glow: 'rgba(18,188,67,0.18)',      // 소프트 그린 글로우
  onAccent: '#FFFFFF',               // accent(초록) 배경 위의 글자색 = 흰색
  navBg: 'rgba(246,251,247,0.82)',   // nav 배경 (반투명 라이트)
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
