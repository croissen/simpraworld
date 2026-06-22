import { get, set } from 'idb-keyval'
import { DEFAULT_BG, emptyDoc, uid } from './types'
import type { Asset, ComponentDef, NodeType, Placement, SEdge, SimpraWorldDoc, SNode, SpaceItem } from './types'
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
let camera: Camera = { x: 0, y: 0, zoom: 1 }
let spacePath: string[] = [] // 진입한 폴더 node id 스택 (빈 배열 = 최상위)
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
export const canUndo = () => past.length > 0
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
  version += 1
  dirty = true // undo/redo도 저장된 상태와 달라짐
  markDirty()
  listeners.forEach((l) => l())
  scheduleSave()
}

export function undo() {
  if (!past.length) return
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

/** 저장 성공 시 호출 → "변경 없음" 상태로. */
export const markSaved = () => {
  dirty = false
}
/** 마지막 저장/열기 이후 내용 변경이 있었는지. */
export const isDirty = () => dirty
/** 저장할 가치가 있는 미저장 작업이 있는지(변경됨 + 내용 비어있지 않음). New/Load 전 확인용. */
export const hasUnsavedWork = () => dirty && (doc.nodes.length > 0 || doc.components.length > 0)
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
  bumpUI()
}
export function closeNote() {
  noteEditorNodeId = null
  noteEditorPid = null
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
export function selectionToDoc(): SimpraWorldDoc {
  const out = emptyDoc()
  const seenNode = new Set<string>()
  const seenAsset = new Set<string>()
  const rootByPid = new Map<string, string>() // 선택된 원본 배치 pid → out에서의 루트 배치 id
  for (const pid of selection) {
    const p = getPlacement(pid)
    if (!p) continue
    const sub = nodeToDoc(p.nodeId)
    if (!sub) continue
    for (const sp of sub.placements)
      if (sp.space === null)
        (sp.x = p.x), (sp.y = p.y), (sp.locked = p.locked), rootByPid.set(pid, sp.id)
    for (const n of sub.nodes) if (!seenNode.has(n.id)) seenNode.add(n.id), out.nodes.push(n)
    for (const a of sub.assets) if (!seenAsset.has(a.id)) seenAsset.add(a.id), out.assets.push(a)
    for (const sp of sub.placements) out.placements.push(sp)
    for (const e of sub.edges) out.edges.push(e) // 폴더 내부 참조선
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
export function getSelectedNode(): SNode | undefined {
  const pid = getSoleSelectedPid()
  const p = pid ? getPlacement(pid) : undefined
  return p ? getNode(p.nodeId) : undefined
}
export function getAsset(id: string | undefined): Asset | undefined {
  if (!id) return undefined
  return doc.assets.find((a) => a.id === id)
}

/** 현재 공간의 배치들 (보관 전용 stored는 캔버스에 안 보이므로 제외) */
export function placementsInCurrentSpace(): Placement[] {
  const space = getCurrentSpace()
  return doc.placements.filter((p) => p.space === space && !p.stored)
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
    existing.stored = false
    existing.x = camera.x
    existing.y = camera.y
    selection = new Set([existing.id])
  } else {
    const pl: Placement = { id: uid('p'), nodeId, space, x: camera.x, y: camera.y }
    doc.placements.push(pl)
    selection = new Set([pl.id])
  }
  changed()
}

/** 캔버스 개체를 보관함으로 보내기(숨김). 이 배치만 stored 처리 → 캔버스에서 사라지고 보관함/검색에만. */
export function storePlacement(pid: string) {
  const p = getPlacement(pid)
  if (!p) return
  p.stored = true
  selection.delete(pid)
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
      fontSize: n.fontSize,
      bold: n.bold,
      align: n.align,
      valign: n.valign,
      wrap: n.wrap,
      body: n.body,
      badge: n.badge,
      badgeSize: n.badgeSize,
      badgeColor: n.badgeColor,
      badgeBg: n.badgeBg,
      x: p.x,
      y: p.y,
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
  camera = { x: 0, y: 0, zoom: 1 }
  changed()
}

/** 브레드크럼용 경로 */
export function breadcrumb(): SNode[] {
  return spacePath.map((id) => getNode(id)).filter((n): n is SNode => !!n)
}

export function goTo(spaceId: string | null) {
  if (spaceId === null) {
    spacePath = []
  } else {
    const i = spacePath.indexOf(spaceId)
    if (i >= 0) spacePath = spacePath.slice(0, i + 1)
  }
  selection = new Set()
  camera = { x: 0, y: 0, zoom: 1 }
  changed()
}

// ── 선택 (placement id 집합) ────────────────────────────────
/** additive=true(Shift) → 토글, 아니면 단독 선택. null → 전체 해제 */
export function select(pid: string | null, additive = false) {
  if (pid === null) {
    selection = new Set()
  } else if (additive) {
    selection.has(pid) ? selection.delete(pid) : selection.add(pid)
  } else {
    selection = new Set([pid])
  }
  if (pid) selectedComponentId = null // 노드 선택 시 컴포넌트 미리보기 선택 해제(배타)
  mobileEditOpen = false // 선택 바뀌면 모바일 편집 패널은 닫고 연필부터
  changed()
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
  const node: SNode = {
    id: uid(type === 'folder' ? 'f' : isText ? 't' : 'm'),
    type,
    name: type === 'folder' ? 'New folder' : isText ? 'Text' : 'New note',
    shape: isText ? 'rect' : type === 'folder' ? 'rect' : 'circle',
    w: isText ? 40 : 68,
    h: isText ? 30 : 68,
    color: type === 'folder' ? '#5b8cff' : isText ? 'none' : '#34c98a',
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
  pl.x = cx
  pl.y = cy
  markDirty()
}

/**
 * 편집 종료(커밋). body 비면 노드/배치 삭제. w/h(월드)와 중심좌표(cx,cy)로 박스 맞춤.
 */
export function commitText(pid: string, body: string, w: number, h: number, cx: number, cy: number) {
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
    n.updatedAt = Date.now()
  }
  pl.x = cx
  pl.y = cy
  changed()
}

/** 드래그 중에는 React 재렌더 없이 배치 좌표만 갱신(=부드러움). 끝날 때 commit */
export function moveNodeLive(pid: string, x: number, y: number) {
  const p = getPlacement(pid)
  if (!p || p.locked) return // 잠긴 항목은 움직이지 않음
  p.x = x
  p.y = y
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

/** 인스펙터에서 좌표 직접 수정 */
export function setPlacementXY(pid: string, x: number, y: number) {
  const p = getPlacement(pid)
  if (!p || p.locked) return // 잠긴 항목은 좌표 편집 무시
  p.x = x
  p.y = y
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
    // newNode가 이 공간에 배치가 없던 경우 → 기존 노트를 보관 전용으로 새로 보관
    doc.placements.push({ id: uid('p'), nodeId: oldNodeId, space, x: slot.x, y: slot.y, stored: true })
  }
  slot.nodeId = newNodeId
  slot.stored = false // 자리는 노출 상태로
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
  const cdoc = selectionToDoc() // 다중-루트 미니문서(상대 위치 유지)
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

/** 외부에서 들여온(.smk) 미니 문서를 컴포넌트 목록에 추가 */
export function addComponentDoc(name: string, cdoc: SimpraWorldDoc): ComponentDef {
  migrateEdgesToPlacements(cdoc) // 구버전 컴포넌트 .smk도 placement 기준으로 변환
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

/** 폴더 하나(+내부 전체)를 독립 문서로 추출 → .smk 내보내기용. 폴더가 루트가 됨. */
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
  camera = { x: 0, y: 0, zoom: 1 }
  noteEditorNodeId = null
  selectedComponentId = null
  resetHistory() // 리셋은 되돌릴 수 없음 → 히스토리도 비움
  changed() // 저장(IndexedDB)도 함께
}

/** 새 파일(New): 빈 유니버스로 시작. 화면 상태도 초기화. */
export function newWorld() {
  doc = emptyDoc()
  spacePath = []
  selection = new Set()
  camera = { x: 0, y: 0, zoom: 1 }
  noteEditorNodeId = null
  selectedComponentId = null
  resetHistory()
  changed()
}

/**
 * 다른 유니버스 파일을 "열기": 현재 유니버스를 전부 버리고 incoming으로 교체(병합 아님).
 * Load(다른 파일 열기)용. resetToSample과 같은 방식으로 화면 상태도 초기화한다.
 */
export function replaceWorld(incoming: SimpraWorldDoc) {
  migrateEdgesToPlacements(incoming) // 구버전 .smk도 placement 기준으로
  doc = { ...emptyDoc(), ...incoming }
  spacePath = []
  selection = new Set()
  camera = { x: 0, y: 0, zoom: 1 }
  noteEditorNodeId = null
  selectedComponentId = null
  resetHistory() // 새 문서를 연 것이므로 이전 히스토리는 버림
  changed()
}

/** .smk 폴더를 My Universe(최상위)로 가져오기. 루트 폴더 이름이 겹치면 "이름(1)". */
export function importWorld(incoming: SimpraWorldDoc) {
  migrateEdgesToPlacements(incoming) // 구버전(node 기준) .smk도 placement 기준으로 변환 후 가져옴
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
  // 유니버스 최상위에 이미 있는 이름들
  const rootNames = new Set<string>()
  for (const p of doc.placements) {
    if (p.space === null) {
      const nm = getNode(p.nodeId)?.name
      if (nm) rootNames.add(nm)
    }
  }
  // 붙여넣기처럼: 가져온 루트가 기존 노드와 안 겹치게 오프셋 (지금 doc 기준으로 미리 계산)
  const importRoots = incoming.placements.filter((p) => p.space === null)
  const { dx, dy } = findFreeOffset(null, importRoots, 0, 0)
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
      space: isRoot ? null : remap(p.space!),
      x: isRoot ? p.x + dx : p.x,
      y: isRoot ? p.y + dy : p.y,
      locked: p.locked, // 위치잠금 유지
    })
    if (isRoot) newRootPids.push(newPid)
  }
  for (const e of incoming.edges) {
    doc.edges.push({ id: uid('e'), from: remap(e.from), to: remap(e.to), color: e.color, bold: e.bold })
  }
  spacePath = [] // 가져온 건 유니버스 루트에서 보이게
  selection = new Set(newRootPids) // 붙여넣은 것처럼 전부 선택 → 바로 이동 가능
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
      // 구버전: 이미지 메모(본문 없음) → 사진 개체로
      for (const n of saved.nodes)
        if (n.type === 'memo' && n.shape === 'image' && n.assetId && !n.body) n.type = 'photo'
      doc = saved
    } else {
      doc = makeSampleWorld()
      set(DB_KEY, doc).catch(() => {})
    }
  } catch {
    doc = makeSampleWorld()
  }
  resetHistory()
  changed()
}
