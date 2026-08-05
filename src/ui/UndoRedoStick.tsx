import { useRef, useState } from 'react'
import { redo, undo } from '../store'
import * as S from './Toolbar.styles'

// 하단 조이스틱: 좌로 끌면 undo, 우로 끌면 redo. STEP마다 1회(멀리 끌면 여러 번). 손 떼면 복귀.
// 끄는 방향에 따라 가운데 아이콘이 ↶(undo)/↷(redo)로 바뀜.
const STEP = 30 // px당 1회 실행
const MAX = 72 // 3·5번째 버튼 자리까지 이동

export default function UndoRedoStick() {
  const ref = useRef<HTMLButtonElement>(null)
  const st = useRef<{ x: number; acc: number } | null>(null)
  const dirRef = useRef<'c' | 'l' | 'r'>('c')
  const [dir, setDir] = useState<'c' | 'l' | 'r'>('c')

  const setDirection = (d: 'c' | 'l' | 'r') => {
    if (dirRef.current !== d) {
      dirRef.current = d
      setDir(d)
    }
  }

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ref.current?.setPointerCapture?.(e.pointerId)
    st.current = { x: e.clientX, acc: 0 }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!st.current) return
    const dx = e.clientX - st.current.x
    while (dx - st.current.acc >= STEP) {
      redo()
      st.current.acc += STEP
    }
    while (st.current.acc - dx >= STEP) {
      undo()
      st.current.acc -= STEP
    }
    setDirection(dx < -6 ? 'l' : dx > 6 ? 'r' : 'c')
    const vis = Math.max(-MAX, Math.min(MAX, dx))
    if (ref.current) ref.current.style.transform = `translateX(${vis}px)`
  }
  const onUp = () => {
    st.current = null
    setDirection('c')
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <S.StickKnob
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      title="Drag ← undo · redo →"
    >
      <span className="ic" key={dir}>
        {dir === 'l' ? '↶' : dir === 'r' ? '↷' : '⇆'}
      </span>
    </S.StickKnob>
  )
}
