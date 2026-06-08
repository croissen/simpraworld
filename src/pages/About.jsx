import { Section, SectionHeader, SectionNum, SectionTitle, Button } from '../styles/common.js'
import * as S from './About.styles'

export default function About() {
  return (
    <>
      <S.Hero>
        <S.Tag>What is SimpraWorld?</S.Tag>
        <S.Title>심플하다,<br /><span>심프라다.</span></S.Title>
        <S.Lead>
          SimpraWorld는 <strong>'Simple is Best'</strong>에서 시작된 1인 개발자 <strong>곽승민</strong>의 작은 세계입니다.<br /><br />
          복잡한 것을 단순하게 만드는 일에 매료된 한 사람이, 자신만의 기술 스택을 쌓아가며 서비스를 하나씩 세워 올리는 공간이에요.
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
          <MottoCard num="003" word="혼자 만든다" en="solo" desc="기획부터 디자인, 개발, 배포, 운영까지. 1인 개발자가 AI와 함께 닿을 수 있는 가장 먼 지점을 실험합니다." />
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
              세상엔 좋은 도구들이 정말 많습니다. 하지만 정작 사람들이 쓸 때 <strong>"왜 이렇게 복잡하지?"</strong> 라고 느끼는 순간이 너무 많죠. 그 간극을 줄이는 일이 재미있어서 시작했습니다.
            </S.StoryP>
            <S.StoryP>
              SimpraWorld는 그런 고민에서 출발한 1인 개발자의 작업장이자, 만들어 낸 서비스들이 한자리에 모이는 세계입니다.
            </S.StoryP>
          </StoryBlock>

          <S.Quote>
            <S.QuoteText>
              "모든 사람들이 <span className="accent">심플하게</span><br />모든 것을 해나갈 수 있도록."
            </S.QuoteText>
          </S.Quote>

          <StoryBlock q="Q. 왜 포트폴리오를 simpraworld.com에 올리나요?" h="개발자보다 먼저, '심프라월드'라는 정체성이 있으니까요.">
            <S.StoryP>
              저는 회사에서 개발자로 일하지만, 동시에 SimpraWorld라는 이름으로 제 서비스를 만들고 있어요. <strong>로또베이스, AI 다이어리, 행복스토어, SeoulEZ, 스펙마루</strong> — 모두 같은 사람이 같은 모토로 만든 결과물입니다.
            </S.StoryP>
            <S.StoryP>
              그래서 이력서를 보러 오신 분께도 단순히 "곽승민의 깃허브"가 아니라, <strong>제가 만들고 있는 세계 전체</strong>를 보여드리고 싶었어요.
            </S.StoryP>
          </StoryBlock>

          <StoryBlock q="Q. 앞으로의 방향은요?" h="기술 스택은 넓히고, 사용자 경험은 단순하게.">
            <S.StoryP>
              혼자서 닿을 수 있는 기술의 범위를 계속 넓혀가는 중입니다. 웹, 모바일, AI, 데이터, 결제 — 어떤 영역이든 <strong>"심플하게 풀 수 있는 방법은 없을까?"</strong> 라는 질문에서 시작합니다.
            </S.StoryP>
            <S.StoryP>
              SimpraWorld는 그 질문에 대한 답을 하나씩 쌓아가는 공간입니다. 지금은 5개의 서비스로, 앞으로는 더 많이.
            </S.StoryP>
          </StoryBlock>
        </S.StoryWrap>
      </Section>

      <S.CtaWrap>
        <S.CtaTitle>SimpraWorld에서 만든 것들,<br />직접 보실래요?</S.CtaTitle>
        <S.CtaDesc>5개의 서비스가 어떻게 '심플함'을 풀어냈는지 확인해보세요.</S.CtaDesc>
        <Button as="a" href="/#projects">프로젝트 보러 가기 →</Button>
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
