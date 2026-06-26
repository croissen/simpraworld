import styled, { css } from 'styled-components'

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 120;
  background: #00000088;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4%;
`

// 흰 "종이" — 왼쪽(사진/검색) + 오른쪽(메모장) 2단
export const Paper = styled.div<{ $cap?: boolean }>`
  width: 100%;
  max-width: 780px;
  height: auto; /* 본문(고정) + 태그 줄 수에 맞춰 세로로 커짐 */
  max-height: 90vh;
  background: #f3f1ea;
  border: 1px solid #d9d4c7;
  border-radius: 14px;
  box-shadow: 0 18px 60px #00000066;
  display: flex;
  overflow: hidden;

  @media (max-width: 620px) {
    flex-direction: column;
  }
  ${(p) => p.$cap && hideForCap}
`

/* ── 왼쪽: 정사각 썸네일 + 교체 + 태그검색 ── */
export const Left = styled.div`
  flex: none;
  width: 248px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-right: 1px solid #e3dece;
  background: #efece2;

  @media (max-width: 620px) {
    width: auto;
    border-right: none;
    border-bottom: 1px solid #e3dece;
  }
`

export const Thumb = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  background: #e2ddcd;
  border: 1px solid #d4cdb9;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  > .ph {
    color: #a39e8f;
    font-size: 12px;
  }
`

/* 좌상단 배지 영역 (사진 위 오버레이) */
export const Badge = styled.button`
  position: absolute;
  top: 6px;
  left: 6px;
  max-width: 85%;
  background: #e3b341;
  color: #1a1300;
  border: none;
  border-radius: 7px;
  padding: 3px 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  white-space: pre-wrap; /* 줄바꿈 표시 */
  word-break: break-word;
  line-height: 1.25;
  box-shadow: 0 1px 4px #0006;
`

export const BadgeDot = styled.button`
  position: absolute;
  top: 7px;
  left: 7px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid #0003;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 1px 4px #0006;
  opacity: 0.85;
  &:hover {
    opacity: 1;
  }
`

/* 배지 편집 팝업 (사진 위 오버레이) */
export const BadgePop = styled.div`
  position: absolute;
  top: 6px;
  left: 6px;
  right: 6px;
  z-index: 6;
  background: #20242e;
  border: 1px solid #39435a;
  border-radius: 10px;
  padding: 9px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  box-shadow: 0 10px 30px #0009;
`
export const PopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`
export const PopLabel = styled.span`
  font-size: 11px;
  color: #9aa3b4;
  width: 38px;
  flex: none;
`
export const PopInput = styled.input`
  flex: 1;
  min-width: 0;
  background: #0f1320;
  border: 1px solid #2b3346;
  color: #e8ecf3;
  border-radius: 6px;
  padding: 5px 7px;
  font-size: 12px;
  outline: none;
  &:focus {
    border-color: #3ddc7f;
  }
`
export const PopArea = styled.textarea.attrs({ spellCheck: false, autoCapitalize: 'off' })`
  width: 100%;
  box-sizing: border-box;
  min-height: 0; /* 1줄부터 시작, 줄바꿈마다 자동 증가 */
  resize: none; /* 수동 리사이즈 막고 내용따라 자동 높이 */
  overflow: hidden;
  background: #0f1320;
  border: 1px solid #2b3346;
  color: #e8ecf3;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  line-height: 1.35;
  font-family: inherit;
  outline: none;
  &:focus {
    border-color: #3ddc7f;
  }
`
export const SizeBtn = styled.button<{ $on?: boolean }>`
  flex: 1;
  background: ${(p) => (p.$on ? '#10311f' : '#0f1320')};
  border: 1px solid ${(p) => (p.$on ? '#3ddc7f' : '#2b3346')};
  color: #cdd6ea;
  border-radius: 6px;
  padding: 4px 0;
  font-size: 11px;
  cursor: pointer;
`
export const PopColor = styled.input`
  width: 30px;
  height: 24px;
  padding: 0;
  border: 1px solid #2b3346;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  flex: none;
`
export const PopX = styled.button`
  flex: none;
  align-self: flex-start;
  width: 24px;
  height: 24px;
  border: none;
  background: #2b3346;
  color: #cdd6ea;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  &:active {
    background: #394559;
  }
`
export const PopBtn = styled.button<{ $on?: boolean }>`
  background: ${(p) => (p.$on ? '#10311f' : '#0f1320')};
  border: 1px solid ${(p) => (p.$on ? '#3ddc7f' : '#2b3346')};
  color: #cdd6ea;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
`

export const SwapBtn = styled.button`
  flex: none;
  padding: 9px;
  border-radius: 9px;
  border: 1px solid #41506e;
  background: #10311f;
  color: #c2f0d4;
  font-size: 13px;
  line-height: 1.2;
  cursor: pointer;
  &:hover:not(:disabled) {
    border-color: #3ddc7f;
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

/* Swap in + Share 한 줄(8:2). Swap 없을 땐 Share만 꽉 채움 */
export const ActionRow = styled.div`
  display: flex;
  gap: 6px;
`

export const ShareBtn = styled.button`
  flex: none;
  padding: 9px;
  border-radius: 9px;
  border: 1px solid #41506e;
  background: #1b2030;
  color: #dbe3f4;
  font-size: 13px;
  line-height: 1.2; /* SwapBtn(텍스트)과 동일 높이 → 이모지 때문에 행이 커져 구분선 밀리는 것 방지 */
  cursor: pointer;
  &:hover {
    border-color: #3ddc7f;
  }
`

/* 공유 팝업(갤러리/클립보드/텍스트) */
export const SharePop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 140;
  background: #00000066;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`
export const ShareSheet = styled.div`
  width: 100%;
  max-width: 280px;
  background: #20242e;
  border: 1px solid #39435a;
  border-radius: 14px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 16px 50px #000a;
`
export const ShareItem = styled.button`
  width: 100%;
  text-align: left;
  background: #2b3346;
  border: 1px solid #41506e;
  color: #e8ecf3;
  border-radius: 10px;
  padding: 14px 16px;
  font-size: 15px;
  cursor: pointer;
  &:active {
    background: #354060;
  }
`

export const Search = styled.input.attrs({ spellCheck: false })`
  flex: none;
  width: 100%;
  background: #fbfaf5;
  border: 1px solid #d4cdb9;
  color: #2b2a26;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  outline: none;
  &:focus {
    border-color: #3ddc7f;
  }
`

/* 검색 입력 + 오른쪽 초기화(✕) 버튼 한 줄 */
export const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  > input {
    flex: 1;
    width: auto;
    min-width: 0;
  }
`
export const ClearBtn = styled.button`
  flex: none;
  width: 30px;
  height: 30px;
  border: 1px solid #d4cdb9;
  background: #efece2;
  color: #5a564a;
  border-radius: 8px;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  &:active {
    background: #e3dece;
  }
`

export const Results = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 5px;
`

export const ResultItem = styled.button<{ $on?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  padding: 5px 6px;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$on ? '#3ddc7f' : 'transparent')};
  background: ${(p) => (p.$on ? '#e6ecfb' : 'transparent')};
  cursor: pointer;
  &:hover {
    background: #e9e5d8;
  }

  > .t {
    width: 30px;
    height: 30px;
    border-radius: 6px;
    background: #e2ddcd;
    object-fit: cover;
    flex: none;
  }
  > .m {
    min-width: 0;
  }
  > .m .nm {
    color: #2b2a26;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  > .m .tg {
    color: #8a8472;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

export const Empty = styled.div`
  color: #a39e8f;
  font-size: 12px;
  padding: 6px 2px;
`

/* ── 오른쪽: 제목 + 본문 + 태그란 ── */
export const Right = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`

export const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #e3dece;
`

export const Title = styled.input.attrs({
  spellCheck: false,
  autoCorrect: 'off',
  autoCapitalize: 'off',
})`
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  outline: none;
  color: #2b2a26;
  font-size: 17px;
  font-weight: 600;
`

export const Close = styled.button`
  flex: none;
  background: #e7e2d5;
  border: 1px solid #d4cdb9;
  color: #5a564a;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  &:hover {
    background: #ddd6c4;
  }
`

export const Revert = styled(Close)`
  color: #2a3f6b;
` // X 왼쪽: 미리보기 취소(원래 노트로)

export const Body = styled.textarea.attrs({
  spellCheck: false,
  autoCorrect: 'off',
  autoCapitalize: 'off',
  autoComplete: 'off',
})`
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  background: none;
  color: #2b2a26;
  font-size: 15px;
  line-height: 1.65;
  padding: 16px 18px;
  font-family: inherit; /* 기본(비례) 폰트 유지 */
  tab-size: 8; /* Tab 표 정렬 칸 간격(스페이스 8칸 폭) */
  -moz-tab-size: 8;
  font-variant-numeric: tabular-nums; /* 숫자 폭 고정 → figure space(숫자폭 공백)와 일치 */
  &::placeholder {
    color: #a39e8f;
  }
  /* PC(≥641px): 본문 높이 고정 → 태그 줄이 늘어도 본문은 안 줄고, 늘어난 만큼 노트(Paper)가 커짐.
     모바일은 위의 flex:1로 MPaper를 채움(이 규칙 미적용). */
  @media (min-width: 641px) {
    flex: none;
    height: 52vh;
  }
`

/* 본문 + 떠 있는 Tab 칩 컨테이너(모바일: 소프트 키보드엔 Tab 키가 없어서) */
export const BodyWrap = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  min-height: 0;
`

/* 모바일 Tab 버튼: 본문 우하단에 떠 있음. pointerdown에서 포커스 유지(키보드 안 내려감). */
export const TabKey = styled.button`
  position: absolute;
  right: 12px;
  bottom: 10px;
  border: 1px solid #d4cdb9;
  background: rgba(243, 241, 234, 0.92);
  color: #6b6453;
  border-radius: 9px;
  padding: 7px 13px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.14);
  cursor: pointer;
  touch-action: none;
  &:active {
    background: #e7e2d4;
  }
`

/* ── 모바일 전용: 헤더(작은 사진 + 제목/검색 + X) → 본문이 나머지 채움 ── */
export const MPaper = styled.div<{ $cap?: boolean }>`
  position: relative;
  width: 100%;
  height: 92%;
  background: #f3f1ea;
  border: 1px solid #d9d4c7;
  border-radius: 14px;
  box-shadow: 0 18px 60px #00000066;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  ${(p) => p.$cap && hideForCap}
`
export const MHead = styled.div`
  display: flex;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid #e3dece;
`

export const MThumb = styled.div`
  position: relative;
  width: 100px;
  height: 100px;
  flex: none;
  border-radius: 10px;
  background: #e2ddcd;
  border: 1px solid #d4cdb9;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  > .ph {
    color: #a39e8f;
    font-size: 10px;
  }
`
export const MMeta = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`
export const MTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`
export const MResults = styled.div`
  max-height: 34vh;
  overflow-y: auto;
  padding: 6px 12px;
  border-bottom: 1px solid #e3dece;
  display: flex;
  flex-direction: column;
  gap: 5px;
`
export const MBadgeWrap = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  width: 248px;
  z-index: 20;
`

/* 사진 클릭 메뉴(삭제/교체/보기) — 화면 중앙 작은 카드 + 뒤 마스크 */
export const PhotoMask = styled.div`
  position: fixed;
  inset: 0;
  z-index: 124;
`
export const PhotoMenu = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 125;
  min-width: 150px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: #20242ef7;
  border: 1px solid #39435a;
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 14px 40px #000a;
  backdrop-filter: blur(8px);
`
export const PhotoMenuItem = styled.button<{ $danger?: boolean }>`
  background: none;
  border: none;
  text-align: left;
  color: ${(p) => (p.$danger ? '#ff9aa8' : '#dbe3f4')};
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  &:active {
    background: #2a3550;
  }
`
/* 모바일: 사진 탭하면 칸 위에 어두운 오버레이 + 가운데 3버튼 (쓰레기통/교체/눈) */
export const MThumbMenu = styled.div`
  position: absolute;
  inset: 0;
  z-index: 126;
  background: #000000a8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
`
export const PBtn = styled.button<{ $c?: 'del' | 'rep' | 'view' }>`
  width: 24px;
  height: 24px;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 1px 4px #0007;
  background: ${(p) => (p.$c === 'del' ? '#d8453f' : p.$c === 'rep' ? '#2faa6a' : '#4a5570')};
  &:active {
    filter: brightness(1.15);
  }
`

/* 모바일 사진 크게 보기 (탭하면 닫힘) */
export const FullView = styled.div`
  position: fixed;
  inset: 0;
  z-index: 130;
  background: #000000ee;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
`

export const TagBar = styled.div`
  flex: none;
  border-top: 1px solid #e3dece;
  padding: 10px 12px;
  display: flex;
  flex-direction: column; /* 칩은 위에 쌓이고, 입력란은 아래 고정(폭 유지, 옆으로 안 밀림) */
  align-items: stretch;
  gap: 8px;
  background: #f3f1ea;
`

/* 해시태그 칩 묶음(입력란 위에서 줄바꿈하며 쌓임) */
export const TagChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

/* 해시태그 드래그 중 들어갈 자리 표시(삽입 막대) */
export const TagDrop = styled.span`
  width: 3px;
  align-self: stretch;
  min-height: 22px;
  border-radius: 2px;
  background: #3ddc7f;
  box-shadow: 0 0 0 2px #3ddc7f44;
`

export const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #e6ecfb;
  border: 1px solid #c4d3f5;
  color: #2a3f6b;
  border-radius: 999px;
  padding: 3px 4px 3px 9px;
  font-size: 12px;

  > button {
    border: none;
    background: #cdd9f3;
    color: #2a3f6b;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 11px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  > button:hover {
    background: #b3c4ec;
  }
`

export const TagInput = styled.input.attrs({ spellCheck: false, autoCapitalize: 'off' })`
  flex: none;
  width: 100%; /* 아래 고정 폭 — 칩이 쌓여도 옆으로 안 밀림 */
  background: none;
  border: none;
  outline: none;
  color: #2b2a26;
  font-size: 13px;
  padding: 4px 2px;
  &::placeholder {
    color: #a39e8f;
  }
`

/* 캡처 시 해시태그 칩(위치만 이동): 칩은 줄바꿈 안 되고(통째로), 많으면 다음 줄로 */
export const CapTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`
export const CapTag = styled.span`
  background: #e6ecfb;
  border: 1px solid #c4d3f5;
  color: #2a3f6b;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 10.5px;
  display: inline-flex;
  align-items: center; /* 글자 세로 중앙 */
  line-height: 1.3;
  max-width: 100%; /* 칸(왼쪽 열) 넘지 않게 → 내용 영역 침범 방지 */
  overflow-wrap: anywhere; /* 아주 긴 태그만 칸 안에서 줄바꿈(짧은 건 그대로) */
`
/* 캡처 시 본문: textarea 대신 div로 전체 내용 표시(길면 아래로 계속 이어짐) */
export const CapBody = styled.div`
  flex: 1;
  padding: 16px 18px;
  font-size: 15px;
  line-height: 1.65;
  color: #2b2a26;
  white-space: pre-wrap;
  word-break: break-word;
  tab-size: 8;
  -moz-tab-size: 8;
  font-variant-numeric: tabular-nums;
`

/* 공유 캡처: 조작 버튼·기본 태그바·textarea 숨기고, 창은 내용만큼 늘림(긴 글 안 잘림) */
const hideForCap = css`
  height: auto;
  max-height: none;
  overflow: visible;
  ${Close}, ${Revert}, ${SwapBtn}, ${ShareBtn}, ${ActionRow}, ${SearchRow}, ${Results},
  ${MResults}, ${ClearBtn}, ${TagInput}, ${TagBar}, ${Body} {
    display: none !important;
  }
`
