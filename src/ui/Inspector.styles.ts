import styled from 'styled-components'

export const Inspector = styled.aside`
  position: absolute;
  top: 56px;
  right: 12px;
  bottom: 12px;
  width: 260px;
  z-index: 10;
  background: #161b27ee;
  border: 1px solid #2b3346;
  border-radius: 14px;
  padding: 14px;
  overflow-y: auto;
  backdrop-filter: blur(6px);

  @media (max-width: 640px) {
    width: auto;
    left: 12px;
    top: auto;
    bottom: 48px;
    height: 44%;
  }
`

export const Head = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  margin-bottom: 12px;
`

export const RefNote = styled.div`
  font-size: 12px;
  color: #9fc6ff;
  background: #16243f;
  border: 1px solid #294066;
  border-radius: 8px;
  padding: 7px 9px;
  margin-bottom: 12px;
  line-height: 1.4;
`

/* div 와 label 둘 다로 쓰임 → 호출부에서 as="label" 사용 */
export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 12px;

  > span {
    font-size: 11px;
    color: #8b95a8;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  input,
  select {
    background: #0f1320;
    border: 1px solid #2b3346;
    color: #e8ecf3;
    border-radius: 8px;
    padding: 7px 9px;
    font-size: 13px;
    width: 100%;
  }
`

export const Row = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`

/* 직접 색 고르기 — 스와치(네이티브 color input) + HEX 입력(타이핑+Enter로 적용) */
export const ColorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0f1320;
  border: 1px solid #2b3346;
  border-radius: 8px;
  padding: 5px 8px;
  margin-top: 6px;

  input[type='color'] {
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    flex: none;
  }
  input[type='color']::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  input[type='color']::-webkit-color-swatch {
    border: 1px solid #2b3346;
    border-radius: 5px;
  }
  /* HEX 입력칸 */
  input[type='text'] {
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    color: #cdd6ea;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    letter-spacing: 0.04em;
    padding: 4px 0;
    outline: none;
    text-transform: uppercase;
  }
`

/* 라벨 + 우측 버튼 한 줄 (예: Name | + Component) */
export const LabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;

  > span {
    font-size: 11px;
    color: #8b95a8;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
`

export const AddComp = styled.button<{ $ok?: boolean }>`
  flex: none;
  border-radius: 7px;
  padding: 3px 9px;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  background: ${(p) => (p.$ok ? '#bff0cf' : '#1a2440')};
  border: 1px solid ${(p) => (p.$ok ? '#7fd6a0' : '#41506e')};
  color: ${(p) => (p.$ok ? '#1f6b3f' : '#cfe0ff')};
  &:hover { border-color: ${(p) => (p.$ok ? '#7fd6a0' : '#5b8cff')}; }
`

export const NumRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

/* 이름 입력 + 강조 토글 한 줄 */
export const NameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  > input {
    flex: 1;
    min-width: 0;
  }
`

/* 피그마 Dimensions 처럼: 박스 안에 W/H(또는 X/Y) 라벨 + 숫자 입력 */
export const DimBox = styled.label`
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

export const Lock = styled.button<{ $on?: boolean }>`
  flex: none;
  width: 34px;
  background: ${(p) => (p.$on ? '#1a2440' : '#0f1320')};
  border: 1px solid ${(p) => (p.$on ? '#5b8cff' : '#2b3346')};
  border-radius: 8px;
  padding: 6px 0;
  cursor: pointer;
  font-size: 14px;
`

/* 링크(참조선) 색 고르기 버튼 */
export const ColorBtn = styled.input`
  flex: none;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid #2b3346;
  border-radius: 8px;
  background: none;
  cursor: pointer;
`

export const Chip = styled.button<{ $on?: boolean }>`
  background: ${(p) => (p.$on ? '#1a2440' : '#0f1320')};
  border: 1px solid ${(p) => (p.$on ? '#5b8cff' : '#2b3346')};
  color: #cdd6ea;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 14px;
`

export const Swatch = styled.button<{ $on?: boolean; $color: string }>`
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 2px solid ${(p) => (p.$on ? '#fff' : 'transparent')};
  background: ${(p) => p.$color};
  cursor: pointer;
`

export const Mini = styled.button`
  background: #1b2030;
  border: 1px solid #2b3346;
  color: #dbe3f4;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  margin-right: 6px;
`

export const FieldsBox = styled.div`
  border-top: 1px dashed #2b3346;
  padding-top: 10px;
  margin-top: 4px;
`

export const Delete = styled.button`
  width: 100%;
  margin-top: 8px;
  background: #3a1620;
  border: 1px solid #6b2030;
  color: #ffb3c0;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
`
