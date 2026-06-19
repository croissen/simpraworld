// 펼침(오버플로) 메뉴: 토글 버튼을 누르면 그 옆으로 버튼들이 좌르륵 펼쳐짐.
// 다시 누르기 전까지 안 닫힘(바깥 클릭으로 자동으로 닫지 않음).
import { useState, type ReactElement, type ReactNode } from 'react'
import * as S from './Toolbar.styles'

export default function OverflowMenu({
  label,
  title,
  items,
  defaultOpen = false,
  align = 'left',
  saved = false,
}: {
  label: ReactNode // 토글 버튼 내용 (예: '+', '📄', '⋯')
  title?: string
  items: ReactElement[] // 펼쳐질 버튼들
  defaultOpen?: boolean
  align?: 'left' | 'right'
  saved?: boolean // 토글 버튼 초록 체크 강조(저장 직후 "..." 메뉴용)
}) {
  const [open, setOpen] = useState(defaultOpen)

  const toggle = (
    <S.Button $on={open} $saved={saved} onClick={() => setOpen((v) => !v)} title={title}>
      {label}
    </S.Button>
  )
  const tray = (
    <S.Tray $open={open} $align={align} aria-hidden={!open}>
      {items.map((el, i) => (
        <S.TrayItem
          key={el.key ?? i}
          $open={open}
          $i={i}
          $n={items.length}
          $align={align}
          tabIndex={open ? undefined : -1}
        >
          {el}
        </S.TrayItem>
      ))}
    </S.Tray>
  )

  // align='right'면 트레이가 버튼 왼쪽에서 펼쳐지도록 순서를 뒤집는다
  return (
    <S.Overflow $align={align}>
      {align === 'right' ? (
        <>
          {tray}
          {toggle}
        </>
      ) : (
        <>
          {toggle}
          {tray}
        </>
      )}
    </S.Overflow>
  )
}
