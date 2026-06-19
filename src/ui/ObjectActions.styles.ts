import styled from 'styled-components'

// 선택된 개체 위 중앙에 떠 있는 액션 바 (모바일). 카메라 따라 매 프레임 위치 갱신.
export const Bar = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 25;
  display: flex;
  align-items: stretch;
  gap: 2px;
  padding: 4px;
  background: linear-gradient(180deg, #1c2230f2, #161b27f2);
  border: 1px solid #ffffff1f;
  border-radius: 14px;
  box-shadow: 0 10px 28px #000a, inset 0 1px 0 #ffffff14;
  backdrop-filter: blur(10px);
  /* transform은 JS가 매 프레임 갱신: translate(-50%,-100%) + 위치 */
  will-change: transform;
`

export const Btn = styled.button`
  width: 40px;
  height: 38px;
  border: none;
  background: none;
  color: #dbe3f4;
  font-size: 17px;
  line-height: 1;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s ease, color 0.12s ease;
  &:active {
    background: #5b8cff33;
    color: #fff;
  }
`

export const Divider = styled.span`
  width: 1px;
  margin: 6px 0;
  background: #ffffff1a;
  flex: none;
`

// 아래쪽을 가리키는 작은 꼬리(말풍선 느낌)
export const Tail = styled.span`
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: #161b27f2;
  border-right: 1px solid #ffffff1f;
  border-bottom: 1px solid #ffffff1f;
`
