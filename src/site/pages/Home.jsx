import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { projects } from '../data/projects.js'
import { Section, SectionHeader, SectionNum, SectionTitle } from '../styles/common.js'
import * as S from './Home.styles'

const NAV_SECTIONS = [
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
]

function SectionNav() {
  const [active, setActive] = useState('projects')

  useEffect(() => {
    const onScroll = () => {
      const offset = 160
      let current = NAV_SECTIONS[0].id
      for (const s of NAV_SECTIONS) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= offset) current = s.id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const jump = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <S.SectionNav>
      {NAV_SECTIONS.map(s => (
        <S.SectionNavBtn
          key={s.id}
          className={active === s.id ? 'active' : ''}
          onClick={() => jump(s.id)}
        >
          {s.label}
        </S.SectionNavBtn>
      ))}
    </S.SectionNav>
  )
}

export default function Home() {
  useEffect(() => {
    document.title = 'Portfolio · 곽승민 · SimpraWorld'
  }, [])

  return (
    <>
      <S.Hero>
        <S.HeroTag>AI-Native Full Stack Developer</S.HeroTag>
        <S.HeroTitle>곽승민<span>Kwak Seungmin</span></S.HeroTitle>
        <S.HeroDesc>
          기획부터 배포까지 직접 부딪히며 배우는 1년차 개발자입니다.<br />
          AI를 도구 삼아 5개의 서비스를 만들어 출시했고, 지금도 만들고 있습니다.
        </S.HeroDesc>
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

      <SectionNav />

      <Section id="projects">
        <SectionHeader>
          <SectionNum>01</SectionNum>
          <SectionTitle>Projects</SectionTitle>
        </SectionHeader>
        <S.ProjectsGrid>
          {projects.map(p => {
            const isInternal = p.href.startsWith('/')
            const linkProps = isInternal
              ? { as: Link, to: p.href }
              : { href: p.href, target: '_blank', rel: 'noreferrer' }
            return (
              <S.ProjectCard key={p.num} {...linkProps}>
                <S.ProjectBadge>{p.badge}</S.ProjectBadge>
                <S.ProjectNum>{p.num}</S.ProjectNum>
                <S.ProjectName>{p.name}</S.ProjectName>
                <S.ProjectDesc>{p.desc}</S.ProjectDesc>
                <S.ProjectTags>
                  {p.tags.map(t => <S.Tag key={t}>{t}</S.Tag>)}
                </S.ProjectTags>
                <S.ProjectLink>{p.link}</S.ProjectLink>
              </S.ProjectCard>
            )
          })}
        </S.ProjectsGrid>
      </Section>

      <Section id="experience">
        <SectionHeader>
          <SectionNum>02</SectionNum>
          <SectionTitle>Experience</SectionTitle>
        </SectionHeader>
        <S.ExpList>
          <S.ExpItem>
            <S.ExpPeriod>2025. 06 ~ 재직 중</S.ExpPeriod>
            <div>
              <S.ExpRole>근무경력</S.ExpRole>
              <S.ExpCompany>(주)예신정보기술</S.ExpCompany>
              <S.ExpDesc>
                <li>공공기관 SI 프로젝트 시스템 유지보수</li>
                <li>공무원연금공단 복지시설 통합관리 시스템 구축 (2025.09.01 ~ 2025.12.31)</li>
              </S.ExpDesc>
            </div>
          </S.ExpItem>
          <S.ExpItem>
            <S.ExpPeriod>2024. 08 ~ 2024. 10</S.ExpPeriod>
            <div>
              <S.ExpCompany>주식회사 대형</S.ExpCompany>
              <S.ExpDesc>
                <li>전자 미용기기 AS 접수 · 처리 · 품질 보증 업무</li>
              </S.ExpDesc>
            </div>
          </S.ExpItem>
          <S.ExpItem>
            <S.ExpPeriod>2024. 01 ~ 2024. 06</S.ExpPeriod>
            <div>
              <S.ExpCompany>(주)위스텍</S.ExpCompany>
              <S.ExpDesc>
                <li>반도체 부품 생산 · 공정 작업</li>
              </S.ExpDesc>
            </div>
          </S.ExpItem>


          <S.ExpItem>
            <S.ExpPeriod>사이드 프로젝트</S.ExpPeriod>
            <div>
              <S.ExpRole>1인 개발 &amp; 기획</S.ExpRole>
              <S.ExpCompany>SimpraWorld</S.ExpCompany>
              <S.ExpDesc>
                <li>5개 서비스 기획 · 디자인 · 개발 · 배포 전 과정 경험</li>
                <li>AI를 적극 활용한 생산성 극대화</li>
                <li>쿠팡 파트너스 · 앱 구독 등 수익화 모델 직접 설계</li>
                <li>글로벌 타겟(영어) 서비스 기획 및 운영</li>
              </S.ExpDesc>
            </div>
          </S.ExpItem>

          <S.ExpItem>
            <S.ExpPeriod>기타 사항</S.ExpPeriod>
            <div>
              <S.ExpRole>병역사항</S.ExpRole>
              <S.ExpDesc>
                <li>[군필] 2021. 12 ~ 2023. 06 육군 병장 제대</li>
              </S.ExpDesc>
              <br/>
              <S.ExpRole>자격증</S.ExpRole>
              <S.ExpDesc>
                <li>1종보통운전면허</li>
                <li>초경량비행장치 지도 조종자</li>
              </S.ExpDesc>
              <br/>
              <S.ExpRole>기타 경험</S.ExpRole>
              <S.ExpDesc>
                <li>온라인쇼핑몰 위탁판매(스마트스토어, 쿠팡윙)</li>
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
            <S.ContactHeading>잘 부탁드립니다<span>.</span></S.ContactHeading>
            <S.ContactSub>
              누구보다 빠르게 배우고, 누구보다 오래 고민하겠습니다. <br/>
              작은 것부터 시작해도 꼼꼼하게 수행하겠습니다. <br/>
              부족한 부분이 있다면 채워나가가겠습니다.  <br/>
              모르는 것이 있다면 반드시 알아내겠습니다. <br/>
              함께할 기회를 주신다면 후회하지 않으실 정도로 열심히 하겠습니다.
              </S.ContactSub>
          </div>
          <S.ContactInfo>
            <S.ContactLink>
              <div>
                <S.ContactLinkLabel>EMAIL</S.ContactLinkLabel>
                <S.ContactLinkValue>croissen214@gmail.com</S.ContactLinkValue>
              </div>
            </S.ContactLink>
            <S.ContactLink>
              <div>
                <S.ContactLinkLabel>PHONE</S.ContactLinkLabel>
                <S.ContactLinkValue>010-4842-4910</S.ContactLinkValue>
              </div>
            </S.ContactLink>
            <S.ContactLink>
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
