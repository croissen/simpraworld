import styled from 'styled-components'

export const Crumb = styled.nav`
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  min-width: 0;
  overflow: hidden; /* 넘치면 스크롤 대신 …로 접음(JS가 폭 측정) */
`

export const CrumbBtn = styled.button`
  background: none;
  border: none;
  color: #cdd6ea;
  padding: 4px 6px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 13px;

  &:hover {
    background: #ffffff14;
  }
`

export const Sep = styled.span`
  color: #5a6272;
  padding: 0 2px;
`

export const RootInput = styled.input`
  background: #0f1320;
  border: 1px solid #5b8cff;
  color: #e8ecf3;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  width: 160px;
`
