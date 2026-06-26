import { useEffect, useRef, useState } from 'react'
import {
  commitText,
  getCamera,
  getNode,
  getPlacement,
  liveResizeText,
  liveSetTextBody,
  placementPos,
  setCamera,
} from '../store'
import { useIsMobile } from '../useIsMobile'

// 캔버스 텍스트 개체 인라인 편집: 개체 위 textarea로 바로 입력.
// - 좌상단 고정(anchorLeft·anchorTop): 왼쪽·윗변을 고정 → 오른쪽·아래로만 자람.
// - 글자/배경은 투명, 커서만 보임. 실제 글자는 캔버스가 그림(liveSetTextBody) → 편집/보기 위치 100% 동일.
// - 오른쪽으로 늘다가 화면 폭에 닿으면 자동 줄바꿈(wrap). Enter=줄바꿈, 다른 곳 클릭/Esc=완료.
export default function TextEditor({ pid }: { pid: string }) {
  const pl = getPlacement(pid)
  const n = pl ? getNode(pl.nodeId) : undefined
  const isMobile = useIsMobile()
  const ref = useRef<HTMLTextAreaElement>(null)
  const committed = useRef(false)
  const [value, setValue] = useState(n?.body ?? '')

  // 시작 중심(월드). 가로 중심(c0.x)·모바일 카메라 기준으로 사용.
  const center = useRef<{ x: number; y: number } | null>(null)
  if (!center.current && pl) center.current = placementPos(pl)
  // 좌상단 고정점(월드). 표시 중인 박스의 왼쪽·윗변(중심 ∓ 크기/2)에서 잡음 → 측정 타이밍과 무관(드리프트 방지).
  const anchorTop = useRef<number | null>(null)
  const anchorLeft = useRef<number | null>(null)
  if (anchorTop.current == null && pl && n) anchorTop.current = placementPos(pl).y - n.h / 2
  if (anchorLeft.current == null && pl && n) anchorLeft.current = placementPos(pl).x - n.w / 2
  const font = useRef({ bold: !!n?.bold, fontSize: n?.fontSize || 20 })
  const lockedW = useRef<number | null>(null)
  if (lockedW.current == null && n) lockedW.current = n.w
  const wrappedRef = useRef(!!n?.wrap) // 현재 줄바꿈(wrap) 상태(커밋 때 저장)

  // 입력 → 박스 크기 측정 + 화면 폭 넘으면 wrap, 중심 고정
  const resize = () => {
    const ta = ref.current
    if (!ta) return
    const cam = getCamera()
    const maxPx = Math.max(80, window.innerWidth - 48) // 화면 가용 폭

    if (n?.lock) {
      // 락: 고정 폭, 높이 자동
      ta.style.whiteSpace = 'pre-wrap'
      ta.style.wordBreak = 'break-all'
      ta.style.width = (lockedW.current || n.w) * cam.zoom + 'px'
      ta.style.height = '0px'
      ta.style.height = ta.scrollHeight + 'px'
      wrappedRef.current = true
    } else {
      // 자연 폭 측정(줄바꿈 없이)
      ta.style.whiteSpace = 'pre'
      ta.style.wordBreak = 'normal'
      ta.style.width = '0px'
      ta.style.height = '0px'
      const natural = ta.scrollWidth
      if (natural <= maxPx) {
        ta.style.width = natural + 'px'
        wrappedRef.current = false
      } else {
        // 화면 폭 도달 → 줄바꿈
        ta.style.whiteSpace = 'pre-wrap'
        ta.style.wordBreak = 'break-all'
        ta.style.width = maxPx + 'px'
        wrappedRef.current = true
      }
      ta.style.height = '0px'
      ta.style.height = ta.scrollHeight + 'px'
    }
    if (anchorTop.current != null && anchorLeft.current != null) {
      const wWorld = ta.offsetWidth / cam.zoom
      const hWorld = ta.offsetHeight / cam.zoom
      // 좌·상 고정 → 우·하로만 자람 (중심 = 고정점 + 크기/2)
      liveResizeText(pid, wWorld, hWorld, anchorLeft.current + wWorld / 2, anchorTop.current + hWorld / 2)
    }
    liveSetTextBody(pid, ta.value, wrappedRef.current) // 캔버스가 현재 글자를 바로 그리게
  }

  useEffect(() => {
    const c0 = center.current
    // 모바일: 키보드에 안 가리게 화면 상단 30%로
    if (isMobile && c0) {
      const cam = getCamera()
      setCamera({ x: c0.x, y: c0.y + (0.2 * window.innerHeight) / cam.zoom, zoom: cam.zoom })
    }
    const ta = ref.current
    if (ta) {
      ta.focus()
      const len = ta.value.length
      ta.setSelectionRange(len, len)
    }
    let raf = 0
    let lastZoom = -1
    const tick = () => {
      const el = ref.current
      const c = center.current
      if (el && c) {
        const cam = getCamera()
        const canvas = document.querySelector('canvas')
        const r = canvas
          ? canvas.getBoundingClientRect()
          : ({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight } as DOMRect)
        const cy = (c.y - cam.y) * cam.zoom + r.top + r.height / 2
        const cx = (c.x - cam.x) * cam.zoom + r.left + r.width / 2
        const fs = font.current.fontSize * cam.zoom
        el.style.font = `${font.current.bold ? '700 ' : ''}${fs}px system-ui, sans-serif`
        el.style.lineHeight = '1.25'
        el.style.padding = `${4 * cam.zoom}px`
        if (cam.zoom !== lastZoom) {
          lastZoom = cam.zoom
          resize() // 줌 바뀌면 글자 px 변하니 박스 재측정
        }
        // 좌상단(anchorLeft·anchorTop) 고정 → 박스 왼쪽·윗변이 그 화면좌표에 붙고 우·하로 자람
        const at = anchorTop.current
        const al = anchorLeft.current
        el.style.left =
          al != null
            ? `${(al - cam.x) * cam.zoom + r.left + r.width / 2}px`
            : `${cx - el.offsetWidth / 2}px`
        el.style.top =
          at != null
            ? `${(at - cam.y) * cam.zoom + r.top + r.height / 2}px`
            : `${cy - el.offsetHeight / 2}px`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    resize()
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const commit = () => {
    if (committed.current) return
    committed.current = true
    const cam = getCamera()
    const ta = ref.current
    const c0 = center.current!
    const w = ta ? ta.offsetWidth / cam.zoom : 40
    const h = ta ? ta.offsetHeight / cam.zoom : 24
    const cx = anchorLeft.current != null ? anchorLeft.current + w / 2 : c0.x // 좌 고정 기준 최종 중심
    const cy = anchorTop.current != null ? anchorTop.current + h / 2 : c0.y // 윗변 고정 기준
    commitText(pid, value, w, h, cx, cy, n?.lock ? undefined : wrappedRef.current)
  }

  if (!pl || !n || !center.current) return null

  return (
    <textarea
      ref={ref}
      value={value}
      spellCheck={false}
      wrap="soft"
      onChange={(e) => {
        setValue(e.target.value)
        resize()
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation() // 캔버스/전역 단축키와 충돌 방지
        if (e.key === 'Escape') {
          e.preventDefault()
          commit()
        }
        // Enter = 줄바꿈(textarea 기본). 완료는 다른 곳 클릭(blur).
      }}
      style={{
        position: 'fixed',
        zIndex: 60,
        margin: 0,
        minWidth: '8px',
        boxSizing: 'border-box',
        border: 'none',
        outline: 'none',
        resize: 'none',
        overflow: 'hidden',
        // 배경·글자 모두 투명: 실제 글자/배경은 캔버스가 그림. 여기선 커서만 보임 → 편집/보기 위치 동일.
        background: 'transparent',
        color: 'transparent',
        // 초기 폰트/패딩(첫 측정도 정확하게 — 이후 tick이 줌 따라 갱신)
        font: `${n.bold ? '700 ' : ''}${(n.fontSize || 20) * getCamera().zoom}px system-ui, sans-serif`,
        lineHeight: 1.25,
        padding: `${4 * getCamera().zoom}px`,
        textAlign: n.align || 'left',
        caretColor: n.textColor || '#ffffff',
        borderRadius: `${(n.radius || 0) * getCamera().zoom}px`,
        boxShadow: '0 0 0 1.5px #3ddc7f', // 선택 시 캔버스 외곽선과 동일 → 편집/선택 이음매 없음
      }}
    />
  )
}
