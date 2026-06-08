import { useEffect } from 'react'
import * as S from './DayflipPolicy.styles'

export default function DayflipData() {
  useEffect(() => {
    document.title = 'DayFlip 데이터 처리 안내 · SimpraWorld'
  }, [])

  return (
    <S.Wrap>
      <S.Container>
        <S.Header>
          <S.Brand href="/">Simpra World</S.Brand>
          <S.Title>DayFlip 데이터 처리 안내</S.Title>
          <S.Intro>
            DayFlip이 사용자 데이터를 어떻게 다루는지 한눈에 정리했어요.
          </S.Intro>
        </S.Header>

        <S.Summary>
          <S.SummaryLabel>핵심 요약</S.SummaryLabel>
          <S.SummaryText>
            모든 데이터는 클라우드(Supabase)에 암호화 저장됩니다. AI 일기 정리 시에만 답변 텍스트가 일시적으로 Google Gemini 로 전송되며 결과를 받으면 즉시 폐기됩니다.
          </S.SummaryText>
        </S.Summary>

        <S.Section>
          <S.H2>1. 인증</S.H2>
          <S.List>
            <li>이메일+비밀번호 또는 Google 계정으로 로그인</li>
            <li>비밀번호는 Supabase가 단방향 해시로 저장 — 원본 비밀번호는 어디에도 보관되지 않아요</li>
            <li>로그인 세션은 디바이스 SecureStore에 안전하게 저장</li>
          </S.List>
        </S.Section>

        <S.Section>
          <S.H2>2. 데이터 저장 위치</S.H2>
          <S.List>
            <li><strong>일기·답변·노트·설정</strong> — Supabase 데이터베이스 (PostgreSQL, 미국 리전)</li>
            <li><strong>사진</strong> — Supabase Storage의 사용자별 격리된 폴더</li>
            <li><strong>로컬 캐시</strong> — 일부 설정(테마, 디바이스 온보딩 플래그)만 디바이스에 보관</li>
          </S.List>
        </S.Section>

        <S.Section>
          <S.H2>3. AI 일기 생성 방식</S.H2>
          <S.List>
            <li>설정된 시각(기본 23:00 KST)에 서버 cron이 그날의 답변을 모아 Google Gemini API로 전송</li>
            <li>Gemini가 1인칭 일기 본문과 시적인 제목을 생성해 반환</li>
            <li>결과는 사용자 계정에 저장되고, 전송 데이터는 즉시 폐기 (별도 로그 미저장)</li>
            <li>사용자가 직접 쓴 일기가 있으면 AI가 정리한 본문과 함께 표시되고, 사용자가 선택할 수 있어요 (교체·유지·추가)</li>
          </S.List>
        </S.Section>

        <S.Section>
          <S.H2>4. 데이터 접근 제어</S.H2>
          <S.List>
            <li><strong>RLS (Row Level Security)</strong> — Supabase 정책으로 본인 데이터만 조회·수정 가능</li>
            <li>사진은 시간 제한이 있는 서명된 URL로만 접근</li>
            <li>서버 측 cron 작업은 service_role 키로 동작하며 외부 노출되지 않음</li>
          </S.List>
        </S.Section>

        <S.Section>
          <S.H2>5. 제3자 광고·마케팅</S.H2>
          <S.List>
            <li>광고 목적으로 데이터를 제3자에게 제공하지 않습니다</li>
            <li>광고 SDK를 탑재하지 않습니다</li>
            <li>분석 도구를 사용하지 않습니다 (앱 사용 패턴 추적 X)</li>
          </S.List>
        </S.Section>

        <S.Section>
          <S.H2>6. 데이터 내보내기 / 삭제</S.H2>
          <S.List>
            <li>개별 일기·노트·사진은 앱에서 즉시 삭제 가능</li>
            <li>회원 탈퇴 시 30일 유예 후 모든 데이터 영구 삭제</li>
            <li>전체 데이터 내보내기 (백업 다운로드)는 향후 추가 예정</li>
          </S.List>
        </S.Section>

        <S.BackBtn href="/dayflip/policy">개인정보 처리방침 →</S.BackBtn>
        &nbsp;
        <S.BackBtn href="/" style={{ background: '#6B7280' }}>← Simpra World</S.BackBtn>
      </S.Container>
    </S.Wrap>
  )
}
