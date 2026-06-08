import styled from 'styled-components'

/* DayFlip 개인정보 처리방침 — 라이트 테마 (사이트 다크와 별개) */
export const Wrap = styled.div`
  background: #F7F8FA;
  color: #1C1C1E;
  min-height: 100vh;
  line-height: 1.7;
  padding: 24px 16px 80px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
`

export const Container = styled.div`
  max-width: 720px;
  margin: 0 auto;
`

export const Header = styled.header`
  padding-bottom: 24px;
  border-bottom: 1px solid #E5E7EB;
  margin-bottom: 32px;
`

export const Brand = styled.a`
  display: inline-block;
  font-size: 14px;
  font-weight: 700;
  color: #4A6FA5;
  text-decoration: none;
  margin-bottom: 12px;
`

export const Title = styled.h1`
  font-size: 32px;
  font-weight: 800;
  color: #1C1C1E;
  margin-bottom: 8px;
`

export const Intro = styled.p`
  font-size: 15px;
  color: #6B7280;
  line-height: 1.7;
`

export const Summary = styled.div`
  background: #E6F0FB;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 32px;
`

export const SummaryLabel = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #4A6FA5;
  margin-bottom: 8px;
`

export const SummaryText = styled.div`
  font-size: 15px;
  color: #1C1C1E;
  line-height: 1.7;
`

export const Section = styled.section`
  margin-bottom: 36px;
`

export const H2 = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #1C1C1E;
  margin-bottom: 16px;
`

export const H3 = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: #1C1C1E;
  margin-top: 16px;
  margin-bottom: 8px;
`

export const List = styled.ul`
  list-style: none;
  padding-left: 4px;

  li {
    position: relative;
    padding-left: 18px;
    margin-bottom: 6px;
    font-size: 15px;
    color: #1C1C1E;

    &::before {
      content: '•';
      position: absolute;
      left: 0;
      color: #4A6FA5;
      font-weight: 700;
    }

    strong { color: #1C1C1E; }
    a { color: #4A6FA5; }
  }
`

export const Note = styled.p`
  font-size: 14px;
  color: #6B7280;
  margin-top: 12px;
  padding-left: 4px;
`

export const Para = styled.p`
  font-size: 15px;
  color: #1C1C1E;
`

export const FooterText = styled.p`
  text-align: right;
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 24px;
`

export const BackBtn = styled.a`
  display: inline-block;
  margin-top: 48px;
  padding: 10px 18px;
  background: #1C1C1E;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
`
