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
      <S.BtnRow>
        {/* /my-universe = 같은 앱의 라우트(캔버스). lazy 로드되므로 라우터 Link로 이동. */}
        <S.StartBtn as={Link} to="/my-universe">심프라 유니버스</S.StartBtn>
        {/* 웨이브폼 메이커 = public/의 정적 HTML. 라우터 밖이라 일반 링크로 전체 이동. */}
        <S.StartBtn as="a" href="/waveform-maker.html" $variant="outline">웨이브폼 메이커</S.StartBtn>
      </S.BtnRow>
    </S.Hero>
  )
}
