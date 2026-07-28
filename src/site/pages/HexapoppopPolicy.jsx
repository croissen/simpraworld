import { useEffect, useState } from 'react'
import * as S from './DayflipPolicy.styles'

// 브라우저 언어 자동감지 — 한국어 기기면 ko, 그 외 en. 상단 토글로 수동 전환 가능.
function detectLang() {
  const n = ((typeof navigator !== 'undefined' && navigator.language) || 'en').toLowerCase()
  return n.startsWith('ko') ? 'ko' : 'en'
}

export default function HexapoppopPolicy() {
  const [lang, setLang] = useState(detectLang)
  useEffect(() => {
    document.title = lang === 'ko'
      ? 'Hexa PopPop! 개인정보처리방침 · SimpraWorld'
      : 'Hexa PopPop! Privacy Policy · SimpraWorld'
  }, [lang])

  const tab = (on) => ({
    padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontWeight: 700, fontSize: 14, background: on ? '#5566d8' : '#e6e8f5',
    color: on ? '#fff' : '#5566d8',
  })

  return (
    <S.Wrap>
      <S.Container>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
          <button style={tab(lang === 'en')} onClick={() => setLang('en')}>English</button>
          <button style={tab(lang === 'ko')} onClick={() => setLang('ko')}>한국어</button>
        </div>
        {lang === 'ko' ? <Ko /> : <En />}
      </S.Container>
    </S.Wrap>
  )
}

function En() {
  return (
    <>
      <S.Header>
        <S.Brand href="/">Simpra World</S.Brand>
        <S.Title>Hexa PopPop! Privacy Policy</S.Title>
        <S.Intro>
          How Hexa PopPop! (the "Game") collects, uses, and protects your information.
        </S.Intro>
      </S.Header>

      <S.Summary>
        <S.SummaryLabel>In short</S.SummaryLabel>
        <S.SummaryText>
          The Game has no accounts and no login. Your progress is stored only on your device.
          We do not collect your name, email, or any directly identifying information.
          Third-party services (Google AdMob for ads, RevenueCat and Google Play for the
          optional "Remove Ads" purchase) may process device and advertising identifiers.
        </S.SummaryText>
      </S.Summary>

      <S.Section>
        <S.H2>1. Information We Collect</S.H2>

        <S.H3>Information you provide</S.H3>
        <S.List>
          <li><strong>None.</strong> The Game does not ask for an account, email address, name, or phone number.</li>
        </S.List>

        <S.H3>Stored on your device only</S.H3>
        <S.List>
          <li>Game progress — high scores, current board state, rounds played</li>
          <li>Coins, awards, and achievement progress</li>
          <li>Daily check-in and login streak counts</li>
          <li>Settings — sound, music, vibration, selected effect theme</li>
          <li>
            <strong>Custom background photo</strong> — if you choose a photo from your
            device to use as a game background, it is saved only on your device and is
            never uploaded, shared, or included in any backup
          </li>
        </S.List>
        <S.Note>
          This data never leaves your device. It is not uploaded to us or to any server.
          Deleting the Game removes it permanently.
        </S.Note>

        <S.H3>Collected by third-party services</S.H3>
        <S.List>
          <li>
            <strong>Advertising identifier</strong> (Google Advertising ID on Android,
            IDFA on iOS) — used by Google AdMob to serve and measure ads
          </li>
          <li>
            <strong>Device and usage information</strong> — device model, operating system
            version, language, country, approximate (non-precise) location derived from IP
            address, and ad interaction events
          </li>
          <li>
            <strong>Purchase information</strong> — an anonymous purchase identifier and
            receipt data, if you buy "Remove Ads"
          </li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>2. How We Use Information</S.H2>
        <S.List>
          <li><strong>Play the game</strong> — saving your scores and settings on your device</li>
          <li><strong>Show ads</strong> — a banner at the bottom of the screen and a full-screen ad shown occasionally after a game ends</li>
          <li><strong>Process purchases</strong> — unlocking and restoring the "Remove Ads" purchase</li>
        </S.List>
        <S.Note>
          We do not sell your data, and we do not build advertising profiles ourselves.
        </S.Note>
      </S.Section>

      <S.Section>
        <S.H2>3. Third-Party Services</S.H2>
        <S.List>
          <li>
            <strong>Google AdMob</strong> — serves the ads in the Game and may use device
            and advertising identifiers for ad delivery, frequency capping, and fraud
            prevention. See Google's privacy policy at{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
              policies.google.com/privacy
            </a>
            .
          </li>
          <li>
            <strong>RevenueCat</strong> — manages the "Remove Ads" purchase and restores it
            on reinstall, using an anonymous identifier and store receipt data.
          </li>
          <li>
            <strong>Google Play Billing</strong> — processes the payment. We never see or
            store your payment card details.
          </li>
        </S.List>
        <S.Note>
          Each service processes data under its own privacy policy. The Game sends only the
          minimum data required for these features to work.
        </S.Note>
      </S.Section>

      <S.Section>
        <S.H2>4. Personalized Ads and Your Choices</S.H2>
        <S.List>
          <li>
            <strong>iOS</strong> — the Game asks for permission to track before showing
            personalized ads (App Tracking Transparency). If you decline, ads are still
            shown but are not personalized.
          </li>
          <li>
            <strong>Android</strong> — you can reset or delete your advertising ID in
            Settings → Google → Ads, which limits ad personalization.
          </li>
          <li>
            <strong>Remove ads entirely</strong> — buy "Remove Ads" in the Game's settings.
            After that, no ads are requested or shown.
          </li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>5. Data Retention and Deletion</S.H2>
        <S.List>
          <li><strong>Game progress</strong> — kept on your device until you delete the Game. Uninstalling erases it.</li>
          <li><strong>We hold no server-side copy</strong>, so there is no account for us to delete.</li>
          <li><strong>Purchase records</strong> — retained by Google Play and RevenueCat as required for billing, refunds, and restoring purchases.</li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>6. Children</S.H2>
        <S.Para>
          The Game is intended for a general audience and is not directed at children under
          13. We do not knowingly collect personal information from children. If you believe
          a child has provided us with personal information, please contact us and we will
          address it.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>7. Security</S.H2>
        <S.List>
          <li>All network communication with third-party services uses HTTPS / TLS encryption.</li>
          <li>Game progress stays in the app's private storage, which other apps cannot read.</li>
          <li>Because no account exists, there are no passwords to store or leak.</li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>8. Changes to This Policy</S.H2>
        <S.Para>
          If this policy changes, we will update this page and revise the effective date
          below. Significant changes will also be announced in the Game or on the store
          listing before taking effect.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>9. Contact</S.H2>
        <S.List>
          <li>Operator: Simpra</li>
          <li>Email: <a href="mailto:support@simpraworld.com">support@simpraworld.com</a></li>
          <li>Response time: within 3 business days</li>
        </S.List>
      </S.Section>

      <S.FooterText>Effective date: July 28, 2026</S.FooterText>
    </>
  )
}

function Ko() {
  return (
    <>
      <S.Header>
        <S.Brand href="/">Simpra World</S.Brand>
        <S.Title>Hexa PopPop! 개인정보처리방침</S.Title>
        <S.Intro>
          Hexa PopPop!("게임")이 여러분의 정보를 어떻게 수집·이용·보호하는지 안내합니다.
        </S.Intro>
      </S.Header>

      <S.Summary>
        <S.SummaryLabel>요약</S.SummaryLabel>
        <S.SummaryText>
          이 게임은 계정도 로그인도 없습니다. 진행 상황은 기기에만 저장됩니다.
          이름·이메일 등 직접 식별할 수 있는 정보는 수집하지 않습니다.
          제3자 서비스(광고를 위한 Google AdMob, 선택형 "광고 제거" 구매를 위한
          RevenueCat 및 Google Play)가 기기 및 광고 식별자를 처리할 수 있습니다.
        </S.SummaryText>
      </S.Summary>

      <S.Section>
        <S.H2>1. 수집하는 정보</S.H2>

        <S.H3>여러분이 제공하는 정보</S.H3>
        <S.List>
          <li><strong>없음.</strong> 게임은 계정·이메일 주소·이름·전화번호를 요구하지 않습니다.</li>
        </S.List>

        <S.H3>기기에만 저장되는 정보</S.H3>
        <S.List>
          <li>게임 진행 — 최고 점수, 현재 보드 상태, 플레이한 판 수</li>
          <li>코인, 어워드, 업적 진행도</li>
          <li>출석 체크 및 연속 접속 일수</li>
          <li>설정 — 사운드, 음악, 진동, 선택한 이펙트 테마</li>
          <li>
            <strong>커스텀 배경 사진</strong> — 기기의 사진을 게임 배경으로
            선택하면 기기에만 저장되며, 업로드·공유되거나 어떤 백업에도
            포함되지 않습니다
          </li>
        </S.List>
        <S.Note>
          이 데이터는 기기를 벗어나지 않습니다. 당사나 어떤 서버로도 업로드되지
          않습니다. 게임을 삭제하면 영구히 제거됩니다.
        </S.Note>

        <S.H3>제3자 서비스가 수집하는 정보</S.H3>
        <S.List>
          <li>
            <strong>광고 식별자</strong> (Android의 Google 광고 ID, iOS의 IDFA)
            — Google AdMob이 광고 게재 및 측정에 사용
          </li>
          <li>
            <strong>기기 및 이용 정보</strong> — 기기 모델, 운영체제 버전, 언어,
            국가, IP 주소에서 추정된 대략적(비정밀) 위치, 광고 상호작용 이벤트
          </li>
          <li>
            <strong>구매 정보</strong> — "광고 제거"를 구매하는 경우 익명 구매
            식별자 및 영수증 데이터
          </li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>2. 정보의 이용</S.H2>
        <S.List>
          <li><strong>게임 실행</strong> — 점수와 설정을 기기에 저장</li>
          <li><strong>광고 표시</strong> — 화면 하단 배너, 게임 종료 후 가끔 표시되는 전면 광고</li>
          <li><strong>구매 처리</strong> — "광고 제거" 구매의 해제 및 복원</li>
        </S.List>
        <S.Note>
          당사는 여러분의 데이터를 판매하지 않으며, 직접 광고 프로필을 만들지 않습니다.
        </S.Note>
      </S.Section>

      <S.Section>
        <S.H2>3. 제3자 서비스</S.H2>
        <S.List>
          <li>
            <strong>Google AdMob</strong> — 게임 내 광고를 게재하며, 광고 전송,
            노출 빈도 제한, 부정 방지를 위해 기기 및 광고 식별자를 사용할 수
            있습니다. Google 개인정보처리방침:{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
              policies.google.com/privacy
            </a>
            .
          </li>
          <li>
            <strong>RevenueCat</strong> — "광고 제거" 구매를 관리하고 재설치 시
            복원하며, 익명 식별자와 스토어 영수증 데이터를 사용합니다.
          </li>
          <li>
            <strong>Google Play 결제</strong> — 결제를 처리합니다. 당사는 여러분의
            결제 카드 정보를 보거나 저장하지 않습니다.
          </li>
        </S.List>
        <S.Note>
          각 서비스는 자체 개인정보처리방침에 따라 데이터를 처리합니다. 게임은 이
          기능들이 작동하는 데 필요한 최소한의 데이터만 전송합니다.
        </S.Note>
      </S.Section>

      <S.Section>
        <S.H2>4. 맞춤 광고와 선택권</S.H2>
        <S.List>
          <li>
            <strong>iOS</strong> — 맞춤 광고를 표시하기 전에 추적 권한(앱 추적
            투명성)을 요청합니다. 거부해도 광고는 표시되지만 맞춤화되지 않습니다.
          </li>
          <li>
            <strong>Android</strong> — 설정 → Google → 광고에서 광고 ID를
            재설정하거나 삭제하여 광고 맞춤화를 제한할 수 있습니다.
          </li>
          <li>
            <strong>광고 완전 제거</strong> — 게임 설정에서 "광고 제거"를
            구매하세요. 이후에는 광고가 요청되거나 표시되지 않습니다.
          </li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>5. 데이터 보관 및 삭제</S.H2>
        <S.List>
          <li><strong>게임 진행</strong> — 게임을 삭제할 때까지 기기에 보관됩니다. 삭제하면 지워집니다.</li>
          <li><strong>당사는 서버측 사본을 보관하지 않으므로</strong> 삭제할 계정이 없습니다.</li>
          <li><strong>구매 기록</strong> — 결제, 환불, 구매 복원을 위해 Google Play와 RevenueCat이 필요한 범위에서 보관합니다.</li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>6. 아동</S.H2>
        <S.Para>
          이 게임은 일반 이용자를 대상으로 하며 만 13세 미만 아동을 대상으로 하지
          않습니다. 당사는 아동의 개인정보를 고의로 수집하지 않습니다. 아동이
          개인정보를 제공했다고 판단되면 연락 주시면 조치하겠습니다.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>7. 보안</S.H2>
        <S.List>
          <li>제3자 서비스와의 모든 통신은 HTTPS / TLS 암호화를 사용합니다.</li>
          <li>게임 진행 데이터는 다른 앱이 읽을 수 없는 앱 전용 저장소에 보관됩니다.</li>
          <li>계정이 없으므로 저장하거나 유출될 비밀번호가 없습니다.</li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>8. 방침의 변경</S.H2>
        <S.Para>
          이 방침이 변경되면 이 페이지를 갱신하고 아래 시행일을 수정합니다. 중요한
          변경은 시행 전에 게임 내 또는 스토어 등록정보에서도 안내합니다.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>9. 문의</S.H2>
        <S.List>
          <li>운영자: Simpra</li>
          <li>이메일: <a href="mailto:support@simpraworld.com">support@simpraworld.com</a></li>
          <li>응답 시간: 영업일 기준 3일 이내</li>
        </S.List>
      </S.Section>

      <S.FooterText>시행일: 2026년 7월 28일</S.FooterText>
    </>
  )
}
