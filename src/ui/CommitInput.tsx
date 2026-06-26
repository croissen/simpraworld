import { useEffect, useState } from 'react'
import type { ComponentType, InputHTMLAttributes } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string | number
  onCommit: (v: string) => void
  numeric?: boolean
  /** 렌더할 입력 요소(기본 'input', 스타일드 컴포넌트 전달 가능) */
  component?: ComponentType<InputHTMLAttributes<HTMLInputElement>> | 'input'
}

/**
 * 타이핑 중에는 값을 자유롭게(빈 칸 포함) 둘 수 있고,
 * Enter 또는 포커스 아웃(모바일 키패드 "완료") 때만 실제 값으로 반영.
 * numeric일 때 빈/잘못된 값이면 원래 값으로 되돌림.
 */
export default function CommitInput({
  value,
  onCommit,
  numeric,
  component: Comp = 'input',
  ...rest
}: Props) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])

  const commit = () => {
    if (numeric) {
      const n = parseFloat(text)
      if (isNaN(n)) {
        setText(String(value)) // 빈/잘못된 값 → 원복
        return
      }
      onCommit(String(n))
    } else {
      onCommit(text)
    }
  }

  // styled-components(또는 'input')를 동적으로 렌더
  const El = Comp as ComponentType<InputHTMLAttributes<HTMLInputElement>>
  return (
    <El
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
      {...rest}
      value={text}
      enterKeyHint="done"
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur() // Enter → blur → commit
        }
      }}
      onBlur={commit}
    />
  )
}
