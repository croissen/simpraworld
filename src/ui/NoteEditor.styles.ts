import styled from 'styled-components'

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 120;
  background: #00000088;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4%;
`

// 적당한 흰색 "종이" — 순백(#fff)이 아니라 살짝 톤 다운된 오프화이트
export const Paper = styled.div`
  width: 100%;
  max-width: 560px;
  height: 70%;
  max-height: 640px;
  background: #f3f1ea;
  border: 1px solid #d9d4c7;
  border-radius: 14px;
  box-shadow: 0 18px 60px #00000066;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

export const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #e3dece;
`

export const Title = styled.input`
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  outline: none;
  color: #2b2a26;
  font-size: 17px;
  font-weight: 600;
`

export const Close = styled.button`
  flex: none;
  background: #e7e2d5;
  border: 1px solid #d4cdb9;
  color: #5a564a;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  &:hover { background: #ddd6c4; }
`

export const Body = styled.textarea`
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  background: none;
  color: #2b2a26;
  font-size: 15px;
  line-height: 1.65;
  padding: 16px 18px;
  font-family: inherit;
  &::placeholder { color: #a39e8f; }
`
