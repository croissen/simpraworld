// SimpraWorld 데이터 모델
// 설계 원칙(클라우드 대비):
//  1) user_id 자리를 비워둠 → 나중에 로그인 붙이면 채우기만
//  2) 구조(JSON)와 사진(asset)을 분리 → "구조 무료동기화 / 사진 과금" 스위치 가능
//  3) 모든 노드에 id + updatedAt → 나중에 동기화(뭐가 바뀌었나) 가능
//  4) 소속+좌표는 노드에서 분리해 placements(관계 테이블)로 → 한 노드가 여러 공간에
//     동시에 존재 가능(다대다 참조). node=데이터(원본 1개), placement=어디에 어떤 좌표로 놓였나.

export type NodeType = 'folder' | 'memo' | 'photo' | 'text' | 'shape' // text=자유 텍스트, shape=노트 없는 순수 도형(선·사각형 등)
export type Shape = 'rect' | 'circle' | 'triangle' | 'hexagon' | 'image' | 'line'

/**
 * Frame = 공간(폴더/루트)마다 저장하는 "기준 화면 영역"(월드 사각형).
 * 좌표·줌이 아니라 영역으로 저장 → 기기 화면 비율이 달라도 이 영역이 화면에
 * 꽉 차게(contain) 중앙에 들어오도록 줌이 자동 계산됨. 가로 넓은 PC에서 딴 프레임을
 * 세로 긴 모바일로 보면 좌우가, 반대면 위아래가 비는 식(레터박스).
 */
export interface Frame {
  cx: number // 영역 중심 월드 X
  cy: number // 영역 중심 월드 Y
  w: number // 영역 가로(월드 단위)
  h: number // 영역 세로(월드 단위)
}

/**
 * 컴포넌트 = "재사용할 노드(폴더·메모)를 내용째 저장해둔 복사본".
 * doc = 그 노드 하나(폴더면 하위 전체)를 담은 독립 미니 문서(.smk와 같은 구조).
 * 목록에서 더블클릭 = 현재 공간에 그대로 복제(stamp). 다운로드 = "{name}_comp.smk".
 */
export interface ComponentDef {
  id: string
  name: string
  doc: SimpraWorldDoc
  updatedAt: number
}

/** 사진은 구조와 분리 저장. thumb(512px)는 캔버스용, original은 선택적 보관 */
export interface Asset {
  id: string
  kind: 'image'
  mime: string
  thumb: string // dataURL (캔버스 렌더 + .smk 저장 대상)
  original?: string // dataURL (원본, 선택적)
  name?: string
}

/** 노드 = 엔티티(데이터). 원본은 하나. 위치/소속은 갖지 않음(placement가 가짐). */
export interface SNode {
  id: string
  type: NodeType
  name: string
  shape: Shape
  w: number // 월드 기준 가로 크기
  h: number // 월드 기준 세로 크기
  radius?: number // 모서리 둥글기(월드 단위, 사각형·이미지에 적용)
  color: string
  assetId?: string // 이미지 아이콘
  textColor?: string // 이름(라벨) 글자색. 없으면 기본 밝은색. text 개체에선 글자색.
  emphasize?: boolean // 이름 라벨 강조(대비 테두리) → 어떤 배경에서도 잘 보이게
  hideName?: boolean // 이름 라벨 숨김(폴더·노트) → 캔버스에 이름 안 그림
  rotation?: number // 사진 회전 각도(도, 임의값). 개체 아래 회전 핸들을 끌어 자유 회전(90°마다 스냅). 중심 기준 강체 회전.
  fontSize?: number // text 개체 글자 크기(월드 단위, 기본 20)
  bold?: boolean // text 개체 굵게
  align?: 'left' | 'center' | 'right' // text 개체 가로 정렬(기본 left)
  valign?: 'top' | 'middle' | 'bottom' // text 개체 세로 정렬(기본 top)
  wrap?: boolean // text 개체: 폭에 맞춰 자동 줄바꿈(크기 조절하면 켜짐). 기본 false=오른쪽 무한
  lock?: boolean // text 개체: 크기 락(비율 유지 + 글자보다 작아지지 않음)
  body?: string // 메모 본문 / text 개체 내용
  tags?: string[] // 해시태그(연관 메모 묶기·검색·교체용). '#' 없이 저장.
  badge?: string // 좌상단 배지(유통기한·능력치·직급 등 짧은 라벨). 비면 캔버스에 안 보임.
  badgeSize?: number // 배지 폰트 크기(월드 단위, 기본 14). 노드 크기와 무관 → 가림 비율 고정.
  badgeColor?: string // 배지 글자색(기본 진한색)
  badgeBg?: string // 배지 배경색. 'none'=배경 없음, 미지정=기본 앰버
  framePC?: Frame // 폴더 전용: PC로 진입할 때 맞춰 들어갈 기준 영역(없으면 0,0 기본줌)
  frameMobile?: Frame // 폴더 전용: 모바일로 진입할 때의 기준 영역
  updatedAt: number
}

/** 배치 = 관계 테이블. "어떤 노드가 어느 공간에 어떤 좌표로 놓였나". 한 노드가 여러 placement 가능. */
export interface Placement {
  id: string
  nodeId: string
  space: string | null // 들어있는 폴더의 node id (null = 최상위 공간)
  x: number
  y: number
  locked?: boolean // 위치 잠금: true면 드래그·좌표편집으로 안 움직임
  groupId?: string // 그룹화: 같은 groupId끼리 하나로 선택·이동됨(대칭). 척추화(spine)와 별개.
  spineParent?: string // 척추화: 이 배치가 매달린 부모 배치 id(부모 이동·회전 시 함께 따라감)
  spineJX?: number // 관절점(회전 축) — 부모 로컬 프레임 기준 X(부모 중심 기준, 부모 회전 역보정)
  spineJY?: number // 관절점 — 부모 로컬 프레임 기준 Y
  stored?: boolean // PC 우주 보관: 캔버스에 안 그려지고 보관함/검색에만(교체 대기).
  storedM?: boolean // 모바일 우주 보관 — PC(stored)와 완전 독립(폴백 없음).
  mx?: number // 모바일 우주 전용 X(없으면 x 사용). PC=x,y / 모바일=mx,my → 평행우주 위치.
  my?: number // 모바일 우주 전용 Y(없으면 y 사용)
}

/** 캔버스 렌더/조작용 조인 뷰: placement(위치) + node(데이터). 저장 안 됨, 런타임 계산용. */
export interface SpaceItem {
  pid: string // placement id (선택/드래그/이동 기준)
  nodeId: string // 원본 노드 id (폴더진입/엣지/편집 기준)
  type: NodeType
  name: string
  shape: Shape
  color: string
  assetId?: string
  textColor?: string
  emphasize?: boolean
  hideName?: boolean
  rotation?: number
  fontSize?: number
  bold?: boolean
  align?: 'left' | 'center' | 'right'
  valign?: 'top' | 'middle' | 'bottom'
  wrap?: boolean
  lock?: boolean
  body?: string
  badge?: string
  badgeSize?: number
  badgeColor?: string
  badgeBg?: string
  w: number
  h: number
  radius?: number
  x: number
  y: number
  locked?: boolean
}

export interface SEdge {
  id: string
  from: string // placement id (배치 단위 — 같은 노드라도 배치마다 참조선이 따로)
  to: string // placement id
  color?: string // 참조선 색(없으면 기본 회색)
  bold?: boolean // 강조: 더 굵게
}

/**
 * 잉크 획 = 캔버스 위 자유 필기(펜/손가락) 한 번의 선.
 * 노드/배치와 별개(재사용·다중배치 안 함). 공간(space)에 고정된 월드좌표 점열.
 * pts = 평탄화된 월드좌표 [x0,y0,x1,y1,…] → 카메라 팬/줌 따라 같이 움직이고, 저장·되돌리기에 함께 실림.
 */
export type InkKind = 'pen' | 'highlighter' | 'pencil' // 펜=선명 / 형광펜=반투명·굵게 / 연필=살짝 흐리게

export interface InkStroke {
  id: string
  space: string | null // 그려진 공간(폴더 node id, null=최상위). 그 공간에서만 보임.
  pts: number[] // 월드좌표 평탄 배열 [x0,y0,x1,y1,…]
  color: string
  width: number // 굵기(월드 단위)
  kind?: InkKind // 없으면 'pen'으로 취급(구버전 호환)
  updatedAt: number
}

export interface SimpraWorldDoc {
  version: string
  user_id: string | null
  universeName: string // 최상위(=My Universe) 표시 이름. 편집 가능, 전체 export에 동봉됨.
  nodes: SNode[]
  placements: Placement[]
  edges: SEdge[]
  strokes?: InkStroke[] // 자유 필기(펜) 획들. 없으면 빈 것으로 취급(구버전 문서 호환).
  assets: Asset[]
  components: ComponentDef[]
  groups?: Record<string, { rot: number }> // 그룹별 누적 회전각(도) → 선택 박스가 회전 따라 안정적으로 감쌈
  bgColor?: string // 캔버스 배경색(없으면 기본 #0f1115)
  showGrid?: boolean // 그리드 표시 여부(없으면 기본 true)
  gridBold?: boolean // 그리드 선명하게(진하게)
  rootFramePC?: Frame // 최상위(My Universe) 공간의 PC 기준 영역
  rootFrameMobile?: Frame // 최상위 공간의 모바일 기준 영역
  showFrame?: boolean // 현재 공간의 프레임 점선 테두리 표시 여부(기본 false)
}

// 캔버스 기본 배경색 (배경색 미설정 시 / 되돌리기 기준)
export const DEFAULT_BG = '#0f1115'

export function emptyDoc(): SimpraWorldDoc {
  return {
    version: '1.0',
    user_id: null,
    universeName: 'My Universe',
    nodes: [],
    placements: [],
    edges: [],
    assets: [],
    components: [],
  }
}

let _seq = 0
export function uid(prefix = 'n'): string {
  // 시간+증가카운터로 충돌 방지 (Math.random 미사용 환경 대비)
  _seq += 1
  return `${prefix}_${Date.now().toString(36)}_${_seq.toString(36)}`
}
