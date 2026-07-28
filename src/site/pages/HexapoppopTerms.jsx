import { useEffect } from 'react'
import * as S from './DayflipPolicy.styles'

export default function HexapoppopTerms() {
  useEffect(() => {
    document.title = 'Hexa PopPop! Terms of Service · SimpraWorld'
  }, [])

  return (
    <S.Wrap>
      <S.Container>
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
      </S.Container>
    </S.Wrap>
  )
}
