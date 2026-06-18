import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
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
