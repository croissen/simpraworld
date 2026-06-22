import { useEffect, useRef, useState } from 'react'
import { commitText, getCamera, getNode, getPlacement, liveResizeText } from '../store'
import { useIsMobile } from '../useIsMobile'

// 캔버스 텍스트 개체 인라인 편집: 개체 위에 textarea를 띄워 바로 입력.
// 줄바꿈은 데스크톱 Shift/Alt+Enter, 모바일 Enter. 데스크톱 Enter=완료, Esc=완료, blur=완료.
// 자동 줄바꿈 없음(wrap off). 위치는 매 프레임 카메라/캔버스 크기에 맞춰 추적(키보드·팬·줌 따라감).
export default function TextEditor({ pid }: { pid: string }) {
  const pl = getPlacement(pid)
  const n = pl ? getNode(pl.nodeId) : undefined
  const isMobile = useIsMobile()
  const ref = useRef<HTMLTextAreaElement>(null)
  const committed = useRef(false)
  const [value, setValue] = useState(n?.body ?? '')

  // 편집 시작 시점의 월드 좌상단(고정 기준). 이후 화면좌표는 이 기준으로 매 프레임 재계산.
  const tl = useRef<{ x: number; y: number } | null>(null)
  if (!tl.current && pl && n) tl.current = { x: pl.x - n.w / 2, y: pl.y - n.h / 2 }
  const font = useRef({ bold: !!n?.bold, fontSize: n?.fontSize || 20 })
  const isWrap = !!n?.wrap
  const wrapW = useRef<number | null>(null) // wrap 모드의 고정 폭(월드)
  if (wrapW.current == null && n) wrapW.current = n.w

  // 입력 → 박스 크기(월드) 실시간 반영
  const resize = () => {
    const ta = ref.current
    if (!ta) return
    const cam = getCamera()
    const t = tl.current
    if (isWrap) {
      // 고정 폭: 폭 유지, 높이만 내용에 맞춰 자람
      const wWorld = wrapW.current || n?.w || 40
      ta.style.width = wWorld * cam.zoom + 'px'
      ta.style.height = '0px'
      ta.style.height = ta.scrollHeight + 'px'
      if (t) liveResizeText(pid, wWorld, ta.scrollHeight / cam.zoom, t.x + wWorld / 2, t.y + ta.scrollHeight / cam.zoom / 2)
    } else {
      // 오른쪽 무한: 폭/높이 모두 내용에 맞춰
      ta.style.width = '0px'
      ta.style.height = '0px'
      ta.style.width = ta.scrollWidth + 'px'
      ta.style.height = ta.scrollHeight + 'px'
      if (t) {
        const w = ta.scrollWidth / cam.zoom
        const h = ta.scrollHeight / cam.zoom
        liveResizeText(pid, w, h, t.x + w / 2, t.y + h / 2)
      }
    }
  }

  useEffect(() => {
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
      const t = tl.current
      if (el && t) {
        const cam = getCamera()
        const canvas = document.querySelector('canvas')
        const r = canvas
          ? canvas.getBoundingClientRect()
          : ({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight } as DOMRect)
        const sx = (t.x - cam.x) * cam.zoom + r.left + r.width / 2
        const sy = (t.y - cam.y) * cam.zoom + r.top + r.height / 2
        const fs = font.current.fontSize * cam.zoom
        el.style.left = `${sx}px`
        el.style.top = `${sy}px`
        el.style.font = `${font.current.bold ? '700 ' : ''}${fs}px system-ui, sans-serif`
        el.style.lineHeight = '1.25'
        el.style.padding = `${4 * cam.zoom}px`
        if (cam.zoom !== lastZoom) {
          lastZoom = cam.zoom
          resize() // 줌 바뀌면 글자 px 변하니 박스 재측정
        }
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
    const t = tl.current!
    const w = isWrap ? wrapW.current || n?.w || 40 : ta ? ta.scrollWidth / cam.zoom : 40
    const h = ta ? ta.scrollHeight / cam.zoom : 24
    commitText(pid, value, w, h, t.x + w / 2, t.y + h / 2)
  }

  if (!pl || !n || !tl.current) return null

  return (
    <textarea
      ref={ref}
      value={value}
      spellCheck={false}
      wrap={isWrap ? 'soft' : 'off'}
      onChange={(e) => {
        setValue(e.target.value)
        resize()
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Enter') {
          if (isMobile || e.shiftKey || e.altKey) {
            e.preventDefault()
            const ta = e.currentTarget
            const start = ta.selectionStart
            const end = ta.selectionEnd
            const nv = value.slice(0, start) + '\n' + value.slice(end)
            setValue(nv)
            requestAnimationFrame(() => {
              ta.selectionStart = ta.selectionEnd = start + 1
              resize()
            })
          } else {
            e.preventDefault()
            commit()
          }
        }
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
        whiteSpace: isWrap ? 'pre-wrap' : 'pre',
        wordBreak: isWrap ? 'break-all' : 'normal',
        caretColor: n.textColor || '#ffffff',
        borderRadius: `${(n.radius || 0) * getCamera().zoom}px`,
        boxShadow: '0 0 0 1px #3ddc7f',
      }}
    />
  )
}
