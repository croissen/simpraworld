# SimpraWorld — 작업 핸드오프 (다음 세션은 이거 먼저 정독)

> 이 파일은 **새 채팅방이 이거 하나 읽고 바로 정신차리고 작업**하게 하려고 만든 문서다.
> 대충 읽지 마라. 끝까지 읽고, 기존 코드를 재사용하고, 같은 걸 다시 구현하지 마라.

---

## 0. 절대 규칙 (작업하기 전에 머리에 박을 것)

> 🚨 **치명적 — 토큰 절약**: 코드를 읽고 쓸 때 **꼭 필요한 부분만** 읽어라. 큰 파일(InfiniteCanvas.tsx, store.ts, earthImage.ts 등)을 통째로 Read 하지 말고 Grep/offset으로 해당 구간만. 큰 에러 로그·스크린샷·base64를 컨텍스트에 끌어오지 마라. 답변은 짧게(불필요한 표 X). 대화가 길어질수록 매 턴 비용이 눈덩이처럼 커진다. 새 세션은 이 파일만 읽고 바로 작업.

1. **투명하게 작업해라.** 지금 뭘 하는지 단계별로 사용자에게 알리고, 에러·막힘·불확실한 점은 **터지기 직전까지 숨기지 말고 즉시** 보고해라. 조용히 재시도 반복 금지.
2. **코드 비대화/중복 절대 금지.** 300줄로 돌아가면 300줄로 둬라. 길어진다고 좋아지는 게 아니면 늘리지 마라. **자기가 만든 코드를 어디 쓰는지 헷갈려서 같은 로직을 또 구현하는 짓**을 하지 마라. → 그래서 이 파일과 기존 코드를 **정독**하라는 거다.
3. **파급효과를 스스로 먼저 찾아라.** 하나의 로직을 건드리면 그와 엮인 다른 로직에서 자주 터진다. 사용자가 말하기 전에 수정한 곳과 연결된 부분을 직접 점검해라. (특히 `store.ts`의 상태 ↔ `InfiniteCanvas.tsx`의 렌더/입력 ↔ UI 컴포넌트는 강하게 엮여 있다.)
4. **로컬 단계에선 오류가 많이 안 나는 게 정상이다.** 펑펑 터지면 집중을 안 한 거다. **한 번 만들 때 제대로** 만들어라. (서버 연결·고도화 이후엔 오류가 늘 수 있지만 지금은 순수 로컬이다.)
5. **화면이 깨지면 안 된다.** 스타일 규칙은 아래 2번 섹션. 핵심: `sp`/`dp` 같은 앱 단위 금지, **여백·거리는 % 위주**(반응형), `px`는 고정 디테일에만.

---

## 1. 프로젝트가 뭔가 (한 문단)

**SimpraWorld** = 노트앱도 게임도 관리툴도 아닌 **무한 캔버스 샌드박스**. 폴더/파일(노드)이 무한 캔버스 위 좌표에 자유 배치되고, 폴더를 더블클릭하면 그 안으로 들어가 **또 하나의 캔버스 세계**가 펼쳐진다(구글어스 줌인 느낌). 피그마처럼 노드를 **컴포넌트(템플릿+필드)화** 할 수 있어 쓰는 사람에 따라 용도가 갈린다(재고관리/인맥CRM/피파 스쿼드/조직도 등). 마인크래프트처럼 자유, 컬러노트처럼 심플. 원본 기획서: `C:\Users\i\Desktop\캡\두번째프로젝트.txt`.

**브랜드/앱 이름 = SimpraWorld** (구 이름 Simpranet에서 승격). 공유 파일 확장자 = `.smk`.

---

## 2. 스타일 규칙 (화면 안 깨지게 — 매우 중요)

- **styled-components** 사용. (CSS 파일/클래스 방식 금지. 이미 styles.css는 제거됨.)
- 스타일은 컴포넌트별 **별도 파일** `XXX.styles.ts` 에 styled로 export.
- 사용처에서 `import * as S from './XXX.styles'` → `<S.Inspector>` 형태로 사용.
- active/토글 상태는 **transient prop**(`$on` 처럼 `$` 접두)으로. 예: `<S.Chip $on={선택됨}>`.
- **단위:**
  - `sp`·`dp`(안드/RN 단위) **절대 금지**.
  - **반응형 레이아웃·여백·거리는 % 위주**(필요시 vw/vh/rem). 화면 크기 바뀌어도 안 깨지게.
  - `px`는 테두리/작은 radius 같은 "고정돼야 자연스러운 디테일"에만.
  - **단, position:fixed 고정 패널의 폭(예: 인스펙터 260px)은 px가 적절하다.** 무지성으로 전부 %로 바꾸면 오히려 깨진다. **판단해서** 적용.
- ⚠️ **styled-components v6 + Vite 함정(이미 해결됨, 다시 건드리지 마):** React 사본 중복으로 "Invalid hook call" 이 났었다. `vite.config.ts`에 `resolve.dedupe: ['react','react-dom','styled-components']` + `optimizeDeps.include` 로 고쳤다. 이 설정 지우지 마라.

---

## 3. 기술 스택 & 멀티플랫폼 전략

- **웹 코어 1개**(지금 이거) = React + TypeScript + Vite + **Canvas 2D 직접 렌더**.
  - 렌더는 DOM이 아니라 **Canvas 2D**다 (iOS 100% 호환 + 성능). 캔버스 위 노드는 React 컴포넌트가 아니라 ctx로 직접 그린다.
- 나중에 이 코어를 그대로 감싼다:
  - **PC** → **Tauri** (.exe 설치형, 진짜 파일시스템)
  - **모바일(안드/아이폰)** → **Capacitor** (.apk/.ipa, 진짜 로컬저장·.smk 파일연결)
  - **웹** → 그대로 배포 (`app.simpraworld.com` 서브도메인 예정)
- **RN 아님.** 캔버스 엔진이 심장이라 웹 기술이 압도적으로 유리해서 일부러 웹으로 간다.
- 배포: 기존 포트폴리오(`thinking/portfolio/simpraworld`, Cloudflare 배포 중)와 **별도 코드/별도 배포**. 도메인에서만 링크로 연결. **합치지 마라.**

---

## 4. 저장 & 클라우드 대비 (지금부터 지켜야 나중이 공짜)

- 지금은 **완전 로컬**: 웹은 **IndexedDB**(`idb-keyval`)에 자동저장. 오프라인 동작.
- **클라우드 대비 3원칙(데이터 모델이 이미 지키고 있음 — 깨지 마라):**
  1. `user_id` 자리를 null로 비워둠 → 나중에 로그인 붙이면 채우기만.
  2. **구조(JSON)와 사진(asset) 분리** → 나중에 "구조 무료동기화 / 사진 과금" 스위치 가능.
  3. 모든 노드에 `id` + `updatedAt` → 나중에 동기화(뭐 바뀌었나 비교) 가능.
- **`.smk` = ZIP(`data.json` + `images/`)**. 불러올 때 **id 전부 remap**(충돌 방지), 좌표는 상대좌표 기준이라 원하는 위치에 삽입 가능.

---

## 5. 파일 지도 (어디에 뭐가 있는지 — 다시 구현하지 말고 여기서 찾아 써라)

```
simpraworld/
  HANDOFF.md                  ← 이 파일
  vite.config.ts              ← dedupe 설정 있음(건드리지 마)
  index.html                  ← title: SimpraWorld, iOS viewport(user-scalable=no)
  src/
    main.tsx                  ← 엔트리 (styles.css import 없음. GlobalStyle은 App에서 렌더)
    global.styles.ts          ← createGlobalStyle (html/body/#root 리셋)
    App.tsx / App.styles.ts   ← 셸: 상단바(브랜드/Breadcrumb/Toolbar) + Canvas + Inspector + Hint
    types.ts                  ← 데이터 모델(SNode/SEdge/Template/Asset/SimpraWorldDoc) + uid()
    store.ts                  ← ★상태 + 모든 mutation + IndexedDB 영속화. 앱의 두뇌.
    sampleWorld.ts            ← 온보딩 예시 세계(우리집/친구들/냉장고…)
    smk.ts                    ← .smk 내보내기/불러오기(JSZip) + 다운로드/파일선택 헬퍼
    image.ts                  ← 사진 → 512px 썸네일(thumb) + 원본(original) 분리
    canvas/
      InfiniteCanvas.tsx      ← ★캔버스 렌더 루프 + pan/zoom/pinch + 히트테스트 + 드래그
      InfiniteCanvas.styles.ts← <S.Canvas> (touch-action:none 등)
    ui/
      Toolbar.tsx/.styles.ts      ← +폴더 +메모, 내보내기/추가/열기
      Inspector.tsx/.styles.ts    ← 선택 노드 편집(이름/모양/색/사진/뷰/컴포넌트/삭제)
      Breadcrumb.tsx/.styles.ts   ← 🌍 내 세계 › 폴더 › ... 경로
```

---

## 6. 핵심 설계 결정 (이걸 모르고 건드리면 터진다)

- **카메라(pan/zoom)는 React 상태가 아니다.** `store.ts`의 `setCamera()`는 React 재렌더를 일으키지 않고 `markDirty()`만 한다. 이래야 드래그/줌이 부드럽다(60fps). **카메라를 React state로 바꾸지 마라 — 버벅인다.**
- **렌더는 dirty일 때만.** `InfiniteCanvas`는 rAF 루프에서 `consumeDirty()`가 true일 때만 다시 그린다(배터리/iOS 친화). 노드/카메라 바뀌면 `markDirty()`가 호출돼야 화면이 갱신된다.
- **UI(React)는 `useSyncExternalStore`로 store 구독.** 노드/선택/공간 변경 시에만 `changed()`가 version을 올려 UI를 재렌더. 카메라는 제외(위 참고).
- **성능 3종(이미 구현):** ① 뷰포트 컬링(보이는 노드만 그림) ② LOD(zoom<0.18 → 점, <0.4 → 도형, ≥0.4 → 썸네일) ③ 이미지 캐시(`imgCache`). "1억 노드"는 비유다 — 수만~수십만에서 부드러우면 OK. 더 키우려면 공간인덱스(quadtree) 추가.
- **폴더 진입 = 공간 전환.** 각 폴더 id가 하나의 "공간". 노드의 `parent`가 그 폴더 id면 그 안에 있는 것. `currentSpace`가 현재 보는 공간. 최상위는 `parent=null`.
- **드래그 중 좌표는 `moveNodeLive()`**(React 안 거침) → 손 떼면 `commitMove()`(여기서 저장/재렌더). 이 분리를 유지해라.

---

## 7. 지금까지 구현된 것 (v0.1, 동작 확인됨)

무한 캔버스(pan/zoom/휠/핀치, Pointer 이벤트로 터치 통합) · 폴더 더블클릭 진입 + 브레드크럼(스택) · 노드 생성/드래그/선택/삭제 · 도형 + 색 · 사진 업로드(512 썸네일) · **노트 더블클릭=본문 팝업 편집(NoteEditor)** · **컴포넌트(재사용 노드 스냅샷)** · **다중선택(shift클릭/Ctrl+A/마퀴) + 일괄 이동·복사·삭제** · **Ctrl+C/V(독립복제) · 우클릭 Unique copy(결속복제)** · **엣지=Ctrl+Alt 줄잇기** · IndexedDB 자동저장 · **.smk 폴더단위 내보내기/가져오기**.

**입력 모델(2026-06-18 대개편):** 좌드래그 빈곳=**영역선택(마퀴, 걸치면 선택)**, **Space/휠버튼 드래그=팬**, 휠=줌. **shift+클릭=다중토글, Ctrl+A=현재공간 전체**. 선택은 store에서 **Set**(`selection`). 다중선택 시 우측은 `MultiInspector`(Position 그룹이동/Copy/Delete만). 드래그/방향키=선택 일괄 이동. **Ctrl+C=독립복제 / 우클릭 Unique copy=결속복제(같은 노드 공유→편집·삭제 전파) / Paste here=커서위치, Ctrl+V=계단오프셋**. 클립보드는 `{mode:'copy'|'unique'}`. **Ctrl+Alt+클릭/드래그=줄잇기**(소스=단일선택, 클릭=토글/박스=다수, `toggleEdge`/`linkNodes`). 우클릭 컨텍스트메뉴=`ui/ContextMenu`.

**노트/메모(NoteEditor):** memo 노드 더블클릭 → 팝업(`ui/NoteEditor`)에서 제목+본문(`SNode.body`) 편집. **X버튼/Esc로만 닫힘**(바깥 클릭·텍스트선택 중 바깥 release로 안 닫힘 — 사용자 요구). 배경은 적당한 오프화이트 종이(#f3f1ea, 순백 금지). store UI상태 `noteEditorNodeId`+`openNote/closeNote`, App이 렌더.

**컴포넌트 = "재사용할 노드(폴더·메모)를 내용째 저장한 스냅샷"** (⚠️ 옛 '템플릿+필드 스키마' 방식은 사용자가 "필드 추가가 아니다"라며 거부 → **2026-06-17 전부 제거**. `Template/FieldDef/templateId/fields` 삭제됨. 다시 만들지 마.). `ComponentDef{id,name,doc,updatedAt}` where doc=그 노드의 독립 미니문서(폴더면 `exportFolderDoc`로 하위 전체, 메모면 단일노드). store `doc.components[]`. **인스펙터 Name 줄 우측 `+ Component` 버튼**(누르면 연초록 'Complete' 1.1s 후 복귀)=현재 노드 저장(`saveNodeAsComponent`). Toolbar **Components** 버튼=좌측 패널(`ui/ComponentsPanel`): 항목 **클릭=미리보기 카드**, **더블클릭=현재 공간에 복제 생성**(`stampComponent`→`placeDoc`, id remap, 계단식 오프셋), 항목별 **⤓ 다운로드=`{name}_comp.smk`**(smk 재사용), 헤더 **⤒ Import**=`_comp.smk`를 목록에 추가(`addComponentDoc`).

**구조(중요):** 최상위 = **My Universe**(space=null) → 기본 폴더 **SimpraWorld**(earth.png 이미지, 0,0, 100×100, =첫 "세계") → 그 안에 샘플(우리집/친구들…). 브레드크럼 루트 "🌌 My Universe". DB키 `simpraworld:doc:v7`. earth 이미지는 `src/earthImage.ts`(base64). 탑뷰/평면뷰(view/background) 제거됨. **UI 전부 영어**(글로벌): 인스펙터 Name(+우측 `+ Component` 버튼)/Position(X·Y)/Dimensions(W·H+🔓, 피그마식)/Shape/Color/Image, Toolbar +Folder/+Note/Components/Export/Import, 샘플도 영어(기본 노드명 New folder/New note). 코드 주석만 한글. ⚠️ **store.ts 저장 시 Vite 전체 리로드** → DB키 올린 직후 미완성 샘플로 새 키가 생성·오염되는 함정 반복. DB키/샘플 변경은 **서버 정지→코드 완성→빌드→재시작** 순서(또는 IndexedDB 키 삭제 후 reload).

**.smk (폴더 단위):** 내보내기 = **선택한 폴더만**(`exportFolderDoc`: 그 폴더가 루트로 재구성, 미선택 시 alert) → `saveSmk`가 "다른 이름으로 저장" 다이얼로그(`showSaveFilePicker`, 파일명+위치; 미지원/모바일은 다운로드+위치 안내). ⚠️ 다이얼로그는 **클릭 직후** 호출돼야 해서 zip 생성(makeBlob)보다 **먼저** 연다(gesture 유지). 가져오기 = `importWorld`로 **My Universe 최상위**에 추가, 루트 폴더명 충돌 시 **"이름(1)"**.

**다대다 참조 구조(중요):** node=데이터 원본 1개, **placement=소속+좌표 관계테이블**(한 노드가 여러 placement → 여러 공간 동시 존재). 캔버스엔 `SpaceItem`(placement+node 조인) 넘김. 선택/드래그=placement id, 진입/엣지=node id. 네비=`spacePath` 스택. 인스펙터 "🔗 N곳에 있음"+`여기서만 빼기`(removePlacement)/`완전 삭제`(deleteNode), 순환방지 `isCyclic`/`canNestInto`.

**정리=드래그, 결속=Unique copy (⚠️ 옛 Alt드래그 참조는 제거됨 — 다시 만들지 마):** 노드를 폴더 위로 끌어 **0.5초(DWELL_MS) 머물면** 초록 강조('Move here') → 드래그=그 폴더로 **이동**(`movePlacementToSpace`, 소속만 변경, 참조 아님). **여러 공간에 같은 걸 두려면**: 독립이면 **컴포넌트**(스냅샷, 따로 편집), 결속이면 **우클릭 Unique copy → Paste**(같은 노드 공유 placement → 값/사진/삭제 전파). 즉 다대다 placement 공유 메커니즘은 그대로지만 **노출은 Unique copy로만**. ⚠️ 옛 검색형 ReferencePicker/Alt드래그 참조 UX 부활 금지. 아직 없음: 드래그로 폴더 **밖으로** 빼기, 모바일(Space/Alt 없음 → 롱프레스 등). 향후.

---

## 8. 아직 안 한 것 / 다음 작업 후보 (우선순위 순)

1. **Space/World 개념 반영.** 루트 "내 세계" → **"Space(우주)"** 로, **World(세계)=최상위 폴더**(새 타입 안 만듦, 폴더에 의미만 부여). `.smk` "세계로 추가"(폴더로 감싸 불러오기) + "일부만 추출"(선택 영역만 export) 옵션.
2. **애니메이션 "살아있는 세계"** (강력한 차별점 후보). 노드 이동/궤도. **설계 합의됨:** 앵커(placement.x/y=저장 고정좌표) + `anim` 정의 분리 → 렌더 시 `앵커+계산오프셋`으로 합성(**라이브 좌표 저장 안 함=드리프트 방지**), 기본 off, 토글로 실행. 이동 시퀀스(steps: dx/dy/duration, count:1·N·무한, easing) + 궤도(center노드/radius/speed/axis기울기/방향). 애니 켜진 동안만 연속 redraw(아니면 dirty-only 유지).
3. **킬러 후크 미정.** 첫 출시를 뭘로 띄울지(스쿼드메이커/재고/인맥CRM 등) 아직 안 정함. 사용자와 정해야 함.
4. CSV/엑셀 내보내기(컴포넌트=시트별 테이블 + 관계 시트). 모델이 이미 테이블형이라 쉬움.
5. 폴더 복사(참조 vs 깊은복사 구분) · 평면(side)뷰 실제 배경 렌더 · 배경 커스텀(잔디/격자/단색).
6. 공간인덱스(대량 노드) · 아이콘팩 공유 · 커뮤니티(.smk) · Tauri/Capacitor 래핑.
7. (사소·나중) **여러 탭 동시 사용 시 IndexedDB 저장 덮어쓰기** — 크로스탭 동기화 필요. 단일 탭은 문제없음.

---

## 9. 실행 방법

```
cd C:\Users\i\Desktop\thinking\simpraworld
npm run dev      # → http://localhost:1123  (회사 시스템이 5173 써서 1123으로 고정)
npm run build    # 프로덕션 빌드(에러 체크용)
```
(이 PC에 Node 22 / npm 10 설치돼 있음.)

---

## 10. 시작 전 체크리스트

- [ ] 이 파일 + 건드릴 영역의 기존 코드를 **정독**했는가? (대충 읽고 재구현 금지)
- [ ] 이미 있는 함수/컴포넌트를 **재사용**하는가? (중복 구현 아닌가)
- [ ] 수정이 **엮인 로직**(store↔canvas↔ui)에 영향 주는지 직접 점검했는가?
- [ ] 스타일은 styled-components + `import * as S` + 여백 % 위주인가?
- [ ] 코드가 불필요하게 길어지지 않았는가?
- [ ] 작업 단계와 막힘을 사용자에게 투명하게 알렸는가?
