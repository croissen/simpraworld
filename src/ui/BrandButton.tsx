import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '../useIsMobile'
import * as S from '../App.styles'

// 로고: 1탭 → "↗ Go Main"으로 변신(무장), 2탭 → 사이트 메인 이동. 2.5초 후 원복.
export default function BrandButton({ label }: { label: string }) {
  const [armed, setArmed] = useState(false)
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onClick = () => {
    if (armed) {
      navigate('/')
      return
    }
    setArmed(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setArmed(false), 2500)
  }
  return (
    <S.Brand
      $armed={armed}
      onClick={onClick}
      title={armed ? 'Tap again to leave to main' : label}
    >
      {armed ? (isMobile ? 'Main' : '↗ Go Main') : label}
    </S.Brand>
  )
}
