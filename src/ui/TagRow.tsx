import { useEffect, useRef, useState, type CSSProperties } from 'react'

// 해시태그 칩 드래그 정렬 — 애니메이션 없이 즉시 스냅(버벅임 없음).
// 드래그 중 다른 칩 위로 가면 그 자리로 순서가 바로 바뀜. 손 떼면 저장.
const chip: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center', // 글자·× 세로 중앙
  gap: 4,
  background: '#e6ecfb',
  border: '1px solid #c4d3f5',
  color: '#2a3f6b',
  borderRadius: 999,
  padding: '3px 4px 3px 9px',
  fontSize: 12,
  lineHeight: 1.3,
  maxWidth: '100%', // 칸 넘으면 줄바꿈(아래 label에서 단어 분리)
  cursor: 'grab',
  touchAction: 'none',
  userSelect: 'none',
}
const label: CSSProperties = { overflowWrap: 'anywhere', minWidth: 0 } // 아주 긴 태그만 칸 안에서 분리
const xbtn: CSSProperties = {
  border: 'none',
  background: '#cdd9f3',
  color: '#2a3f6b',
  width: 16,
  height: 16,
  borderRadius: '50%',
  cursor: 'pointer',
  fontSize: 11,
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  flexShrink: 0, // 긴 태그가 줄바꿈돼도 × 버튼은 안 찌부됨
}

export default function TagRow({
  tags,
  onReorder,
  onRemove,
}: {
  tags: string[]
  onReorder: (tags: string[]) => void
  onRemove: (t: string) => void
}) {
  const [items, setItems] = useState<string[]>(tags)
  const itemsRef = useRef<string[]>(tags)
  const dragging = useRef<string | null>(null)
  const [dragTag, setDragTag] = useState<string | null>(null)
  const lastMove = useRef(0) // 약 60fps로만 정렬 계산(모바일 부하↓)

  useEffect(() => {
    if (!dragging.current) {
      itemsRef.current = tags
      setItems(tags)
    }
  }, [tags])

  const onDown = (e: React.PointerEvent, t: string) => {
    dragging.current = t
    setDragTag(t)
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    const drag = dragging.current
    if (!drag) return
    const now = performance.now()
    if (now - lastMove.current < 16) return // 프레임당 1회로 제한
    lastMove.current = now
    const over = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest(
      '[data-tg]',
    ) as HTMLElement | null
    if (!over) return
    const overTag = over.dataset.tg
    if (!overTag || overTag === drag) return
    const cur = itemsRef.current
    const from = cur.indexOf(drag)
    const to = cur.indexOf(overTag)
    if (from < 0 || to < 0) return
    const arr = [...cur]
    const [m] = arr.splice(from, 1)
    arr.splice(to, 0, m)
    itemsRef.current = arr
    setItems(arr)
  }
  const onUp = () => {
    if (!dragging.current) return
    dragging.current = null
    setDragTag(null)
    onReorder(itemsRef.current)
  }

  return (
    <>
      {items.map((t) => (
        <span
          key={t}
          data-tg={t}
          onPointerDown={(e) => onDown(e, t)}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{
            ...chip,
            ...(dragTag === t
              ? { background: '#d3e0fb', boxShadow: '0 2px 8px #0004', cursor: 'grabbing' }
              : {}),
          }}
        >
          <span style={label}>#{t}</span>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemove(t)} title="Remove" style={xbtn}>
            ×
          </button>
        </span>
      ))}
    </>
  )
}
