import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import {
  commitRecentColor,
  getInkColor,
  getInkMode,
  getInkSmooth,
  getLastEraser,
  getPanTool,
  getHandMode,
  getPenWidth,
  getRecentColors,
  getPalettePos,
  setInkColor,
  setInkMode,
  setInkSmooth,
  setPanTool,
  setHandMode,
  setPenWidth,
  setPalettePos,
} from '../store'
import type { InkMode } from '../store'
import ColorPopup from './ColorPopup'
import { useIsTouch } from '../useIsMobile'

const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window

// 펜 모드일 때 뜨는 플로팅 팔레트(헤더 드래그로 이동). 삼성노트풍.
// 펜/형광펜 + 지우개 2종(획 전체·부분) + 올가미 · 굵기 · 색상(기본+그라데이션+최근).
const PENS: { m: InkMode; label: string }[] = [
  { m: 'pen', label: 'Pen' },
  { m: 'highlighter', label: 'Highlighter' },
]
const ERASERS: { m: InkMode; label: string }[] = [
  { m: 'eraser', label: 'Stroke' },
  { m: 'erasePart', label: 'Area' },
]

// 도구 아이콘 — 이모지(PC에서 흑백으로 안 보임) 대신 흰색 SVG(currentColor)
export function ToolIcon({ m, size = 20 }: { m: InkMode; size?: number }) {
  const p: Record<string, string> = {
    pen: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    highlighter:
      'M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.9959.9959 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z',
    fill: 'M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z',
    eraser:
      'M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0zM4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l3.53-3.53-4.95-4.95-4.95 4.95z',
    lasso:
      'M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5z',
  }
  const key = m === 'erasePart' ? 'eraser' : m || 'pen'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d={p[key] || p.pen} fill="currentColor" />
    </svg>
  )
}
// 한 줄: 흰·검 + 빨·파·초
const BASE_COLORS = ['#ffffff', '#12151c', '#ff4d6d', '#5b8cff', '#3ddc7f']

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
// 핸드모드(손가락으로도 그리기) 아이콘 — 손 모양
const IconHand = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <path
      d="M13 1.5a1.5 1.5 0 0 1 1.5 1.5v6h1V3.5a1.5 1.5 0 0 1 3 0V11h1V5.5a1.5 1.5 0 0 1 3 0v8.5c0 4.14-3.36 7.5-7.5 7.5h-1.2a7.5 7.5 0 0 1-6.1-3.14l-3.3-4.62a1.5 1.5 0 0 1 2.3-1.9L9.5 12V3A1.5 1.5 0 0 1 11 1.5h.5A1.5 1.5 0 0 1 13 3v5.5h-1V3a1.5 1.5 0 0 0-1.5-1.5z"
      fill="currentColor"
    />
  </svg>
)

export default function PenPalette() {
  const mode = getInkMode()
  const color = getInkColor()
  const width = getPenWidth()
  const smooth = getInkSmooth()
  const recents = getRecentColors()
  const [pos, setPos] = useState(
    () =>
      getPalettePos() ?? {
        x: typeof window !== 'undefined' ? Math.max(8, window.innerWidth - 268) : 8,
        y: 72,
      },
  )
  const touch = useIsTouch() // 터치/앱(마우스 안드로이드=블루스택 포함) 기준
  const panOn = getPanTool()
  const handOn = getHandMode()
  const [min, setMin] = useState(() => touch) // 터치기기(가로폰·태블릿 포함)는 최소화로 시작, PC(마우스)만 펼친 채로
  const [showPicker, setShowPicker] = useState(false) // 상세 색 선택 팝업
  // 최소화 바에서 아래로 펼치는 하위 패널: 색상 / 펜(펜·형광펜+굵기) / 지우개(획·영역+굵기)
  const [miniPanel, setMiniPanel] = useState<null | 'colors' | 'pen' | 'eraser'>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // 카드가 화면 밖으로 나가지 않게: 실제 크기를 재서 뷰포트 안으로 위치를 당김.
  // (펼침/최소화로 크기가 바뀔 때, 창 크기가 바뀔 때마다)
  useLayoutEffect(() => {
    const clamp = () => {
      const el = cardRef.current
      if (!el || typeof window === 'undefined') return
      const w = el.offsetWidth,
        h = el.offsetHeight
      setPos((p) => ({
        x: Math.max(8, Math.min(window.innerWidth - w - 8, p.x)),
        y: Math.max(8, Math.min(window.innerHeight - h - 8, p.y)),
      }))
    }
    clamp()
    window.addEventListener('resize', clamp)
    return () => window.removeEventListener('resize', clamp)
  }, [min, mode])

  if (!mode) return null

  // 헤더 드래그로 이동(창 밖으로 완전히 못 나가게 클램프).
  function onHeaderDown(e: React.PointerEvent) {
    e.preventDefault()
    const start = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
    let last = pos
    const move = (ev: PointerEvent) => {
      const el = cardRef.current
      const w = el?.offsetWidth ?? 256
      const h = el?.offsetHeight ?? 120
      last = {
        x: Math.max(8, Math.min(window.innerWidth - w - 8, start.px + (ev.clientX - start.mx))),
        y: Math.max(8, Math.min(window.innerHeight - h - 8, start.py + (ev.clientY - start.my))),
      }
      setPos(last)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setPalettePos(last) // 옮긴 위치 기억(닫았다 열어도 그 자리)
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
    // 지우개·올가미에서 색을 고르면 펜으로 전환(펜·형광펜·채우기는 색이 의미 있으니 유지)
    if (mode === 'eraser' || mode === 'erasePart' || mode === 'lasso') setInkMode('pen')
  }
  // 도구 선택(토글 안 됨) — 하위 패널의 펜/형광펜·획/영역 버튼용.
  const chooseTool = (m: InkMode) => {
    setPanTool(false)
    if (getInkMode() !== m) setInkMode(m)
  }

  // 스포이드: 화면에서 색 집기(지원 브라우저)
  const eyedrop = async () => {
    const ED = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } })
      .EyeDropper
    if (!ED) return
    try {
      const res = await new ED().open()
      pickColor(res.sRGBHex)
    } catch {
      /* 취소 */
    }
  }

  // ── 최소화: 헤더 바(도구·현재색·펼치기) + 재클릭 시 아래로 하위 옵션. 필기는 계속 활성 ──
  if (min) {
    const miniSwatches = ['#ffffff', '#12151c', recents[0], recents[1]].filter(Boolean) as string[]
    const isPen = !panOn && (mode === 'pen' || mode === 'highlighter' || mode === 'pencil')
    const isEr = !panOn && (mode === 'eraser' || mode === 'erasePart')
    const isLasso = !panOn && mode === 'lasso'
    // 굵기 조절 줄(펜·지우개 패널 공용) — 컴팩트(짧은 슬라이더 + ± + 값)
    const sizeRow = (
      <MiniSizeRow>
        <Step title="Thinner" onClick={() => setPenWidth(width - 1)}>
          −
        </Step>
        <MiniSlider
          type="range"
          min={1}
          max={100}
          step={1}
          value={width}
          onChange={(e) => setPenWidth(Number(e.target.value))}
          title={`Size: ${width} px`}
        />
        <Step title="Thicker" onClick={() => setPenWidth(width + 1)}>
          +
        </Step>
        <SizeVal>{width}</SizeVal>
      </MiniSizeRow>
    )
    return createPortal(
      <>
        <Card ref={cardRef} style={{ left: pos.x, top: pos.y }} onPointerDown={(e) => e.stopPropagation()}>
          <MiniBar onPointerDown={onHeaderDown}>
            <Grip>⠿</Grip>
            {touch && (
              <MiniTool
                $on={handOn}
                title={handOn ? 'Hand mode ON — finger also draws' : 'Hand mode — let finger draw too (off: finger pans)'}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  setHandMode(!handOn)
                  setMiniPanel(null)
                }}
              >
                <IconHand />
              </MiniTool>
            )}
            <MiniTool
              $on={isPen}
              title="Pen (tap again: Pen/Highlighter + size)"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                if (isPen) setMiniPanel((p) => (p === 'pen' ? null : 'pen'))
                else {
                  setPanTool(false)
                  if (mode !== 'pen' && mode !== 'highlighter' && mode !== 'pencil') setInkMode('pen')
                  setMiniPanel(null)
                }
              }}
            >
              <ToolIcon m={mode === 'highlighter' ? 'highlighter' : 'pen'} size={16} />
            </MiniTool>
            <MiniTool
              $on={isEr}
              title="Eraser (tap again: Stroke/Area + size)"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                if (isEr) setMiniPanel((p) => (p === 'eraser' ? null : 'eraser'))
                else {
                  setPanTool(false)
                  if (mode !== 'eraser' && mode !== 'erasePart') setInkMode(getLastEraser())
                  setMiniPanel(null)
                }
              }}
            >
              <ToolIcon m="eraser" size={16} />
            </MiniTool>
            <MiniTool
              $on={isLasso}
              title="Lasso (select & move drawing)"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setPanTool(false)
                if (mode !== 'lasso') setInkMode('lasso')
                setMiniPanel(null)
              }}
            >
              <ToolIcon m="lasso" size={16} />
            </MiniTool>
            <MiniColorBtn
              $sel={miniPanel === 'colors'}
              title="Colors"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setMiniPanel((p) => (p === 'colors' ? null : 'colors'))}
            >
              <MiniDot style={{ background: color }} />
            </MiniColorBtn>
            <IconBtn
              title="Expand palette"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setMin(false)}
            >
              <IconExpand />
            </IconBtn>
          </MiniBar>

          {/* 펜 재클릭: 펜/형광펜 + 굵기 */}
          {miniPanel === 'pen' && (
            <MiniPanel onPointerDown={(e) => e.stopPropagation()}>
              <MiniSeg>
                <SegBtn $on={mode === 'pen' || mode === 'pencil'} onClick={() => chooseTool('pen')}>
                  Pen
                </SegBtn>
                <SegBtn $on={mode === 'highlighter'} onClick={() => chooseTool('highlighter')}>
                  Highlighter
                </SegBtn>
              </MiniSeg>
              {sizeRow}
            </MiniPanel>
          )}

          {/* 지우개 재클릭: 획/영역 + 굵기 */}
          {miniPanel === 'eraser' && (
            <MiniPanel onPointerDown={(e) => e.stopPropagation()}>
              <MiniSeg>
                <SegBtn $on={mode === 'eraser'} onClick={() => chooseTool('eraser')}>
                  Stroke
                </SegBtn>
                <SegBtn $on={mode === 'erasePart'} onClick={() => chooseTool('erasePart')}>
                  Area
                </SegBtn>
              </MiniSeg>
              {sizeRow}
            </MiniPanel>
          )}

          {/* 색깔 표시: 흰·검·최근2개·팔레트 5개 동그라미(중앙). 다시 누르면 사라짐. */}
          {miniPanel === 'colors' && (
            <MiniColorRow onPointerDown={(e) => e.stopPropagation()}>
              {miniSwatches.map((c) => (
                <Swatch
                  key={c}
                  $c={c}
                  $sel={color.toLowerCase() === c.toLowerCase()}
                  title={c}
                  onClick={() => pickColor(c)}
                />
              ))}
              <GradientSwatch title="More colors" onClick={() => setShowPicker(true)} />
            </MiniColorRow>
          )}
        </Card>
        {showPicker && (
          <ColorPopup value={color} onChange={pickColor} onClose={() => setShowPicker(false)} />
        )}
      </>,
      document.body,
    )
  }

  return createPortal(
    <>
      {/* 모바일: 펼친 상태면 팔레트 밖을 덮는 백드롭 → 그 위 탭은 드로잉 안 되고(차단) 팔레트를 최소화. */}
      {touch && <Backdrop onPointerDown={minimize} />}
      <Card ref={cardRef} style={{ left: pos.x, top: pos.y }} onPointerDown={(e) => e.stopPropagation()}>
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
            <span className="i">
              <ToolIcon m={t.m} />
            </span>
            <span className="l">{t.label}</span>
          </Tool>
        ))}
      </Tools>

      {/* 손떨림 보정: 굵기 줄과 동일한 슬라이더 UI. 우측 값 = OFF/1~5. 펜·연필에만 적용. */}
      <Section>Smoothing</Section>
      <SizeRow>
        <Step title="Less" onClick={() => setInkSmooth(smooth - 1)}>
          −
        </Step>
        <Slider
          type="range"
          min={0}
          max={5}
          step={1}
          value={smooth}
          onChange={(e) => setInkSmooth(Number(e.target.value))}
          title={smooth === 0 ? 'Smoothing off' : `Smoothing ${smooth}`}
        />
        <Step title="More" onClick={() => setInkSmooth(smooth + 1)}>
          +
        </Step>
        <SizeVal title="Stroke smoothing">{smooth === 0 ? 'OFF' : smooth}</SizeVal>
      </SizeRow>

      {/* 지우개(명시) */}
      <Section>Eraser</Section>
      <Tools>
        {ERASERS.map((t) => (
          <Tool key={t.m} $on={mode === t.m} title={`${t.label} eraser`} onClick={() => setInkMode(t.m)}>
            <span className="i">
              <ToolIcon m={t.m} />
            </span>
            <span className="l">{t.label}</span>
          </Tool>
        ))}
      </Tools>

      {/* 굵기(− ● +) — 올가미는 굵기 영향을 안 받으니 그 위에 둔다 */}
      <SizeRow>
        <Step title="Thinner" onClick={() => setPenWidth(width - 1)}>
          −
        </Step>
        <Slider
          type="range"
          min={1}
          max={100}
          step={1}
          value={width}
          onChange={(e) => setPenWidth(Number(e.target.value))}
          title={`Size: ${width} px`}
        />
        <Step title="Thicker" onClick={() => setPenWidth(width + 1)}>
          +
        </Step>
        <SizeVal title="Current color & size (px)">
          <span className="chip" style={{ background: color }} />
          {width}
        </SizeVal>
      </SizeRow>

      {/* 올가미 */}
      <Tools>
        <Tool
          $on={mode === 'lasso'}
          title="Lasso — cut & move drawing"
          onClick={() => setInkMode('lasso')}
          style={{ flexDirection: 'row', gap: 6, padding: '8px' }}
        >
          <span className="i">
            <ToolIcon m="lasso" size={18} />
          </span>
          <span className="l" style={{ fontSize: 12 }}>
            Lasso (cut &amp; move)
          </span>
        </Tool>
      </Tools>

      {/* 색상: 한 줄(흰·검·빨·파·초) + 그라데이션(→상세 팝업) + 스포이드 · 현재 HEX 표시 */}
      <Section>
        Colors <HexTag>{color.toUpperCase()}</HexTag>
      </Section>
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
        <GradientSwatch title="More colors — open picker" onClick={() => setShowPicker(true)} />
        {hasEyeDropper && (
          <EyeSwatch title="Eyedropper — pick from screen" onClick={eyedrop}>
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M19.35 4.65a2.2 2.2 0 0 0-3.11 0l-2.2 2.2-1-1-1.42 1.42 1 1L4.2 16.7a2 2 0 0 0-.55 1.02L3 21l3.28-.65a2 2 0 0 0 1.02-.55l7.43-7.42 1 1 1.42-1.42-1-1 2.2-2.2a2.2 2.2 0 0 0 0-3.11z"
                fill="currentColor"
              />
            </svg>
          </EyeSwatch>
        )}
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

      {showPicker && (
        <ColorPopup value={color} onChange={pickColor} onClose={() => setShowPicker(false)} />
      )}
      </Card>
    </>,
    document.body,
  )
}

/* 모바일 전용: 펼친 팔레트 밖을 덮어 탭을 가로채는 투명 백드롭. */
const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 129; /* 팔레트(130) 바로 아래, 노트 편집기(120)·캔버스 위 → 밖 탭을 가로챔 */
`

const Card = styled.div`
  position: fixed;
  z-index: 130; /* 노트 편집기(120)보다 위 — 노트 안 필기 때도 팔레트가 보이게 */
  width: 256px;
  max-width: calc(100vw - 16px);
  max-height: calc(100dvh - 16px);
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  background: #161b27;
  border: 1px solid #2b3346;
  border-radius: 16px;
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.5);
  padding: 8px 10px 10px;
  user-select: none;
  touch-action: pan-y; /* 세로 스크롤 허용(펼친 팔레트가 화면보다 크면 스크롤). 드래그는 헤더에서만. */
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0 8px;
  cursor: grab;
  touch-action: none; /* 헤더 드래그로 이동(스크롤과 충돌 방지) */
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
  touch-action: none; /* 최소화 바 드래그로 이동 */
  &:active {
    cursor: grabbing;
  }
`

const MiniTool = styled.button<{ $on: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(p) => (p.$on ? '#bff3d4' : '#eef2f8')};
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

// 최소화 바의 "색깔 표시" 버튼(현재색 점을 감쌈). 누르면 색상 줄 토글.
const MiniColorBtn = styled.button<{ $sel: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(p) => (p.$sel ? '#22301f' : '#0f1320')};
  border: 1px solid ${(p) => (p.$sel ? '#3ddc7f' : '#2b3346')};
`

// 최소화 바 아래 하위 패널(펜/지우개 옵션 + 굵기)
const MiniPanel = styled.div`
  padding: 8px 2px 2px;
`

// 두 갈래 선택(펜/형광펜, 획/영역) — 고정 폭 안에서 반반으로 꽉 채움
const MiniSeg = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
`

const SegBtn = styled.button<{ $on: boolean }>`
  flex: 1;
  padding: 7px 6px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  color: ${(p) => (p.$on ? '#bff3d4' : '#aab3c5')};
  background: ${(p) => (p.$on ? '#22301f' : '#0f1320')};
  border: 1px solid ${(p) => (p.$on ? '#3ddc7f' : '#2b3346')};
`

// 최소화 패널 굵기 줄 — 고정 폭에 맞춰 슬라이더가 채움(±버튼 + 값).
const MiniSizeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
`
const MiniSlider = styled.input`
  flex: 1 1 0;
  min-width: 0;
  accent-color: #3ddc7f;
  cursor: pointer;
`

// 최소화 바 아래 색상 5개 줄(중앙 정렬)
const MiniColorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 4px 4px;
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
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    color: ${(p) => (p.$on ? '#bff3d4' : '#eef2f8')};
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
  min-width: 0;
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
  flex: 1 1 0;
  min-width: 0; /* range 기본 최소폭 무시 → 좁아도 줄어들어 오른쪽 숫자가 안 잘림 */
  accent-color: #3ddc7f;
  cursor: pointer;
`

const SizeVal = styled.div`
  flex: none;
  min-width: 46px;
  height: 28px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border-radius: 8px;
  border: 1px solid #2b3346;
  background: #0f1320;
  color: #e8ecf3;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  .chip {
    width: 13px;
    height: 13px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.25);
    flex: none;
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

const GradientSwatch = styled.button`
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: conic-gradient(#ff4d4d, #ffd23f, #3ddc7f, #22c1c3, #5b8cff, #c9a9ff, #ff4d6d, #ff4d4d);
`

const EyeSwatch = styled.button`
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cdd6ea;
  background: #0f1320;
  border: 1px solid #2b3346;
  &:hover {
    border-color: #3ddc7f;
    color: #bff3d4;
  }
`

const HexTag = styled.span`
  color: #aab3c5;
  font-family: ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.3px;
`
