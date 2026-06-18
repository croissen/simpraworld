import styled from 'styled-components'

export const Canvas = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* iOS 핀치/스크롤 가로채기 방지 → 캔버스가 제스처 직접 처리 */
  touch-action: none;
  display: block;
`
