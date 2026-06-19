import styled from 'styled-components'

// 우상단에 자리잡는 컨테이너 (접힘=칩 / 펼침=카드)
export const Wrap = styled.div`
  position: absolute;
  top: 12%;
  right: 2%;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
`

// 접힘: 좌표만 보여주는 작은 칩
export const Chip = styled.button`
  background: #161b27ee;
  border: 1px solid #2b3346;
  color: #cdd6ea;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.03em;
  cursor: pointer;
  backdrop-filter: blur(6px);
  &:hover {
    border-color: #41506e;
  }
`

// 펼침: 좌표 입력 카드
export const Card = styled.div`
  width: 210px;
  background: #161b27f2;
  border: 1px solid #2b3346;
  border-radius: 14px;
  padding: 10px;
  backdrop-filter: blur(6px);
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const Head = styled.button`
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: #aeb8cc;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  cursor: pointer;
  padding: 0 2px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

export const Box = styled.label`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #0f1320;
  border: 1px solid #2b3346;
  border-radius: 8px;
  padding: 0 9px;

  > span {
    color: #8b95a8;
    font-size: 12px;
    flex: none;
  }
  input {
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    color: #e8ecf3;
    padding: 7px 0;
    font-size: 13px;
    outline: none;
  }
`

export const Go = styled.button`
  flex: 1;
  background: #1a2440;
  border: 1px solid #41506e;
  color: #cfe0ff;
  border-radius: 8px;
  padding: 7px 0;
  cursor: pointer;
  font-size: 13px;
  &:hover {
    border-color: #5b8cff;
  }
`

export const Reset = styled.button`
  flex: none;
  width: 40px;
  background: #1b2030;
  border: 1px solid #2b3346;
  color: #dbe3f4;
  border-radius: 8px;
  padding: 7px 0;
  cursor: pointer;
  font-size: 15px;
`
