import styled from 'styled-components'

export const Panel = styled.aside`
  position: absolute;
  top: 56px;
  left: 12px;
  bottom: 12px;
  width: 290px;
  z-index: 30;
  background: #161b27ee;
  border: 1px solid #2b3346;
  border-radius: 14px;
  padding: 12px;
  overflow-y: auto;
  backdrop-filter: blur(6px);
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (max-width: 640px) {
    width: auto;
    right: 12px;
    top: 50%; /* 모바일: 아래 절반만 채움 */
  }
`

export const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #e8ecf3;
  font-weight: 600;
`

export const CloseX = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  width: 26px;
  height: 26px;
  background: #1b2030;
  border: 1px solid #2b3346;
  color: #aeb8cc;
  border-radius: 7px;
  cursor: pointer;
  font-size: 13px;
  &:hover {
    color: #fff;
    border-color: #41506e;
  }
`

export const HeaderBtns = styled.div`
  display: flex;
  gap: 6px;
`

export const HeaderBtn = styled.button`
  flex: 1;
  background: #1b2030;
  border: 1px solid #2b3346;
  color: #dbe3f4;
  padding: 5px 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  &:hover { background: #232b41; }
`

export const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

/* 클릭=미리보기 / 더블클릭=생성. 버튼 안 버튼 금지라 div로. */
export const Item = styled.div<{ $on?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${(p) => (p.$on ? '#10311f' : '#0f1320')};
  border: 1px solid ${(p) => (p.$on ? '#3ddc7f' : '#2b3346')};
  color: #dbe3f4;
  border-radius: 9px;
  padding: 8px 9px;
  cursor: pointer;
  user-select: none;
  &:hover { border-color: #41506e; }
`

export const ItemMain = styled.div`
  flex: 1;
  min-width: 0;
`
export const ItemName = styled.div`
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
export const RenameInput = styled.input.attrs({ spellCheck: false, autoCapitalize: 'off' })`
  width: 100%;
  background: #161b27;
  border: 1px solid #3ddc7f;
  color: #e8ecf3;
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 13px;
  outline: none;
`

export const ItemMeta = styled.div`
  font-size: 11px;
  color: #8b95a8;
  margin-top: 2px;
`

/* 컴포넌트를 현재 공간에 배치하는 Use 버튼(모바일·PC 공통, 더블클릭 대용) */
export const UseBtn = styled.button`
  flex: none;
  background: #15391f;
  border: 1px solid #3ddc7f;
  color: #7cffb0;
  padding: 5px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  &:hover {
    background: #1c4a29;
  }
`

export const IconBtn = styled.button`
  flex: none;
  width: 26px;
  height: 26px;
  background: #161b27;
  border: 1px solid #2b3346;
  color: #aeb8cc;
  border-radius: 7px;
  cursor: pointer;
  font-size: 12px;
  &:hover { color: #fff; border-color: #41506e; }
`

export const Empty = styled.div`
  font-size: 12px;
  color: #8b95a8;
  line-height: 1.5;
  padding: 6px 2px;
`

export const Hint = styled.div`
  font-size: 11px;
  color: #6f7991;
  margin-top: auto;
  line-height: 1.4;
`

/* 선택 시 옆에 뜨는 비차단(non-modal) 미리보기 카드 */
export const Preview = styled.div`
  position: absolute;
  top: 56px;
  left: 314px;
  z-index: 30;
  width: 240px;
  max-height: 60%;
  overflow-y: auto;
  background: #1b2233f2;
  border: 1px solid #2b3346;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 12px 40px #00000066;

  @media (max-width: 640px) {
    display: none; /* 모바일에선 미리보기 카드 숨김(공간 부족) */
  }
`
export const PreviewName = styled.div`
  color: #e8ecf3;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 6px;
`
export const PreviewMeta = styled.div`
  font-size: 11px;
  color: #8b95a8;
  margin-bottom: 8px;
`
export const PreviewBody = styled.pre`
  font-size: 12px;
  color: #cdd6ea;
  background: #0f1320;
  border: 1px solid #2b3346;
  border-radius: 8px;
  padding: 8px 10px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  margin: 0;
`
export const PreviewHint = styled.div`
  font-size: 11px;
  color: #8b95a8;
  margin-top: 10px;
  line-height: 1.45;
`
