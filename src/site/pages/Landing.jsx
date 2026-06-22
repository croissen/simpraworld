import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as S from './Landing.styles'

export default function Landing() {
  useEffect(() => {
    document.title = 'Welcome to SimpraWorld'
  }, [])

  return (
    <S.Hero>
      <S.Title>Welcome to <span>SimpraWorld</span></S.Title>
      <S.Sub>Create your Universe!</S.Sub>
      {/* /my-universe = 같은 앱의 라우트(캔버스). lazy 로드되므로 라우터 Link로 이동. */}
      <S.StartBtn as={Link} to="/my-universe">Start</S.StartBtn>
    </S.Hero>
  )
}
