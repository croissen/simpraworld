// SimpraWorld 데이터 모델
// 설계 원칙(클라우드 대비):
//  1) user_id 자리를 비워둠 → 나중에 로그인 붙이면 채우기만
//  2) 구조(JSON)와 사진(asset)을 분리 → "구조 무료동기화 / 사진 과금" 스위치 가능
//  3) 모든 노드에 id + updatedAt → 나중에 동기화(뭐가 바뀌었나) 가능
//  4) 소속+좌표는 노드에서 분리해 placements(관계 테이블)로 → 한 노드가 여러 공간에
//     동시에 존재 가능(다대다 참조). node=데이터(원본 1개), placement=어디에 어떤 좌표로 놓였나.

export type NodeType = 'folder' | 'memo' | 'photo' // photo = 순수 사진 개체(라벨·노트편집 없음)
export type Shape = 'rect' | 'circle' | 'triangle' | 'hexagon' | 'image'

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
  textColor?: string // 이름(라벨) 글자색. 없으면 기본 밝은색
  emphasize?: boolean // 이름 라벨 강조(대비 테두리) → 어떤 배경에서도 잘 보이게
  body?: string // 메모 본문(노트 더블클릭 팝업에서 편집)
  tags?: string[] // 해시태그(연관 메모 묶기·검색·교체용). '#' 없이 저장.
  badge?: string // 좌상단 배지(유통기한·능력치·직급 등 짧은 라벨). 비면 캔버스에 안 보임.
  badgeSize?: number // 배지 폰트 크기(월드 단위, 기본 14). 노드 크기와 무관 → 가림 비율 고정.
  badgeColor?: string // 배지 글자색(기본 진한색)
  badgeBg?: string // 배지 배경색. 'none'=배경 없음, 미지정=기본 앰버
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
  stored?: boolean // 보관 전용: 캔버스에 안 그려지고 보관함/검색에만 존재(교체 대기)
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

export interface SimpraWorldDoc {
  version: string
  user_id: string | null
  universeName: string // 최상위(=My Universe) 표시 이름. 편집 가능, 전체 export에 동봉됨.
  nodes: SNode[]
  placements: Placement[]
  edges: SEdge[]
  assets: Asset[]
  components: ComponentDef[]
}

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
