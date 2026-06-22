import { useEffect, useRef, useState } from 'react'
import {
  bumpUI,
  getBgColor,
  getCamera,
  getGridBold,
  getShowGrid,
  resetBgColor,
  setBgColor,
  setCamera,
  setGridBold,
  setShowGrid,
} from '../store'
import ColorPicker from './ColorPicker'
import * as S from './ViewPanel.styles'

// 아무것도 선택 안 됐을 때 우상단 좌표 위젯.
// 접힘: 현재 중심좌표만 작게. 탭하면 펼쳐서 X/Y 입력 → Go로 이동, ⟲로 0,0 복귀.
export default function ViewPanel() {
  const [open, setOpen] = useState(false)
  const [xv, setXv] = useState('0')
  const [yv, setYv] = useState('0')
  const c = getCamera()
  const wrapRef = useRef<HTMLDivElement>(null)

  // 다른 곳(캔버스 등) 클릭하면 좌표 패널 닫기(취소)
  useEffect(() => {
    if (!open) return
    const h = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', h)
    return () => window.removeEventListener('pointerdown', h)
  }, [open])

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
    setCamera({ x: 0, y: 0, zoom: 1 })
    bumpUI()
    setXv('0')
    setYv('0')
  }

  if (!open) {
    return (
      <S.Wrap>
        <S.Chip onClick={openEdit} title="Go to coordinates">
          ◎ {Math.round(c.x)}, {Math.round(c.y)}
        </S.Chip>
      </S.Wrap>
    )
  }

  return (
    <S.Wrap ref={wrapRef}>
      <S.Card>
        <S.Head onClick={() => setOpen(false)} title="Collapse">
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
      </S.Card>
    </S.Wrap>
  )
}
