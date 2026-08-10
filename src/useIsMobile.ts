import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

// 화면 폭으로 모바일(세로폰 등 좁은 화면) 여부 판단 (≤640px). 레이아웃 전환용.
// 가로/태블릿(폭>640)은 데스크톱 레이아웃. 터치기기 판정은 useIsTouch 별도.
export function useIsMobile(query = '(max-width: 640px)'): boolean {
  const [match, setMatch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

// 터치/앱 환경인가(= PC 마우스 레이아웃이 아닌가).
// ⚠️ 네이티브 앱(안드/iOS)이면 포인터가 뭐든(블루스택 등 마우스 기반 에뮬 포함) 무조건 true.
//    → 앱은 항상 팝업 메뉴 + 손가락(핸드모드) 버튼 등 '비-PC' 레이아웃을 쓴다.
//    미디어쿼리(hover:none, pointer:coarse)는 웹에서 실제 터치기기 판정에만 쓰인다.
export function useIsTouch(): boolean {
  const coarse = useIsMobile('(hover: none) and (pointer: coarse)')
  return Capacitor.isNativePlatform() || coarse
}
