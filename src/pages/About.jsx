import { useEffect } from 'react'
import { Section, SectionHeader, SectionNum, SectionTitle, Button } from '../styles/common.js'
import * as S from './About.styles'

export default function About() {
  useEffect(() => {
    document.title = 'Welcome to SimpraWorld'
  }, [])

  return (
    <>
      <S.Hero>
        <S.Tag>What is SimpraWorld?</S.Tag>
        <S.Title>심플하다,<br /><span>심프라다.</span></S.Title>
        <S.Lead>
          SimpraWorld는 <strong>'Simple is Best'</strong>에서 시작된 1인 개발자 <strong>곽승민</strong>의 작은 세계입니다.<br /><br />
          복잡한 것을 단순하게 만드는 일에 매료된 한 사람이, <br />자신만의 기술 스택을 쌓아가며 서비스를 하나씩 세워 올리는 공간이에요.
        </S.Lead>
      </S.Hero>

      <Section>
        <SectionHeader>
          <SectionNum>01</SectionNum>
          <SectionTitle>The Motto</SectionTitle>
        </SectionHeader>
        <S.MottoGrid>
          <MottoCard num="001" word="심플하다" en="simple" desc="사용자가 고민하지 않아도 되는 인터페이스. 한 번 보고 알 수 있는 흐름. 군더더기 없이 핵심에 도달하는 경험." />
          <MottoCard num="002" word="심프라다" en="simpra" desc="우리만의 형용사. 복잡한 문제를 단순한 해답으로 바꾸는 태도. SimpraWorld가 추구하는 모든 결과물의 기준." />
        </S.MottoGrid>
      </Section>

      <Section>
        <SectionHeader>
          <SectionNum>02</SectionNum>
          <SectionTitle>Story</SectionTitle>
        </SectionHeader>
        <S.StoryWrap>
          <StoryBlock q="Q. SimpraWorld는 왜 만들어졌나요?" h='"심플하다 + 심프라다"에서 시작했어요.'>
            <S.StoryP>
              세상엔 좋은 도구들이 정말 많습니다. 하지만 정작 사람들이 쓸 때 <strong>"왜 이렇게 복잡하지?"</strong> 라고 느끼는 순간이 너무 많아요. 그 간극을 줄이는 일은 정말 흥미롭고 늘 새롭습니다.
            </S.StoryP>
            <S.StoryP>
              SimpraWorld는 그런 고민에서 출발한 1인 개발자의 공간이자, 만들어 낸 서비스들이 한자리에 모이는 세계입니다.
            </S.StoryP>
          </StoryBlock>

          <S.Quote>
            <S.QuoteText>
              "모든 사람들이 <span className="accent">심플하게</span><br />모든 것을 해나갈 수 있도록."
            </S.QuoteText>
          </S.Quote>

          <StoryBlock q="Q. 앞으로의 방향은요?" h="기술 스택은 넓히고, 사용자 경험은 단순하게.">
            <S.StoryP>
              아직은 혼자서 닿을 수 있는 기술의 범위를 계속 넓혀가는 중입니다. 웹, 모바일, AI, 데이터, 결제 등 어떤 영역이든 "심플하게 풀 수 있는 방법은 없을까?" 라는 질문에서 시작합니다.
            </S.StoryP>
            <S.StoryP>
              <strong>이제는 함께하고 싶습니다.</strong> 같이라서 닿을 수 있는 넓이는 차원이 다르기 때문입니다.
            </S.StoryP>
            <S.StoryP>
              SimpraWorld는 그 질문에 대한 답을 하나씩 쌓아가는 공간입니다. 지금은 5개의 서비스로, 앞으로는 더 많이.
            </S.StoryP>
          </StoryBlock>
        </S.StoryWrap>
      </Section>

      <S.CtaWrap>
        <S.CtaTitle>Welcome to SimpraWorld<br />환영합니다.</S.CtaTitle>
        <S.CtaDesc>그동안의 성장여정을 포트폴리오에 담았습니다.</S.CtaDesc>
        <Button as="a" href="/portfolio">포트폴리오 보러 가기 →</Button>
      </S.CtaWrap>
    </>
  )
}

function MottoCard({ num, word, en, desc }) {
  return (
    <S.MottoCardBox>
      <S.MottoNum>{num}</S.MottoNum>
      <S.MottoKeyword>{word} <span className="en">/ {en}</span></S.MottoKeyword>
      <S.MottoDesc>{desc}</S.MottoDesc>
    </S.MottoCardBox>
  )
}

function StoryBlock({ q, h, children }) {
  return (
    <S.StoryBlockBox>
      <S.StoryQ>{q}</S.StoryQ>
      <S.StoryH>{h}</S.StoryH>
      {children}
    </S.StoryBlockBox>
  )
}
