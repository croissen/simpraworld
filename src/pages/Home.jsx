import { projects } from '../data/projects.js'
import { Section, SectionHeader, SectionNum, SectionTitle, Button } from '../styles/common.js'
import * as S from './Home.styles'

export default function Home() {
  return (
    <>
      <S.Hero>
        <S.HeroTag>AI-Native Full Stack Developer</S.HeroTag>
        <S.HeroTitle>곽승민<span>Kwak Seungmin</span></S.HeroTitle>
        <S.HeroDesc>
          기획부터 배포까지 직접 부딪히며 배우는 1년차 개발자입니다.<br />
          AI를 도구 삼아 5개의 서비스를 만들어 출시했고, 지금도 만들고 있습니다.
        </S.HeroDesc>
        <S.HeroCta>
          <Button href="#projects">프로젝트 보기</Button>
          <Button $variant="outline" href="#contact">연락하기</Button>
        </S.HeroCta>
        <S.HeroStats>
          <S.Stat>
            <S.StatNum>5+</S.StatNum>
            <S.StatLabel>SIDE PROJECTS</S.StatLabel>
          </S.Stat>
          <S.Stat>
            <S.StatNum>1yr</S.StatNum>
            <S.StatLabel>EXPERIENCE</S.StatLabel>
          </S.Stat>
        </S.HeroStats>
      </S.Hero>

      <Section id="projects">
        <SectionHeader>
          <SectionNum>01</SectionNum>
          <SectionTitle>Projects</SectionTitle>
        </SectionHeader>
        <S.ProjectsGrid>
          {projects.map(p => (
            <S.ProjectCard key={p.num} href={p.href} target="_blank" rel="noreferrer">
              <S.ProjectBadge>{p.badge}</S.ProjectBadge>
              <S.ProjectNum>{p.num}</S.ProjectNum>
              <S.ProjectName>{p.name}</S.ProjectName>
              <S.ProjectDesc>{p.desc}</S.ProjectDesc>
              <S.ProjectTags>
                {p.tags.map(t => <S.Tag key={t}>{t}</S.Tag>)}
              </S.ProjectTags>
              <S.ProjectLink>{p.link}</S.ProjectLink>
            </S.ProjectCard>
          ))}
        </S.ProjectsGrid>
      </Section>

      <Section id="experience">
        <SectionHeader>
          <SectionNum>02</SectionNum>
          <SectionTitle>Experience</SectionTitle>
        </SectionHeader>
        <S.ExpList>
          <S.ExpItem>
            <S.ExpPeriod>2025 — 현재</S.ExpPeriod>
            <div>
              <S.ExpRole>개발자</S.ExpRole>
              <S.ExpCompany>SI 개발사</S.ExpCompany>
              <S.ExpDesc>
                <li>공무원연금공단 프로젝트 참여</li>
                <li>상록 골프&amp;리조트 프로젝트 참여</li>
                <li>공공기관 사이트 유지보수</li>
                <li>Spring MVC, Oracle DB 기반 엔터프라이즈 개발</li>
              </S.ExpDesc>
            </div>
          </S.ExpItem>
          <S.ExpItem>
            <S.ExpPeriod>사이드 프로젝트</S.ExpPeriod>
            <div>
              <S.ExpRole>1인 개발자 &amp; 기획자</S.ExpRole>
              <S.ExpCompany>독립 프로젝트</S.ExpCompany>
              <S.ExpDesc>
                <li>5개 서비스 기획 · 디자인 · 개발 · 배포 전 과정 경험</li>
                <li>AI를 적극 활용한 생산성 극대화</li>
                <li>쿠팡 파트너스 · 앱 구독 등 수익화 모델 직접 설계</li>
                <li>글로벌 타겟(영어) 서비스 기획 및 운영</li>
              </S.ExpDesc>
            </div>
          </S.ExpItem>
        </S.ExpList>
      </Section>

      <Section id="skills">
        <SectionHeader>
          <SectionNum>03</SectionNum>
          <SectionTitle>Skills</SectionTitle>
        </SectionHeader>
        <S.SkillsGrid>
          <SkillGroup name="FRONTEND" items={['React','Next.js','React Native / Expo','HTML / CSS','JavaScript']} />
          <SkillGroup name="BACKEND" items={['Spring MVC','Oracle DB','PostgreSQL','Supabase','REST API']} />
          <SkillGroup name="TOOLS" items={['Git / SVN','Cloudflare','Google Play Console']} />
          <SkillGroup name="ETC" items={['AI 협업 개발','서비스 기획','수익화 설계','GIS / 공공 시스템']} />
        </S.SkillsGrid>
      </Section>

      <Section id="contact">
        <S.ContactInner>
          <div>
            <S.ContactHeading>함께 만들고<br />싶어요<span>.</span></S.ContactHeading>
            <S.ContactSub>새로운 프로젝트, 협업, 채용 제안 모두 환영합니다. 편하게 연락 주세요.</S.ContactSub>
          </div>
          <S.ContactInfo>
            <S.ContactLink href="mailto:croissen214@gmail.com">
              <div>
                <S.ContactLinkLabel>EMAIL</S.ContactLinkLabel>
                <S.ContactLinkValue>croissen214@gmail.com</S.ContactLinkValue>
              </div>
            </S.ContactLink>
            <S.ContactLink href="https://simpraworld.com" target="_blank" rel="noreferrer">
              <div>
                <S.ContactLinkLabel>PORTFOLIO</S.ContactLinkLabel>
                <S.ContactLinkValue>simpraworld.com</S.ContactLinkValue>
              </div>
            </S.ContactLink>
          </S.ContactInfo>
        </S.ContactInner>
      </Section>
    </>
  )
}

function SkillGroup({ name, items }) {
  return (
    <S.SkillGroupBox>
      <S.SkillGroupName>{name}</S.SkillGroupName>
      <S.SkillItems>
        {items.map(i => <S.SkillItem key={i}>{i}</S.SkillItem>)}
      </S.SkillItems>
    </S.SkillGroupBox>
  )
}
