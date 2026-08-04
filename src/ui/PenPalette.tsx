import { useState } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import {
  commitRecentColor,
  getInkColor,
  getInkMode,
  getLastEraser,
  getPenWidth,
  getRecentColors,
  setInkColor,
  setInkMode,
  setPenWidth,
} from '../store'
import type { InkMode } from '../store'

// 펜 모드일 때 뜨는 플로팅 팔레트(헤더 드래그로 이동). 삼성노트풍.
// 펜/형광펜 + 지우개 2종(획 전체·부분) + 올가미 · 굵기 · 색상(기본+그라데이션+최근).
const PENS: { m: InkMode; icon: string; label: string }[] = [
  { m: 'pen', icon: '🖊', label: 'Pen' },
  { m: 'highlighter', icon: '🖍', label: 'Highlighter' },
]
const ERASERS: { m: InkMode; label: string }[] = [
  { m: 'eraser', label: 'Stroke' },
  { m: 'erasePart', label: 'Area' },
]
// 한 줄: 흰·검 + 빨·파·초
const BASE_COLORS = ['#ffffff', '#12151c', '#ff4d6d', '#5b8cff', '#3ddc7f']

// HSL(0~360, %,%) → #RRGGBB
function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// 미니바 아이콘(펼치기 / 최소화) — 폰트 의존 없는 SVG
const IconExpand = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
    <path d="M4 4h7V2H2v9h2V4zm16 16h-7v2h9v-9h-2v7z" fill="currentColor" />
  </svg>
)
const IconMinimize = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
    <rect x="5" y="16" width="14" height="2.4" rx="1.2" fill="currentColor" />
  </svg>
)

export default function PenPalette() {
  const mode = getInkMode()
  const color = getInkColor()
  const width = getPenWidth()
  const recents = getRecentColors()
  const [pos, setPos] = useState(() => ({
    x: typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 288) : 16,
    y: 76,
  }))
  const [min, setMin] = useState(false)

  if (!mode) return null

  // 헤더 드래그로 이동(창 밖으로 완전히 못 나가게 클램프).
  function onHeaderDown(e: React.PointerEvent) {
    e.preventDefault()
    const start = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
    const move = (ev: PointerEvent) => {
      setPos({
        x: Math.max(4, Math.min(window.innerWidth - 60, start.px + (ev.clientX - start.mx))),
        y: Math.max(4, Math.min(window.innerHeight - 40, start.py + (ev.clientY - start.my))),
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const minimize = () => {
    commitRecentColor() // 최근색은 이 시점에 갱신
    setMin(true)
  }

  const pickColor = (c: string) => {
    setInkColor(c)
    // 지우개·올가미 상태에서 색을 고르면 펜으로 전환
    if (mode !== 'pen' && mode !== 'highlighter') setInkMode('pen')
  }

  // 무지개 그라데이션에서 색 집기(클릭/드래그)
  function pickHue(e: React.PointerEvent) {
    const el = e.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    const apply = (clientX: number) => {
      const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      pickColor(hslToHex(t * 360, 90, 55))
    }
    apply(e.clientX)
    const move = (ev: PointerEvent) => apply(ev.clientX)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // ── 최소화: 헤더 바만(현재색 점 + 펼치기). 필기는 계속 활성 ──
  if (min) {
    return createPortal(
      <Card style={{ left: pos.x, top: pos.y, width: 'auto' }} onPointerDown={(e) => e.stopPropagation()}>
        <MiniBar onPointerDown={onHeaderDown}>
          <Grip>⠿</Grip>
          <MiniTool
            $on={mode === 'pen' || mode === 'highlighter' || mode === 'pencil'}
            title="Pen"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setInkMode('pen')}
          >
            🖊
          </MiniTool>
          <MiniTool
            $on={mode === 'eraser' || mode === 'erasePart'}
            title="Eraser"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setInkMode(getLastEraser())}
          >
            🧽
          </MiniTool>
          <MiniDot style={{ background: color }} />
          <IconBtn
            title="Expand palette"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMin(false)}
          >
            <IconExpand />
          </IconBtn>
        </MiniBar>
      </Card>,
      document.body,
    )
  }

  return createPortal(
    <Card style={{ left: pos.x, top: pos.y }} onPointerDown={(e) => e.stopPropagation()}>
      <Header onPointerDown={onHeaderDown}>
        <Grip>⠿</Grip>
        <span className="t">Draw</span>
        <IconBtn
          title="Minimize (keeps drawing on)"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={minimize}
        >
          <IconMinimize />
        </IconBtn>
      </Header>

      {/* 펜류 */}
      <Tools>
        {PENS.map((t) => (
          <Tool key={t.m} $on={mode === t.m} title={t.label} onClick={() => setInkMode(t.m)}>
            <span className="i">{t.icon}</span>
            <span className="l">{t.label}</span>
          </Tool>
        ))}
      </Tools>

      {/* 지우개(명시) */}
      <Section>Eraser</Section>
      <Tools>
        {ERASERS.map((t) => (
          <Tool key={t.m} $on={mode === t.m} title={`${t.label} eraser`} onClick={() => setInkMode(t.m)}>
            <span className="i">🧽</span>
            <span className="l">{t.label}</span>
          </Tool>
        ))}
      </Tools>

      {/* 올가미 */}
      <Tools>
        <Tool
          $on={mode === 'lasso'}
          title="Lasso — cut & move drawing"
          onClick={() => setInkMode('lasso')}
          style={{ flexDirection: 'row', gap: 6, padding: '8px' }}
        >
          <span className="i">✂️</span>
          <span className="l" style={{ fontSize: 12 }}>
            Lasso (cut &amp; move)
          </span>
        </Tool>
      </Tools>

      {/* 굵기(− ● +) */}
      <SizeRow>
        <Step title="Thinner" onClick={() => setPenWidth(width - 1)}>
          −
        </Step>
        <Slider
          type="range"
          min={1}
          max={mode === 'highlighter' ? 80 : 40}
          step={1}
          value={width}
          onChange={(e) => setPenWidth(Number(e.target.value))}
          title={`Thickness: ${width}`}
        />
        <Step title="Thicker" onClick={() => setPenWidth(width + 1)}>
          +
        </Step>
        <Dot>
          <span
            style={{
              width: Math.min(22, Math.max(3, width)),
              height: Math.min(22, Math.max(3, width)),
              background: color,
            }}
          />
        </Dot>
      </SizeRow>

      {/* 색상: 한 줄(흰·검·빨·파·초) + 그라데이션 팔레트 */}
      <Section>Colors</Section>
      <ColorLine>
        {BASE_COLORS.map((c) => (
          <Swatch
            key={c}
            $c={c}
            $sel={color.toLowerCase() === c.toLowerCase()}
            title={c}
            onClick={() => pickColor(c)}
          />
        ))}
        <Rainbow title="Pick any color" onPointerDown={pickHue} />
      </ColorLine>

      {/* 최근색(최소화 시 갱신) */}
      {recents.length > 0 && (
        <>
          <Section>Recent</Section>
          <ColorLine>
            {recents.map((c) => (
              <Swatch
                key={c}
                $c={c}
                $sel={color.toLowerCase() === c.toLowerCase()}
                title={c}
                onClick={() => pickColor(c)}
              />
            ))}
          </ColorLine>
        </>
      )}
    </Card>,
    document.body,
  )
}

const Card = styled.div`
  position: fixed;
  z-index: 70;
  width: 256px;
  background: #161b27;
  border: 1px solid #2b3346;
  border-radius: 16px;
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.5);
  padding: 8px 10px 10px;
  user-select: none;
  touch-action: none;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0 8px;
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
  .t {
    font-size: 12px;
    color: #cdd6ea;
    font-weight: 600;
    letter-spacing: 0.3px;
  }
`

const MiniBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px;
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
`

const MiniTool = styled.button<{ $on: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  background: ${(p) => (p.$on ? '#22301f' : '#0f1320')};
  border: 1px solid ${(p) => (p.$on ? '#3ddc7f' : '#2b3346')};
`

const Grip = styled.span`
  color: #6b7488;
  font-size: 14px;
  line-height: 1;
`

const MiniDot = styled.span`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: inline-block;
`

const IconBtn = styled.button`
  margin-left: auto;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid #2b3346;
  background: #0f1320;
  color: #cdd6ea;
  cursor: pointer;
  &:hover {
    border-color: #3ddc7f;
    color: #bff3d4;
  }
`

const Tools = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
`

const Tool = styled.button<{ $on: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 2px 6px;
  border-radius: 10px;
  cursor: pointer;
  background: ${(p) => (p.$on ? '#22301f' : '#0f1320')};
  border: 1px solid ${(p) => (p.$on ? '#3ddc7f' : '#2b3346')};
  transition: background 0.12s, border-color 0.12s;
  .i {
    font-size: 18px;
    line-height: 1;
  }
  .l {
    font-size: 11px;
    color: ${(p) => (p.$on ? '#bff3d4' : '#aab3c5')};
  }
`

const SizeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 2px;
`

const Step = styled.button`
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid #2b3346;
  background: #0f1320;
  color: #e8ecf3;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  flex: none;
`

const Slider = styled.input`
  flex: 1;
  accent-color: #3ddc7f;
  cursor: pointer;
`

const Dot = styled.div`
  width: 26px;
  height: 26px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  span {
    display: block;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
`

const Section = styled.div`
  font-size: 10px;
  color: #6b7488;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 4px 2px 5px;
`

const ColorLine = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 2px 4px;
`

const Swatch = styled.button<{ $c: string; $sel: boolean }>`
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  background: ${(p) => p.$c};
  border: ${(p) => (p.$sel ? '2px solid #3ddc7f' : '1px solid rgba(255,255,255,0.25)')};
  box-shadow: ${(p) => (p.$sel ? '0 0 0 1px #3ddc7f' : 'none')};
`

const Rainbow = styled.div`
  flex: 1;
  height: 22px;
  min-width: 60px;
  border-radius: 6px;
  cursor: crosshair;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: linear-gradient(
    90deg,
    #ff0000 0%,
    #ffa500 14%,
    #ffff00 28%,
    #00ff00 45%,
    #00ffff 60%,
    #0000ff 75%,
    #ff00ff 88%,
    #ff0000 100%
  );
`
