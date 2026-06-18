import styled from 'styled-components'
import { theme } from '../styles/GlobalStyle'

export const Page = styled.div`
  padding: 7rem 3rem 4rem;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) { padding: 6rem 1.25rem 3rem; }
`

/* ---------- Top header (icon + title + install) ---------- */
export const Header = styled.div`
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 3rem;
  padding-bottom: 2.5rem;
  border-bottom: 1px solid ${theme.border};

  @media (max-width: 768px) {
    grid-template-columns: 1fr 110px;
    gap: 1rem;
  }
`

export const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

export const AppTitle = styled.h1`
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
`

export const Developer = styled.p`
  font-family: ${theme.mono};
  font-size: 13px;
  color: ${theme.accent};
  letter-spacing: 0.05em;
`

export const AdBadge = styled.span`
  font-size: 12px;
  color: ${theme.text3};
  margin-left: 0.5rem;
`

export const MetaRow = styled.div`
  display: flex;
  gap: 2.5rem;
  flex-wrap: wrap;
`

export const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

export const MetaValue = styled.span`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${theme.text};
  display: flex;
  align-items: center;
  gap: 0.3rem;
`

export const MetaLabel = styled.span`
  font-family: ${theme.mono};
  font-size: 10px;
  color: ${theme.text3};
  letter-spacing: 0.1em;
  text-transform: uppercase;
`

export const Star = styled.span`
  color: ${theme.accent};
`

export const HeaderRight = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-start;
`

export const AppIcon = styled.div`
  width: 160px;
  height: 160px;
  border-radius: 28px;
  background: ${({ $src }) =>
    $src ? `url(${$src}) center/cover no-repeat` : `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`};
  border: 1px solid ${theme.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${theme.mono};
  font-size: 11px;
  color: ${({ $src }) => ($src ? 'transparent' : theme.onAccent)};
  letter-spacing: 0.1em;

  @media (max-width: 768px) { width: 100px; height: 100px; border-radius: 20px; }
`

/* ---------- Install / Share ---------- */
export const ActionRow = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 0.5rem;
`

export const InstallBtn = styled.a`
  background: ${theme.accent};
  color: ${theme.onAccent};
  font-weight: 700;
  font-family: ${theme.mono};
  font-size: 14px;
  letter-spacing: 0.05em;
  padding: 0.85rem 2.5rem;
  border-radius: 4px;
  text-decoration: none;
  border: none;
  transition: background 0.2s;
  &:hover { background: ${theme.accent2}; }

  &:disabled,
  &[aria-disabled='true'] {
    background: ${theme.bg3};
    color: ${theme.text2};
    cursor: not-allowed;
    &:hover { background: ${theme.bg3}; }
  }
`

export const DeviceNote = styled.p`
  font-size: 12px;
  color: ${theme.text3};
  margin-top: 0.25rem;
`

/* ---------- Screenshots ---------- */
export const Screenshots = styled.div`
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding: 2.5rem 0;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
  scrollbar-color: ${theme.border2} transparent;
  border-bottom: 1px solid ${theme.border};

  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-thumb { background: ${theme.border2}; border-radius: 3px; }
`

export const Screenshot = styled.div`
  flex: 0 0 auto;
  width: 240px;
  height: 480px;
  border-radius: 18px;
  border: 1px solid ${theme.border};
  background: ${({ $src }) => ($src ? `url(${$src}) center/cover no-repeat` : theme.bg2)};
  scroll-snap-align: start;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${theme.mono};
  font-size: 11px;
  color: ${theme.text3};

  @media (max-width: 768px) { width: 180px; height: 360px; }
`

/* ---------- Sections ---------- */
export const Section = styled.section`
  padding: 2.5rem 0;
  border-bottom: 1px solid ${theme.border};
  &:last-child { border-bottom: none; }
`

export const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const SectionArrow = styled.span`
  color: ${theme.text3};
  font-family: ${theme.mono};
`

export const AppDesc = styled.div`
  font-size: 15px;
  color: ${theme.text2};
  line-height: 1.85;
  white-space: pre-line;
  strong { color: ${theme.text}; font-weight: 500; }
`

export const TagRow = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
`

export const Chip = styled.span`
  font-family: ${theme.mono};
  font-size: 11px;
  padding: 0.3rem 0.75rem;
  border: 1px solid ${theme.border};
  border-radius: 100px;
  color: ${theme.text3};
  letter-spacing: 0.05em;
`

export const UpdateDate = styled.p`
  font-family: ${theme.mono};
  font-size: 12px;
  color: ${theme.text3};
  margin-top: 1rem;
`

/* ---------- Data Safety ---------- */
export const SafetyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

export const SafetyItem = styled.div`
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem 1.25rem;
  background: ${theme.bg2};
  border: 1px solid ${theme.border};
  border-radius: 6px;
`

export const SafetyIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${theme.accentSoftBg};
  color: ${theme.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
`

export const SafetyText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`

export const SafetyLabel = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${theme.text};
`

export const SafetyDesc = styled.span`
  font-size: 13px;
  color: ${theme.text2};
  line-height: 1.5;
`

/* ---------- Info grid (Age / Support) ---------- */
export const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`

export const InfoBox = styled.div`
  padding: 1.25rem;
  background: ${theme.bg2};
  border: 1px solid ${theme.border};
  border-radius: 6px;
`

export const InfoBoxLink = styled.a`
  padding: 1.25rem;
  background: ${theme.bg2};
  border: 1px solid ${theme.border};
  border-radius: 6px;
  text-decoration: none;
  color: inherit;
  display: block;
  transition: background 0.2s, border-color 0.2s;
  cursor: pointer;
  &:hover {
    background: ${theme.bg3};
    border-color: ${theme.border2};
  }
`

export const InfoTitle = styled.p`
  font-family: ${theme.mono};
  font-size: 11px;
  color: ${theme.accent};
  letter-spacing: 0.1em;
  margin-bottom: 0.5rem;
`

export const InfoValue = styled.p`
  font-size: 15px;
  color: ${theme.text};
  font-weight: 500;
`

export const InfoSub = styled.p`
  font-size: 12px;
  color: ${theme.text3};
  margin-top: 0.25rem;
`
