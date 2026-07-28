import { useEffect, useState } from 'react'
import * as S from './DayflipPolicy.styles'

// 브라우저 언어 자동감지 — 한국어 기기면 ko, 그 외 en. 상단 토글로 수동 전환 가능.
function detectLang() {
  const n = ((typeof navigator !== 'undefined' && navigator.language) || 'en').toLowerCase()
  return n.startsWith('ko') ? 'ko' : 'en'
}

export default function HexapoppopTerms() {
  const [lang, setLang] = useState(detectLang)
  useEffect(() => {
    document.title = lang === 'ko'
      ? 'Hexa PopPop! 이용약관 · SimpraWorld'
      : 'Hexa PopPop! Terms of Service · SimpraWorld'
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
        <S.Title>Hexa PopPop! Terms of Service</S.Title>
        <S.Intro>
          The rules for using Hexa PopPop! (the "Game"). By installing or playing the Game,
          you agree to these terms.
        </S.Intro>
      </S.Header>

      <S.Summary>
        <S.SummaryLabel>In short</S.SummaryLabel>
        <S.SummaryText>
          The Game is free to play and supported by ads. You may buy "Remove Ads" once to
          turn ads off permanently on your store account. Play fair, don't modify the Game,
          and understand that it is provided as-is.
        </S.SummaryText>
      </S.Summary>

      <S.Section>
        <S.H2>1. License to Use</S.H2>
        <S.Para>
          We grant you a personal, non-exclusive, non-transferable, revocable license to
          install and play the Game on devices you own or control, for personal and
          non-commercial entertainment only.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>2. Advertising</S.H2>
        <S.List>
          <li>The Game is free and is supported by advertising provided through Google AdMob.</li>
          <li>A banner is shown at the bottom of the screen, and a full-screen ad may appear after a game ends.</li>
          <li>Ad content comes from third parties. We do not endorse and are not responsible for advertised products or services.</li>
          <li>You can remove all ads by purchasing "Remove Ads" (see below).</li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>3. In-App Purchase — "Remove Ads"</S.H2>
        <S.List>
          <li><strong>One-time purchase.</strong> It is not a subscription and does not renew.</li>
          <li><strong>What it does.</strong> It permanently disables banner and full-screen ads in the Game.</li>
          <li><strong>Tied to your store account.</strong> If you reinstall the Game or change devices, use <strong>Restore purchase</strong> in the Game's settings to re-enable it at no extra cost.</li>
          <li><strong>Payment and refunds</strong> are handled by Google Play under its own terms. Refund requests must be made through Google Play, not through us.</li>
          <li>Prices may change for future buyers; this never affects a purchase you have already made.</li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>4. Game Progress</S.H2>
        <S.List>
          <li>Scores, coins, awards, and settings are stored <strong>only on your device</strong>.</li>
          <li>There is no account and no cloud backup. Deleting the Game erases your progress permanently.</li>
          <li>We cannot recover lost progress, including progress lost by uninstalling, clearing app data, or changing devices.</li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>5. Acceptable Use</S.H2>
        <S.Para>You agree not to:</S.Para>
        <S.List>
          <li>Modify, decompile, reverse engineer, or create derivative works from the Game</li>
          <li>Use cheats, automation, modified clients, or emulators to manipulate scores or purchases</li>
          <li>Attempt to obtain paid features without paying, or interfere with ad delivery in a fraudulent way</li>
          <li>Redistribute, resell, or sublicense the Game or its assets</li>
        </S.List>
        <S.Note>
          We may stop providing the Game to anyone who violates these rules.
        </S.Note>
      </S.Section>

      <S.Section>
        <S.H2>6. Intellectual Property</S.H2>
        <S.Para>
          The Game, including its code, artwork, sound, and the "Hexa PopPop!" name and logo,
          is owned by Simpra and protected by copyright and other laws. These terms do not
          transfer any ownership to you.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>7. Updates and Availability</S.H2>
        <S.List>
          <li>We may update the Game to add features, fix bugs, or meet store requirements.</li>
          <li>Features may be changed or removed, and the Game may be discontinued at any time.</li>
          <li>We do not guarantee uninterrupted or error-free operation.</li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>8. Disclaimer and Limitation of Liability</S.H2>
        <S.Para>
          The Game is provided "as is" and "as available", without warranties of any kind,
          whether express or implied. To the fullest extent permitted by law, Simpra is not
          liable for indirect, incidental, or consequential damages, or for lost game
          progress. Nothing in these terms limits rights you have under mandatory consumer
          protection law.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>9. Privacy</S.H2>
        <S.Para>
          Our handling of data is described in the Privacy Policy, which forms part of
          these terms.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>10. Changes to These Terms</S.H2>
        <S.Para>
          We may revise these terms. The revised version will be posted on this page with an
          updated effective date, and continuing to play the Game after that date means you
          accept the changes.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>11. Governing Law</S.H2>
        <S.Para>
          These terms are governed by the laws of the Republic of Korea, without regard to
          conflict-of-law rules. This does not deprive you of the protection of mandatory
          laws of your country of residence.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>12. Contact</S.H2>
        <S.List>
          <li>Operator: Simpra</li>
          <li>Email: <a href="mailto:support@simpraworld.com">support@simpraworld.com</a></li>
          <li>Response time: within 3 business days</li>
        </S.List>
      </S.Section>

      <S.FooterText>Effective date: July 24, 2026</S.FooterText>
    </>
  )
}

function Ko() {
  return (
    <>
      <S.Header>
        <S.Brand href="/">Simpra World</S.Brand>
        <S.Title>Hexa PopPop! 이용약관</S.Title>
        <S.Intro>
          Hexa PopPop!("게임") 이용 규칙입니다. 게임을 설치하거나 플레이하면 본
          약관에 동의하는 것입니다.
        </S.Intro>
      </S.Header>

      <S.Summary>
        <S.SummaryLabel>요약</S.SummaryLabel>
        <S.SummaryText>
          게임은 무료이며 광고로 운영됩니다. "광고 제거"를 한 번 구매하면 스토어
          계정에서 광고를 영구히 끌 수 있습니다. 공정하게 플레이하고, 게임을
          변조하지 마시고, 게임이 있는 그대로 제공됨을 이해해 주세요.
        </S.SummaryText>
      </S.Summary>

      <S.Section>
        <S.H2>1. 이용 라이선스</S.H2>
        <S.Para>
          당사는 여러분이 소유하거나 관리하는 기기에 게임을 설치하고 플레이할 수
          있도록, 개인적·비상업적 오락 목적에 한하여 개인적·비독점적·양도 불가·철회
          가능한 라이선스를 부여합니다.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>2. 광고</S.H2>
        <S.List>
          <li>게임은 무료이며 Google AdMob을 통해 제공되는 광고로 운영됩니다.</li>
          <li>화면 하단에 배너가 표시되고, 게임 종료 후 전면 광고가 나타날 수 있습니다.</li>
          <li>광고 내용은 제3자가 제공합니다. 당사는 광고된 제품·서비스를 보증하지 않으며 책임지지 않습니다.</li>
          <li>"광고 제거"를 구매하면 모든 광고를 없앨 수 있습니다(아래 참조).</li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>3. 인앱 구매 — "광고 제거"</S.H2>
        <S.List>
          <li><strong>1회 구매.</strong> 구독이 아니며 갱신되지 않습니다.</li>
          <li><strong>기능.</strong> 게임 내 배너 및 전면 광고를 영구히 비활성화합니다.</li>
          <li><strong>스토어 계정에 연동.</strong> 게임을 재설치하거나 기기를 바꾸면 게임 설정의 <strong>구매 복원</strong>으로 추가 비용 없이 다시 활성화하세요.</li>
          <li><strong>결제 및 환불</strong>은 Google Play가 자체 약관에 따라 처리합니다. 환불 요청은 당사가 아니라 Google Play를 통해 하셔야 합니다.</li>
          <li>향후 구매자에게는 가격이 변경될 수 있으며, 이미 완료한 구매에는 영향을 주지 않습니다.</li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>4. 게임 진행</S.H2>
        <S.List>
          <li>점수·코인·어워드·설정은 <strong>기기에만</strong> 저장됩니다.</li>
          <li>계정도 클라우드 백업도 없습니다. 게임을 삭제하면 진행 상황이 영구히 지워집니다.</li>
          <li>삭제, 앱 데이터 초기화, 기기 변경 등으로 잃은 진행 상황을 포함해, 분실된 진행 상황은 복구할 수 없습니다.</li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>5. 이용 시 준수사항</S.H2>
        <S.Para>다음 행위를 하지 않기로 동의합니다:</S.Para>
        <S.List>
          <li>게임을 수정·디컴파일·역설계하거나 2차적 저작물을 만드는 행위</li>
          <li>점수나 구매를 조작하기 위해 치트·자동화·변조된 클라이언트·에뮬레이터를 사용하는 행위</li>
          <li>결제 없이 유료 기능을 얻으려 하거나, 부정한 방식으로 광고 전송을 방해하는 행위</li>
          <li>게임 또는 그 자산을 재배포·재판매·재라이선스하는 행위</li>
        </S.List>
        <S.Note>
          당사는 이 규칙을 위반하는 이용자에게 게임 제공을 중단할 수 있습니다.
        </S.Note>
      </S.Section>

      <S.Section>
        <S.H2>6. 지식재산권</S.H2>
        <S.Para>
          코드, 아트워크, 사운드 및 "Hexa PopPop!" 명칭과 로고를 포함한 게임은
          Simpra의 소유이며 저작권 등 법률로 보호됩니다. 본 약관은 어떠한 소유권도
          여러분에게 이전하지 않습니다.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>7. 업데이트 및 제공</S.H2>
        <S.List>
          <li>기능 추가, 버그 수정, 스토어 요구사항 충족을 위해 게임을 업데이트할 수 있습니다.</li>
          <li>기능은 변경되거나 삭제될 수 있으며, 게임은 언제든 중단될 수 있습니다.</li>
          <li>중단 없는 또는 오류 없는 작동을 보장하지 않습니다.</li>
        </S.List>
      </S.Section>

      <S.Section>
        <S.H2>8. 면책 및 책임의 제한</S.H2>
        <S.Para>
          게임은 명시적이든 묵시적이든 어떠한 보증도 없이 "있는 그대로",
          "제공되는 그대로" 제공됩니다. 법이 허용하는 최대 범위에서, Simpra는
          간접·부수적·결과적 손해나 분실된 게임 진행에 대해 책임지지 않습니다. 본
          약관의 어떤 내용도 강행적 소비자 보호법에 따른 여러분의 권리를 제한하지
          않습니다.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>9. 개인정보</S.H2>
        <S.Para>
          당사의 데이터 처리 방식은 개인정보처리방침에 설명되어 있으며, 이는 본
          약관의 일부를 구성합니다.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>10. 약관의 변경</S.H2>
        <S.Para>
          당사는 본 약관을 개정할 수 있습니다. 개정본은 갱신된 시행일과 함께 이
          페이지에 게시되며, 해당 일자 이후 게임을 계속 플레이하면 변경에 동의하는
          것으로 간주됩니다.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>11. 준거법</S.H2>
        <S.Para>
          본 약관은 법률 충돌 규정과 관계없이 대한민국 법률의 적용을 받습니다. 이는
          여러분의 거주 국가의 강행 법률에 따른 보호를 박탈하지 않습니다.
        </S.Para>
      </S.Section>

      <S.Section>
        <S.H2>12. 문의</S.H2>
        <S.List>
          <li>운영자: Simpra</li>
          <li>이메일: <a href="mailto:support@simpraworld.com">support@simpraworld.com</a></li>
          <li>응답 시간: 영업일 기준 3일 이내</li>
        </S.List>
      </S.Section>

      <S.FooterText>시행일: 2026년 7월 24일</S.FooterText>
    </>
  )
}
