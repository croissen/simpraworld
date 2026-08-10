import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import type { Shape } from '../types'
import { useOverlay } from '../overlays'

// "+ Element" → 그릴 도형을 고르는 팝업(모바일·PC 공용). 고르면 그리기 모드 진입.
const SHAPES: { v: Shape; label: string; icon: string }[] = [
  { v: 'rect', label: 'Rectangle', icon: '▭' },
  { v: 'circle', label: 'Circle', icon: '●' },
  { v: 'triangle', label: 'Triangle', icon: '▲' },
  { v: 'line', label: 'Line', icon: '╱' },
]

export default function ShapePicker({
  onPick,
  onClose,
}: {
  onPick: (s: Shape) => void
  onClose: () => void
}) {
  useOverlay(true, onClose) // 뒤로가기로 도형 선택 팝업 닫기
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return createPortal(
    <Overlay onClick={onClose}>
      <Sheet onClick={(e) => e.stopPropagation()}>
        <Title>Pick a shape to draw</Title>
        <Grid>
          {SHAPES.map((s) => (
            <Item key={s.v} onClick={() => onPick(s.v)}>
              <span className="i">{s.icon}</span>
              <span className="l">{s.label}</span>
            </Item>
          ))}
        </Grid>
        <Hint>Then drag on the canvas to draw it.</Hint>
      </Sheet>
    </Overlay>,
    document.body,
  )
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  @media (max-width: 640px) {
    align-items: flex-end;
  }
`

const Sheet = styled.div`
  background: #161b27;
  border: 1px solid #2b3346;
  border-radius: 16px;
  padding: 16px;
  width: 320px;
  max-width: calc(100vw - 24px);
  @media (max-width: 640px) {
    width: 100%;
    border-radius: 18px 18px 0 0;
    padding-bottom: 24px;
  }
`

const Title = styled.div`
  font-size: 13px;
  color: #8b95a8;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 12px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`

const Item = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 18px 10px;
  background: #0f1320;
  border: 1px solid #2b3346;
  border-radius: 12px;
  color: #e8ecf3;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  &:hover {
    border-color: #3ddc7f;
  }
  &:active {
    background: #10311f;
  }
  .i {
    font-size: 30px;
    line-height: 1;
  }
  .l {
    font-size: 13px;
    color: #cdd6ea;
  }
`

const Hint = styled.div`
  margin-top: 12px;
  font-size: 12px;
  color: #8b95a8;
  text-align: center;
`
