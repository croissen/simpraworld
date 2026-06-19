import { useEffect, useState } from 'react'
import * as S from './Inspector.styles'

// '#RGB'/'#RRGGBB'(# 생략 허용) → '#RRGGBB' 대문자. 잘못된 값이면 null.
export function normalizeHex(s: string): string | null {
  let v = s.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(v)) v = v.split('').map((c) => c + c).join('')
  return /^[0-9a-fA-F]{6}$/.test(v) ? '#' + v.toUpperCase() : null
}

// 직접 색 고르기: 스와치(네이티브 OS 팔레트) + HEX 입력. HEX 고치고 Enter/포커스아웃 → 그 색으로.
export default function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [hex, setHex] = useState(value.toUpperCase())
  useEffect(() => setHex(value.toUpperCase()), [value])
  const commit = () => {
    const v = normalizeHex(hex)
    if (v) onChange(v)
    else setHex(value.toUpperCase()) // 잘못된 값 → 원복
  }
  return (
    <S.ColorRow>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <input
        type="text"
        value={hex}
        spellCheck={false}
        onChange={(e) => setHex(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur() // Enter → blur → commit
          }
        }}
        onBlur={commit}
      />
    </S.ColorRow>
  )
}
