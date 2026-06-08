import * as S from './Dayflip.styles'

const SCREENSHOTS = [
  '/dayflip/screenshot_01.jpg',
  '/dayflip/screenshot_02.jpg',
  '/dayflip/screenshot_03.jpg',
  '/dayflip/screenshot_04.jpg',
  '/dayflip/screenshot_05.jpg',
  '/dayflip/screenshot_06.jpg',
  '/dayflip/screenshot_07.jpg',
]

const APP_ICON = '/dayflip/icon.png'

export default function Dayflip() {
  return (
    <S.Page>
      {/* Header: 아이콘 + 제목 + 메타 + 설치 */}
      <S.Header>
        <S.HeaderLeft>
          <S.AppTitle>DayFlip — AI 감성 다이어리</S.AppTitle>
          <S.Developer>
            SIMPRAWORLD
            <S.AdBadge>· 광고 포함 · 인앱 구매</S.AdBadge>
          </S.Developer>

          <S.MetaRow>
            <S.MetaItem>
              <S.MetaValue><S.Star>★</S.Star> 5점 희망</S.MetaValue>
              <S.MetaLabel>리뷰 (체험판)</S.MetaLabel>
            </S.MetaItem>
            <S.MetaItem>
              <S.MetaValue>Beta</S.MetaValue>
              <S.MetaLabel>사전 체험판</S.MetaLabel>
            </S.MetaItem>
            <S.MetaItem>
              <S.MetaValue>3세 이상</S.MetaValue>
              <S.MetaLabel>전체 이용가</S.MetaLabel>
            </S.MetaItem>
          </S.MetaRow>

          <S.ActionRow>
            <S.InstallBtn as="button" type="button" disabled aria-disabled="true">
              사전 체험 진행중이에요!
            </S.InstallBtn>
          </S.ActionRow>

          <S.DeviceNote>* 현재 Google Play 사전 체험판으로 운영 중입니다. 검색에는 노출되지 않으며, 체험을 희망하시면 support@simpra.com 으로 문의 부탁드립니다.</S.DeviceNote>
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
          <strong>매일 하루를 단정하게 기록하고 싶으신가요?</strong>{'\n\n'}
          DayFlip은 AI가 함께 쓰는 감성 다이어리입니다. 정해진 시간마다 오는 질문, 자유로운 생각정리를 입력하면 AI가 그날의 분위기를 정리해주고, 정리시간이 되면 모아진 답변으로 오늘 하루의 일기장을 완성해줍니다.{'\n\n'}
          <strong>주요 기능</strong>{'\n'}
          · AI가 질문 및 답변을 받아 일기로 작성{'\n'}
          · 캘린더에서 일일메모와 기간별 일정 정리{'\n'}
          · 노트에 알림 기능으로 편리하게{'\n'}
          · 안전한 클라우드 백업{'\n'}
        </S.AppDesc>

        <S.TagRow>
          <S.Chip>#다이어리</S.Chip>
          <S.Chip>#AI 일기</S.Chip>
          <S.Chip>#감성</S.Chip>
          <S.Chip>#캘린더</S.Chip>
          <S.Chip>#기분 기록</S.Chip>
        </S.TagRow>

        <S.UpdateDate>업데이트 날짜: 2026. 6. 6.</S.UpdateDate>
      </S.Section>

      {/* 데이터 보안 */}
      <S.Section>
        <S.SectionTitle>데이터 보안</S.SectionTitle>
        <S.SafetyList>
          <S.SafetyItem>
            <S.SafetyIcon>🔒</S.SafetyIcon>
            <S.SafetyText>
              <S.SafetyLabel>전송 중 데이터 암호화</S.SafetyLabel>
              <S.SafetyDesc>모든 통신은 HTTPS로 암호화되어 전송됩니다.</S.SafetyDesc>
            </S.SafetyText>
          </S.SafetyItem>
          <S.SafetyItem>
            <S.SafetyIcon>📝</S.SafetyIcon>
            <S.SafetyText>
              <S.SafetyLabel>일기 데이터는 본인만 열람 가능</S.SafetyLabel>
              <S.SafetyDesc>작성한 일기는 사용자 계정으로 암호화되어 저장됩니다.</S.SafetyDesc>
            </S.SafetyText>
          </S.SafetyItem>
          <S.SafetyItem>
            <S.SafetyIcon>🗑</S.SafetyIcon>
            <S.SafetyText>
              <S.SafetyLabel>계정 삭제 시 30일 후 데이터 삭제</S.SafetyLabel>
              <S.SafetyDesc>계정을 삭제하면 30일 후 작성한 모든 일기와 개인 정보가 영구 삭제됩니다. 복구를 원하시면 30일 이전에 로그인하시면 탈퇴가 철회됩니다.</S.SafetyDesc>
            </S.SafetyText>
          </S.SafetyItem>
        </S.SafetyList>
      </S.Section>

      {/* 새로운 기능 */}
      <S.Section>
        <S.SectionTitle>새로운 기능</S.SectionTitle>
        <S.AppDesc>
          · AI 일기 다듬기 정확도 개선{'\n'}
          · 캘린더에서 사진 미리보기 추가{'\n'}
          · 잠금 모드(PIN) 안정성 개선{'\n'}
          · 잔잔한 버그 수정
        </S.AppDesc>
      </S.Section>

      {/* 앱 정보 박스 */}
      <S.Section>
        <S.SectionTitle>정보</S.SectionTitle>
        <S.InfoGrid>
          <S.InfoBox>
            <S.InfoTitle>VERSION</S.InfoTitle>
            <S.InfoValue>1.1.1 (Beta)</S.InfoValue>
            <S.InfoSub>사전 체험판</S.InfoSub>
          </S.InfoBox>
          <S.InfoBox>
            <S.InfoTitle>AGE RATING</S.InfoTitle>
            <S.InfoValue>3세 이상</S.InfoValue>
            <S.InfoSub>전체 이용가</S.InfoSub>
          </S.InfoBox>
          <S.InfoBox>
            <S.InfoTitle>CATEGORY</S.InfoTitle>
            <S.InfoValue>라이프스타일</S.InfoValue>
          </S.InfoBox>
          <S.InfoBox>
            <S.InfoTitle>DEVELOPER</S.InfoTitle>
            <S.InfoValue>SimpraWorld</S.InfoValue>
            <S.InfoSub>croissen214@gmail.com</S.InfoSub>
          </S.InfoBox>
          <S.InfoBoxLink href="/dayflip/policy">
            <S.InfoTitle>PRIVACY</S.InfoTitle>
            <S.InfoValue>개인정보처리방침 →</S.InfoValue>
            <S.InfoSub>/dayflip/policy</S.InfoSub>
          </S.InfoBoxLink>
          <S.InfoBox>
            <S.InfoTitle>SUPPORT</S.InfoTitle>
            <S.InfoValue>support@simpra.com</S.InfoValue>
            <S.InfoSub>문의/피드백</S.InfoSub>
          </S.InfoBox>
        </S.InfoGrid>
      </S.Section>
    </S.Page>
  )
}
