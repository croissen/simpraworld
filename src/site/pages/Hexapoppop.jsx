import { useEffect } from 'react'
import * as S from './Dayflip.styles'

const SCREENSHOTS = [
  '/hexapoppop/screenshot_01.png',
  '/hexapoppop/screenshot_02.png',
  '/hexapoppop/screenshot_03.png',
  '/hexapoppop/screenshot_04.png',
]

const APP_ICON = '/hexapoppop/icon.png'

export default function Hexapoppop() {
  useEffect(() => {
    document.title = 'Hexa PopPop! · SimpraWorld'
  }, [])

  return (
    <S.Page>
      {/* Header: 아이콘 + 제목 + 메타 + 설치 */}
      <S.Header>
        <S.HeaderLeft>
          <S.AppTitle>Hexa PopPop! — 헥사 블록 퍼즐</S.AppTitle>
          <S.Developer>
            SIMPRAWORLD
            <S.AdBadge>· 광고 포함 · 인앱 구매</S.AdBadge>
          </S.Developer>

          <S.MetaRow>
            <S.MetaItem>
              <S.MetaValue><S.Star>★</S.Star> 5점 희망</S.MetaValue>
              <S.MetaLabel>리뷰 (테스트)</S.MetaLabel>
            </S.MetaItem>
            <S.MetaItem>
              <S.MetaValue>Beta</S.MetaValue>
              <S.MetaLabel>비공개 테스트</S.MetaLabel>
            </S.MetaItem>
            <S.MetaItem>
              <S.MetaValue>퍼즐</S.MetaValue>
              <S.MetaLabel>게임</S.MetaLabel>
            </S.MetaItem>
          </S.MetaRow>

          <S.ActionRow>
            <S.InstallBtn as="button" type="button" disabled aria-disabled="true">
              비공개 테스트 진행중이에요!
            </S.InstallBtn>
          </S.ActionRow>

          <S.DeviceNote>* 현재 Google Play 비공개 테스트로 운영 중입니다. 검색에는 노출되지 않으며, 테스트 참여를 희망하시면 support@simpraworld.com 으로 문의 부탁드립니다.</S.DeviceNote>
        </S.HeaderLeft>

        <S.HeaderRight>
          <S.AppIcon $src={APP_ICON}>APP ICON</S.AppIcon>
        </S.HeaderRight>
      </S.Header>

      {/* Screenshots */}
      <S.Screenshots>
        {SCREENSHOTS.map((src, i) => (
          <S.Screenshot key={i} $src={src}>
            {!src && `SCREEN ${String(i + 1).padStart(2, '0')}`}
          </S.Screenshot>
        ))}
      </S.Screenshots>

      {/* 앱 정보 */}
      <S.Section>
        <S.SectionTitle>앱 정보</S.SectionTitle>
        <S.AppDesc>
          <strong>한 손으로 즐기는 시원한 헥사 블록 퍼즐!</strong>{'\n\n'}
          육각형 블록을 끼워 줄을 완성하면 팡! 하고 터집니다. 계정도, 로그인도 필요 없이 바로 시작하세요. 콤보를 길게 이어갈수록 점수가 제곱으로 폭발하고, 같은 색으로 보드를 싹 비우면 화면이 시원하게 와이프됩니다.{'\n\n'}
          <strong>주요 기능</strong>{'\n'}
          · 클래식 모드 + 타임어택 모드{'\n'}
          · 콤보 제곱 점수 · 보석 수집 & 별(올클리어) 시스템{'\n'}
          · 12종 어워드 · 5등급 메달로 도전 과제{'\n'}
          · 배경·이펙트·음악을 골라 담는 테마 인벤토리{'\n'}
          · 내 사진을 배경으로(기기에만 저장){'\n'}
          · 매일 출석 체크인 보상 · 햅틱 진동 · 배경 음악{'\n'}
        </S.AppDesc>

        <S.TagRow>
          <S.Chip>#헥사블록</S.Chip>
          <S.Chip>#퍼즐</S.Chip>
          <S.Chip>#블록퍼즐</S.Chip>
          <S.Chip>#타임어택</S.Chip>
          <S.Chip>#캐주얼게임</S.Chip>
        </S.TagRow>

        <S.UpdateDate>업데이트 날짜: 2026. 7. 28.</S.UpdateDate>
      </S.Section>

      {/* 데이터 보안 */}
      <S.Section>
        <S.SectionTitle>데이터 보안</S.SectionTitle>
        <S.SafetyList>
          <S.SafetyItem>
            <S.SafetyIcon>📴</S.SafetyIcon>
            <S.SafetyText>
              <S.SafetyLabel>계정 없음 · 진행상황은 기기에만 저장</S.SafetyLabel>
              <S.SafetyDesc>점수·어워드·설정은 오직 이 기기에만 저장되며, 서버로 올라가지 않습니다. 앱을 삭제하면 함께 사라집니다.</S.SafetyDesc>
            </S.SafetyText>
          </S.SafetyItem>
          <S.SafetyItem>
            <S.SafetyIcon>🖼</S.SafetyIcon>
            <S.SafetyText>
              <S.SafetyLabel>커스텀 배경 사진은 기기 내 저장</S.SafetyLabel>
              <S.SafetyDesc>배경으로 고른 사진은 이 기기에만 저장되며 업로드·공유·백업되지 않습니다.</S.SafetyDesc>
            </S.SafetyText>
          </S.SafetyItem>
          <S.SafetyItem>
            <S.SafetyIcon>🔒</S.SafetyIcon>
            <S.SafetyText>
              <S.SafetyLabel>전송 중 데이터 암호화</S.SafetyLabel>
              <S.SafetyDesc>광고·결제 등 외부 서비스와의 모든 통신은 HTTPS로 암호화됩니다. 광고 식별자는 Google AdMob의 광고 제공에만 사용됩니다.</S.SafetyDesc>
            </S.SafetyText>
          </S.SafetyItem>
        </S.SafetyList>
      </S.Section>

      {/* 새로운 기능 */}
      <S.Section>
        <S.SectionTitle>새로운 기능</S.SectionTitle>
        <S.AppDesc>
          · 보석 수집 & 별(올클리어) 시스템 추가{'\n'}
          · 어워드 12종 · 5등급 메달로 전면 개편{'\n'}
          · 배경·이펙트·음악 테마 인벤토리 추가{'\n'}
          · 배경 음악 · 햅틱 진동 반영{'\n'}
          · 레이아웃 정리 및 잔잔한 버그 수정
        </S.AppDesc>
      </S.Section>

      {/* 앱 정보 박스 */}
      <S.Section>
        <S.SectionTitle>정보</S.SectionTitle>
        <S.InfoGrid>
          <S.InfoBox>
            <S.InfoTitle>VERSION</S.InfoTitle>
            <S.InfoValue>1.0.0 (Beta)</S.InfoValue>
            <S.InfoSub>비공개 테스트</S.InfoSub>
          </S.InfoBox>
          <S.InfoBox>
            <S.InfoTitle>AGE RATING</S.InfoTitle>
            <S.InfoValue>만 13세 이상</S.InfoValue>
            <S.InfoSub>청소년 이용가</S.InfoSub>
          </S.InfoBox>
          <S.InfoBox>
            <S.InfoTitle>CATEGORY</S.InfoTitle>
            <S.InfoValue>게임 · 퍼즐</S.InfoValue>
          </S.InfoBox>
          <S.InfoBox>
            <S.InfoTitle>DEVELOPER</S.InfoTitle>
            <S.InfoValue>SimpraWorld</S.InfoValue>
            <S.InfoSub>support@simpraworld.com</S.InfoSub>
          </S.InfoBox>
          <S.InfoBoxLink href="/hexapoppop/policy">
            <S.InfoTitle>PRIVACY</S.InfoTitle>
            <S.InfoValue>개인정보처리방침 →</S.InfoValue>
            <S.InfoSub>/hexapoppop/policy</S.InfoSub>
          </S.InfoBoxLink>
          <S.InfoBoxLink href="/hexapoppop/terms">
            <S.InfoTitle>TERMS</S.InfoTitle>
            <S.InfoValue>이용약관 →</S.InfoValue>
            <S.InfoSub>/hexapoppop/terms</S.InfoSub>
          </S.InfoBoxLink>
          <S.InfoBox>
            <S.InfoTitle>SUPPORT</S.InfoTitle>
            <S.InfoValue>support@simpraworld.com</S.InfoValue>
            <S.InfoSub>문의/피드백</S.InfoSub>
          </S.InfoBox>
        </S.InfoGrid>
      </S.Section>
    </S.Page>
  )
}
