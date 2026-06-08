import styled from 'styled-components'
import { theme } from '../styles/GlobalStyle'

export const Hero = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8rem 3rem 4rem;
  position: relative;
  border-bottom: 1px solid ${theme.border};

  @media (max-width: 768px) { padding: 7rem 1.5rem 3rem; }
`

export const HeroTag = styled.p`
  font-family: ${theme.mono};
  font-size: 12px;
  color: ${theme.accent};
  letter-spacing: 0.15em;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  &::before { content: ''; width: 32px; height: 1px; background: ${theme.accent}; }
`

export const HeroTitle = styled.h1`
  font-size: clamp(3rem, 8vw, 7rem);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.03em;
  margin-bottom: 0.2em;

  span { color: ${theme.accent}; display: block; }
`

export const HeroDesc = styled.p`
  max-width: 520px;
  margin-top: 2.5rem;
  font-size: 16px;
  color: ${theme.text2};
  line-height: 1.7;
`

export const HeroCta = styled.div`
  margin-top: 3rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`

export const HeroStats = styled.div`
  position: absolute;
  bottom: 3rem;
  right: 3rem;
  display: flex;
  gap: 3rem;

  @media (max-width: 768px) {
    position: static;
    margin-top: 3rem;
    justify-content: flex-start;
  }
`

export const Stat = styled.div`
  text-align: right;
`

export const StatNum = styled.span`
  font-family: ${theme.mono};
  font-size: 2rem;
  font-weight: 700;
  color: ${theme.accent};
  display: block;
`

export const StatLabel = styled.span`
  font-size: 11px;
  color: ${theme.text3};
  letter-spacing: 0.1em;
`

/* ---------- Projects ---------- */
export const ProjectsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1px;
  border: 1px solid ${theme.border};
`

export const ProjectCard = styled.a`
  background: ${theme.bg2};
  padding: 2rem;
  position: relative;
  overflow: hidden;
  transition: background 0.3s;
  text-decoration: none;
  color: inherit;
  display: block;

  &:hover { background: ${theme.bg3}; }

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: ${theme.accent};
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s;
  }
  &:hover::before { transform: scaleX(1); }
`

export const ProjectBadge = styled.span`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  font-family: ${theme.mono};
  font-size: 10px;
  padding: 0.2rem 0.5rem;
  background: rgba(200,245,90,0.1);
  color: ${theme.accent};
  border: 1px solid rgba(200,245,90,0.2);
  border-radius: 2px;
  letter-spacing: 0.08em;
`

export const ProjectNum = styled.p`
  font-family: ${theme.mono};
  font-size: 11px;
  color: ${theme.text3};
  margin-bottom: 1.5rem;
  letter-spacing: 0.1em;
`

export const ProjectName = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  letter-spacing: -0.01em;
`

export const ProjectDesc = styled.p`
  font-size: 14px;
  color: ${theme.text2};
  line-height: 1.6;
  margin-bottom: 1.5rem;
`

export const ProjectTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1.5rem;
`

export const Tag = styled.span`
  font-family: ${theme.mono};
  font-size: 11px;
  padding: 0.25rem 0.6rem;
  border: 1px solid ${theme.border};
  color: ${theme.text3};
  border-radius: 2px;
  letter-spacing: 0.05em;
`

export const ProjectLink = styled.span`
  font-family: ${theme.mono};
  font-size: 11px;
  color: ${theme.accent};
  letter-spacing: 0.05em;
`

/* ---------- Experience ---------- */
export const ExpList = styled.div`
  display: flex;
  flex-direction: column;
`

export const ExpItem = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 3rem;
  padding: 2.5rem 0;
  border-bottom: 1px solid ${theme.border};
  &:last-child { border-bottom: none; }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
`

export const ExpPeriod = styled.div`
  font-family: ${theme.mono};
  font-size: 12px;
  color: ${theme.text3};
  letter-spacing: 0.05em;
  padding-top: 0.2rem;
`

export const ExpRole = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  letter-spacing: -0.01em;
`

export const ExpCompany = styled.p`
  font-size: 13px;
  color: ${theme.accent};
  margin-bottom: 1rem;
  font-family: ${theme.mono};
  letter-spacing: 0.05em;
`

export const ExpDesc = styled.ul`
  li {
    margin-bottom: 0.3rem;
    padding-left: 1rem;
    position: relative;
    font-size: 14px;
    color: ${theme.text2};
    line-height: 1.7;
    list-style: none;
    &::before { content: '—'; position: absolute; left: 0; color: ${theme.text3}; }
  }
`

/* ---------- Skills ---------- */
export const SkillsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1px;
  border: 1px solid ${theme.border};
`

export const SkillGroupBox = styled.div`
  background: ${theme.bg2};
  padding: 1.75rem;
`

export const SkillGroupName = styled.p`
  font-family: ${theme.mono};
  font-size: 11px;
  color: ${theme.accent};
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
`

export const SkillItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

export const SkillItem = styled.span`
  font-size: 14px;
  color: ${theme.text2};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  &::before {
    content: '';
    width: 4px; height: 4px;
    background: ${theme.text3};
    border-radius: 50%;
    flex-shrink: 0;
  }
`

/* ---------- Contact ---------- */
export const ContactInner = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6rem;
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 3rem;
  }
`

export const ContactHeading = styled.h2`
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  span { color: ${theme.accent}; }
`

export const ContactSub = styled.p`
  margin-top: 1.25rem;
  font-size: 15px;
  color: ${theme.text2};
  line-height: 1.7;
  max-width: 380px;
`

export const ContactInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

export const ContactLink = styled.a`
  display: flex;
  align-items: center;
  gap: 1rem;
  text-decoration: none;
  color: ${theme.text};
  padding: 1.25rem 1.5rem;
  border: 1px solid ${theme.border};
  transition: border-color 0.2s, background 0.2s;
  &:hover { border-color: ${theme.border2}; background: ${theme.bg2}; }
`

export const ContactLinkLabel = styled.span`
  font-family: ${theme.mono};
  font-size: 11px;
  color: ${theme.text3};
  letter-spacing: 0.1em;
  display: block;
  margin-bottom: 0.25rem;
`

export const ContactLinkValue = styled.span`
  font-size: 15px;
`
