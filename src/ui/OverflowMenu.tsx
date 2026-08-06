// 펼침 메뉴:
//  - 데스크톱(마우스): 토글 버튼 옆으로 좌르륵(인라인 트레이=아코디언).
//  - 세로폰(≤640, 기존 모바일 레이아웃): 우상단/인라인 토글 + 중앙 팝업 리스트. (기존 그대로)
//  - 가로폰·태블릿(터치 + 넓은 화면=데스크톱 레이아웃): 버튼은 PC 위치 그대로 두되, 클릭하면 팝업.
import { useState, type ReactElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { leavePenForNav } from '../store'
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
  heading?: string // 팝업 좌측 제목 (예: 'Add', 'Directory', 'Setting')
  subheader?: ReactNode // 제목 아래 줄(예: Setting 팝업의 유니버스명 + 수정)
  items: ReactElement[] // 펼쳐질 버튼들
  defaultOpen?: boolean
  align?: 'left' | 'right'
  saved?: boolean // 토글 버튼 초록 체크 강조(저장 직후 "..." 메뉴용)
  corner?: boolean // 세로폰에서 토글을 우상단 고정 버튼으로(⋯ Setting용)
}) {
  const narrow = useIsMobile() // 세로폰(≤640) = 기존 모바일 하단 FAB 레이아웃
  const touch = useIsMobile('(hover: none) and (pointer: coarse)') // 터치기기(가로폰·태블릿 포함)
  const popup = narrow || touch // 아코디언 대신 팝업으로 열지 (PC 외 모든 기기)
  const [open, setOpen] = useState(popup ? false : defaultOpen)

  const toggle = (
    <S.Button
      $icon
      $on={open}
      $saved={saved}
      onClick={() => {
        leavePenForNav() // 내비 메뉴(+/폴더/…) 열면 핸드모드 아닌 한 펜 끄기
        setOpen((v) => !v)
      }}
      title={title}
    >
      {label}
    </S.Button>
  )

  // 팝업 리스트(세로폰·가로폰·태블릿 공용)
  const sheet = open
    ? createPortal(
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
      )
    : null

  // 세로폰: 기존 모바일 렌더 그대로(코너팹/인라인 토글 + 팝업)
  if (narrow) {
    return (
      <>
        {corner ? createPortal(<S.CornerFab>{toggle}</S.CornerFab>, document.body) : toggle}
        {sheet}
      </>
    )
  }

  // 가로폰·태블릿(터치, 넓은 화면=데스크톱 레이아웃): 버튼은 PC 위치 그대로, 클릭 시 팝업
  if (touch) {
    return (
      <S.Overflow $align={align}>
        {toggle}
        {sheet}
      </S.Overflow>
    )
  }

  // 데스크톱(마우스): 인라인 트레이(아코디언)
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
