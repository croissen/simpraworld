import { useEffect } from 'react'
import * as S from './DayflipPolicy.styles'

export default function HexapoppopPolicy() {
  useEffect(() => {
    document.title = 'Hexa PopPop! Privacy Policy · SimpraWorld'
  }, [])

  return (
    <S.Wrap>
      <S.Container>
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
      </S.Container>
    </S.Wrap>
  )
}
