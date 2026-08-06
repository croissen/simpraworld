import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { redo, undo } from '../store'
import * as S from './Toolbar.styles'

// 하단 조이스틱: 좌로 끌면 undo, 우로 끌면 redo. 옆 버튼 자리까지 끌면 1회(가운데 복귀 후 다시 끌면 또).
// 끌면 좌/우에 undo(↶)/redo(↷) 가이드 아이콘이 뜨고, 넘긴 쪽이 초록으로 반전.
const TRIG = 52 // 옆(3·5번째) 버튼 자리까지 끌어야 발동
const MAX = 72

export default function UndoRedoStick() {
  const ref = useRef<HTMLButtonElement>(null)
  const startX = useRef<number | null>(null)
  const fired = useRef(false)
  const dirRef = useRef<'c' | 'l' | 'r'>('c')
  const [dir, setDir] = useState<'c' | 'l' | 'r'>('c')
  const [drag, setDrag] = useState(false)

  const setDirection = (d: 'c' | 'l' | 'r') => {
    if (dirRef.current !== d) {
      dirRef.current = d
      setDir(d)
    }
  }

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault()
    try {
      ref.current?.setPointerCapture?.(e.pointerId)
    } catch {
      /* 무시 */
    }
    startX.current = e.clientX
    fired.current = false
    setDrag(true)
  }
  const onMove = (e: React.PointerEvent) => {
    if (startX.current === null) return
    const dx = e.clientX - startX.current
    if (Math.abs(dx) < TRIG * 0.4) fired.current = false // 가운데 복귀 → 다음 발동 허용
    if (!fired.current) {
      if (dx <= -TRIG) {
        undo()
        fired.current = true
      } else if (dx >= TRIG) {
        redo()
        fired.current = true
      }
    }
    setDirection(dx <= -TRIG ? 'l' : dx >= TRIG ? 'r' : 'c') // TRIG 넘은 것만 확정(가이드 초록)
    const vis = Math.max(-MAX, Math.min(MAX, dx))
    if (ref.current) ref.current.style.transform = `translateX(${vis}px)`
  }
  const onUp = () => {
    startX.current = null
    fired.current = false
    setDirection('c')
    setDrag(false)
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <>
      {/* 툴바 행엔 자리만 */}
      <S.StickSpacer />
      {/* 실제 버튼은 body로 포털 → 노트 열려도 위에 보임 */}
      {createPortal(
        <S.StickPortal>
          {drag && (
            <>
              <S.URGuide $side="l" data-on={dir === 'l' ? '1' : ''}>
                ↶
              </S.URGuide>
              <S.URGuide $side="r" data-on={dir === 'r' ? '1' : ''}>
                ↷
              </S.URGuide>
            </>
          )}
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
        </S.StickPortal>,
        document.body,
      )}
    </>
  )
}
