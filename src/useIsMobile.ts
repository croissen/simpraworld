import { useEffect, useState } from 'react'

// 화면 폭으로 모바일 여부 판단 (≤640px). PC는 기존 레이아웃, 모바일은 전용 헤더.
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
