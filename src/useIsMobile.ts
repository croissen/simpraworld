import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

// 미디어쿼리 매칭(반응형).
function useMedia(query: string): boolean {
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

// 레이아웃 판정: 좁은 '모바일 화면'인가.
//  - 웹: 화면 폭(기본 ≤640px) 기준.
//  - 앱(네이티브): 화면 폭과 무관하게 '세로모드(portrait)'면 모바일. 눕히면(landscape) PC처럼.
//    → BlueStacks·태블릿 앱도 세로면 모바일 화면(노트 풀스크린 등), 가로면 넓은 레이아웃.
export function useIsMobile(query = '(max-width: 640px)'): boolean {
  const match = useMedia(query)
  const portrait = useMedia('(orientation: portrait)')
  return match || (Capacitor.isNativePlatform() && portrait)
}

// 인터랙션 판정: PC 마우스 레이아웃이 아닌가(팝업 메뉴·손가락 버튼·Copy=복제 등).
//  - 앱(네이티브)은 방향/포인터와 무관하게 항상 터치. 웹은 실제 터치기기만.
export function useIsTouch(): boolean {
  const coarse = useMedia('(hover: none) and (pointer: coarse)')
  return Capacitor.isNativePlatform() || coarse
}
