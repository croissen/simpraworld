import { get, set } from 'idb-keyval'
import { DEFAULT_BG, emptyDoc, uid } from './types'
import type { Asset, ComponentDef, Frame, InkKind, InkStroke, NodeType, NoteStroke, Placement, SEdge, Shape, SimpraWorldDoc, SNode, SpaceItem } from './types'
import { makeSampleWorld } from './sampleWorld'
import { measureTextNode, wrappedHeight } from './textMeasure'

export interface Camera {
  x: number // 화면 중앙에 오는 월드 좌표
  y: number
  zoom: number
}

const DB_KEY = 'simpraworld:doc:v7' // v7: 영어화된 기본세계(깨끗 재생성)

export const DEFAULT_BADGE_SIZE = 14 // 배지 기본 폰트 크기(월드 단위) — 여기 한 곳만 고치면 됨

// ── 내부 상태 ────────────────────────────────────────────────
let doc: SimpraWorldDoc = emptyDoc()
// 모바일은 기본 줌 75%(좁은 화면에 더 많이 보이게). PC는 100%.
export const defaultZoom = () =>
  typeof window !== 'undefined' && window.innerWidth <= 640 ? 0.75 : 1
let camera: Camera = { x: 0, y: 0, zoom: defaultZoom() }
let spacePath: string[] = [] // 진입한 폴더 node id 스택 (빈 배열 = 최상위)
// 캔버스 그리기 영역 크기(px). InfiniteCanvas가 리사이즈마다 갱신.
// 프레임 캡처(현재 보이는 월드 영역 계산)와 적용(영역→줌 fit)에 필요.
let viewport = {
  w: typeof window !== 'undefined' ? window.innerWidth : 1280,
  h: typeof window !== 'undefined' ? window.innerHeight : 800,
}
let selection = new Set<string>() // 선택된 placement id 집합(다중선택)

// 카메라는 자주 바뀌므로 React를 건드리지 않음(=버벅임 방지).
let canvasDirty = true
export function markDirty() {
  canvasDirty = true
}
export function consumeDirty(): boolean {
  if (canvasDirty) {
    canvasDirty = false
    return true
  }
  return false
}

// React UI용 구독 (노드/선택/공간 변경 시에만 알림)
const listeners = new Set<() => void>()
let version = 0
export function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}
export function getSnapshot() {
  return version
}
function changed() {
  version += 1
  markDirty()
  recordHistory()
  listeners.forEach((l) => l())
  scheduleSave()
}

// ── 실행취소/다시실행 (Undo/Redo) ────────────────────────────
// 구조(노드/배치/엣지)만 스냅샷으로 쌓는다. 이미지(asset.thumb 등 base64)는 무거우니
// 스냅샷에서 떼어내고(assetMem에 1벌만 보관) 복원 시 다시 채운다 → 메모리 폭발(OOM) 방지.
const HISTORY_LIMIT = 30
let past: string[] = []
let future: string[] = []
let committedJSON = '' // 마지막으로 확정된 (슬림) doc 상태
let historyReady = false // init 완료 전엔 기록하지 않음
let dirty = false // 마지막 저장/열기/새로만들기 이후 내용이 바뀌었는지(저장 안 한 변경)
const assetMem = new Map<string, Asset>() // id별 이미지 원본 1벌 보관(히스토리 복원용)
// 노트 편집 중 undo 바닥: 노트에 들어온 순간의 past 깊이. 그 아래로는 undo 금지
// (노트 생성/이전 작업까지 롤백돼 노트가 사라지며 팅기는 것 방지). 노트 밖이면 null.
let noteUndoFloor: number | null = null
export const canUndo = () => past.length > (noteUndoFloor ?? 0)
export const canRedo = () => future.length > 0

// 현재 doc/컴포넌트의 모든 에셋을 id로 기억(복원 때 다시 채울 수 있게)
function rememberAssets() {
  for (const a of doc.assets) assetMem.set(a.id, a)
  for (const c of doc.components) for (const a of c.doc.assets) assetMem.set(a.id, a)
}
// 무거운 이미지 데이터를 뺀 슬림 에셋(스냅샷용)
const slimAsset = (a: Asset): Asset => ({ ...a, thumb: '', original: undefined })
// 다시 채우기: id로 원본 thumb/original 복구
function fatAsset(a: Asset): Asset {
  const full = assetMem.get(a.id)
  return full ? { ...a, thumb: full.thumb, original: full.original } : a
}
function slimDocJSON(): string {
  const slim: SimpraWorldDoc = {
    ...doc,
    assets: doc.assets.map(slimAsset),
    components: doc.components.map((c) => ({ ...c, doc: { ...c.doc, assets: c.doc.assets.map(slimAsset) } })),
  }
  return JSON.stringify(slim)
}

function resetHistory() {
  past = []
  future = []
  rememberAssets()
  committedJSON = slimDocJSON()
  historyReady = true
  dirty = false // 저장/열기/새로만들기 등 새 기준점 → 변경 없음 상태
}

function recordHistory() {
  if (!historyReady) return
  rememberAssets()
  const cur = slimDocJSON()
  if (cur === committedJSON) return // doc 변화 없음(선택/공간만 바뀜) → 기록 안 함
  dirty = true // 실제 내용 변경 발생
  past.push(committedJSON)
  if (past.length > HISTORY_LIMIT) past.shift()
  future = []
  committedJSON = cur
}

/** undo/redo로 받은 (슬림) 스냅샷을 doc에 적용 — 이미지 데이터는 assetMem에서 복구. */
function applyDocSnapshot(json: string) {
  const parsed = JSON.parse(json) as SimpraWorldDoc
  parsed.assets = parsed.assets.map(fatAsset)
  parsed.components = parsed.components.map((c) => ({
    ...c,
    doc: { ...c.doc, assets: c.doc.assets.map(fatAsset) },
  }))
  doc = parsed
  committedJSON = json
  // 사라진 항목은 선택/경로에서 정리
  const livePids = new Set(doc.placements.map((p) => p.id))
  selection = new Set([...selection].filter((pid) => livePids.has(pid)))
  const liveNodes = new Set(doc.nodes.map((n) => n.id))
  spacePath = spacePath.filter((id) => liveNodes.has(id))
  const liveStrokes = new Set((doc.strokes ?? []).map((s) => s.id))
  selectedStrokeIds = new Set([...selectedStrokeIds].filter((id) => liveStrokes.has(id)))
  version += 1
  dirty = true // undo/redo도 저장된 상태와 달라짐
  markDirty()
  listeners.forEach((l) => l())
  scheduleSave()
}

export function undo() {
  if (!past.length) return
  if (noteUndoFloor !== null && past.length <= noteUndoFloor) return // 노트 안: 바닥 밑으로 막음
  future.push(committedJSON)
  applyDocSnapshot(past.pop()!)
}

export function redo() {
  if (!future.length) return
  past.push(committedJSON)
  applyDocSnapshot(future.pop()!)
}

// ── 접근자 ───────────────────────────────────────────────────
export const getDoc = () => doc
export const getCamera = () => camera
export const getCurrentSpace = (): string | null =>
  spacePath.length ? spacePath[spacePath.length - 1] : null
export const getSelection = (): string[] => [...selection]
export const getSelectionSet = () => selection
export const isSelected = (pid: string) => selection.has(pid)
export const selectionCount = () => selection.size
export const getSoleSelectedPid = (): string | null =>
  selection.size === 1 ? [...selection][0] : null
export const getUniverseName = () => doc.universeName || 'My Universe'

// ── 캔버스 보기 설정 (배경색·그리드) — doc에 저장돼 .spu/새로고침에도 유지 ──
export const getBgColor = () => doc.bgColor || DEFAULT_BG
export function setBgColor(hex: string) {
  doc.bgColor = hex
  changed()
}
export function resetBgColor() {
  doc.bgColor = DEFAULT_BG
  changed()
}
export const getShowGrid = () => doc.showGrid !== false // 기본 true
export function setShowGrid(on: boolean) {
  doc.showGrid = on
  changed()
}
export const getGridBold = () => !!doc.gridBold // 기본 false
export function setGridBold(on: boolean) {
  doc.gridBold = on
  changed()
}

// ── 평행우주 (공간 × PC/Mobile 두 버전) ──────────────────────────
// 한 공간에 PC 버전 / Mobile 버전을 따로 둔다. "활성 우주"는 수동 탭(PC/Mobile)으로 고르며
// 실제 기기와 무관 — PC에서도 Mobile 탭을 눌러 모바일 우주를 보고 편집할 수 있다.
// 프레임(화면 영역)·요소 위치·표시여부 모두 이 활성 우주를 기준으로 한다.
// 기본값만 현재 기기로 시작(폰=mobile, 그 외=pc).
export type FrameTarget = 'pc' | 'mobile'
const isMobileDevice = () => typeof window !== 'undefined' && window.innerWidth <= 640
const deviceTarget = (): FrameTarget => (isMobileDevice() ? 'mobile' : 'pc')

// 활성 우주(저장 안 함, 새로고침 시 기기 기본값으로). 모든 우주별 분기의 기준.
let frameTarget: FrameTarget = deviceTarget()
export const getFrameTarget = () => frameTarget
export function setFrameTarget(t: FrameTarget) {
  frameTarget = t
  // 그 우주에 저장된 프레임이 있으면 그 view로 복귀(같은 탭 다시 눌러도 재복귀).
  // 없으면 현 화면 유지(원점으로 튀지 않게) — 위치·표시만 활성 우주 기준으로 갱신.
  const f = getFrame(getCurrentSpace(), t)
  if (f) camera = fitCameraToFrame(f)
  markDirty() // 캔버스: 위치·표시·프레임 점선 모두 활성 우주 기준으로 다시 그림
  bumpUI()
}

/** 캔버스 그리기 영역 크기 등록 (InfiniteCanvas 리사이즈/매 프레임). */
export function setViewport(w: number, h: number) {
  if (w > 0 && h > 0) viewport = { w, h }
}

/** 영역(Frame)을 현재 기기 화면에 꽉 차게(contain) 중앙 정렬하는 카메라. */
function fitCameraToFrame(f: Frame): Camera {
  const zoom = Math.min(viewport.w / f.w, viewport.h / f.h)
  return { x: f.cx, y: f.cy, zoom }
}

/** 진입 시 카메라: 활성 우주 프레임 있으면 그 영역에 contain-fit, 없으면 0,0 기본줌. */
function entryCamera(space: string | null): Camera {
  const f = getFrame(space, frameTarget)
  return f ? fitCameraToFrame(f) : { x: 0, y: 0, zoom: defaultZoom() }
}

/** 공간(폴더 id / null=루트) × 타깃의 저장된 프레임. */
export function getFrame(space: string | null, target: FrameTarget): Frame | undefined {
  if (space === null) return target === 'mobile' ? doc.rootFrameMobile : doc.rootFramePC
  const n = getNode(space)
  if (!n) return undefined
  return target === 'mobile' ? n.frameMobile : n.framePC
}
/** 캔버스 점선 미리보기용: 현재 공간 × 현재 선택 타깃. */
export const getCurrentFrame = (): Frame | undefined => getFrame(getCurrentSpace(), frameTarget)

/** 공간 × 타깃 슬롯에 프레임 기록. */
function writeFrame(space: string | null, target: FrameTarget, f: Frame) {
  if (space === null) {
    if (target === 'mobile') doc.rootFrameMobile = f
    else doc.rootFramePC = f
  } else {
    const n = getNode(space)
    if (!n) return
    if (target === 'mobile') n.frameMobile = f
    else n.framePC = f
    n.updatedAt = Date.now()
  }
}

/** 같은 우주의 다른 공간들 프레임 크기 평균(없으면 null) — 새 프레임 기본값용. */
function averageFrameSize(target: FrameTarget, exclude: string | null): { w: number; h: number } | null {
  const fs: Frame[] = []
  if (exclude !== null) {
    const rf = target === 'mobile' ? doc.rootFrameMobile : doc.rootFramePC // 루트 제외 안 됐으면 포함
    if (rf) fs.push(rf)
  }
  for (const n of doc.nodes) {
    if (n.id === exclude) continue
    const f = target === 'mobile' ? n.frameMobile : n.framePC
    if (f) fs.push(f)
  }
  if (!fs.length) return null
  return {
    w: fs.reduce((s, f) => s + f.w, 0) / fs.length,
    h: fs.reduce((s, f) => s + f.h, 0) / fs.length,
  }
}

/**
 * 현재 공간 × 활성 우주의 프레임을 저장.
 * - 첫 세팅이고 같은 우주의 다른 공간 프레임이 있으면 → 그 평균 크기를 현재 위치에 적용(폴더 간 일관).
 * - 그 외(없음/덮어쓰기) → 지금 보이는 화면 그대로.
 * 저장 후 그 프레임으로 화면을 다시 맞춰 결과를 바로 보여준다.
 */
export function captureFrame() {
  const space = getCurrentSpace()
  const existing = getFrame(space, frameTarget)
  const avg = existing ? null : averageFrameSize(frameTarget, space)
  const f: Frame = avg
    ? { cx: camera.x, cy: camera.y, w: avg.w, h: avg.h }
    : { cx: camera.x, cy: camera.y, w: viewport.w / camera.zoom, h: viewport.h / camera.zoom }
  writeFrame(space, frameTarget, f)
  camera = fitCameraToFrame(f)
  changed()
}

/** 현재 프레임이 현재 화면에서 만드는 줌(%). */
export function frameZoomPct(f: Frame): number {
  return Math.round(Math.min(viewport.w / f.w, viewport.h / f.h) * 100)
}

/** 프레임 W/H 직접 수정(중심 유지) → 다시 fit. */
export function setCurrentFrameSize(w: number, h: number) {
  const space = getCurrentSpace()
  const f = getFrame(space, frameTarget)
  if (!f) return
  const nf: Frame = { cx: f.cx, cy: f.cy, w: Math.max(1, w), h: Math.max(1, h) }
  writeFrame(space, frameTarget, nf)
  camera = fitCameraToFrame(nf)
  changed()
}

/** 프레임 줌(%) 직접 수정 → W/H를 비율 유지로 스케일해 그 줌이 나오게. */
export function setCurrentFrameZoom(pct: number) {
  const space = getCurrentSpace()
  const f = getFrame(space, frameTarget)
  if (!f) return
  const z = Math.max(1, pct) / 100
  const cur = Math.min(viewport.w / f.w, viewport.h / f.h)
  const k = cur / z // 줌을 z로 만들려면 영역을 이만큼 키움/줄임
  const nf: Frame = { cx: f.cx, cy: f.cy, w: f.w * k, h: f.h * k }
  writeFrame(space, frameTarget, nf)
  camera = fitCameraToFrame(nf)
  changed()
}

export const getShowFrame = () => !!doc.showFrame // 기본 false
export function setShowFrame(on: boolean) {
  doc.showFrame = on
  changed()
}

/** 현재 공간 × 현재 기기 프레임으로 카메라를 다시 맞춤(로드 직후·기기 전환 시 호출). */
export function applyEntryFrame() {
  camera = entryCamera(getCurrentSpace())
  markDirty()
  bumpUI()
}

/** 저장 성공 시 호출 → "변경 없음" 상태로. */
export const markSaved = () => {
  dirty = false
}
/** 마지막 저장/열기 이후 내용 변경이 있었는지. */
export const isDirty = () => dirty
/** 캔버스에 지울 만한 내용(노드/컴포넌트/필기)이 있는지. */
export const hasContent = () =>
  doc.nodes.length > 0 || doc.components.length > 0 || (doc.strokes?.length ?? 0) > 0
/** 저장할 가치가 있는 미저장 작업이 있는지(변경됨 + 내용 비어있지 않음). New/Load 전 확인용. */
export const hasUnsavedWork = () => dirty && hasContent()
export function setUniverseName(name: string) {
  doc.universeName = name.trim() || 'My Universe'
  changed()
}

export function setCamera(c: Camera) {
  camera = c
  markDirty() // 카메라만 → 캔버스만 다시 그림 (React 재렌더 없음)
}

/** 저장 없이 React UI만 갱신 (카메라 좌표 표시 등) */
export function bumpUI() {
  version += 1
  listeners.forEach((l) => l())
}

// ── 순수 UI 상태(저장 안 함) ─────────────────────────────────
// 노트 편집 팝업으로 열린 노드 / 컴포넌트 패널 토글 / 미리보기로 선택된 컴포넌트
let noteEditorNodeId: string | null = null
let noteEditorPid: string | null = null // 노트가 열린 "자리"(교체 대상 placement)
let componentsOpen = false
let selectedComponentId: string | null = null
// 모바일: 선택만으론 인스펙터 안 띄우고, 개체의 연필 아이콘을 눌렀을 때만 편집 패널 표시
let mobileEditOpen = false
export const getEditOpen = () => mobileEditOpen
export function setEditOpen(v: boolean) {
  mobileEditOpen = v
  bumpUI()
}

export const getNoteEditorId = () => noteEditorNodeId
export const getNoteEditorPid = () => noteEditorPid
export function openNote(nodeId: string, pid: string | null = null) {
  noteEditorNodeId = nodeId
  noteEditorPid = pid
  noteUndoFloor = past.length // 이 순간을 undo 바닥으로 → 이후 필기만 undo 가능
  future = [] // 노트 밖에서 남은 redo가 노트 안으로 새어들지 않게
  bumpUI()
}
export function closeNote() {
  noteEditorNodeId = null
  noteEditorPid = null
  noteUndoFloor = null // 노트 밖: undo 전역 복귀
  bumpUI()
}

export const getComponentsOpen = () => componentsOpen
export function toggleComponents() {
  componentsOpen = !componentsOpen
  if (!componentsOpen) selectedComponentId = null
  if (componentsOpen) libraryOpen = false // 패널 하나만
  bumpUI()
}

// 보관함(전체 트리) 패널 토글
let libraryOpen = false
export const getLibraryOpen = () => libraryOpen
export function toggleLibrary() {
  libraryOpen = !libraryOpen
  if (libraryOpen) componentsOpen = false // 패널 하나만
  bumpUI()
}

// 비율 잠금(리사이즈) — 인스펙터 토글과 캔버스 코너 리사이즈가 같은 값을 공유
let aspectLocked = true
export const getAspectLocked = () => aspectLocked
export function setAspectLocked(v: boolean) {
  aspectLocked = v
  bumpUI()
}

// ── 도형 그리기 도구 ─────────────────────────────────────────
// 툴바에서 도형(사각형·원·삼각형·선)을 고르면 이 값이 세팅되고, 캔버스에서
// 다음 드래그로 실제 크기·각도를 그린다(피그마/엑스칼리드로식). 한 번 그리면 해제.
let drawTool: Shape | null = null
export const getDrawTool = () => drawTool
export function setDrawTool(s: Shape | null) {
  drawTool = s
  if (s) inkMode = null // 도형 그리기 켜면 펜/지우개는 끔(상호배타)
  bumpUI()
}

/** 그리기 시작: (x,y)에 아주 작은 도형 노드를 즉시 만든다(히스토리 없음 — 손 뗄 때 확정). */
export function addShapeAt(shape: Shape, x: number, y: number): { nodeId: string; pid: string } {
  const node: SNode = {
    id: uid('s'),
    type: 'shape',
    name: 'Shape',
    shape,
    w: shape === 'line' ? 2 : 8,
    h: shape === 'line' ? 1 : 8, // 선 최초 두께=1
    color: '#5b8cff',
    updatedAt: Date.now(),
  }
  doc.nodes.push(node)
  const space = getCurrentSpace()
  const pl: Placement = { id: uid('p'), nodeId: node.id, space, x, y }
  doc.placements.push(pl)
  selection = new Set([pl.id])
  bumpUI()
  markDirty()
  return { nodeId: node.id, pid: pl.id }
}

/** 그리기 취소(Esc·너무 작음): 방금 만든 도형을 히스토리 없이 제거. */
export function cancelDrawNode(nodeId: string, pid: string) {
  doc.placements = doc.placements.filter((p) => p.id !== pid)
  doc.nodes = doc.nodes.filter((n) => n.id !== nodeId)
  selection = new Set()
  bumpUI()
  markDirty()
}

// ── 잉크(펜 필기) ─────────────────────────────────────────────
// 갤노트/아이폰 노트식 자유 필기. 펜을 켜면 캔버스 드래그가 획이 되고, 지우개면
// 닿는 획을 지운다. 획은 현재 공간(space)에 고정된 월드좌표 점열 → doc.strokes에 저장
// (save/열기/되돌리기에 자동 포함). 한 번 켜면 계속 쓸 수 있음(도형툴처럼 1회성 아님).
// 그리기(펜/형광펜/연필) + 도구(지우개 2종·올가미). null=필기 꺼짐.
export type InkMode = InkKind | 'eraser' | 'erasePart' | 'lasso' | 'fill' | null
const DRAW_KINDS = new Set<InkMode>(['pen', 'highlighter', 'pencil'])
export const isDrawKind = (m: InkMode): m is InkKind => DRAW_KINDS.has(m)

let inkMode: InkMode = null
let lastEraser: 'eraser' | 'erasePart' = 'eraser' // 마지막에 고른 지우개 종류(우클릭 임시지우개용)
export const getLastEraser = () => lastEraser
// ── 잉크 사용자 취향(로컬 저장, 문서 아님) ───────────────────────────
// 색: 펜은 컨텍스트별 기본 — '노트 안=검정 / 캔버스=초록' + 각각 따로 기억. 형광펜은 공통(노랑).
// 굵기: 펜·형광펜·지우개 각각 따로(통일 아님) 기억. 팔레트 위치도 기억.
const INK_PREF_KEY = 'simpra:inkPrefs'
type InkPrefs = {
  penCanvas: string
  penNote: string
  hlColor: string
  penW: number
  hlW: number
  eraserW: number
  smooth: number // 손떨림 보정 강도(0=끔 ~ 5=최대). 펜/연필 필기에만 적용.
  palettePos: { x: number; y: number } | null
}
const DEFAULT_INK: InkPrefs = {
  penCanvas: '#3ddc7f', // 캔버스 펜 기본 = 초록
  penNote: '#111111', // 노트 펜 기본 = 검정
  hlColor: '#ffe600', // 형광펜 = 노랑
  penW: 3,
  hlW: 20,
  eraserW: 24,
  smooth: 0,
  palettePos: null,
}
let inkPrefs: InkPrefs = loadInkPrefs()
function loadInkPrefs(): InkPrefs {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(INK_PREF_KEY) : null
    return raw ? { ...DEFAULT_INK, ...JSON.parse(raw) } : { ...DEFAULT_INK }
  } catch {
    return { ...DEFAULT_INK }
  }
}
function saveInkPrefs() {
  try {
    localStorage.setItem(INK_PREF_KEY, JSON.stringify(inkPrefs))
  } catch {
    /* 사생활 모드 등 localStorage 불가 → 이 세션만 유지 */
  }
}

// 최근 사용색(로컬 저장, 최신 우선 최대 8) — 문서가 아니라 사용자 취향
const RECENT_KEY = 'simpra:recentColors'
let recentColors: string[] = loadRecentColors()
function loadRecentColors(): string[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(RECENT_KEY) : null
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string').slice(0, 8) : []
  } catch {
    return []
  }
}
export const getRecentColors = () => recentColors
function pushRecentColor(c: string) {
  const lc = c.toLowerCase()
  recentColors = [c, ...recentColors.filter((x) => x.toLowerCase() !== lc)].slice(0, 8)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentColors))
  } catch {
    /* 사생활 모드 등 localStorage 불가 → 최근색은 이 세션만 유지 */
  }
}

// 화면이동(손) 도구: 켜지면 드래그가 그리기 대신 화면 이동(노트·캔버스 공통). 도구를 고르면 꺼짐.
let panTool = false
export const getPanTool = () => panTool
export function setPanTool(v: boolean) {
  panTool = v
  markDirty()
  bumpUI()
}

// 핸드모드: 펜 팔레트(잉크모드)가 열려 있을 때 '손가락으로도 그리기'를 켠다.
// 기본 꺼짐 → 팔레트 열리면 손가락은 화면이동, 펜만 필기. 켜면 손가락도 펜처럼 그림.
let handMode = false
export const getHandMode = () => handMode
export function setHandMode(v: boolean) {
  handMode = v
  markDirty()
  bumpUI()
}

// 내비 버튼(홈/+/폴더/…)을 누르면 펜을 끈다 — 단, 핸드모드(손가락 필기)일 땐 유지.
export function leavePenForNav() {
  if (inkMode && !handMode) setInkMode(null)
}

export const getInkMode = () => inkMode
export function setInkMode(m: InkMode) {
  panTool = false // 도구 선택 = 화면이동 해제
  inkMode = inkMode === m ? null : m // 같은 도구 다시 누르면 끄기(토글)
  if (inkMode === 'eraser' || inkMode === 'erasePart') lastEraser = inkMode // 우클릭 임시지우개가 쓸 종류 기억
  if (inkMode) {
    drawTool = null // 도형 그리기 도구와 겹치지 않게
    selection = new Set() // 필기 중엔 노드 선택 해제(오조작 방지)
  }
  if (inkMode !== 'lasso') clearStrokeSelection() // 올가미 벗어나면 필기 선택 해제
  markDirty() // 캔버스 커서/오버레이 즉시 갱신
  bumpUI()
}
// 노트가 열려 있으면 노트 컨텍스트(펜 기본=검정), 아니면 캔버스(펜 기본=초록).
const penColorKey = (): 'penNote' | 'penCanvas' => (noteEditorNodeId != null ? 'penNote' : 'penCanvas')
// 활성 도구의 색: 형광펜이면 형광펜 색, 그 외엔 컨텍스트별 펜 색.
export const getInkColor = () => (inkMode === 'highlighter' ? inkPrefs.hlColor : inkPrefs[penColorKey()])
export function setInkColor(c: string) {
  if (inkMode === 'highlighter') inkPrefs.hlColor = c
  else inkPrefs[penColorKey()] = c
  saveInkPrefs()
  bumpUI()
}
// (하위호환) 예전 이름 — 캔버스가 쓰는 색 게터
export const getPenColor = getInkColor
/** 최근색 등록: 색을 고를 때가 아니라 '최소화' 시점에 현재색을 최근 목록에 넣음. */
export function commitRecentColor() {
  pushRecentColor(getInkColor())
  bumpUI()
}
// 활성 도구의 굵기: 펜/연필·형광펜·지우개 각각 따로 기억(통일 아님).
const inkWidthKey = (): 'penW' | 'hlW' | 'eraserW' =>
  inkMode === 'highlighter' ? 'hlW' : inkMode === 'eraser' || inkMode === 'erasePart' ? 'eraserW' : 'penW'
export const getInkWidth = () => inkPrefs[inkWidthKey()]
export function setInkWidth(w: number) {
  inkPrefs[inkWidthKey()] = Math.max(1, Math.min(100, Math.round(w)))
  saveInkPrefs()
  bumpUI()
}
// 손떨림 보정 강도(0~5). 펜/연필 필기 입력점을 One-Euro 필터로 다듬어 글씨를 매끄럽게.
export const getInkSmooth = () => inkPrefs.smooth
export function setInkSmooth(v: number) {
  inkPrefs.smooth = Math.max(0, Math.min(5, Math.round(v)))
  saveInkPrefs()
  bumpUI()
}
/** 지우개 반경(월드) — 지우개 굵기의 절반. 우클릭 임시지우개도 이 값 사용(현재 도구와 무관). */
export const getEraserRadius = () => inkPrefs.eraserW / 2
// (하위호환) 예전 이름 — 캔버스가 쓰는 굵기 게터
export const getPenWidth = getInkWidth
export const setPenWidth = setInkWidth

// 펜 팔레트 위치 기억(닫았다 열어도 같은 자리). 드래그 끝/최소화 때 저장.
export const getPalettePos = () => inkPrefs.palettePos
export function setPalettePos(p: { x: number; y: number }) {
  inkPrefs.palettePos = p
  saveInkPrefs()
}

/** 현재 공간에서 보이는 획들(렌더용). */
export const strokesInCurrentSpace = (): InkStroke[] => {
  const space = getCurrentSpace()
  return (doc.strokes ?? []).filter((s) => s.space === space)
}

/** 한 획 확정: 월드좌표 점열(pts) → 히스토리 1스텝 + 저장. 점이 2개(4값) 미만이면 무시. */
export function addStroke(pts: number[], color: string, width: number, kind: InkKind = 'pen') {
  if (pts.length < 2) return
  const stroke: InkStroke = {
    id: uid('ink'),
    space: getCurrentSpace(),
    pts,
    color,
    width,
    kind,
    updatedAt: Date.now(),
  }
  if (!doc.strokes) doc.strokes = []
  doc.strokes.push(stroke)
  changed() // 되돌리기 1스텝 + 저장 + UI 알림
}

/** 채우기 확정: 닫힌 영역 경계 폴리곤(pts)을 색으로 채운 fill 획 추가. */
export function addFill(pts: number[], color: string) {
  if (pts.length < 6) return // 점 3개 미만이면 면 없음
  const stroke: InkStroke = {
    id: uid('fill'),
    space: getCurrentSpace(),
    pts,
    color,
    width: 0,
    fill: true,
    updatedAt: Date.now(),
  }
  if (!doc.strokes) doc.strokes = []
  doc.strokes.push(stroke) // 렌더에서 fill을 선보다 먼저 그려 선이 위로 오게 함
  changed()
}

/**
 * 지움 자국(area 지우개) 추가: 잉크 레이어에서 이 경로(굵기 width)만큼 픽셀을 파냄.
 * 실제 렌더는 캔버스가 destination-out으로 처리. 되돌리기 1스텝 + 저장.
 */
export function addEraseMark(pts: number[], width: number) {
  if (pts.length < 2) return
  if (!doc.strokes) doc.strokes = []
  doc.strokes.push({
    id: uid('era'),
    space: getCurrentSpace(),
    pts,
    color: '#000',
    width,
    erase: true,
    updatedAt: Date.now(),
  })
  changed()
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/**
 * 획 지우개(라이브): 지우개 선분 (ax,ay)-(bx,by) 반경 r 안에 닿는 획을 통째로 제거.
 * 선분 기반이라 빠르게 그어도 사이 구간이 안 빠짐. 지웠으면 true.
 */
export function eraseStrokesNear(ax: number, ay: number, bx: number, by: number, r: number): boolean {
  const strokes = doc.strokes
  if (!strokes || !strokes.length) return false
  const space = getCurrentSpace()
  let removed = false
  const keep: InkStroke[] = []
  for (const s of strokes) {
    if (s.space !== space || s.erase) {
      keep.push(s) // 지움 자국은 안 지움
      continue
    }
    if (s.fill) {
      if (eraserHitsFill(s, ax, ay, bx, by, r)) removed = true
      else keep.push(s)
      continue
    }
    const tol = r + (s.width || 1) / 2
    const p = densifyPts(s.pts, Math.max(r / 2, 1)) // 성긴 획(형광펜 2점)도 중간 교차 감지
    let hit = false
    for (let i = 0; i < p.length; i += 2) {
      if (distToSeg(p[i], p[i + 1], ax, ay, bx, by) <= tol) {
        hit = true
        break
      }
    }
    if (hit) removed = true
    else keep.push(s)
  }
  if (removed) {
    doc.strokes = keep
    markDirty()
  }
  return removed
}

// ── 노트 안 필기 (SNode.noteStrokes, 콘텐츠 로컬 좌표) ───────────────
export const getNoteStrokes = (nodeId: string): NoteStroke[] => getNode(nodeId)?.noteStrokes ?? []

/** 노트 안 한 획 확정. 점 1개(2값) 미만이면 무시. changed()로 저장·되돌리기 1스텝. */
export function addNoteStroke(nodeId: string, s: NoteStroke) {
  if (s.pts.length < 2) return
  const n = getNode(nodeId)
  if (!n) return
  ;(n.noteStrokes ??= []).push(s)
  n.updatedAt = Date.now()
  changed()
}

/**
 * 지우개 이동 선분 (ax,ay)-(bx,by) 반경 r 안에 닿는 노트 획을 통째로 지움(Stroke 지우개·우클릭).
 * 캔버스 eraseStrokesNear와 동일: 획을 densify해 성긴 획(형광펜 2점)도 중간에서 잡고,
 * 지움 자국(erase)은 지우지 않는다. 지운 게 있으면 true.
 */
export function eraseNoteStrokesNear(
  nodeId: string,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r: number,
): boolean {
  const n = getNode(nodeId)
  if (!n?.noteStrokes?.length) return false
  const keep: NoteStroke[] = []
  let removed = false
  for (const s of n.noteStrokes) {
    if (s.erase) {
      keep.push(s) // 지움 자국은 안 지움
      continue
    }
    const tol = r + (s.width || 1) / 2
    const p = densifyPts(s.pts, Math.max(r / 2, 1))
    let hit = false
    for (let i = 0; i < p.length; i += 2)
      if (distToSeg(p[i], p[i + 1], ax, ay, bx, by) <= tol) {
        hit = true
        break
      }
    if (hit) removed = true
    else keep.push(s)
  }
  if (removed) {
    n.noteStrokes = keep
    n.updatedAt = Date.now()
    changed()
  }
  return removed
}

/** 노트 획들을 (dx,dy)만큼 이동(올가미로 잘라 옮기기). commit=false면 저장 없이 미리보기(markDirty). */
export function moveNoteStrokes(nodeId: string, ids: Set<string>, dx: number, dy: number, commit = true) {
  const n = getNode(nodeId)
  if (!n?.noteStrokes?.length || !ids.size) return
  for (const s of n.noteStrokes) {
    if (!ids.has(s.id)) continue
    for (let i = 0; i < s.pts.length; i += 2) {
      s.pts[i] += dx
      s.pts[i + 1] += dy
    }
  }
  if (commit) {
    n.updatedAt = Date.now()
    changed()
  } else markDirty()
}

/** 노트 획들의 점/굵기를 직접 교체(올가미 크기조절용). commit=false면 미리보기. */
export function applyNoteStrokeGeom(
  nodeId: string,
  geom: Map<string, { pts: number[]; width: number }>,
  commit = true,
) {
  const n = getNode(nodeId)
  if (!n?.noteStrokes?.length || !geom.size) return
  for (const s of n.noteStrokes) {
    const g = geom.get(s.id)
    if (g) {
      s.pts = g.pts
      s.width = g.width
    }
  }
  if (commit) {
    n.updatedAt = Date.now()
    changed()
  } else markDirty()
}

/** 노트 획 삭제(올가미 선택 삭제). */
export function deleteNoteStrokes(nodeId: string, ids: Set<string>) {
  const n = getNode(nodeId)
  if (!n?.noteStrokes?.length || !ids.size) return
  const before = n.noteStrokes.length
  n.noteStrokes = n.noteStrokes.filter((s) => !ids.has(s.id))
  if (n.noteStrokes.length !== before) {
    n.updatedAt = Date.now()
    changed()
  }
}

/** 선을 step 간격으로 촘촘히 리샘플(성긴 획도 중간 교차 감지용). */
function densifyPts(pts: number[], step: number): number[] {
  if (pts.length <= 4) {
    // 점 1개는 그대로, 2점(직선·형광펜)은 그 한 세그먼트를 잘게 나눔
    if (pts.length < 4) return pts.slice()
    const out = [pts[0], pts[1]]
    const d = Math.hypot(pts[2] - pts[0], pts[3] - pts[1])
    const n = Math.max(1, Math.floor(d / step))
    for (let k = 1; k <= n; k++) {
      const t = k / n
      out.push(pts[0] + (pts[2] - pts[0]) * t, pts[1] + (pts[3] - pts[1]) * t)
    }
    return out
  }
  const out = [pts[0], pts[1]]
  for (let i = 2; i < pts.length; i += 2) {
    const ax = pts[i - 2],
      ay = pts[i - 1],
      bx = pts[i],
      by = pts[i + 1]
    const d = Math.hypot(bx - ax, by - ay)
    const n = Math.max(1, Math.floor(d / step))
    for (let k = 1; k <= n; k++) {
      const t = k / n
      out.push(ax + (bx - ax) * t, ay + (by - ay) * t)
    }
  }
  return out
}

/** 지우개 선분이 채우기(면)에 닿는지 — 폴리곤 내부거나 경계 r 이내. */
function eraserHitsFill(s: InkStroke, ax: number, ay: number, bx: number, by: number, r: number): boolean {
  if (pointInPoly(ax, ay, s.pts) || pointInPoly(bx, by, s.pts)) return true
  const dp = densifyPts(s.pts, Math.max(r, 1))
  for (let i = 0; i < dp.length; i += 2)
    if (distToSeg(dp[i], dp[i + 1], ax, ay, bx, by) <= r) return true
  return false
}

/** 지우개/이동 드래그 확정: 되돌리기 1스텝 + 저장. */
export function commitStrokes() {
  changed()
}

// ── 올가미: 필기 영역을 골라 이동/삭제 ────────────────────────
let selectedStrokeIds = new Set<string>()
export const getSelectedStrokeIds = () => selectedStrokeIds
export const hasStrokeSelection = () => selectedStrokeIds.size > 0
export function clearStrokeSelection() {
  if (selectedStrokeIds.size) {
    selectedStrokeIds = new Set()
    markDirty()
    bumpUI()
  }
}

/** 점이 다각형(평탄 배열) 내부인지 — ray casting. */
function pointInPoly(x: number, y: number, poly: number[]): boolean {
  let inside = false
  const n = poly.length / 2
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i * 2]
    const yi = poly[i * 2 + 1]
    const xj = poly[j * 2]
    const yj = poly[j * 2 + 1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** 올가미 폴리곤(월드) 안의 획 선택 — 점 과반이 안에 들면 선택. */
export function lassoSelectStrokes(poly: number[]): void {
  const space = getCurrentSpace()
  const sel = new Set<string>()
  if (poly.length >= 6) {
    for (const s of doc.strokes ?? []) {
      if (s.space !== space || s.erase) continue
      let inside = 0
      const total = s.pts.length / 2
      for (let i = 0; i < s.pts.length; i += 2)
        if (pointInPoly(s.pts[i], s.pts[i + 1], poly)) inside++
      if (total && inside / total >= 0.5) sel.add(s.id)
    }
  }
  selectedStrokeIds = sel
  markDirty()
  bumpUI()
}

/** 선택 획들의 월드 경계 박스(굵기 반영). 없으면 null. */
export function selectedStrokesBBox(): { x0: number; y0: number; x1: number; y1: number } | null {
  if (!selectedStrokeIds.size) return null
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const s of doc.strokes ?? []) {
    if (!selectedStrokeIds.has(s.id)) continue
    const hw = s.width / 2
    for (let i = 0; i < s.pts.length; i += 2) {
      x0 = Math.min(x0, s.pts[i] - hw)
      x1 = Math.max(x1, s.pts[i] + hw)
      y0 = Math.min(y0, s.pts[i + 1] - hw)
      y1 = Math.max(y1, s.pts[i + 1] + hw)
    }
  }
  return x0 <= x1 ? { x0, y0, x1, y1 } : null
}

/** 선택 획들을 (dx,dy)만큼 이동(라이브, 히스토리 없음). */
export function moveSelectedStrokesBy(dx: number, dy: number): void {
  if (!selectedStrokeIds.size) return
  for (const s of doc.strokes ?? []) {
    if (!selectedStrokeIds.has(s.id)) continue
    for (let i = 0; i < s.pts.length; i += 2) {
      s.pts[i] += dx
      s.pts[i + 1] += dy
    }
    s.updatedAt = Date.now()
  }
  markDirty()
}

/** 선택 획 삭제(되돌리기 1스텝 + 저장). */
export function deleteSelectedStrokes(): void {
  if (!selectedStrokeIds.size || !doc.strokes) return
  doc.strokes = doc.strokes.filter((s) => !selectedStrokeIds.has(s.id))
  selectedStrokeIds = new Set()
  changed()
}

/** 리사이즈 시작용 스냅샷(선택 획들의 점·굵기 원본 복사). */
export function getSelectedStrokesSnapshot(): { id: string; pts: number[]; width: number }[] {
  const snap: { id: string; pts: number[]; width: number }[] = []
  for (const s of doc.strokes ?? [])
    if (selectedStrokeIds.has(s.id)) snap.push({ id: s.id, pts: s.pts.slice(), width: s.width })
  return snap
}

/** 선택 획들을 고정점(fx,fy) 기준 배율 k로 균일 스케일(스냅샷 기준 → 누적오차 없음). */
export function applyStrokeScale(
  snap: { id: string; pts: number[]; width: number }[],
  fx: number,
  fy: number,
  k: number,
): void {
  const byId = new Map((doc.strokes ?? []).map((s) => [s.id, s]))
  for (const e of snap) {
    const s = byId.get(e.id)
    if (!s) continue
    const np = new Array(e.pts.length)
    for (let i = 0; i < e.pts.length; i += 2) {
      np[i] = fx + (e.pts[i] - fx) * k
      np[i + 1] = fy + (e.pts[i + 1] - fy) * k
    }
    s.pts = np
    if (!s.fill) s.width = Math.max(0.5, e.width * k) // 채움(면)은 굵기 없음
    s.updatedAt = Date.now()
  }
  markDirty()
}

export const getSelectedComponentId = () => selectedComponentId
export function selectComponent(id: string | null) {
  selectedComponentId = id
  if (id) selection = new Set() // 노드 선택과 배타 → Delete키 대상이 명확
  bumpUI()
}

// 우클릭 컨텍스트 메뉴 (화면좌표 x/y + 월드좌표 wx/wy + 대상 노드)
export interface ContextMenuState {
  x: number
  y: number
  wx: number
  wy: number
  pid: string | null
  nodeId: string | null
}
let contextMenu: ContextMenuState | null = null
export const getContextMenu = () => contextMenu
export function openContextMenu(m: ContextMenuState) {
  contextMenu = m
  bumpUI()
}
export function closeContextMenu() {
  if (!contextMenu) return
  contextMenu = null
  bumpUI()
}

// 클립보드. 'copy'=독립 복제(스냅샷), 'unique'=같은 노드 공유(결속: 편집/삭제 전파).
type Clip =
  | { mode: 'copy'; doc: SimpraWorldDoc }
  | { mode: 'unique'; items: { nodeId: string; x: number; y: number }[] }
let clipboard: Clip | null = null
export const hasClipboard = () => !!clipboard

/** 선택 항목들을 상대 위치 유지한 독립 미니문서로 (복사·선택 내보내기 공용). 루트=실제 위치. */
export function selectionToDoc(pids: Iterable<string> = selection): SimpraWorldDoc {
  const out = emptyDoc()
  const seenNode = new Set<string>()
  const seenAsset = new Set<string>()
  const rootByPid = new Map<string, string>() // 선택된 원본 배치 pid → out에서의 루트 배치 id
  for (const pid of pids) {
    const p = getPlacement(pid)
    if (!p) continue
    const sub = nodeToDoc(p.nodeId)
    if (!sub) continue
    for (const sp of sub.placements)
      if (sp.space === null) {
        sp.x = p.x
        sp.y = p.y
        sp.locked = p.locked
        sp.groupId = p.groupId // 그룹 유지
        sp.spineParent = p.spineParent // 관절(척추화) 부모 — 임시로 원본 pid, 아래서 새 루트 id로 교체
        sp.spineJX = p.spineJX
        sp.spineJY = p.spineJY
        rootByPid.set(pid, sp.id)
      }
    for (const n of sub.nodes) if (!seenNode.has(n.id)) seenNode.add(n.id), out.nodes.push(n)
    for (const a of sub.assets) if (!seenAsset.has(a.id)) seenAsset.add(a.id), out.assets.push(a)
    for (const sp of sub.placements) out.placements.push(sp)
    for (const e of sub.edges) out.edges.push(e) // 폴더 내부 참조선
  }
  // 관절 부모를 '함께 복사된' 새 루트 id로 교체 — 부모가 선택에 없으면 관절 끊음(자식만 복사).
  for (const sp of out.placements) {
    if (sp.space === null && sp.spineParent) {
      const parent = rootByPid.get(sp.spineParent)
      sp.spineParent = parent
      if (!parent) {
        sp.spineJX = undefined
        sp.spineJY = undefined
      }
    }
  }
  // 선택한 항목들 사이의 참조선(양 끝이 모두 선택된 배치)을 루트끼리 다시 연결
  for (const e of doc.edges) {
    const a = rootByPid.get(e.from)
    const b = rootByPid.get(e.to)
    if (a && b) out.edges.push({ id: uid('e'), from: a, to: b })
  }
  return out
}

/** 복사 시 OS 클립보드에 박혀 있던 이미지(스크린샷)를 비워 Ctrl+V가 내부 클립보드를 쓰게 함. */
function evictOSClipboardImage() {
  try {
    navigator.clipboard?.writeText('').catch(() => {})
  } catch {
    /* 권한/미지원 → 무시 */
  }
}

/** 선택된 항목 전부를 상대 위치 유지한 채 복사 (독립 복제) */
export function copySelection() {
  if (!selection.size) return
  clipboard = { mode: 'copy', doc: selectionToDoc() }
  evictOSClipboardImage()
  bumpUI()
}

/** 기존 노드와 겹치지 않는 (dx,dy) 찾기 — (dx0,dy0)에서 시작해 충돌하면 비울 때까지 민다. */
function findFreeOffset(
  space: string | null,
  roots: { x: number; y: number }[],
  dx0: number,
  dy0: number,
) {
  const existing = doc.placements.filter((p) => p.space === space)
  if (!existing.length || !roots.length) return { dx: dx0, dy: dy0 }
  const THRESH = 18
  const STEP = 24
  let dx = dx0
  let dy = dy0
  for (let i = 0; i < 60; i++) {
    const hit = roots.some((r) =>
      existing.some(
        (e) => Math.abs(e.x - (r.x + dx)) < THRESH && Math.abs(e.y - (r.y + dy)) < THRESH,
      ),
    )
    if (!hit) break
    dx += STEP
    dy += STEP
  }
  return { dx, dy }
}

/** 유니크 카피: 같은 노드를 공유(결속)하는 붙여넣기용. 선택 항목의 nodeId+위치만 저장. */
export function uniqueCopySelection() {
  const items = [...selection]
    .map((pid) => getPlacement(pid))
    .filter((p): p is Placement => !!p)
    .map((p) => ({ nodeId: p.nodeId, x: p.x, y: p.y }))
  if (items.length) clipboard = { mode: 'unique', items }
  evictOSClipboardImage()
  bumpUI()
}

/** 유니크 붙여넣기: 같은 노드를 현재 공간에 placement만 추가(결속). 같은 공간 중복·순환은 건너뜀. */
function pasteUnique(items: { nodeId: string; x: number; y: number }[], dx: number, dy: number) {
  const space = getCurrentSpace()
  const newPids: string[] = []
  for (const it of items) {
    if (space !== null && isCyclic(it.nodeId, space)) continue
    // 같은 공간에도 또 하나 놓을 수 있게 허용(같은 노드를 공유 = 결속). 중복 배치 금지 안 함.
    const pl: Placement = { id: uid('p'), nodeId: it.nodeId, space, x: it.x + dx, y: it.y + dy }
    doc.placements.push(pl)
    newPids.push(pl.id)
  }
  if (newPids.length) selection = new Set(newPids)
  changed()
}

/** 클립보드를 (wx,wy) 위치에 붙여넣기 (첫 항목이 그 지점에). 우클릭 "Paste here"용. */
export function pasteClipboardAt(wx: number, wy: number) {
  if (!clipboard) return
  if (clipboard.mode === 'copy') {
    const root = clipboard.doc.placements.find((p) => p.space === null)
    placeDoc(clipboard.doc, getCurrentSpace(), wx - (root?.x ?? 0), wy - (root?.y ?? 0))
  } else {
    const first = clipboard.items[0]
    pasteUnique(clipboard.items, wx - (first?.x ?? 0), wy - (first?.y ?? 0))
  }
}

/** 클립보드를 안 겹치는 위치에 붙여넣기 (Ctrl+V). 반복할수록 계단식으로 비켜감. */
export function pasteClipboard() {
  if (!clipboard) return
  const space = getCurrentSpace()
  if (clipboard.mode === 'copy') {
    const roots = clipboard.doc.placements.filter((p) => p.space === null)
    const { dx, dy } = findFreeOffset(space, roots, 24, 24)
    placeDoc(clipboard.doc, space, dx, dy)
  } else {
    const { dx, dy } = findFreeOffset(space, clipboard.items, 24, 24)
    pasteUnique(clipboard.items, dx, dy)
  }
}

/** 즉시 복제: 선택을 복사해 바로 옆에 붙여넣음(모바일 — 붙여넣기 경로 없이 한 번에). */
export function duplicateSelection() {
  if (!selection.size) return
  copySelection()
  pasteClipboard()
}
/** 즉시 유니크 복제(결속): 같은 노드를 placement만 추가로 바로 옆에 놓음. */
export function duplicateSelectionBound() {
  if (!selection.size) return
  uniqueCopySelection()
  pasteClipboard()
}

export function getNode(id: string | null | undefined): SNode | undefined {
  if (!id) return undefined
  return doc.nodes.find((n) => n.id === id)
}
export function getPlacement(pid: string | null | undefined): Placement | undefined {
  if (!pid) return undefined
  return doc.placements.find((p) => p.id === pid)
}

// ── 우주별 위치 해석 ─────────────────────────────────────────
// PC 우주=x,y / Mobile 우주=mx,my(없으면 x,y로 폴백). 같은 배치가 우주마다 다른 자리에 놓일 수 있음.
// 활성 우주(frameTarget) 기준 — 실제 기기가 아니라 수동 탭을 따른다.
export function placementPos(p: Placement): { x: number; y: number } {
  if (frameTarget === 'mobile' && p.mx !== undefined && p.my !== undefined) {
    return { x: p.mx, y: p.my }
  }
  return { x: p.x, y: p.y }
}
/** 활성 우주에 맞는 좌표 슬롯에 기록(Mobile이면 mx,my / PC면 x,y). */
function writePos(p: Placement, x: number, y: number) {
  if (frameTarget === 'mobile') {
    p.mx = x
    p.my = y
  } else {
    p.x = x
    p.y = y
  }
}

// 보관(라이브러리에 넣음) 여부는 우주별 완전 독립 — 한쪽에서 보관해도 다른쪽엔 영향 없음(폴백 없음).
export function isStored(p: Placement): boolean {
  return frameTarget === 'mobile' ? !!p.storedM : !!p.stored
}
function writeStored(p: Placement, v: boolean) {
  if (frameTarget === 'mobile') p.storedM = v
  else p.stored = v
}
export function getSelectedNode(): SNode | undefined {
  const pid = getSoleSelectedPid()
  const p = pid ? getPlacement(pid) : undefined
  return p ? getNode(p.nodeId) : undefined
}
export function getAsset(id: string | undefined): Asset | undefined {
  if (!id) return undefined
  return doc.assets.find((a) => a.id === id)
}

/** 현재 공간의 배치들 (활성 우주에서 보관된 건 캔버스에 안 보이므로 제외) */
export function placementsInCurrentSpace(): Placement[] {
  const space = getCurrentSpace()
  return doc.placements.filter((p) => p.space === space && !isStored(p))
}

/** 특정 공간의 모든 배치(보관 포함) — 보관함 트리용 */
export function placementsInSpaceAll(space: string | null): Placement[] {
  return doc.placements.filter((p) => p.space === space)
}

/** 공간(폴더) 이름 라벨. 최상위는 유니버스명. */
export function spaceLabel(space: string | null): string {
  return space === null ? getUniverseName() : getNode(space)?.name || '?'
}

/** 보관함 "사용": 현재 공간에 노출 배치로 가져옴. 보관돼 있던 거면 노출로 전환(카메라 중앙). */
export function useFromLibrary(nodeId: string) {
  const n = getNode(nodeId)
  if (!n) return
  const space = getCurrentSpace()
  if (space !== null && isCyclic(nodeId, space)) return // 폴더 순환 방지
  const existing = doc.placements.find((p) => p.nodeId === nodeId && p.space === space)
  if (existing) {
    // 숨김 해제만 — 원래 있던 좌표 그대로 다시 나타난다(위치를 절대 바꾸지 않음).
    writeStored(existing, false)
    selection = new Set([existing.id])
  } else {
    const pl: Placement = { id: uid('p'), nodeId, space, x: camera.x, y: camera.y }
    doc.placements.push(pl)
    selection = new Set([pl.id])
  }
  changed()
}

/** 캔버스 개체를 보관함으로 보내기(숨김) — 활성 우주에서만. 다중선택이면 선택 전체. */
export function storePlacement(pid: string) {
  const pids = selection.size ? [...selection] : [pid] // 선택 있으면 전부, 없으면 대상 하나
  for (const id of pids) {
    const p = getPlacement(id)
    if (p) writeStored(p, true)
  }
  selection = new Set()
  changed()
}

/** 보관함 전체(유니버스) 검색 — 이름/태그 매칭 노드 + 위치 라벨. */
export function searchLibrary(query: string): { node: SNode; path: string }[] {
  const q = query.trim().replace(/^#/, '').toLowerCase()
  if (!q) return []
  const out: { node: SNode; path: string }[] = []
  for (const n of doc.nodes) {
    const hit =
      n.name.toLowerCase().includes(q) || (n.tags || []).some((t) => t.toLowerCase().includes(q))
    if (!hit) continue
    const first = doc.placements.find((p) => p.nodeId === n.id)
    out.push({ node: n, path: spaceLabel(first ? first.space : null) })
  }
  return out
}

/** 현재 공간에 그릴 항목들 (placement + node 조인). 캔버스가 이것만 쓴다. */
export function itemsInCurrentSpace(): SpaceItem[] {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]))
  const items: SpaceItem[] = []
  for (const p of placementsInCurrentSpace()) {
    const n = byId.get(p.nodeId)
    if (!n) continue
    items.push({
      pid: p.id,
      nodeId: n.id,
      type: n.type,
      name: n.name,
      shape: n.shape,
      w: n.w,
      h: n.h,
      radius: n.radius,
      color: n.color,
      assetId: n.assetId,
      textColor: n.textColor,
      emphasize: n.emphasize,
      hideName: n.hideName,
      rotation: n.rotation,
      flipX: n.flipX,
      flipY: n.flipY,
      fontSize: n.fontSize,
      bold: n.bold,
      align: n.align,
      valign: n.valign,
      wrap: n.wrap,
      lock: n.lock,
      body: n.body,
      badge: n.badge,
      badgeSize: n.badgeSize,
      badgeColor: n.badgeColor,
      badgeBg: n.badgeBg,
      ...placementPos(p), // 현재 기기에 맞는 x,y (모바일 전용 좌표 폴백 포함)
      locked: p.locked,
    })
  }
  return items
}

// ── 네비게이션 (스택 기반: 폴더는 여러 공간에 있을 수 있어 parent로 경로 못 구함) ──
export function enterFolder(nodeId: string) {
  const n = getNode(nodeId)
  if (!n || n.type !== 'folder') return
  if (getCurrentSpace() === nodeId) return
  spacePath.push(nodeId)
  selection = new Set()
  camera = entryCamera(nodeId)
  changed()
}

/** 브레드크럼용 경로 */
export function breadcrumb(): SNode[] {
  return spacePath.map((id) => getNode(id)).filter((n): n is SNode => !!n)
}

/** 최상위(루트) 공간인가 — 뒤로가기가 더 올라갈 곳이 없는 상태. */
export const isAtRoot = () => spacePath.length === 0

/** 상위 폴더로 한 칸 이동. 이미 최상위면 아무것도 안 하고 false. (안드로이드 뒤로가기용) */
export function goUpOne(): boolean {
  if (spacePath.length === 0) return false
  goTo(spacePath.length >= 2 ? spacePath[spacePath.length - 2] : null)
  return true
}

export function goTo(spaceId: string | null) {
  if (spaceId === null) {
    spacePath = []
  } else {
    const i = spacePath.indexOf(spaceId)
    if (i >= 0) spacePath = spacePath.slice(0, i + 1)
  }
  selection = new Set()
  camera = entryCamera(spaceId)
  changed()
}

// ── 선택 (placement id 집합) ────────────────────────────────
/** additive=true(Shift) → 토글, 아니면 단독 선택. null → 전체 해제 */
/** 그룹 확장: pid가 그룹에 속하면 같은 그룹의 모든 배치(같은 공간)를 함께 반환. */
function groupMembers(pid: string): string[] {
  const p = getPlacement(pid)
  if (!p || !p.groupId) return [pid]
  return doc.placements.filter((q) => q.groupId === p.groupId && q.space === p.space).map((q) => q.id)
}

export function select(pid: string | null, additive = false) {
  if (pid === null) {
    selection = new Set()
  } else {
    const members = groupMembers(pid) // 그룹이면 통째로 선택
    if (additive) {
      const allIn = members.every((m) => selection.has(m))
      for (const m of members) allIn ? selection.delete(m) : selection.add(m)
    } else {
      selection = new Set(members)
    }
  }
  if (pid) selectedComponentId = null // 노드 선택 시 컴포넌트 미리보기 선택 해제(배타)
  mobileEditOpen = false // 선택 바뀌면 모바일 편집 패널은 닫고 연필부터
  changed()
}

// ── 그룹화 ────────────────────────────────────────────────────
/** 선택(2개 이상)을 한 그룹으로 묶음 → 이후 하나만 클릭해도 함께 선택·이동. */
export function groupSelection() {
  const pids = [...selection]
  if (pids.length < 2) return
  const gid = uid('g')
  for (const pid of pids) {
    const p = getPlacement(pid)
    if (p) p.groupId = gid
  }
  if (!doc.groups) doc.groups = {}
  doc.groups[gid] = { rot: 0 } // 그룹 회전값 초기화
  changed()
}
/** 선택된 것들의 그룹 해제. */
export function ungroupSelection() {
  for (const pid of selection) {
    const p = getPlacement(pid)
    if (p) delete p.groupId
  }
  changed()
}
/** 선택 전체가 같은 한 그룹인지(=Ungroup 버튼 노출 조건). */
export function selectionGrouped(): boolean {
  const pids = [...selection]
  if (pids.length < 2) return false
  const g0 = getPlacement(pids[0])?.groupId
  return !!g0 && pids.every((pid) => getPlacement(pid)?.groupId === g0)
}
/** 현재 선택이 한 그룹이면 그 groupId, 아니면 null */
export function selectedGroupId(): string | null {
  if (!selectionGrouped()) return null
  return getPlacement([...selection][0])?.groupId ?? null
}
/** 그룹 확장 없이 한 배치만 단독 선택(그룹 안에서 개별 요소 편집용). */
export function selectSingle(pid: string) {
  selection = new Set([pid])
  selectedComponentId = null
  mobileEditOpen = false
  changed()
}
export const getGroupRot = (gid: string) => doc.groups?.[gid]?.rot || 0
/** 그룹 회전각 누적(라이브) — 선택 박스 방향 갱신용 */
export function addGroupRotLive(gid: string, ddeg: number) {
  if (!doc.groups) doc.groups = {}
  const cur = doc.groups[gid]?.rot || 0
  doc.groups[gid] = { rot: ((((cur + ddeg) % 360) + 360) % 360) }
  markDirty()
}

/** 선택(단일/다중/그룹)을 좌우('x')·위아래('y')로 뒤집기(미러). 중심 기준으로 통째 뒤집음.
 *  각 개체: 위치를 중심 기준 미러 + 개별 flip 토글 + 회전 부호 반전(반사=회전 -θ) + 관절점 미러. */
export function flipSelection(axis: 'x' | 'y') {
  const pls = [...selection].map((pid) => getPlacement(pid)).filter((p): p is Placement => !!p)
  if (!pls.length) return
  const centers = pls.map((p) => placementPos(p))
  let sx = 0
  let sy = 0
  for (const c of centers) {
    sx += c.x
    sy += c.y
  }
  const cx = sx / centers.length
  const cy = sy / centers.length
  for (let i = 0; i < pls.length; i++) {
    const p = pls[i]
    const n = getNode(p.nodeId)
    if (!n) continue
    const pos = centers[i]
    // 위치를 중심 기준 미러(단일은 자기중심 → 제자리)
    if (axis === 'x') writePos(p, 2 * cx - pos.x, pos.y)
    else writePos(p, pos.x, 2 * cy - pos.y)
    // 개별 뒤집기 토글 + 회전 부호 반전
    if (axis === 'x') n.flipX = !n.flipX
    else n.flipY = !n.flipY
    if (n.rotation) n.rotation = -n.rotation
    // 관절점(부모 로컬 프레임)도 같이 미러
    if (axis === 'x' && p.spineJX !== undefined) p.spineJX = -p.spineJX
    if (axis === 'y' && p.spineJY !== undefined) p.spineJY = -p.spineJY
    n.updatedAt = Date.now()
  }
  // 그룹 박스 방향도 미러(부호 반전)
  const gids = new Set(pls.map((p) => p.groupId).filter((g): g is string => !!g))
  for (const gid of gids) {
    if (doc.groups?.[gid]) doc.groups[gid] = { rot: ((-doc.groups[gid].rot % 360) + 360) % 360 }
  }
  changed()
}

/** 그룹의 방향 있는 경계 상자(OBB) — 회전해도 크기가 안 변하는 안정 박스. 월드 좌표. */
export function groupOBB(gid: string): { cx: number; cy: number; hw: number; hh: number; rot: number } | null {
  const members = doc.placements.filter(
    (p) => p.groupId === gid && p.space === getCurrentSpace() && !isStored(p),
  )
  if (!members.length) return null
  const rot = doc.groups?.[gid]?.rot || 0
  const rad = (rot * Math.PI) / 180
  // 멤버 중심들의 무게중심
  let sx = 0
  let sy = 0
  const centers = members.map((p) => placementPos(p))
  for (const c of centers) {
    sx += c.x
    sy += c.y
  }
  const cenX = sx / centers.length
  const cenY = sy / centers.length
  // 각 멤버 박스 모서리를 그룹 로컬(rot 역회전)로 옮겨 AABB → 회전 불변
  const cb = Math.cos(-rad)
  const sb = Math.sin(-rad)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < members.length; i++) {
    const n = getNode(members[i].nodeId)
    if (!n) continue
    const pos = centers[i]
    const mrad = ((n.rotation || 0) * Math.PI) / 180
    const mc = Math.cos(mrad)
    const ms = Math.sin(mrad)
    for (const gx of [-1, 1])
      for (const gy of [-1, 1]) {
        const cw = pos.x + gx * (n.w / 2) * mc - gy * (n.h / 2) * ms
        const cwy = pos.y + gx * (n.w / 2) * ms + gy * (n.h / 2) * mc
        const dx = cw - cenX
        const dy = cwy - cenY
        const lx = dx * cb - dy * sb
        const ly = dx * sb + dy * cb
        minX = Math.min(minX, lx)
        maxX = Math.max(maxX, lx)
        minY = Math.min(minY, ly)
        maxY = Math.max(maxY, ly)
      }
  }
  const bx = (minX + maxX) / 2
  const by = (minY + maxY) / 2
  const cf = Math.cos(rad)
  const sf = Math.sin(rad)
  return {
    cx: cenX + bx * cf - by * sf,
    cy: cenY + bx * sf + by * cf,
    hw: (maxX - minX) / 2,
    hh: (maxY - minY) / 2,
    rot,
  }
}

/** 그룹 멤버들의 드래그 시작 스냅샷 반환(스케일 원본). */
export function groupScaleSnapshot(
  gid: string,
): { pid: string; nodeId: string; x: number; y: number; w: number; h: number }[] {
  return doc.placements
    .filter((p) => p.groupId === gid && p.space === getCurrentSpace() && !isStored(p))
    .map((p) => {
      const pos = placementPos(p)
      const n = getNode(p.nodeId)
      return { pid: p.id, nodeId: p.nodeId, x: pos.x, y: pos.y, w: n?.w || 8, h: n?.h || 8 }
    })
}
/** 스냅샷 기준 절대 배율 스케일(누적 안 됨) — pivot 고정. 라이브. */
export function scaleGroupApply(
  orig: { pid: string; nodeId: string; x: number; y: number; w: number; h: number }[],
  factor: number,
  pivotX: number,
  pivotY: number,
) {
  const f = Math.max(0.05, factor)
  for (const o of orig) {
    const p = getPlacement(o.pid)
    if (p) writePos(p, pivotX + (o.x - pivotX) * f, pivotY + (o.y - pivotY) * f)
    const n = getNode(o.nodeId)
    if (n) {
      n.w = Math.max(1, o.w * f)
      n.h = Math.max(1, o.h * f)
    }
  }
  markDirty()
}

// ── 척추화(관절 연결 = 뼈대) ──────────────────────────────────
export const isSpined = (pid: string) => !!getPlacement(pid)?.spineParent

/** pid의 직속 척추 자식들 */
function spineChildren(pid: string): string[] {
  return doc.placements.filter((p) => p.spineParent === pid).map((p) => p.id)
}
/** pid가 속한 척추(스플라인) 트리의 최상위 루트까지 올라감 (자기 부모가 없으면 자기 자신). */
export function spineRoot(pid: string): string {
  let cur = pid
  const seen = new Set<string>()
  while (!seen.has(cur)) {
    seen.add(cur)
    const parent = getPlacement(cur)?.spineParent
    if (!parent) break
    cur = parent
  }
  return cur
}
/** pid가 속한 척추 그룹 전체(루트 + 그 아래 전 하위). 어느 노드를 골라도 묶인 전체를 반환. */
export function spineGroup(pid: string): string[] {
  const root = spineRoot(pid)
  return [root, ...spineDescendants(root)]
}
/** pid의 모든 척추 하위(재귀, 자기 제외) */
export function spineDescendants(pid: string): string[] {
  const out: string[] = []
  const stack = [...spineChildren(pid)]
  while (stack.length) {
    const id = stack.pop()!
    if (out.includes(id)) continue
    out.push(id)
    stack.push(...spineChildren(id))
  }
  return out
}
/** 순환 방지: parent가 child의 후손이거나 자기 자신이면 true */
function spineWouldCycle(childPid: string, parentPid: string): boolean {
  return childPid === parentPid || spineDescendants(childPid).includes(parentPid)
}

/** 자식 배치의 관절점(회전 축) 월드 좌표 = 부모중심 + Rot(부모회전)·로컬오프셋 */
export function spineJointWorld(childPid: string): { x: number; y: number } | null {
  const c = getPlacement(childPid)
  if (!c || !c.spineParent || c.spineJX === undefined || c.spineJY === undefined) return null
  const par = getPlacement(c.spineParent)
  if (!par) return null
  const pn = getNode(par.nodeId)
  const rot = ((pn?.rotation || 0) * Math.PI) / 180
  const cos = Math.cos(rot)
  const sin = Math.sin(rot)
  const pos = placementPos(par)
  return { x: pos.x + c.spineJX * cos - c.spineJY * sin, y: pos.y + c.spineJX * sin + c.spineJY * cos }
}

// 척추화 마법사: 우클릭 Spine → ①자기 연결점 클릭 → ②상대 연결점 클릭(꿰매기)
// step1=자기 점 대기, step2=상대 점 대기(자기 점은 childAX/AY에 월드로 보관)
let spineWizard: { childPid: string; step: 1 | 2; childAX?: number; childAY?: number } | null = null
export const getSpineWizard = () => spineWizard
/** 우클릭 대상(childPid)으로 척추화 시작 → 다음 캔버스 클릭이 '자기 연결점'. */
export function beginSpineFor(childPid: string) {
  const p = getPlacement(childPid)
  if (!p) return
  spineWizard = { childPid, step: 1 }
  // 그룹이면 그룹 전체를 자식으로(선택 유지), 아니면 그 하나만
  selection = new Set(p.groupId ? groupMembers(childPid) : [childPid])
  bumpUI()
  markDirty()
}
export function cancelSpine() {
  if (!spineWizard) return
  spineWizard = null
  bumpUI()
  markDirty()
}
/** ① 자기 도형의 연결점(월드) 확정 → step2로. */
export function setSpineChildAnchor(wx: number, wy: number) {
  if (!spineWizard || spineWizard.step !== 1) return
  spineWizard = { ...spineWizard, step: 2, childAX: wx, childAY: wy }
  bumpUI()
  markDirty()
}
/** ② 상대 도형(parentPid)의 연결점(월드)에 꿰맴 → 부모/관절 저장 + 자식(그룹)을 그 점으로 당겨 붙임. */
export function finishSpine(parentPid: string, wx: number, wy: number) {
  if (!spineWizard || spineWizard.step !== 2 || spineWizard.childAX === undefined) return
  const childPid = spineWizard.childPid
  const cp = getPlacement(childPid)
  const par = getPlacement(parentPid)
  // 그룹이면 멤버 전체가 자식
  const members = cp?.groupId ? groupMembers(childPid) : [childPid]
  if (!par || members.includes(parentPid) || members.some((m) => spineWouldCycle(m, parentPid))) {
    spineWizard = null
    bumpUI()
    markDirty()
    return
  }
  // 부모 연결점을 부모 로컬 프레임으로 저장(=관절). 그룹이면 모든 멤버가 같은 관절 공유.
  const pn = getNode(par.nodeId)
  const rot = ((pn?.rotation || 0) * Math.PI) / 180
  const cos = Math.cos(-rot)
  const sin = Math.sin(-rot)
  const ppos = placementPos(par)
  const jdx = wx - ppos.x
  const jdy = wy - ppos.y
  const jx = jdx * cos - jdy * sin
  const jy = jdx * sin + jdy * cos
  for (const m of members) {
    const mp = getPlacement(m)
    if (!mp) continue
    mp.spineParent = parentPid
    mp.spineJX = jx
    mp.spineJY = jy
  }
  // 실로 꿰매기: 자식의 연결점(childAX/AY)이 부모 연결점(wx,wy)에 붙게 자식(그룹+하위) 전체 이동
  const dx = wx - spineWizard.childAX
  const dy = wy - spineWizard.childAY!
  const unit = new Set<string>()
  for (const m of members) {
    unit.add(m)
    for (const d of spineDescendants(m)) unit.add(d)
  }
  for (const id of unit) {
    const p = getPlacement(id)
    if (!p) continue
    const pos = placementPos(p)
    writePos(p, pos.x + dx, pos.y + dy)
  }
  spineWizard = null
  changed()
}
export function unspine(pid: string) {
  const p = getPlacement(pid)
  const members = p?.groupId ? groupMembers(pid) : [pid] // 그룹이면 전체 해제
  for (const m of members) {
    const mp = getPlacement(m)
    if (mp) {
      delete mp.spineParent
      delete mp.spineJX
      delete mp.spineJY
    }
  }
  changed()
}

/** 강체 단위: pid가 그룹이면 그룹 멤버 전체, 아니면 자기 하나 + 각자의 척추 하위 전체. */
export function rigidUnit(pid: string): string[] {
  const p = getPlacement(pid)
  const base = p?.groupId ? groupMembers(pid) : [pid]
  const out = new Set<string>(base)
  for (const b of base) for (const d of spineDescendants(b)) out.add(d)
  return [...out]
}

/** 주어진 배치들을 pivot(월드) 중심으로 ddeg(도)만큼 회전(위치 궤도 + 회전각). 라이브. */
export function rotatePidsLive(pids: string[], pivotX: number, pivotY: number, ddeg: number) {
  const rad = (ddeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  for (const id of pids) {
    const p = getPlacement(id)
    if (!p) continue
    const pos = placementPos(p)
    const dx = pos.x - pivotX
    const dy = pos.y - pivotY
    writePos(p, pivotX + dx * cos - dy * sin, pivotY + dx * sin + dy * cos)
    const n = getNode(p.nodeId)
    if (n) n.rotation = ((((n.rotation || 0) + ddeg) % 360) + 360) % 360
  }
  markDirty()
}
export function selectMany(pids: string[]) {
  selection = new Set(pids)
  if (pids.length) selectedComponentId = null
  mobileEditOpen = false
  changed()
}
/** 현재 공간의 모든 항목 선택 (Ctrl+A) */
export function selectAll() {
  selectMany(placementsInCurrentSpace().map((p) => p.id))
}

// ── 노드 + 배치 CRUD ─────────────────────────────────────────
export function addNode(type: NodeType, x: number, y: number): SNode {
  const isText = type === 'text'
  const isShape = type === 'shape' // 노트 없는 순수 도형
  const node: SNode = {
    id: uid(type === 'folder' ? 'f' : isText ? 't' : isShape ? 's' : 'm'),
    type,
    name: type === 'folder' ? 'New folder' : isText ? 'Text' : isShape ? 'Shape' : 'New note',
    shape: isText || type === 'folder' || isShape ? 'rect' : 'circle',
    w: isText ? 40 : 68,
    h: isText ? 30 : 68,
    color: type === 'folder' || isShape ? '#5b8cff' : isText ? 'none' : '#34c98a',
    updatedAt: Date.now(),
    ...(isText
      ? { body: '', textColor: '#ffffff', fontSize: 20, align: 'left' as const, radius: 6 }
      : {}),
  }
  doc.nodes.push(node)
  const space = getCurrentSpace()
  // 같은 자리에 중첩으로 안 쌓이게 빈 자리로 살짝 비켜줌(붙여넣기와 동일 로직)
  const { dx, dy } = findFreeOffset(space, [{ x, y }], 0, 0)
  const pl: Placement = { id: uid('p'), nodeId: node.id, space, x: x + dx, y: y + dy }
  doc.placements.push(pl)
  selection = new Set([pl.id])
  changed()
  return node
}

export function updateNode(id: string, patch: Partial<SNode>) {
  const n = getNode(id)
  if (!n) return
  Object.assign(n, patch)
  // 텍스트 개체: 박스가 내용(글자)보다 작아지지 않게 최소 크기 보장
  if (n.type === 'text') {
    if (n.wrap) {
      // 고정 폭 줄바꿈: 폭은 유지(최소 40), 높이는 줄바꿈 결과 이상
      if (n.w < 40) n.w = 40
      const minH = wrappedHeight(n, n.w)
      if (n.h < minH) n.h = minH
    } else {
      const m = measureTextNode(n)
      if (n.w < m.w) n.w = m.w
      if (n.h < m.h) n.h = m.h
    }
  }
  n.updatedAt = Date.now()
  changed()
}

/** 라디우스(모서리) 라이브 변경 — ▲▼ 꾹 누르는 동안 히스토리 없이 즉시 반영(손 떼면 commit). */
export function setRadiusLive(id: string, val: number) {
  const n = getNode(id)
  if (!n) return
  n.radius = Math.max(0, Math.round(val))
  markDirty()
  bumpUI()
}

/** 사진 회전 드래그 중: 각도만 갱신(히스토리 없음). 손 떼면 updateNode(id,{})로 1스텝 확정. */
export function setRotationLive(id: string, deg: number) {
  const n = getNode(id)
  if (!n) return
  n.rotation = ((deg % 360) + 360) % 360
  markDirty()
}

// ── 텍스트 개체 인라인 편집 ───────────────────────────────────
let editingTextPid: string | null = null
export const getEditingTextPid = () => editingTextPid

/** + Text / 't' : 텍스트 개체 생성 후 바로 인라인 편집 시작. 반환=placement id. */
export function addText(x: number, y: number): string {
  const node = addNode('text', x, y) // 생성+선택, 반환=node
  const pl = doc.placements.find((p) => p.nodeId === node.id)
  editingTextPid = pl ? pl.id : null
  changed()
  return editingTextPid || ''
}

export function startTextEdit(pid: string) {
  editingTextPid = pid
  selection = new Set([pid])
  changed()
}

/** 편집 중 입력에 따라 박스 크기/중심을 실시간 반영(캔버스만 다시 그림, 히스토리·저장은 커밋 때). */
export function liveResizeText(pid: string, w: number, h: number, cx: number, cy: number) {
  const pl = getPlacement(pid)
  if (!pl) return
  const n = getNode(pl.nodeId)
  if (!n) return
  n.w = Math.max(8, w)
  n.h = Math.max(8, h)
  writePos(pl, cx, cy)
  markDirty()
}

/** 편집 중 본문/줄바꿈을 실시간 반영(히스토리·저장 없이) → 캔버스가 현재 글자를 바로 그림. */
export function liveSetTextBody(pid: string, body: string, wrap: boolean) {
  const pl = getPlacement(pid)
  const n = pl && getNode(pl.nodeId)
  if (!n) return
  n.body = body
  if (!n.lock) n.wrap = wrap
  markDirty()
}

/**
 * 편집 종료(커밋). body 비면 노드/배치 삭제. w/h(월드)와 중심좌표(cx,cy)로 박스 맞춤.
 */
export function commitText(
  pid: string,
  body: string,
  w: number,
  h: number,
  cx: number,
  cy: number,
  wrap?: boolean,
) {
  editingTextPid = null
  const pl = getPlacement(pid)
  if (!pl) {
    changed()
    return
  }
  if (!body.trim()) {
    const nodeId = pl.nodeId
    doc.placements = doc.placements.filter((p) => p.id !== pid)
    if (!doc.placements.some((p) => p.nodeId === nodeId))
      doc.nodes = doc.nodes.filter((nn) => nn.id !== nodeId)
    selection = new Set()
    changed()
    return
  }
  const n = getNode(pl.nodeId)
  if (n) {
    n.body = body
    n.name = body.split('\n')[0].trim() || 'Text' // 라이브러리 라벨
    n.w = Math.max(8, w)
    n.h = Math.max(8, h)
    if (wrap !== undefined && !n.lock) n.wrap = wrap // 화면 폭 도달 시 줄바꿈 모드
    n.updatedAt = Date.now()
  }
  writePos(pl, cx, cy)
  changed()
}

/** 드래그 중에는 React 재렌더 없이 배치 좌표만 갱신(=부드러움). 끝날 때 commit */
export function moveNodeLive(pid: string, x: number, y: number) {
  const p = getPlacement(pid)
  if (!p || p.locked) return // 잠긴 항목은 움직이지 않음
  writePos(p, x, y)
  markDirty()
}

/** 위치 잠금 토글 (인스펙터 자물쇠). 잠그면 드래그·좌표편집·방향키로 안 움직임. */
export const isPlacementLocked = (pid: string | null | undefined) => !!getPlacement(pid)?.locked
export function togglePlacementLock(pid: string) {
  const p = getPlacement(pid)
  if (!p) return
  p.locked = !p.locked
  changed()
}
export function commitMove(pid: string) {
  const p = getPlacement(pid)
  if (!p) return
  const n = getNode(p.nodeId)
  if (n) n.updatedAt = Date.now()
  changed()
}

/** 드래그 리사이즈 중: React 재렌더 없이 노드 크기만 갱신(=부드러움). 손 떼면 commitMove로 확정. */
export function setNodeSizeLive(nodeId: string, w: number, h: number) {
  const n = getNode(nodeId)
  if (!n) return
  n.w = Math.max(8, w)
  n.h = Math.max(8, h)
  markDirty()
}

/** 선 그리기·끝점 편집: 길이(w)만 갱신(두께 h는 유지, 최소 1). */
export function setNodeWidthLive(nodeId: string, w: number) {
  const n = getNode(nodeId)
  if (!n) return
  n.w = Math.max(1, w)
  markDirty()
}

/** 인스펙터에서 좌표 직접 수정 */
export function setPlacementXY(pid: string, x: number, y: number) {
  const p = getPlacement(pid)
  if (!p || p.locked) return // 잠긴 항목은 좌표 편집 무시
  writePos(p, x, y)
  const n = getNode(p.nodeId)
  if (n) n.updatedAt = Date.now()
  changed()
}

/** 현재 공간의 부모 공간 (한 단계 위). 최상위면 null. */
export function parentSpace(): string | null {
  return spacePath.length >= 2 ? spacePath[spacePath.length - 2] : null
}

/** 그리기 순서(z) 변경. doc.placements 내 위치 = 그리는 순서(뒤=위). 같은 공간 내에서 이동. */
export function reorderPlacement(pid: string, dir: 'front' | 'back' | 'forward' | 'backward') {
  const arr = doc.placements
  const i = arr.findIndex((p) => p.id === pid)
  if (i < 0) return
  const p = arr[i]
  if (dir === 'front') {
    arr.splice(i, 1)
    arr.push(p) // 맨 뒤 = 맨 위
  } else if (dir === 'back') {
    arr.splice(i, 1)
    arr.unshift(p) // 맨 앞 = 맨 아래
  } else if (dir === 'forward') {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j].space === p.space) {
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
        break
      }
    }
  } else {
    for (let j = i - 1; j >= 0; j--) {
      if (arr[j].space === p.space) {
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
        break
      }
    }
  }
  changed()
}

/** 노드 완전 삭제: 노드 + 모든 배치 + (폴더면)내부까지 + 관련 엣지 */
export function deleteNode(nodeId: string) {
  const n = getNode(nodeId)
  if (!n) return
  // 삭제 대상 노드 집합: nodeId + 그 폴더(들) 내부에 놓인 노드들 재귀
  const delNodes = new Set<string>([nodeId])
  let grew = true
  while (grew) {
    grew = false
    for (const p of doc.placements) {
      if (p.space && delNodes.has(p.space) && !delNodes.has(p.nodeId)) {
        delNodes.add(p.nodeId)
        grew = true
      }
    }
  }
  doc.nodes = doc.nodes.filter((x) => !delNodes.has(x.id))
  // 사라질 placement id들 (이 노드/하위 노드의 배치 전부) → 그 배치에 걸린 참조선도 제거
  const removedPids = new Set(
    doc.placements
      .filter((p) => delNodes.has(p.nodeId) || (p.space !== null && delNodes.has(p.space)))
      .map((p) => p.id),
  )
  doc.placements = doc.placements.filter(
    (p) => !delNodes.has(p.nodeId) && !(p.space !== null && delNodes.has(p.space)),
  )
  doc.edges = doc.edges.filter((e) => !removedPids.has(e.from) && !removedPids.has(e.to))
  // 사라진 placement는 선택에서 제거
  const live = new Set(doc.placements.map((p) => p.id))
  selection = new Set([...selection].filter((pid) => live.has(pid)))
  changed()
}

/** 선택된 항목 전부 삭제 (다중 삭제). 같은 노드를 가리키는 placement는 한 번만 처리. */
export function deleteSelection() {
  const nodeIds = [...selection]
    .map((pid) => getPlacement(pid)?.nodeId)
    .filter((x): x is string => !!x)
  for (const nid of new Set(nodeIds)) deleteNode(nid)
}

/** 선택된 항목들끼리 연결된 참조선들(양 끝 모두 선택). */
export function selectionInternalEdges(): SEdge[] {
  return doc.edges.filter((e) => selection.has(e.from) && selection.has(e.to))
}
export function selectionHasInternalEdges(): boolean {
  return doc.edges.some((e) => selection.has(e.from) && selection.has(e.to))
}

/** "참조 해제": 선택된 항목들끼리의 참조선만 제거. 한쪽만 선택된 참조(예: 1↔4 중 4 미선택)는 유지. */
export function removeEdgesAmongSelection() {
  const before = doc.edges.length
  doc.edges = doc.edges.filter((e) => !(selection.has(e.from) && selection.has(e.to)))
  if (doc.edges.length !== before) changed()
}

/** 선택 내부 참조선들의 색을 일괄 설정. */
export function setEdgeColorAmongSelection(color: string) {
  let hit = false
  for (const e of doc.edges)
    if (selection.has(e.from) && selection.has(e.to)) (e.color = color), (hit = true)
  if (hit) changed()
}

/** 선택 내부 참조선들의 강조(굵게) 토글. 하나라도 보통이면 전부 굵게, 다 굵으면 전부 해제. */
export function toggleEdgeBoldAmongSelection() {
  const edges = selectionInternalEdges()
  if (!edges.length) return
  const target = !edges.every((e) => e.bold)
  for (const e of edges) e.bold = target
  changed()
}

/** 선택 항목 중 하나라도 여러 곳에 놓인(공유=유니크) 노드가 있나 → 삭제 모달에 "여기서만/전체" 분기. */
export function selectionHasShared(): boolean {
  for (const pid of selection) {
    const nid = getPlacement(pid)?.nodeId
    if (nid && placementCount(nid) > 1) return true
  }
  return false
}

/** "여기서만 삭제": 공유 노드는 이 배치만 제거(다른 곳 유지), 단독 노드는 통째로 삭제. */
export function deleteSelectionHereOnly() {
  const entries = [...selection]
    .map((pid) => ({ pid, nodeId: getPlacement(pid)?.nodeId }))
    .filter((e): e is { pid: string; nodeId: string } => !!e.nodeId)
  for (const { pid, nodeId } of entries) {
    if (placementCount(nodeId) > 1) removePlacement(pid)
    else deleteNode(nodeId)
  }
}

// ── 다대다 참조 ──────────────────────────────────────────────
/** 노드가 몇 곳에 놓였나 */
export function placementCount(nodeId: string): number {
  return doc.placements.filter((p) => p.nodeId === nodeId).length
}

/** space 가 nodeId 자신 또는 그 하위 공간인지 (= 폴더를 자기 안에 넣는 순환) */
function isCyclic(nodeId: string, space: string | null): boolean {
  if (space === null) return false
  const desc = new Set<string>([nodeId]) // nodeId 하위 폴더 공간 전부
  let grew = true
  while (grew) {
    grew = false
    for (const p of doc.placements) {
      if (p.space !== null && desc.has(p.space) && !desc.has(p.nodeId)) {
        desc.add(p.nodeId)
        grew = true
      }
    }
  }
  return desc.has(space)
}

/** 지정한 공간(폴더)에 기존 노드를 "참조"로 추가 (placement 하나 더). 원본 노드는 그대로 1개. */
export function addPlacement(nodeId: string, space: string | null, x: number, y: number) {
  const n = getNode(nodeId)
  if (!n) return
  if (doc.placements.some((p) => p.nodeId === nodeId && p.space === space)) return // 이미 거기 있음
  if (space !== null && isCyclic(nodeId, space)) return // 순환 방지
  const pl: Placement = { id: uid('p'), nodeId, space, x, y }
  doc.placements.push(pl)
  selection = new Set([pl.id])
  changed()
}

/** 이 배치만 제거 ("여기서만 빼기"). 노드/다른 배치는 살림. */
export function removePlacement(pid: string) {
  const p = getPlacement(pid)
  if (!p) return
  doc.placements = doc.placements.filter((x) => x.id !== pid)
  doc.edges = doc.edges.filter((e) => e.from !== pid && e.to !== pid) // 이 배치의 참조선 제거
  selection.delete(pid)
  changed()
}

/** dragItem(nodeId)을 folderNodeId 안으로 넣을 수 있나 (자기 자신·순환 방지) */
export function canNestInto(nodeId: string, folderNodeId: string): boolean {
  if (nodeId === folderNodeId) return false
  const f = getNode(folderNodeId)
  if (!f || f.type !== 'folder') return false
  return !isCyclic(nodeId, folderNodeId)
}

/**
 * 노트를 노트 위로 끌어다 놓기 = 데이터만 맞바꿈(swap). 두 배치의 nodeId만 교환하므로
 * 위치·참조선(엣지는 배치 기준)은 그 자리에 그대로 남고, 각 자리에 상대 노트의 데이터가 들어온다.
 */
export function swapPlacementNodes(pidA: string, pidB: string) {
  const a = getPlacement(pidA)
  const b = getPlacement(pidB)
  if (!a || !b || a.id === b.id || a.locked || b.locked) return // 잠긴 개체는 교체 금지
  const tmp = a.nodeId
  a.nodeId = b.nodeId
  b.nodeId = tmp
  changed()
}

/** 이름+본문을 소문자 단어 집합으로 (텍스트 관련도 계산용) */
function wordSet(n?: SNode): Set<string> {
  const s = new Set<string>()
  if (!n) return s
  for (const w of `${n.name} ${n.body || ''}`.toLowerCase().split(/[\s,.\-_/()[\]{}!?:;'"]+/))
    if (w.length > 1) s.add(w)
  return s
}

/**
 * 현재 공간 안에서 태그(또는 이름)로 메모 검색 — 에디터 교체 후보 리스트(노출+보관 포함).
 * 정렬: ① 기준 노트(refNodeId)와 공통 해시태그 많은 순 → ② 겹치는 텍스트(단어) 많은 순 → ③ 이름.
 */
export function searchNotesInCurrentSpace(query: string, refNodeId?: string): SNode[] {
  const space = getCurrentSpace()
  const q = query.trim().replace(/^#/, '').toLowerCase()
  const ref = refNodeId ? getNode(refNodeId) : undefined
  const refTags = new Set((ref?.tags || []).map((t) => t.toLowerCase()))
  const refWords = wordSet(ref)
  const seen = new Set<string>()
  const scored: { n: SNode; tagScore: number; textScore: number }[] = []
  for (const p of doc.placements) {
    if (p.space !== space || seen.has(p.nodeId) || p.nodeId === refNodeId) continue
    const n = getNode(p.nodeId)
    if (!n || n.type !== 'memo') continue
    const hit =
      q === '' ||
      n.name.toLowerCase().includes(q) ||
      (n.tags || []).some((t) => t.toLowerCase().includes(q))
    if (!hit) continue
    seen.add(p.nodeId)
    const tagScore = (n.tags || []).reduce((c, t) => c + (refTags.has(t.toLowerCase()) ? 1 : 0), 0)
    let textScore = 0
    for (const w of wordSet(n)) if (refWords.has(w)) textScore++
    scored.push({ n, tagScore, textScore })
  }
  scored.sort(
    (a, b) => b.tagScore - a.tagScore || b.textScore - a.textScore || a.n.name.localeCompare(b.n.name),
  )
  return scored.map((s) => s.n)
}

/**
 * 에디터 "교체": 자리(slotPid)에 newNodeId를 노출시키고 기존 노트는 같은 공간 보관함으로.
 * 같은 공간에 있던 newNode의 다른 배치(보통 보관됨)에 기존 노트를 넣어 맞교환(입장 바뀜).
 * 자리의 pid는 그대로라 참조선은 유지된다.
 */
export function swapInNote(slotPid: string, newNodeId: string) {
  const slot = getPlacement(slotPid)
  if (!slot) return
  const oldNodeId = slot.nodeId
  if (oldNodeId === newNodeId) return
  const space = slot.space
  const other = doc.placements.find(
    (p) => p.id !== slotPid && p.space === space && p.nodeId === newNodeId,
  )
  if (other) {
    other.nodeId = oldNodeId // 그 배치(보관/노출 상태 유지)에 기존 노트가 들어감
  } else {
    // newNode가 이 공간에 배치가 없던 경우 → 기존 노트를 보관 전용으로 새로 보관(양쪽 우주 다 숨김)
    doc.placements.push({
      id: uid('p'),
      nodeId: oldNodeId,
      space,
      x: slot.x,
      y: slot.y,
      stored: true,
      storedM: true,
    })
  }
  slot.nodeId = newNodeId
  slot.stored = false // 자리는 노출 상태로(양쪽 우주)
  delete slot.storedM
  changed()
}

/** 이 배치를 다른 공간(폴더)으로 이동 — "폴더 위로 끌어다 놓기". 참조 아님(소속만 바뀜). */
export function movePlacementToSpace(pid: string, space: string | null, x = 0, y = 0) {
  const p = getPlacement(pid)
  if (!p || p.locked) return // 잠긴 항목은 폴더로 이동도 막음
  if (space !== null && !canNestInto(p.nodeId, space)) return
  p.space = space
  p.x = x
  p.y = y
  const n = getNode(p.nodeId)
  if (n) n.updatedAt = Date.now()
  changed()
}

// ── 엣지 (보여주기용 줄 잇기, placement-to-placement) ─────────
// 참조선은 "배치(placement)" 단위. 같은 노드를 유니크 복사해도 각 배치는 자기만의 참조선을 가짐
// (내용은 공유, 참조는 분리). from/to = placement id.
function edgeIndex(from: string, to: string) {
  return doc.edges.findIndex(
    (e) => (e.from === from && e.to === to) || (e.from === to && e.to === from),
  )
}
/** 줄 추가(이미 있으면 무시) — 박스로 여러 개 연결할 때. 인자는 placement id. */
export function linkPlacements(from: string, to: string) {
  if (from === to || edgeIndex(from, to) >= 0) return
  doc.edges.push({ id: uid('e'), from, to })
  changed()
}
/** 줄 토글(있으면 제거, 없으면 추가) — Ctrl+Alt+클릭. 인자는 placement id. */
export function togglePlacementEdge(from: string, to: string) {
  if (from === to) return
  const i = edgeIndex(from, to)
  if (i >= 0) doc.edges.splice(i, 1)
  else doc.edges.push({ id: uid('e'), from, to })
  changed()
}

export function edgesInCurrentSpace() {
  const pids = new Set(placementsInCurrentSpace().map((p) => p.id))
  return doc.edges.filter((e) => pids.has(e.from) && pids.has(e.to))
}

// ── 컴포넌트(재사용 스냅샷) ──────────────────────────────────
export const getComponents = (): ComponentDef[] => doc.components

/** 노드 하나(폴더면 하위 전체)를 독립 미니 문서로 추출 */
function nodeToDoc(nodeId: string): SimpraWorldDoc | null {
  const n = getNode(nodeId)
  if (!n) return null
  if (n.type === 'folder') return exportFolderDoc(nodeId) // 폴더 = 서브트리 통째로
  // 메모 = 단일 노드 문서
  const out = emptyDoc()
  out.nodes.push({ ...n })
  out.placements.push({ id: uid('p'), nodeId: n.id, space: null, x: 0, y: 0 })
  if (n.assetId) {
    const a = getAsset(n.assetId)
    if (a) out.assets.push({ ...a })
  }
  return out
}

/** 선택 기준 추천 컴포넌트 이름 (이름 입력 프롬프트 기본값). */
export function suggestComponentName(): string {
  if (!selection.size) return 'Component'
  const firstNode = getNode(getPlacement([...selection][0])?.nodeId)
  const base = firstNode?.name || 'Group'
  return selection.size > 1 ? `${base} +${selection.size - 1}` : base
}

/** 선택(단일 또는 다중)을 컴포넌트(스냅샷)로 저장 → 목록에 추가. 사진·폴더·노트 혼합 가능. */
export function saveSelectionAsComponent(name?: string): ComponentDef | undefined {
  if (!selection.size) return
  // 스플라인(척추)으로 묶인 개체는 어느 걸 골라도 그룹 '전체'(루트+전 하위)를 함께 포함
  // → 컴포넌트에 '연결된 상태'로 들어감. (자식만 골라도 부모·형제까지 딸려옴)
  const pids = new Set(selection)
  for (const pid of [...pids]) for (const g of spineGroup(pid)) pids.add(g)
  const cdoc = selectionToDoc(pids) // 다중-루트 미니문서(상대 위치 + 척추 관절 유지)
  if (!cdoc.nodes.length) return
  const c: ComponentDef = {
    id: uid('c'),
    name: name?.trim() || suggestComponentName(),
    doc: cdoc,
    updatedAt: Date.now(),
  }
  doc.components.push(c)
  changed()
  return c
}

/** 컴포넌트 이름 변경 (컴포넌트 탭에서). */
export function renameComponent(id: string, name: string) {
  const c = doc.components.find((x) => x.id === id)
  if (!c) return
  c.name = name.trim() || c.name
  c.updatedAt = Date.now()
  changed()
}

export function deleteComponent(id: string) {
  doc.components = doc.components.filter((c) => c.id !== id)
  if (selectedComponentId === id) selectedComponentId = null
  changed()
}

/** 외부에서 들여온(.spu) 미니 문서를 컴포넌트 목록에 추가 */
export function addComponentDoc(name: string, cdoc: SimpraWorldDoc): ComponentDef {
  migrateEdgesToPlacements(cdoc) // 구버전 컴포넌트 .spu도 placement 기준으로 변환
  const c: ComponentDef = { id: uid('c'), name, doc: cdoc, updatedAt: Date.now() }
  doc.components.push(c)
  changed()
  return c
}

/** 미니 문서를 특정 공간 (ox,oy) 위치에 복제 삽입(id 전부 remap). 루트 placement를 선택. */
function placeDoc(incoming: SimpraWorldDoc, space: string | null, dx: number, dy: number) {
  const idMap = new Map<string, string>()
  const remap = (old: string) => {
    if (!idMap.has(old)) idMap.set(old, uid('i'))
    return idMap.get(old)!
  }
  for (const a of incoming.assets) doc.assets.push({ ...a, id: remap(a.id) })
  for (const n of incoming.nodes) {
    doc.nodes.push({ ...n, id: remap(n.id), assetId: n.assetId ? remap(n.assetId) : undefined })
  }
  const rootPids: string[] = []
  for (const p of incoming.placements) {
    const isRoot = p.space === null // 루트(=붙여넣을 항목)는 현재 공간으로, (dx,dy)만큼 평행이동
    const np: Placement = {
      id: remap(p.id),
      nodeId: remap(p.nodeId),
      space: isRoot ? space : remap(p.space!),
      x: isRoot ? p.x + dx : p.x,
      y: isRoot ? p.y + dy : p.y,
      locked: p.locked, // 위치잠금 유지
      groupId: p.groupId ? remap(p.groupId) : undefined, // 그룹 유지(새 그룹 id로 remap)
      spineParent: p.spineParent ? remap(p.spineParent) : undefined, // 관절 부모 유지
      spineJX: p.spineJX,
      spineJY: p.spineJY,
    }
    doc.placements.push(np)
    if (isRoot) rootPids.push(np.id)
  }
  for (const e of incoming.edges) {
    doc.edges.push({ id: uid('e'), from: remap(e.from), to: remap(e.to), color: e.color, bold: e.bold })
  }
  selection = new Set(rootPids) // 붙여넣은 항목 전체 선택
  changed()
}

/** 컴포넌트를 현재 공간 카메라 중앙에 복제 생성(stamp). 첫 루트를 중앙으로 + 겹침 회피. */
export function stampComponent(id: string) {
  const c = doc.components.find((x) => x.id === id)
  if (!c) return
  const roots = c.doc.placements.filter((p) => p.space === null)
  const ref = roots[0] ?? { x: 0, y: 0 } // 그룹 기준점(첫 루트)을 카메라 중앙으로
  const { dx, dy } = findFreeOffset(getCurrentSpace(), roots, camera.x - ref.x, camera.y - ref.y)
  placeDoc(c.doc, getCurrentSpace(), dx, dy)
}

// ── 에셋(사진) ───────────────────────────────────────────────
export function addAsset(a: Asset) {
  doc.assets.push(a)
  changed()
}

/** 사진 개체 생성: 에셋 등록 + photo 노드 1개를 (x,y)에 생성(비율 유지). 라벨·노트편집 없음. */
export function addPhoto(
  img: { thumb: string; mime: string; w: number; h: number },
  x: number,
  y: number,
): SNode {
  const asset: Asset = { id: uid('a'), kind: 'image', mime: img.mime, thumb: img.thumb }
  doc.assets.push(asset)
  const node = addNode('memo', x, y) // 생성 + 단독 선택
  const MAX = 320 // 월드 기준 최대 변(기본 사진 크기)
  const scale = Math.min(1, MAX / Math.max(img.w, img.h, 1))
  node.type = 'photo' // 노트가 아닌 "사진" 개체
  node.assetId = asset.id
  node.shape = 'image'
  node.name = 'Photo'
  node.w = Math.max(8, Math.round(img.w * scale))
  node.h = Math.max(8, Math.round(img.h * scale))
  node.updatedAt = Date.now()
  changed()
  return node
}

/** 폴더 하나(+내부 전체)를 독립 문서로 추출 → .spu 내보내기용. 폴더가 루트가 됨. */
export function exportFolderDoc(folderId: string): SimpraWorldDoc {
  const out = emptyDoc()
  // subtree 공간(폴더 id) 집합
  const spaces = new Set<string>([folderId])
  let grew = true
  while (grew) {
    grew = false
    for (const p of doc.placements) {
      if (p.space && spaces.has(p.space) && !spaces.has(p.nodeId)) {
        const n = getNode(p.nodeId)
        if (n && n.type === 'folder') {
          spaces.add(p.nodeId)
          grew = true
        }
      }
    }
  }
  // 포함 노드
  const nodeIds = new Set<string>([folderId])
  for (const p of doc.placements) if (p.space && spaces.has(p.space)) nodeIds.add(p.nodeId)
  for (const id of nodeIds) {
    const n = getNode(id)
    if (n) out.nodes.push({ ...n })
  }
  // 배치: 폴더 자신은 루트로, 내부 배치는 그대로(원본 pid 유지)
  out.placements.push({ id: uid('p'), nodeId: folderId, space: null, x: 0, y: 0 })
  const innerPids = new Set<string>()
  for (const p of doc.placements)
    if (p.space && spaces.has(p.space)) (out.placements.push({ ...p }), innerPids.add(p.id))
  // 엣지 (포함 배치끼리)
  for (const e of doc.edges) if (innerPids.has(e.from) && innerPids.has(e.to)) out.edges.push({ ...e })
  // 사용된 에셋·템플릿만
  const assetIds = new Set<string>()
  for (const id of nodeIds) {
    const n = getNode(id)
    if (n?.assetId) assetIds.add(n.assetId)
  }
  for (const a of doc.assets) if (assetIds.has(a.id)) out.assets.push({ ...a })
  // 필기 획: 포함된 공간(폴더·하위폴더)에 그려진 것만 함께 내보냄(공간 id 유지)
  for (const s of doc.strokes ?? []) if (s.space && spaces.has(s.space)) out.strokes!.push({ ...s })
  return out
}

/**
 * 한 공간(spaceId) 안의 모든 것을 독립 문서로 추출 (선택 없이 Export = 현재 공간 전체).
 * 그 공간의 직속 자식들은 루트(space=null)로, 더 깊은 건 구조 그대로. 유니버스명 동봉.
 */
export function exportSpaceDoc(spaceId: string | null): SimpraWorldDoc {
  const out = emptyDoc()
  out.universeName = doc.universeName
  // spaceId에서 도달 가능한 하위 폴더(공간) 집합
  const spaces = new Set<string | null>([spaceId])
  let grew = true
  while (grew) {
    grew = false
    for (const p of doc.placements) {
      if (spaces.has(p.space) && !spaces.has(p.nodeId)) {
        const n = getNode(p.nodeId)
        if (n && n.type === 'folder') {
          spaces.add(p.nodeId)
          grew = true
        }
      }
    }
  }
  const nodeIds = new Set<string>()
  const inclPids = new Set<string>()
  for (const p of doc.placements) {
    if (spaces.has(p.space)) {
      nodeIds.add(p.nodeId)
      inclPids.add(p.id)
      // 현재 공간의 직속 자식 → 루트로(space=null), 나머지는 구조 그대로(원본 pid 유지)
      out.placements.push({ ...p, space: p.space === spaceId ? null : p.space })
    }
  }
  for (const id of nodeIds) {
    const n = getNode(id)
    if (n) out.nodes.push({ ...n })
  }
  const assetIds = new Set<string>()
  for (const id of nodeIds) {
    const n = getNode(id)
    if (n?.assetId) assetIds.add(n.assetId)
  }
  for (const a of doc.assets) if (assetIds.has(a.id)) out.assets.push({ ...a })
  for (const e of doc.edges) if (inclPids.has(e.from) && inclPids.has(e.to)) out.edges.push({ ...e })
  // 필기 획: 포함 공간에 그려진 것만. 현재 공간 직속(space===spaceId)은 배치와 동일하게 루트(null)로 재매핑.
  for (const s of doc.strokes ?? [])
    if (spaces.has(s.space)) out.strokes!.push({ ...s, space: s.space === spaceId ? null : s.space })
  return out
}

/** 유니버스 전체(유니버스명·모든 공간/노드/배치/엣지·컴포넌트)를 그대로 추출 — Save용(무손실). */
export function exportUniverseDoc(): SimpraWorldDoc {
  return doc
}

/** 모든 컴포넌트를 한 문서로 묶어 추출 (컴포넌트 Export all). */
export function exportAllComponentsDoc(): SimpraWorldDoc {
  const out = emptyDoc()
  out.components = doc.components.map((c) => ({ ...c }))
  return out
}

/** 전부 초기화: 모든 데이터를 버리고 기본 샘플 세계로 되돌림(되돌릴 수 없음). */
export function resetToSample() {
  doc = makeSampleWorld()
  spacePath = []
  selection = new Set()
  camera = { x: 0, y: 0, zoom: defaultZoom() }
  noteEditorNodeId = null
  noteUndoFloor = null
  selectedComponentId = null
  resetHistory() // 리셋은 되돌릴 수 없음 → 히스토리도 비움
  changed() // 저장(IndexedDB)도 함께
}

/** 새 파일(New): 빈 유니버스로 시작. 화면 상태도 초기화. */
export function newWorld() {
  doc = emptyDoc()
  spacePath = []
  selection = new Set()
  camera = { x: 0, y: 0, zoom: defaultZoom() }
  noteEditorNodeId = null
  noteUndoFloor = null
  selectedComponentId = null
  resetHistory()
  changed()
}

/**
 * 다른 유니버스 파일을 "열기": 현재 유니버스를 전부 버리고 incoming으로 교체(병합 아님).
 * Load(다른 파일 열기)용. resetToSample과 같은 방식으로 화면 상태도 초기화한다.
 */
export function replaceWorld(incoming: SimpraWorldDoc) {
  migrateEdgesToPlacements(incoming) // 구버전 .spu도 placement 기준으로
  doc = { ...emptyDoc(), ...incoming }
  spacePath = []
  selection = new Set()
  camera = { x: 0, y: 0, zoom: defaultZoom() }
  noteEditorNodeId = null
  noteUndoFloor = null
  selectedComponentId = null
  resetHistory() // 새 문서를 연 것이므로 이전 히스토리는 버림
  changed()
}

/** .spu 폴더를 My Universe(최상위)로 가져오기. 루트 폴더 이름이 겹치면 "이름(1)". */
export function importWorld(incoming: SimpraWorldDoc, at?: { x: number; y: number }) {
  const space = getCurrentSpace() // 현재 들어와 있는 공간에 가져옴(루트 아님)
  migrateEdgesToPlacements(incoming) // 구버전(node 기준) .spu도 placement 기준으로 변환 후 가져옴
  const idMap = new Map<string, string>()
  const remap = (old: string) => {
    if (!idMap.has(old)) idMap.set(old, uid('i'))
    return idMap.get(old)!
  }
  // 전체 export 파일이 유니버스명을 담고 있고, 현재가 아직 기본값이면 복원(캐시 날아간 뒤 복구용)
  if (incoming.universeName && (!doc.universeName || doc.universeName === 'My Universe')) {
    doc.universeName = incoming.universeName
  }
  if (incoming.components) for (const c of incoming.components) doc.components.push(c)
  for (const a of incoming.assets) doc.assets.push({ ...a, id: remap(a.id) })
  for (const n of incoming.nodes) {
    doc.nodes.push({ ...n, id: remap(n.id), assetId: n.assetId ? remap(n.assetId) : undefined })
  }
  // 현재 공간에 이미 있는 이름들(이름 충돌 시 "(1)")
  const rootNames = new Set<string>()
  for (const p of doc.placements) {
    if (p.space === space) {
      const nm = getNode(p.nodeId)?.name
      if (nm) rootNames.add(nm)
    }
  }
  // 붙여넣기처럼: 가져온 루트가 기존과 안 겹치게 오프셋. 위치 지정 시 그 좌표(우클릭 자리), 없으면 카메라 중앙.
  const importRoots = incoming.placements.filter((p) => p.space === null)
  const base = at ?? { x: camera.x, y: camera.y }
  const { dx, dy } = findFreeOffset(space, importRoots, base.x, base.y)
  const newRootPids: string[] = []
  for (const p of incoming.placements) {
    const newNodeId = remap(p.nodeId)
    const isRoot = p.space === null
    if (isRoot) {
      const node = doc.nodes.find((n) => n.id === newNodeId)
      if (node) {
        if (rootNames.has(node.name)) {
          let i = 1
          while (rootNames.has(`${node.name}(${i})`)) i++
          node.name = `${node.name}(${i})`
        }
        rootNames.add(node.name)
      }
    }
    const newPid = remap(p.id)
    doc.placements.push({
      id: newPid,
      nodeId: newNodeId,
      space: isRoot ? space : remap(p.space!), // 루트 항목은 현재 공간으로
      x: isRoot ? p.x + dx : p.x,
      y: isRoot ? p.y + dy : p.y,
      locked: p.locked, // 위치잠금 유지
    })
    if (isRoot) newRootPids.push(newPid)
  }
  for (const e of incoming.edges) {
    doc.edges.push({ id: uid('e'), from: remap(e.from), to: remap(e.to), color: e.color, bold: e.bold })
  }
  // 현재 공간에 머무름(루트로 안 나감). 붙여넣은 것처럼 전부 선택 → 바로 이동 가능.
  selection = new Set(newRootPids)
  changed()
}

// ── 영속화 (IndexedDB, 디바운스) ─────────────────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    set(DB_KEY, doc).catch((e) => console.warn('save failed', e))
  }, 400)
}

/** 구버전 마이그레이션: 엣지가 node id 기반이면 placement id 기반으로 변환(같은 공간 배치쌍 연결). */
function migrateEdgesToPlacements(d: SimpraWorldDoc) {
  if (d.components) for (const c of d.components) migrateEdgesToPlacements(c.doc) // 컴포넌트 내부도
  if (!d.edges?.length) return
  const pidSet = new Set(d.placements.map((p) => p.id))
  // 모든 엣지 양끝이 이미 placement id면 신버전 → 그대로 둠
  if (d.edges.every((e) => pidSet.has(e.from) && pidSet.has(e.to))) return
  const out: SEdge[] = []
  const seen = new Set<string>()
  for (const e of d.edges) {
    if (pidSet.has(e.from) && pidSet.has(e.to)) {
      out.push(e)
      continue
    }
    // node 기반: 두 노드가 같은 공간에 함께 놓인 배치쌍을 모두 연결
    const froms = d.placements.filter((p) => p.nodeId === e.from)
    const tos = d.placements.filter((p) => p.nodeId === e.to)
    for (const fp of froms)
      for (const tp of tos) {
        if (fp.space !== tp.space || fp.id === tp.id) continue
        const key = [fp.id, tp.id].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ id: uid('e'), from: fp.id, to: tp.id })
      }
  }
  d.edges = out
}

export async function init() {
  try {
    const saved = await get<SimpraWorldDoc>(DB_KEY)
    if (saved && saved.placements && saved.nodes && saved.nodes.length) {
      // 구버전(size) → w/h 마이그레이션
      for (const n of saved.nodes as Array<SNode & { size?: number }>) {
        if (n.w === undefined || n.h === undefined) {
          const s = n.size ?? 34
          n.w = s * 2
          n.h = s * 2
          delete n.size
        }
      }
      if (!saved.components) saved.components = [] // 구버전엔 컴포넌트 배열 없음
      if (!saved.universeName) saved.universeName = 'My Universe' // 구버전엔 유니버스명 없음
      migrateEdgesToPlacements(saved) // 구버전: node 기반 엣지 → placement 기반
      // (제거됨) 예전엔 "이미지+본문없는 memo"를 photo로 바꿨는데, 매 로드마다 돌아
      // 사진 넣은 일반 노트까지 사진으로 바꿔버리는 버그라 삭제. 노트는 노트 그대로 둠.
      doc = saved
    } else {
      doc = makeSampleWorld()
      set(DB_KEY, doc).catch(() => {})
    }
  } catch {
    doc = makeSampleWorld()
  }
  camera = entryCamera(getCurrentSpace()) // 로드 직후 루트 프레임에 맞춰 들어오기
  resetHistory()
  changed()
}
