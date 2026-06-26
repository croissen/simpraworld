import { useEffect, useRef, useState } from 'react'
import { commitText, getCamera, getNode, getPlacement, liveResizeText, placementPos, setCamera } from '../store'
import { useIsMobile } from '../useIsMobile'

// 캔버스 텍스트 개체 인라인 편집: 개체 위 textarea로 바로 입력.
// - 박스는 시작 중심을 기준으로 좌우/상하 균등하게 커짐(글이 좌측정렬이어도 요소는 중앙 고정).
// - 오른쪽으로 늘다가 화면 폭에 닿으면 자동 줄바꿈(wrap).
// - Enter=줄바꿈, 다른 곳 클릭/Esc=완료. 위치는 매 프레임 카메라/캔버스에 맞춰 추적.
export default function TextEditor({ pid }: { pid: string }) {
  const pl = getPlacement(pid)
  const n = pl ? getNode(pl.nodeId) : undefined
  const isMobile = useIsMobile()
  const ref = useRef<HTMLTextAreaElement>(null)
  const committed = useRef(false)
  const [value, setValue] = useState(n?.body ?? '')

  // 시작 중심(월드, 고정). 박스는 이 점을 중심으로 커짐.
  const center = useRef<{ x: number; y: number } | null>(null)
  if (!center.current && pl) center.current = placementPos(pl)
  const font = useRef({ bold: !!n?.bold, fontSize: n?.fontSize || 20 })
  const lockedW = useRef<number | null>(null)
  if (lockedW.current == null && n) lockedW.current = n.w
  const wrappedRef = useRef(!!n?.wrap) // 현재 줄바꿈(wrap) 상태(커밋 때 저장)

  // 입력 → 박스 크기 측정 + 화면 폭 넘으면 wrap, 중심 고정
  const resize = () => {
    const ta = ref.current
    if (!ta) return
    const cam = getCamera()
    const c0 = center.current
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
    if (c0) liveResizeText(pid, ta.offsetWidth / cam.zoom, ta.offsetHeight / cam.zoom, c0.x, c0.y)
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
        const cx = (c.x - cam.x) * cam.zoom + r.left + r.width / 2
        const cy = (c.y - cam.y) * cam.zoom + r.top + r.height / 2
        const fs = font.current.fontSize * cam.zoom
        el.style.font = `${font.current.bold ? '700 ' : ''}${fs}px system-ui, sans-serif`
        el.style.lineHeight = '1.25'
        el.style.padding = `${4 * cam.zoom}px`
        if (cam.zoom !== lastZoom) {
          lastZoom = cam.zoom
          resize() // 줌 바뀌면 글자 px 변하니 박스 재측정
        }
        // 중심(c)에 박스 중앙을 맞춤 → 글 좌측정렬이어도 요소는 중앙 유지
        el.style.left = `${cx - el.offsetWidth / 2}px`
        el.style.top = `${cy - el.offsetHeight / 2}px`
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
    commitText(pid, value, w, h, c0.x, c0.y, n?.lock ? undefined : wrappedRef.current)
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
        background: n.color === 'none' ? 'transparent' : n.color,
        color: n.textColor || '#ffffff',
        textAlign: n.align || 'left',
        caretColor: n.textColor || '#ffffff',
        borderRadius: `${(n.radius || 0) * getCamera().zoom}px`,
        boxShadow: '0 0 0 1px #3ddc7f',
      }}
    />
  )
}
