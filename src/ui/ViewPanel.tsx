import { useEffect, useRef, useState } from 'react'
import {
  bumpUI,
  captureFrame,
  defaultZoom,
  frameZoomPct,
  getBgColor,
  getCamera,
  getCurrentFrame,
  getCurrentSpace,
  getFrame,
  getFrameTarget,
  getGridBold,
  getShowFrame,
  getShowGrid,
  resetBgColor,
  setBgColor,
  setCamera,
  setCurrentFrameSize,
  setCurrentFrameZoom,
  setFrameTarget,
  setGridBold,
  setShowFrame,
  setShowGrid,
} from '../store'
import ColorPicker from './ColorPicker'
import CommitInput from './CommitInput'
import ConfirmModal from './ConfirmModal'
import * as S from './ViewPanel.styles'

// 위치 기억(닫았다 열어도, 재마운트돼도 유지). 세션·재실행 넘어 로컬 저장.
const VIEW_POS_KEY = 'simpra:viewPos'
let savedViewPos: { x: number; y: number } | null = (() => {
  try {
    const r = typeof localStorage !== 'undefined' ? localStorage.getItem(VIEW_POS_KEY) : null
    const p = r ? JSON.parse(r) : null
    return p && typeof p.x === 'number' && typeof p.y === 'number' ? p : null
  } catch {
    return null
  }
})()
function saveViewPos(p: { x: number; y: number }) {
  savedViewPos = p
  try {
    localStorage.setItem(VIEW_POS_KEY, JSON.stringify(p))
  } catch {
    /* 사생활 모드 등 → 이 세션만 */
  }
}

// 아무것도 선택 안 됐을 때 우상단 좌표 위젯.
// 접힘: 현재 중심좌표만 작게. 탭하면 펼쳐서 X/Y 입력 → Go로 이동, ⟲로 0,0 복귀.
export default function ViewPanel() {
  const [open, setOpen] = useState(false)
  const [xv, setXv] = useState('0')
  const [yv, setYv] = useState('0')
  const [dimsOpen, setDimsOpen] = useState(false) // 프레임 W/H/줌 편집기 열림
  const [confirmChange, setConfirmChange] = useState(false) // 기존 프레임 덮어쓰기 확인
  const c = getCamera()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(savedViewPos)
  const dragRef = useRef<{ moved: boolean }>({ moved: false })
  const posStyle = pos ? { left: pos.x, top: pos.y, right: 'auto' as const } : undefined

  // 칩/헤더 드래그로 위젯 이동(위치 기억). 탭(안 움직임)은 클릭으로 통과.
  const startDrag = (e: React.PointerEvent) => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const base = pos ?? { x: rect.left, y: rect.top }
    const sx = e.clientX
    const sy = e.clientY
    const st = { moved: false, last: base }
    dragRef.current = st
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx
      const dy = ev.clientY - sy
      if (!st.moved && Math.hypot(dx, dy) < 4) return
      st.moved = true
      const w = el.offsetWidth
      const h = el.offsetHeight
      st.last = {
        x: Math.max(4, Math.min(window.innerWidth - w - 4, base.x + dx)),
        y: Math.max(4, Math.min(window.innerHeight - h - 4, base.y + dy)),
      }
      setPos(st.last)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (st.moved) saveViewPos(st.last)
      setTimeout(() => (dragRef.current = { moved: false }), 0) // 클릭 가드가 읽은 뒤 초기화
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // 다른 곳(캔버스 등) 클릭하면 좌표 패널 닫기(취소). 단, 확인 모달이 떠 있으면 유지(모달은 포털이라 밖).
  useEffect(() => {
    if (!open) return
    const h = (e: PointerEvent) => {
      if (confirmChange) return
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', h)
    return () => window.removeEventListener('pointerdown', h)
  }, [open, confirmChange])

  const openEdit = () => {
    setXv(String(Math.round(c.x)))
    setYv(String(Math.round(c.y)))
    setOpen(true)
  }
  const go = () => {
    setCamera({ x: Number(xv) || 0, y: Number(yv) || 0, zoom: c.zoom })
    bumpUI()
    setOpen(false)
  }
  const reset = () => {
    setCamera({ x: 0, y: 0, zoom: defaultZoom() }) // 모바일=75%, PC=100%
    bumpUI()
    setXv('0')
    setYv('0')
  }
  // 지금 보이는 화면을 이 공간의 프레임으로 저장 → 점선 테두리도 바로 켜서 확인시켜줌.
  const capture = () => {
    captureFrame()
    if (!getShowFrame()) setShowFrame(true)
  }
  const target = getFrameTarget()
  const space = getCurrentSpace()
  const frame = getCurrentFrame() // 선택 타깃 기준
  const hasFrame = !!frame
  const hasPC = !!getFrame(space, 'pc')
  const hasMobile = !!getFrame(space, 'mobile')
  const targetLabel = target === 'pc' ? 'PC' : 'Mobile'
  // Set Frame: 최초면 바로, 기존에 있으면 실수 방지로 "Change?" 확인.
  const onSetFrame = () => (hasFrame ? setConfirmChange(true) : capture())

  if (!open) {
    return (
      <S.Wrap ref={wrapRef} style={posStyle}>
        <S.Chip
          onPointerDown={startDrag}
          onClick={() => {
            if (dragRef.current.moved) return // 드래그였으면 펼침 안 함
            openEdit()
          }}
          title="Drag to move · tap for coordinates"
        >
          ◎ {Math.round(c.x)}, {Math.round(c.y)}
        </S.Chip>
      </S.Wrap>
    )
  }

  return (
    <S.Wrap ref={wrapRef} style={posStyle}>
      {/* 현재 top 위치 기준으로 최대높이 = 화면끝까지 - 12px → 하단이 잘리지 않고 깔끔히 마감 */}
      <S.Card style={{ maxHeight: `calc(100dvh - ${Math.round(pos?.y ?? 56)}px - 12px)` }}>
        <S.Head
          onPointerDown={startDrag}
          onClick={() => {
            if (dragRef.current.moved) return // 드래그였으면 접지 않음
            setOpen(false)
          }}
          title="Drag to move · tap to collapse"
        >
          <span>◎ center</span>
          <span>▴</span>
        </S.Head>
        <S.Row>
          <S.Box>
            <span>X</span>
            <input
              type="number"
              value={xv}
              onChange={(e) => setXv(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && go()}
            />
          </S.Box>
          <S.Box>
            <span>Y</span>
            <input
              type="number"
              value={yv}
              onChange={(e) => setYv(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && go()}
            />
          </S.Box>
        </S.Row>
        <S.Row>
          <S.Go onClick={go}>Go</S.Go>
          <S.Reset title="Back to 0, 0" onClick={reset}>
            ⟲
          </S.Reset>
        </S.Row>

        <S.Sep />

        <S.Label>Background</S.Label>
        <S.Row>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ColorPicker value={getBgColor()} onChange={setBgColor} />
          </div>
          <S.Reset title="Default background" onClick={resetBgColor}>
            ⟲
          </S.Reset>
        </S.Row>

        <S.Row>
          <S.Label style={{ flex: 1 }}>Grid</S.Label>
          <S.Toggle $on={getShowGrid()} onClick={() => setShowGrid(!getShowGrid())}>
            {getShowGrid() ? 'On' : 'Off'}
          </S.Toggle>
          <S.Toggle
            $on={getShowGrid() && getGridBold()}
            disabled={!getShowGrid()}
            title="Make the grid more visible"
            onClick={() => setGridBold(!getGridBold())}
          >
            Bold
          </S.Toggle>
        </S.Row>

        <S.Sep />

        <S.Row>
          <S.Label style={{ flex: 1 }}>Frame</S.Label>
          <S.Toggle
            $on={getShowFrame()}
            disabled={!hasFrame}
            title="Show the selected frame outline"
            onClick={() => setShowFrame(!getShowFrame())}
          >
            {getShowFrame() ? 'On' : 'Off'}
          </S.Toggle>
        </S.Row>
        <S.Row>
          <S.Toggle
            style={{ flex: 1 }}
            $on={target === 'pc'}
            title="Edit the PC frame for this space"
            onClick={() => setFrameTarget('pc')}
          >
            PC{hasPC ? ' •' : ''}
          </S.Toggle>
          <S.Toggle
            style={{ flex: 1 }}
            $on={target === 'mobile'}
            title="Edit the Mobile frame for this space"
            onClick={() => setFrameTarget('mobile')}
          >
            Mobile{hasMobile ? ' •' : ''}
          </S.Toggle>
        </S.Row>
        <S.Row>
          <S.Go
            title={
              hasFrame
                ? `Change the ${targetLabel} frame (asks first)`
                : `Save this view as the ${targetLabel} frame — auto-fits on entry`
            }
            onClick={onSetFrame}
          >
            {hasFrame ? 'Change' : 'Set'} {targetLabel} Frame
          </S.Go>
          <S.Reset
            title={hasFrame ? 'Edit frame size / zoom' : 'No frame yet'}
            disabled={!hasFrame}
            style={{ width: 52, opacity: hasFrame ? 1 : 0.35 }}
            onClick={() => hasFrame && setDimsOpen((v) => !v)}
          >
            {hasFrame && frame ? `${frameZoomPct(frame)}%` : '—'}
          </S.Reset>
        </S.Row>

        {dimsOpen && frame && (
          <>
            <S.Row>
              <S.Box>
                <span>W</span>
                <CommitInput
                  numeric
                  type="number"
                  value={Math.round(frame.w)}
                  onCommit={(v) => setCurrentFrameSize(Number(v), frame.h)}
                />
              </S.Box>
              <S.Box>
                <span>H</span>
                <CommitInput
                  numeric
                  type="number"
                  value={Math.round(frame.h)}
                  onCommit={(v) => setCurrentFrameSize(frame.w, Number(v))}
                />
              </S.Box>
            </S.Row>
            <S.Row>
              <S.Box>
                <span>Zoom %</span>
                <CommitInput
                  numeric
                  type="number"
                  value={frameZoomPct(frame)}
                  onCommit={(v) => setCurrentFrameZoom(Number(v))}
                />
              </S.Box>
            </S.Row>
          </>
        )}
      </S.Card>

      {confirmChange && (
        <ConfirmModal
          message={`Change the ${targetLabel} frame to the current view?`}
          confirmLabel="Change"
          onConfirm={() => {
            capture()
            setConfirmChange(false)
          }}
          onCancel={() => setConfirmChange(false)}
        />
      )}
    </S.Wrap>
  )
}
