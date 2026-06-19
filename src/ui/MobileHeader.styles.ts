import styled from 'styled-components'

// 모바일 상단 바: [로고] [중앙 폴더 드롭다운] [Undo/Redo]
export const Bar = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
`

export const Side = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
`

// 중앙 현재 폴더 (드롭다운 트리거)
export const Center = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
  position: relative;
`

export const FolderBtn = styled.button`
  max-width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #e8ecf3;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  > .nm {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  > .car {
    flex: none;
    color: #8b95a8;
    font-size: 12px;
  }
  &:active {
    background: #ffffff14;
  }
`

// 드롭다운 패널 (현재 경로 폴더 리스트)
export const Menu = styled.div`
  position: absolute;
  top: 110%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  min-width: 200px;
  max-width: 80vw;
  max-height: 60vh;
  overflow-y: auto;
  background: #161b27f5;
  border: 1px solid #2b3346;
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 12px 40px #0009;
  backdrop-filter: blur(6px);
`

export const Item = styled.button<{ $on?: boolean; $depth?: number }>`
  display: block;
  width: 100%;
  text-align: left;
  background: ${(p) => (p.$on ? '#1a2440' : 'none')};
  border: none;
  color: ${(p) => (p.$on ? '#cfe0ff' : '#dbe3f4')};
  font-size: 14px;
  padding: 8px 10px;
  padding-left: ${(p) => 10 + (p.$depth || 0) * 12}px;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &:active {
    background: #232b41;
  }
`

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 35;
`

export const IconBtn = styled.button`
  flex: none;
  width: 34px;
  height: 34px;
  background: #1b2030;
  border: 1px solid #2b3346;
  color: #dbe3f4;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  &:disabled {
    opacity: 0.4;
  }
`

// 액션 버튼(+Folder 등) 가로 스크롤 줄
export const ToolsRow = styled.div`
  padding: 0 8px 6px;
  display: flex;
`
