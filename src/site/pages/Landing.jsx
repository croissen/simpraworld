import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as S from './Landing.styles'

export default function Landing() {
  useEffect(() => {
    document.title = 'Welcome to SimpraWorld'
  }, [])

  return (
    <S.Hero>
      <S.Grid />
      <S.Blob $size={140} $top="16%" $left="10%" $dur={8} />
      <S.Blob $size={90} $top="24%" $right="12%" $dur={6} $delay="1.2s" />
      <S.Blob $size={70} $top="62%" $left="16%" $dur={7} $delay="0.6s" />

      <S.Inner>
        <S.Tag>SIMPLE IS BEST</S.Tag>
        <S.Title>Welcome to <span>SimpraWorld</span></S.Title>
        <S.Sub>복잡한 것을 단순하게. 당신만의 유니버스를 만들어보세요.</S.Sub>

        <S.BtnRow>
          {/* /my-universe = 같은 앱의 라우트(캔버스). lazy 로드되므로 라우터 Link로 이동. */}
          <S.StartBtn as={Link} to="/my-universe">심프라 유니버스</S.StartBtn>
        </S.BtnRow>
      </S.Inner>
    </S.Hero>
  )
}
