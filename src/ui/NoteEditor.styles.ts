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

// 흰 "종이" — 왼쪽(사진/검색) + 오른쪽(메모장) 2단
export const Paper = styled.div`
  width: 100%;
  max-width: 780px;
  height: 72%;
  max-height: 660px;
  background: #f3f1ea;
  border: 1px solid #d9d4c7;
  border-radius: 14px;
  box-shadow: 0 18px 60px #00000066;
  display: flex;
  overflow: hidden;

  @media (max-width: 620px) {
    flex-direction: column;
  }
`

/* ── 왼쪽: 정사각 썸네일 + 교체 + 태그검색 ── */
export const Left = styled.div`
  flex: none;
  width: 248px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-right: 1px solid #e3dece;
  background: #efece2;

  @media (max-width: 620px) {
    width: auto;
    border-right: none;
    border-bottom: 1px solid #e3dece;
  }
`

export const Thumb = styled.div`
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  background: #e2ddcd;
  border: 1px solid #d4cdb9;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  span {
    color: #a39e8f;
    font-size: 12px;
  }
`

export const SwapBtn = styled.button`
  flex: none;
  padding: 9px;
  border-radius: 9px;
  border: 1px solid #41506e;
  background: #1a2440;
  color: #cfe0ff;
  font-size: 13px;
  cursor: pointer;
  &:hover:not(:disabled) {
    border-color: #5b8cff;
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

export const Search = styled.input`
  flex: none;
  width: 100%;
  background: #fbfaf5;
  border: 1px solid #d4cdb9;
  color: #2b2a26;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  outline: none;
  &:focus {
    border-color: #5b8cff;
  }
`

export const Results = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 5px;
`

export const ResultItem = styled.button<{ $on?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  padding: 5px 6px;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$on ? '#5b8cff' : 'transparent')};
  background: ${(p) => (p.$on ? '#e6ecfb' : 'transparent')};
  cursor: pointer;
  &:hover {
    background: #e9e5d8;
  }

  > .t {
    width: 30px;
    height: 30px;
    border-radius: 6px;
    background: #e2ddcd;
    object-fit: cover;
    flex: none;
  }
  > .m {
    min-width: 0;
  }
  > .m .nm {
    color: #2b2a26;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  > .m .tg {
    color: #8a8472;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

export const Empty = styled.div`
  color: #a39e8f;
  font-size: 12px;
  padding: 6px 2px;
`

/* ── 오른쪽: 제목 + 본문 + 태그란 ── */
export const Right = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
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
  &:hover {
    background: #ddd6c4;
  }
`

export const Revert = styled(Close)`
  color: #2a3f6b;
` // X 왼쪽: 미리보기 취소(원래 노트로)

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
  &::placeholder {
    color: #a39e8f;
  }
`

export const TagBar = styled.div`
  flex: none;
  border-top: 1px solid #e3dece;
  padding: 10px 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

export const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #e6ecfb;
  border: 1px solid #c4d3f5;
  color: #2a3f6b;
  border-radius: 999px;
  padding: 3px 4px 3px 9px;
  font-size: 12px;

  > button {
    border: none;
    background: #cdd9f3;
    color: #2a3f6b;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 11px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  > button:hover {
    background: #b3c4ec;
  }
`

export const TagInput = styled.input`
  flex: 1;
  min-width: 90px;
  background: none;
  border: none;
  outline: none;
  color: #2b2a26;
  font-size: 13px;
  padding: 4px 2px;
  &::placeholder {
    color: #a39e8f;
  }
`
