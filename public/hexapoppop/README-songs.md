# Hexa PopPop! 원격 곡 매니페스트

게임(Hexa PopPop!)의 음악 목록은 **이 폴더의 `songs.json`을 실시간으로 읽어** 표시된다.
곡을 추가/삭제/수정할 때 **게임 앱 업데이트(재빌드·심사·유저 다운로드)가 전혀 필요 없다.** 여기만 고치고 배포하면 끝.

## 서빙 주소
- 매니페스트: `https://simpraworld.com/hexapoppop/songs.json`
- 곡 파일:    `https://simpraworld.com/hexapoppop/songs/<파일명>.mp3`
- 미리보기 페이지: `https://simpraworld.com/hexapoppop/music.html`

## 곡 추가하는 법 (3단계)
1. mp3를 `public/hexapoppop/songs/` 에 넣는다. (권장: 128kbps 이하, 필요하면 모노 — 용량 절약)
2. `songs.json` 의 `songs` 배열에 항목을 하나 추가한다. (아래 스키마 참고)
3. 사이트 배포: 저장소 루트에서 `npm run deploy`

→ 배포 즉시 게임에서 다음에 음악 화면을 열 때 새 곡이 보인다.

## songs.json 스키마
```json
{
  "version": 1,
  "updated": "2026-07-30",
  "songs": [
    {
      "id": "aurora",          // 필수. 소유(다운로드) 기록의 키 → 한 번 정하면 절대 바꾸지 말 것
      "title": "Aurora",       // 필수. 표시 제목
      "artist": "KSMING",      // 선택. 표시용
      "file": "songs/aurora.mp3", // 필수. songs.json 기준 상대경로
      "size": 2100000,         // 선택. 바이트. 받기 버튼에 "2.1MB" 표시용
      "duration": 132,         // 선택. 초. "2:12" 표시용
      "ad": true               // 선택(기본 true). true=받을 때 리워드 광고, false=무료 다운로드
    }
  ]
}
```

## 규칙 (앱이 안 깨지게)
- **`id`는 영구 불변.** 다운로드 소유기록의 키라 바꾸면 유저가 소유를 잃는다. 곡을 바꾸려면 새 id로.
- **필드는 추가만(additive).** 옛 버전 앱이 모르는 필드는 무시하도록 설계돼 있으니 새 필드는 자유롭게 더해도 되지만, 기존 필드 이름/의미는 바꾸지 말 것.
- **mp3만.** 게임 플레이어는 mp3 오디오만 처리한다. (가사싱크 등 새 기능은 그때만 앱 업데이트 필요)
- 곡이 아주 많아지거나 용량이 커지면 `public/`(git 저장소) 대신 **Cloudflare R2**로 옮기는 걸 검토. 지금 규모는 public 정적 서빙으로 충분(Cloudflare는 전송요금 없음).
