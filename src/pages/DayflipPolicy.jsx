import { useEffect } from 'react'
import * as S from './DayflipPolicy.styles'

export default function DayflipPolicy() {
  useEffect(() => {
    document.title = 'DayFlip 개인정보 처리방침 · SimpraWorld'
  }, [])

  return (
    <S.Wrap>
      <S.Container>
        <S.Header>
          <S.Brand href="/">Simpra World</S.Brand>
          <S.Title>DayFlip 개인정보 처리방침</S.Title>
          <S.Intro>
            DayFlip(이하 '앱')이 사용자의 개인정보를 어떻게 수집·이용·보호하는지 안내합니다.
          </S.Intro>
        </S.Header>

        <S.Summary>
          <S.SummaryLabel>핵심 요약</S.SummaryLabel>
          <S.SummaryText>
            앱은 사용자의 일기·답변·노트·사진을 클라우드(Supabase)에 안전하게 보관해요. AI 일기 정리에는 Google Gemini 를 활용해요. 회원 탈퇴 시 30일 유예 후 모든 데이터가 영구 삭제돼요.
          </S.SummaryText>
        </S.Summary>

        <S.Section>
          <S.H2>1. 수집하는 개인정보 항목</S.H2>

          <S.H3>계정 정보</S.H3>
          <S.List>
            <li>이메일 주소</li>
            <li>(선택) 표시 이름</li>
            <li>(Google 로그인 시) Google 계정 식별자</li>
          </S.List>

          <S.H3>사용자 입력 데이터</S.H3>
          <S.List>
            <li>매시간 질문에 대한 한 줄 답변</li>
            <li>직접 작성한 일기 본문 및 제목</li>
            <li>노트 / 폴더 / 달력 노트</li>
            <li>(프리미엄) 일기에 첨부한 사진</li>
          </S.List>

          <S.H3>설정 정보</S.H3>
          <S.List>
            <li>알림 시각, 일기 정리 시각</li>
            <li>AI 톤 / 사용자 정의 스타일</li>
            <li>형광펜·휴일 표시·테마 선택</li>
          </S.List>
        </S.Section>

        <S.Section>
          <S.H2>2. 개인정보의 이용 목적</S.H2>
          <S.List>
            <li><strong>AI 일기 자동 정리</strong> — 설정된 시각에 답변을 모아 1인칭 일기로 합성</li>
            <li><strong>알림 발송</strong> — 설정된 시각에 질문 알림 전송</li>
            <li><strong>계정 관리</strong> — 로그인, 비밀번호 재설정, 회원 탈퇴</li>
            <li><strong>구독 관리</strong> — Google Play 결제 처리, 프리미엄 기능 활성화</li>
          </S.List>
        </S.Section>

        <S.Section>
          <S.H2>3. 개인정보의 제3자 처리 위탁</S.H2>
          <S.List>
            <li><strong>Supabase (미국)</strong> — 데이터베이스, 인증, 파일 저장</li>
            <li><strong>Google Gemini (미국)</strong> — AI 일기 정리 (답변 전송 후 결과 본문 반환)</li>
            <li><strong>Cloudflare Workers</strong> — AI 처리 프록시, 정기 작업 (로그 미저장)</li>
            <li><strong>Resend (미국)</strong> — 인증 이메일 발송</li>
            <li><strong>Google Play / RevenueCat</strong> — 결제 처리, 구독 상태 관리</li>
          </S.List>
          <S.Note>
            각 서비스는 자사 개인정보 처리방침에 따라 데이터를 처리하며, DayFlip 은 필요한 최소한의 데이터만 전송합니다.
          </S.Note>
        </S.Section>

        <S.Section>
          <S.H2>4. 보유 및 이용 기간</S.H2>
          <S.List>
            <li><strong>활성 계정</strong> — 회원 탈퇴 전까지 보관</li>
            <li><strong>회원 탈퇴 요청</strong> — 요청 후 30일 유예 (그 사이 로그인하면 복구 가능). 30일 경과 후 일기·노트·사진·계정 모두 영구 삭제</li>
            <li><strong>구독 만료</strong> — 만료 후 30일 경과 시 노트와 사진 자동 정리 (일기 본문은 유지)</li>
            <li><strong>개별 일기 삭제</strong> — 즉시 영구 삭제</li>
          </S.List>
        </S.Section>

        <S.Section>
          <S.H2>5. 이용자 권리</S.H2>
          <S.List>
            <li>개인정보 열람·수정 — 앱 내 모든 기능에서 가능</li>
            <li>회원 탈퇴 — 설정 → 구독 관리 → 회원 탈퇴 (30일 유예)</li>
            <li>동의 철회 — 회원 탈퇴로 처리</li>
          </S.List>
        </S.Section>

        <S.Section>
          <S.H2>6. 개인정보 보호 조치</S.H2>
          <S.List>
            <li>모든 통신은 HTTPS / TLS 1.2 이상 암호화</li>
            <li>Row Level Security 로 본인 데이터만 접근 가능</li>
            <li>비밀번호는 단방향 해시 처리</li>
            <li>사진은 사용자별 격리된 폴더에 저장 (서명된 URL 로만 접근)</li>
          </S.List>
        </S.Section>

        <S.Section>
          <S.H2>7. 정책 변경 시</S.H2>
          <S.Para>
            본 방침이 변경되는 경우 앱 내 공지 또는 이메일로 사전 알림하며, 변경된 방침은 게시 후 7일 이상 경과한 시점부터 적용됩니다.
          </S.Para>
        </S.Section>

        <S.Section>
          <S.H2>8. 문의</S.H2>
          <S.List>
            <li>책임자: Simpra</li>
            <li>이메일: <a href="mailto:support@simpraworld.com">support@simpraworld.com</a></li>
            <li>응답: 영업일 기준 3일 이내</li>
          </S.List>
        </S.Section>

        <S.FooterText>시행일: 2026년 6월 4일 (최종 수정)</S.FooterText>

        <S.BackBtn href="/">← Simpra World</S.BackBtn>
      </S.Container>
    </S.Wrap>
  )
}
