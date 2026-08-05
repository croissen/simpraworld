// 펼침 메뉴: 데스크톱은 토글 버튼 옆으로 좌르륵, 모바일은 팝업(바텀시트) 리스트로.
import { useState, type ReactElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useIsMobile } from '../useIsMobile'
import * as S from './Toolbar.styles'

export default function OverflowMenu({
  label,
  title,
  heading,
  subheader,
  items,
  defaultOpen = false,
  align = 'left',
  saved = false,
  corner = false,
}: {
  label: ReactNode // 토글 버튼 내용 (예: '+', '📄', '⋯')
  title?: string
  heading?: string // 모바일 중앙 팝업 좌측 제목 (예: 'Add', 'Directory', 'Setting')
  subheader?: ReactNode // 제목 아래 줄(예: Setting 팝업의 유니버스명 + 수정)
  items: ReactElement[] // 펼쳐질 버튼들
  defaultOpen?: boolean
  align?: 'left' | 'right'
  saved?: boolean // 토글 버튼 초록 체크 강조(저장 직후 "..." 메뉴용)
  corner?: boolean // 모바일에서 토글을 우상단 고정 버튼으로(⋯ Setting용)
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
        {corner
          ? createPortal(<S.CornerFab>{toggle}</S.CornerFab>, document.body)
          : toggle}
        {open &&
          createPortal(
            <S.MobilePopOverlay onClick={() => setOpen(false)}>
              <S.MobileSheet onClick={(e) => e.stopPropagation()}>
                <S.SheetHead>
                  <S.SheetTitle>{heading}</S.SheetTitle>
                  <S.SheetClose onClick={() => setOpen(false)} title="Close">
                    ✕
                  </S.SheetClose>
                </S.SheetHead>
                {subheader && <S.SheetSub>{subheader}</S.SheetSub>}
                <S.SheetBody>
                  {items.map((el, i) => (
                    <div key={el.key ?? i} onClick={() => setOpen(false)}>
                      {el}
                    </div>
                  ))}
                </S.SheetBody>
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
