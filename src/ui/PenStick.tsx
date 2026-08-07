import { useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { getInkMode, getSnapshot, setInkMode, subscribe } from '../store'
import { useIsMobile } from '../useIsMobile'
import { ToolIcon } from './PenPalette'
import * as S from './Toolbar.styles'

// ✎ 펜 버튼 = 방향 조이스틱. 펜/손가락 동일.
//  · 탭            = 펜 켜기/끄기 (탭은 버튼을 움직이지 않음)
//  · 펜 켠 채 끌기  = ← 펜 · ↖ 형광펜 · ↗ 올가미 · → 지우개 (버튼 주위 아이콘 색반전, 놓으면 그걸로)
// ⚠️ 제스처 중 React setState를 절대 하지 않는다(포인터 캡처가 풀려 '먹통' 되던 원인).
//    네이티브 리스너 + DOM 직접조작으로만 처리하고, 도구 적용(setInkMode)은 '놓는 순간' 1회.
const TRIG = 52 // 이만큼 끌어야 전환(옆 버튼 자리)
const MAX = 74 // 손잡이 최대 이동
const DEAD = 8 // 이보다 작으면 탭(버튼 안 움직임)

type Dir = 'c' | 'l' | 'r' | 'ul' | 'ur'
const TOOL: Record<Exclude<Dir, 'c'>, 'highlighter' | 'eraser' | 'pen' | 'lasso'> = {
  l: 'pen',
  r: 'eraser',
  ul: 'highlighter',
  ur: 'lasso',
}

export default function PenStick() {
  // 잉크 모드 변경에 구독 → 노트 진입 등으로 펜이 꺼지면 버튼 활성 상태도 즉시 갱신
  // (구독 없으면 펜이 실제로 꺼졌는데 버튼만 켜진 채 남는 stale 버그 발생)
  useSyncExternalStore(subscribe, getSnapshot)
  const mode = getInkMode()
  const active = !!mode
  const fab = useIsMobile() // 폭≤640 = 하단 FAB 레이아웃 → 포털로 띄워 노트 위에도 보이게
  const btnRef = useRef<HTMLButtonElement>(null)
  const guideRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = btnRef.current
    if (!el) return
    let start: { x: number; y: number } | null = null
    let moved = false
    let dir: Dir = 'c'

    const paint = () => {
      const g = guideRef.current
      if (!g) return
      for (const c of g.querySelectorAll<HTMLElement>('[data-dir]'))
        c.dataset.on = c.dataset.dir === dir ? '1' : ''
    }
    const onDown = (e: PointerEvent) => {
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* 무시 */
      }
      start = { x: e.clientX, y: e.clientY }
      moved = false
      dir = 'c'
      const r = el.getBoundingClientRect()
      const g = guideRef.current
      if (g) {
        g.style.left = r.left + r.width / 2 + 'px'
        g.style.top = r.top + r.height / 2 + 'px'
        g.style.opacity = '0'
      }
      paint()
    }
    const onMove = (e: PointerEvent) => {
      if (!start) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      const dist = Math.hypot(dx, dy)
      if (dist > DEAD) moved = true
      // 방향 판정(펜 켜진 상태 + TRIG 이상). 아래로만 끄는 건 무시.
      let d: Dir = 'c'
      if (getInkMode() && dist >= TRIG) {
        if (Math.abs(dx) >= Math.abs(dy)) d = dx < 0 ? 'l' : 'r'
        else if (dy < 0) d = dx < 0 ? 'ul' : 'ur'
      }
      dir = d
      const g = guideRef.current
      if (g) g.style.opacity = moved && getInkMode() ? '1' : '0'
      paint()
      // 펜이 꺼진 상태에선 버튼을 움직이지 않는다(고정). 켜졌을 때만 조이스틱처럼 이동.
      if (moved && getInkMode()) {
        const vx = Math.max(-MAX, Math.min(MAX, dx))
        const vy = Math.max(-MAX, Math.min(MAX, dy))
        el.style.transform = `translate(${vx}px, ${vy}px)`
      }
    }
    const onUp = () => {
      const wasMoved = moved
      const d = dir
      start = null
      moved = false
      dir = 'c'
      el.style.transform = ''
      const g = guideRef.current
      if (g) g.style.opacity = '0'
      paint()
      if (getInkMode() && d !== 'c') {
        const t = TOOL[d]
        if (getInkMode() !== t) setInkMode(t) // 놓는 순간 1회 전환(토글 아님)
      } else if (!wasMoved) {
        setInkMode(getInkMode() ? null : 'pen') // 탭 = 펜 토글
      }
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [fab]) // fab 바뀌면(레이아웃 전환) 버튼 엘리먼트가 바뀌므로 리스너 재부착

  const button = (
    <S.Button
      ref={btnRef}
      $icon={!fab}
      $fab={fab}
      $on={active}
      style={{ touchAction: 'none' }}
      title={active ? 'Pen — tap: off · drag ← HL · ↖ pen · ↗ lasso · → eraser' : 'Draw — tap to turn on'}
    >
      <ToolIcon m={mode ?? 'pen'} size={fab ? 22 : 18} />
    </S.Button>
  )

  return (
    <>
      {/* 모바일 FAB: 2번째 슬롯 자리(spacer) + 버튼은 body로 포털(노트 열려도 위에 보임). 데스크톱: 인라인. */}
      {fab ? (
        <>
          <S.StickSpacer />
          {createPortal(<S.PenPortal>{button}</S.PenPortal>, document.body)}
        </>
      ) : (
        button
      )}
      {active &&
        createPortal(
          <S.PenGuide ref={guideRef}>
            <S.GuideChip data-dir="ul" $pos="ul">
              <ToolIcon m="highlighter" size={20} />
            </S.GuideChip>
            <S.GuideChip data-dir="l" $pos="l">
              <ToolIcon m="pen" size={20} />
            </S.GuideChip>
            <S.GuideChip data-dir="ur" $pos="ur">
              <ToolIcon m="lasso" size={20} />
            </S.GuideChip>
            <S.GuideChip data-dir="r" $pos="r">
              <ToolIcon m="eraser" size={20} />
            </S.GuideChip>
          </S.PenGuide>,
          document.body,
        )}
    </>
  )
}
