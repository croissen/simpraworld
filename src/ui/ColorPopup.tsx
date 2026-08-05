import { useState } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'

// 상세 색 선택 팝업: 채도/명도(SV) 2D + 색상(Hue) 슬라이더 + HEX 입력 + 스포이드.
// 값이 바뀔 때마다 onChange(hex)로 즉시 반영.

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0,
    g = 0,
    b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [h, max ? d / max : 0, max]
}
function hexToRgb(hex: string): [number, number, number] | null {
  let v = hex.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(v))
    v = v
      .split('')
      .map((c) => c + c)
      .join('')
  if (!/^[0-9a-fA-F]{6}$/.test(v)) return null
  const n = parseInt(v, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()
}

const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window

export default function ColorPopup({
  value,
  onChange,
  onClose,
}: {
  value: string
  onChange: (hex: string) => void
  onClose: () => void
}) {
  const init = hexToRgb(value) || [255, 77, 109]
  const [hsv, setHsv] = useState<[number, number, number]>(() => rgbToHsv(...init))
  const [hexText, setHexText] = useState(value.toUpperCase())
  const [h, s, v] = hsv

  const apply = (nh: number, ns: number, nv: number) => {
    setHsv([nh, ns, nv])
    const hex = rgbToHex(...hsvToRgb(nh, ns, nv))
    setHexText(hex)
    onChange(hex)
  }

  // SV(채도/명도) 2D 영역 드래그
  const onSvDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const set = (cx: number, cy: number) => {
      const ns = Math.max(0, Math.min(1, (cx - rect.left) / rect.width))
      const nv = Math.max(0, Math.min(1, 1 - (cy - rect.top) / rect.height))
      apply(h, ns, nv)
    }
    set(e.clientX, e.clientY)
    const mv = (ev: PointerEvent) => set(ev.clientX, ev.clientY)
    const up = () => {
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
  }

  // Hue 슬라이더 드래그
  const onHueDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const set = (cx: number) => apply(Math.max(0, Math.min(360, ((cx - rect.left) / rect.width) * 360)), s, v)
    set(e.clientX)
    const mv = (ev: PointerEvent) => set(ev.clientX)
    const up = () => {
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
  }

  const commitHex = (text: string) => {
    const rgb = hexToRgb(text)
    if (rgb) {
      const [nh, ns, nv] = rgbToHsv(...rgb)
      apply(nh, ns, nv)
    } else setHexText(rgbToHex(...hsvToRgb(h, s, v)))
  }

  const eyedrop = async () => {
    const ED = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } })
      .EyeDropper
    if (!ED) return
    try {
      const res = await new ED().open()
      const rgb = hexToRgb(res.sRGBHex)
      if (rgb) apply(...rgbToHsv(...rgb))
    } catch {
      /* 취소 */
    }
  }

  const cur = rgbToHex(...hsvToRgb(h, s, v))
  const hueColor = rgbToHex(...hsvToRgb(h, 1, 1))

  return createPortal(
    <Overlay onClick={onClose}>
      <Sheet onClick={(e) => e.stopPropagation()}>
        <Title>Color</Title>
        <SV
          style={{ background: `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,${hueColor})` }}
          onPointerDown={onSvDown}
        >
          <Knob style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: cur }} />
        </SV>
        <Hue onPointerDown={onHueDown}>
          <HueKnob style={{ left: `${(h / 360) * 100}%` }} />
        </Hue>
        <Bottom>
          <Preview style={{ background: cur }} />
          <HexInput
            value={hexText}
            spellCheck={false}
            onChange={(e) => setHexText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
            }}
            onBlur={(e) => commitHex(e.currentTarget.value)}
          />
          {hasEyeDropper && (
            <IconBtn title="Eyedropper — pick a color from screen" onClick={eyedrop}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M19.35 4.65a2.2 2.2 0 0 0-3.11 0l-2.2 2.2-1-1-1.42 1.42 1 1L4.2 16.7a2 2 0 0 0-.55 1.02L3 21l3.28-.65a2 2 0 0 0 1.02-.55l7.43-7.42 1 1 1.42-1.42-1-1 2.2-2.2a2.2 2.2 0 0 0 0-3.11z"
                  fill="currentColor"
                />
              </svg>
            </IconBtn>
          )}
          <Done onClick={onClose}>Done</Done>
        </Bottom>
      </Sheet>
    </Overlay>,
    document.body,
  )
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  @media (max-width: 640px) {
    align-items: flex-end;
  }
`
const Sheet = styled.div`
  width: 280px;
  max-width: calc(100vw - 24px);
  background: #161b27;
  border: 1px solid #2b3346;
  border-radius: 16px;
  padding: 14px;
  @media (max-width: 640px) {
    width: 100%;
    border-radius: 18px 18px 0 0;
    padding-bottom: 22px;
  }
`
const Title = styled.div`
  font-size: 11px;
  color: #8b95a8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
`
const SV = styled.div`
  position: relative;
  width: 100%;
  height: 150px;
  border-radius: 10px;
  cursor: crosshair;
  touch-action: none;
`
const Knob = styled.div`
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
  transform: translate(-50%, -50%);
  pointer-events: none;
`
const Hue = styled.div`
  position: relative;
  height: 16px;
  margin-top: 12px;
  border-radius: 8px;
  cursor: pointer;
  touch-action: none;
  background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
`
const HueKnob = styled.div`
  position: absolute;
  top: -3px;
  width: 6px;
  height: 22px;
  border-radius: 4px;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
  transform: translateX(-50%);
  pointer-events: none;
`
const Bottom = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
`
const Preview = styled.div`
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
`
const HexInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid #2b3346;
  background: #0f1320;
  color: #e8ecf3;
  font-size: 13px;
  font-family: ui-monospace, monospace;
  text-transform: uppercase;
`
const IconBtn = styled.button`
  width: 32px;
  height: 30px;
  flex: none;
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
const Done = styled.button`
  height: 30px;
  flex: none;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #3ddc7f;
  background: #22301f;
  color: #bff3d4;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
`
