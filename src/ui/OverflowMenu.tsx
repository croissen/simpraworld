// 펼침 메뉴: 데스크톱은 토글 버튼 옆으로 좌르륵, 모바일은 팝업(바텀시트) 리스트로.
import { useState, type ReactElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useIsMobile } from '../useIsMobile'
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
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(isMobile ? false : defaultOpen)

  const toggle = (
    <S.Button $on={open} $saved={saved} onClick={() => setOpen((v) => !v)} title={title}>
      {label}
    </S.Button>
  )

  // 모바일: 버튼 클릭 → 팝업 리스트(항목 누르면 실행 + 닫힘)
  if (isMobile) {
    return (
      <>
        {toggle}
        {open &&
          createPortal(
            <S.MobilePopOverlay onClick={() => setOpen(false)}>
              <S.MobileSheet onClick={(e) => e.stopPropagation()}>
                {items.map((el, i) => (
                  <div key={el.key ?? i} onClick={() => setOpen(false)}>
                    {el}
                  </div>
                ))}
              </S.MobileSheet>
            </S.MobilePopOverlay>,
            document.body,
          )}
      </>
    )
  }

  // 데스크톱: 인라인 트레이
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
