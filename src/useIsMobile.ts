import { useEffect, useState } from 'react'

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
