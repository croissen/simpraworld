import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent; /* 모바일 탭 시 파란 네모 하이라이트 제거 */
  }
  button:focus,
  button:focus-visible {
    outline: none;
  }
  html,
  body,
  #root {
    margin: 0;
    height: 100%;
    width: 100%;
    overflow: hidden;
    background: #0f1115;
    color: #e8ecf3;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    -webkit-user-select: none;
    user-select: none;
    overscroll-behavior: none;
  }
`
