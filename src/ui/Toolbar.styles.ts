import styled, { css, keyframes } from 'styled-components'

export const Toolbar = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;

  /* 모바일: 하단 중앙에 동그란 FAB 가로 배열(⌂ ✎ + 📁 ⋯) */
  @media (max-width: 640px) {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(30px + env(safe-area-inset-bottom, 0px));
    z-index: 30;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 12px;
    & > button {
      width: 60px;
      height: 60px;
      padding: 0;
      border-radius: 50%;
      font-size: 25px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 18px #0007;
      flex: none;
    }
  }
`

export const Gap = styled.span`
  width: 8px;
  flex: none;
`

/* 펜 버튼(조이스틱) 방향 가이드 — 버튼 중심에 앵커(left/top은 JS로 세팅). opacity는 DOM으로 토글. */
export const PenGuide = styled.div`
  position: fixed;
  z-index: 140;
  opacity: 0;
  transition: opacity 0.12s ease;
  pointer-events: none; /* 표시만; 터치는 버튼이 받음 */
`
// 반지름 = FAB 슬롯 간격 72px. l=180°(홈에 완벽 겹침), r=0°(+에 완벽 겹침), ul=120°, ur=60°.
// 칩 60px(반지름 30) → top-left = 중심좌표 − 30.
const CHIP_POS = {
  l: css`
    left: -102px;
    top: -30px;
  `,
  ul: css`
    left: -66px;
    top: -92px;
  `,
  ur: css`
    left: 6px;
    top: -92px;
  `,
  r: css`
    left: 42px;
    top: -30px;
  `,
}
// 아이콘만(텍스트 X), 버튼과 동일한 60px 원형. data-on='1'이면 색 반전(초록). 크기는 항상 동일.
export const GuideChip = styled.div<{ $pos: 'l' | 'r' | 'ul' | 'ur' }>`
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dbe3f4;
  background: #1b2030f2;
  border: 1px solid #2b3346;
  box-shadow: 0 6px 18px #0009;
  transition: background 0.1s, color 0.1s;
  &[data-on='1'] {
    background: #3ddc7f;
    border-color: #3ddc7f;
    color: #04210f;
  }
  ${(p) => CHIP_POS[p.$pos]}
`

// 하단 조이스틱: 뒤에 레일(트랙)을 깔고, 손잡이(버튼)가 그 위를 좌우로 미끄러짐.
const iconIn = keyframes`
  from { opacity: 0.15; transform: scale(0.6); }
  to   { opacity: 1; transform: scale(1); }
`
// 한 칸(60px) 자리 차지하는 래퍼(내부에 트랙+손잡이). S.Toolbar의 `& > button` FAB는 안 받음.
export const Stick = styled.div`
  position: relative;
  flex: none;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
`
// 조이스틱 레일 — 평소 숨김(opacity 0), 끄는 방향에만 표시. 옆 버튼은 안 가리게 짧게.
export const StickRail = styled.div<{ $side: 'l' | 'r'; $on: boolean }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${(p) => (p.$side === 'l' ? 'right: 30px;' : 'left: 30px;')}
  width: 34px;
  height: 20px;
  border-radius: 10px;
  background: #0d1120;
  border: 1px solid #262f42;
  box-shadow: inset 0 1px 3px #000a;
  z-index: 0;
  opacity: ${(p) => (p.$on ? 1 : 0)};
  transition: opacity 0.12s ease;
`
// 툴바 행에서 조이스틱 자리만 차지(실제 버튼은 body로 포털돼 위로 뜸)
export const StickSpacer = styled.div`
  width: 60px;
  height: 60px;
  flex: none;
`
// 조이스틱을 body로 포털 — 노트 오버레이(z120) 위(z130)에 항상 보이게. 4번째 슬롯 위치에 고정.
export const StickPortal = styled.div`
  position: fixed;
  z-index: 130;
  bottom: calc(30px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(calc(-50% + 72px)); /* 5개 중 4번째 슬롯(간격 72px) */
`
// 펜 조이스틱(2번째 슬롯) — 노트 열려도 위에 보이게 body 포털. 4번째 스틱과 대칭(-72px).
export const PenPortal = styled.div`
  position: fixed;
  z-index: 130;
  bottom: calc(30px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(calc(-50% - 72px)); /* 2번째 슬롯 */
`
// undo/redo 스틱 방향 가이드 — 손잡이 좌/우에 아이콘(색반전). StickPortal(60px) 기준 절대배치.
export const URGuide = styled.div<{ $side: 'l' | 'r' }>`
  position: absolute;
  top: 0;
  ${(p) => (p.$side === 'l' ? 'left: -72px;' : 'left: 72px;')}
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25px;
  color: #dbe3f4;
  background: #1b2030f2;
  border: 1px solid #2b3346;
  box-shadow: 0 6px 18px #0009;
  transition: background 0.1s, color 0.1s;
  &[data-on='1'] {
    background: #3ddc7f;
    border-color: #3ddc7f;
    color: #04210f;
  }
`
// 손잡이(버튼) — 다른 FAB와 동일한 크기/색
export const StickKnob = styled.button`
  position: relative;
  z-index: 2;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #1b2030;
  border: 1px solid #2b3346;
  color: #dbe3f4;
  font-size: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px #0007;
  cursor: pointer;
  touch-action: none;
  & > .ic {
    display: inline-flex;
    animation: ${iconIn} 0.16s ease; /* 방향 아이콘 전환 시 부드럽게 */
  }
`

// ⋯(Setting) 토글을 모바일에서 우상단 고정 원형 버튼으로(body로 포털됨).
export const CornerFab = styled.div`
  position: fixed;
  top: 5px; /* 헤더 로고·제목과 상하 중앙 맞춤 */
  right: 8px; /* 헤더 좌측 패딩(8px)과 대칭 */
  z-index: 40;
  & > button {
    width: 42px;
    height: 42px;
    padding: 0;
    border-radius: 50%;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 14px #0006;
  }
`

/* Undo/Redo 묶음 — 모바일에선 상단 헤더로 옮겨가므로 툴바에서 숨김 */
export const UndoGroup = styled.span`
  display: contents;
  @media (max-width: 640px) {
    display: none;
  }
`

/* 펼침(오버플로) 메뉴 공통: 토글 버튼 + 그 옆으로 좌르륵 펼쳐지는 트레이.
   $align='left'  → 버튼이 왼쪽, 트레이가 오른쪽으로 펼쳐짐 (+, 📄 메뉴)
   $align='right' → 버튼이 오른쪽 고정, 트레이가 왼쪽으로 펼쳐짐 (... 메뉴, 툴바 우측 끝) */
export const Overflow = styled.span<{ $align?: 'left' | 'right' }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  /* $align='right'면 margin-left:auto로 우측 정렬. 모바일 가로스크롤에서도 auto는
     공간이 남으면 오른쪽으로 밀고, 넘치면 0으로 접혀 스크롤이 유지됨(justify-content와 달리). */
  margin-left: ${(p) => (p.$align === 'right' ? 'auto' : '0')};
`

/* 펼쳐지는 트레이 — 닫힘: 폭 0·투명, 열림: 슬라이드+페이드. overflow:hidden으로 폭 전환을 부드럽게 */
export const Tray = styled.div<{ $open: boolean; $align?: 'left' | 'right' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  max-width: ${(p) => (p.$open ? '1000px' : '0')};
  opacity: ${(p) => (p.$open ? 1 : 0)};
  margin-left: ${(p) => (p.$open && p.$align !== 'right' ? '6px' : '0')};
  margin-right: ${(p) => (p.$open && p.$align === 'right' ? '6px' : '0')};
  transition:
    max-width 0.6s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.4s ease,
    margin-left 0.6s cubic-bezier(0.22, 1, 0.36, 1),
    margin-right 0.6s cubic-bezier(0.22, 1, 0.36, 1);
`

/* 각 항목을 시차(stagger)로 슬라이드 — 토글 버튼 쪽 항목부터 차례로 흘러나오게 */
export const TrayItem = styled.span<{ $open: boolean; $i: number; $n: number; $align?: 'left' | 'right' }>`
  flex: none;
  display: inline-flex;
  transform: translateX(${(p) => (p.$open ? '0' : p.$align === 'right' ? '18px' : '-18px')});
  opacity: ${(p) => (p.$open ? 1 : 0)};
  transition:
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.45s ease;
  transition-delay: ${(p) =>
    p.$open ? (p.$align === 'right' ? p.$n - 1 - p.$i : p.$i) * 0.08 : 0}s;
`

/* 메뉴 클릭 시 뜨는 팝업(바텀시트) 리스트 */
export const MobilePopOverlay = styled.div`
  position: fixed;
  inset: 0;
  height: 100dvh; /* 브라우저 주소창 제외한 '실제 보이는' 높이 → 팝업이 위/아래로 안 잘림 */
  z-index: 200;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center; /* 화면 중앙 */
  justify-content: center;
  /* 노치/주소창 여백 확보 + 가로화면에서 사방 여백 */
  padding: max(10px, env(safe-area-inset-top)) 12px max(10px, env(safe-area-inset-bottom));
  box-sizing: border-box;
`

export const MobileSheet = styled.div`
  width: 100%;
  max-width: 300px;
  /* 고정높이 대신 최대높이(dvh) — 짧은 메뉴는 짧게, 길면 내부 스크롤. 가로/짧은 화면에서도 안 잘림. */
  max-height: min(90dvh, 524px);
  display: flex;
  flex-direction: column;
  background: #161b27f5;
  border: 1px solid #2b3346;
  border-radius: 16px;
  box-shadow: 0 16px 44px #0009;
  backdrop-filter: blur(8px);
  overflow: hidden;
`

/* 팝업 상단: 좌측 제목 + 우측 X */
export const SheetHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
`

export const SheetTitle = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: #eef2f8;
  letter-spacing: 0.2px;
`

/* 닫기(X) — 감싸는 박스 없이 글리프만 */
export const SheetClose = styled.button`
  border: none;
  background: none;
  color: #9aa5bd;
  font-size: 18px;
  line-height: 1;
  padding: 4px;
  margin: -4px;
  cursor: pointer;
  &:active {
    color: #fff;
  }
`

/* 제목 아래 서브헤더(유니버스명 + 수정) */
export const SheetSub = styled.div`
  padding: 0 16px 8px;
`
export const NameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #2b3346;
  border-radius: 10px;
  background: #0f1320;
  & > .nm {
    flex: 1;
    min-width: 0;
    color: #eef2f8;
    font-size: 15px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  & > button {
    flex: none;
    border: none;
    background: none;
    color: #9aa5bd;
    font-size: 17px;
    line-height: 1;
    padding: 4px;
    cursor: pointer;
  }
  & > button:active {
    color: #fff;
  }
`

/* 항목 목록 — 남는 공간 채우고, 넘치면 스크롤(제목과 살짝 간격) */
export const SheetBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 12px 12px;

  & button {
    width: 100%;
    justify-content: flex-start;
    text-align: left;
    font-size: 16px;
    padding: 14px 16px;
    border-radius: 10px;
  }
`

/* 저장 성공 시 "..." 버튼이 초록 체크로 팡 떴다가 사라짐 */
export const savedPop = keyframes`
  0%   { transform: scale(0.6); }
  45%  { transform: scale(1.18); }
  100% { transform: scale(1); }
`

export const Button = styled.button<{
  $on?: boolean
  $danger?: boolean
  $saved?: boolean
  $icon?: boolean
  $fab?: boolean
}>`
  background: ${(p) =>
    p.$saved ? '#15391f' : p.$danger ? '#4a2230' : p.$on ? '#10311f' : '#1b2030'};
  border: 1px solid
    ${(p) => (p.$saved ? '#3ddc7f' : p.$danger ? '#8a3a48' : p.$on ? '#3ddc7f' : '#2b3346')};
  color: ${(p) => (p.$saved ? '#7CFFB0' : p.$danger ? '#ffc3cc' : p.$on ? '#c2f0d4' : '#dbe3f4')};
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  flex: none;
  /* 내용(아이콘/글리프/텍스트) 중앙정렬 — 아이콘 세로정렬 어긋남 방지 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: background 0.25s ease, border-color 0.25s ease, color 0.25s ease;
  ${(p) =>
    p.$saved &&
    css`
      animation: ${savedPop} 0.45s ease;
    `}
  /* 단일 아이콘 버튼(홈·펜·+·폴더·⋯)은 크기 통일한 정사각 */
  ${(p) =>
    p.$icon &&
    css`
      width: 34px;
      height: 34px;
      padding: 0;
      font-size: 17px;
    `}
  /* 모바일 FAB로 포털된 버튼(펜 조이스틱)은 다른 FAB와 동일한 60px 원형 */
  ${(p) =>
    p.$fab &&
    css`
      width: 60px;
      height: 60px;
      padding: 0;
      border-radius: 50%;
      font-size: 25px;
      box-shadow: 0 6px 18px #0007;
    `}

  @media (max-width: 640px) {
    padding: 11px 15px;
    font-size: 15px;
  }

  &:hover {
    background: ${(p) => (p.$saved ? '#15391f' : p.$danger ? '#5c2a3a' : '#232b41')};
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
  &:disabled:hover {
    background: #1b2030;
  }
`
