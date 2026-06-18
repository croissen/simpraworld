import { get, set } from 'idb-keyval'
import { emptyDoc, uid } from './types'
import type { Asset, ComponentDef, NodeType, Placement, SimpraWorldDoc, SNode, SpaceItem } from './types'
import { makeSampleWorld } from './sampleWorld'

export interface Camera {
  x: number // 화면 중앙에 오는 월드 좌표
  y: number
  zoom: number
}

const DB_KEY = 'simpraworld:doc:v7' // v7: 영어화된 기본세계(깨끗 재생성)

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
  listeners.forEach((l) => l())
  scheduleSave()
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
let componentsOpen = false
let selectedComponentId: string | null = null

export const getNoteEditorId = () => noteEditorNodeId
export function openNote(nodeId: string) {
  noteEditorNodeId = nodeId
  bumpUI()
}
export function closeNote() {
  noteEditorNodeId = null
  bumpUI()
}

export const getComponentsOpen = () => componentsOpen
export function toggleComponents() {
  componentsOpen = !componentsOpen
  if (!componentsOpen) selectedComponentId = null
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
  for (const pid of selection) {
    const p = getPlacement(pid)
    if (!p) continue
    const sub = nodeToDoc(p.nodeId)
    if (!sub) continue
    for (const sp of sub.placements) if (sp.space === null) (sp.x = p.x), (sp.y = p.y)
    for (const n of sub.nodes) if (!seenNode.has(n.id)) seenNode.add(n.id), out.nodes.push(n)
    for (const a of sub.assets) if (!seenAsset.has(a.id)) seenAsset.add(a.id), out.assets.push(a)
    for (const sp of sub.placements) out.placements.push(sp)
    for (const e of sub.edges) out.edges.push(e)
  }
  return out
}

/** 선택된 항목 전부를 상대 위치 유지한 채 복사 (독립 복제) */
export function copySelection() {
  if (!selection.size) return
  clipboard = { mode: 'copy', doc: selectionToDoc() }
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
  bumpUI()
}

/** 유니크 붙여넣기: 같은 노드를 현재 공간에 placement만 추가(결속). 같은 공간 중복·순환은 건너뜀. */
function pasteUnique(items: { nodeId: string; x: number; y: number }[], dx: number, dy: number) {
  const space = getCurrentSpace()
  const newPids: string[] = []
  for (const it of items) {
    if (space !== null && isCyclic(it.nodeId, space)) continue
    if (doc.placements.some((p) => p.nodeId === it.nodeId && p.space === space)) continue
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

/** 현재 공간의 배치들 */
export function placementsInCurrentSpace(): Placement[] {
  const space = getCurrentSpace()
  return doc.placements.filter((p) => p.space === space)
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
      body: n.body,
      x: p.x,
      y: p.y,
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
  changed()
}
export function selectMany(pids: string[]) {
  selection = new Set(pids)
  if (pids.length) selectedComponentId = null
  changed()
}
/** 현재 공간의 모든 항목 선택 (Ctrl+A) */
export function selectAll() {
  selectMany(placementsInCurrentSpace().map((p) => p.id))
}

// ── 노드 + 배치 CRUD ─────────────────────────────────────────
export function addNode(type: NodeType, x: number, y: number): SNode {
  const node: SNode = {
    id: uid(type === 'folder' ? 'f' : 'm'),
    type,
    name: type === 'folder' ? 'New folder' : 'New note',
    shape: type === 'folder' ? 'rect' : 'circle',
    w: 68,
    h: 68,
    color: type === 'folder' ? '#5b8cff' : '#34c98a',
    updatedAt: Date.now(),
  }
  doc.nodes.push(node)
  const pl: Placement = { id: uid('p'), nodeId: node.id, space: getCurrentSpace(), x, y }
  doc.placements.push(pl)
  selection = new Set([pl.id])
  changed()
  return node
}

export function updateNode(id: string, patch: Partial<SNode>) {
  const n = getNode(id)
  if (!n) return
  Object.assign(n, patch)
  n.updatedAt = Date.now()
  changed()
}

/** 드래그 중에는 React 재렌더 없이 배치 좌표만 갱신(=부드러움). 끝날 때 commit */
export function moveNodeLive(pid: string, x: number, y: number) {
  const p = getPlacement(pid)
  if (!p) return
  p.x = x
  p.y = y
  markDirty()
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
  if (!p) return
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
  doc.placements = doc.placements.filter(
    (p) => !delNodes.has(p.nodeId) && !(p.space !== null && delNodes.has(p.space)),
  )
  doc.edges = doc.edges.filter((e) => !delNodes.has(e.from) && !delNodes.has(e.to))
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

/** 이 배치를 다른 공간(폴더)으로 이동 — "폴더 위로 끌어다 놓기". 참조 아님(소속만 바뀜). */
export function movePlacementToSpace(pid: string, space: string | null, x = 0, y = 0) {
  const p = getPlacement(pid)
  if (!p) return
  if (space !== null && !canNestInto(p.nodeId, space)) return
  p.space = space
  p.x = x
  p.y = y
  const n = getNode(p.nodeId)
  if (n) n.updatedAt = Date.now()
  changed()
}

// ── 엣지 (보여주기용 줄 잇기, node-to-node) ──────────────────
function edgeIndex(from: string, to: string) {
  return doc.edges.findIndex(
    (e) => (e.from === from && e.to === to) || (e.from === to && e.to === from),
  )
}
/** 줄 추가(이미 있으면 무시) — 박스로 여러 개 연결할 때 */
export function linkNodes(from: string, to: string) {
  if (from === to || edgeIndex(from, to) >= 0) return
  doc.edges.push({ id: uid('e'), from, to })
  changed()
}
/** 줄 토글(있으면 제거, 없으면 추가) — Ctrl+Alt+클릭 */
export function toggleEdge(from: string, to: string) {
  if (from === to) return
  const i = edgeIndex(from, to)
  if (i >= 0) doc.edges.splice(i, 1)
  else doc.edges.push({ id: uid('e'), from, to })
  changed()
}

export function edgesInCurrentSpace() {
  const ids = new Set(placementsInCurrentSpace().map((p) => p.nodeId))
  return doc.edges.filter((e) => ids.has(e.from) && ids.has(e.to))
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
    }
    doc.placements.push(np)
    if (isRoot) rootPids.push(np.id)
  }
  for (const e of incoming.edges) {
    doc.edges.push({ id: uid('e'), from: remap(e.from), to: remap(e.to) })
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

/** 사진 노드 생성: 에셋 등록 + 이미지 노드 1개를 (x,y)에 생성(비율 유지). */
export function addPhoto(
  img: { thumb: string; original?: string; mime: string; w: number; h: number },
  x: number,
  y: number,
): SNode {
  const asset: Asset = {
    id: uid('a'),
    kind: 'image',
    mime: img.mime,
    thumb: img.thumb,
    original: img.original,
  }
  doc.assets.push(asset)
  const node = addNode('memo', x, y) // 생성 + 단독 선택
  const MAX = 320 // 월드 기준 최대 변(기본 사진 크기)
  const scale = Math.min(1, MAX / Math.max(img.w, img.h, 1))
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
  // 배치: 폴더 자신은 루트로, 내부 배치는 그대로
  out.placements.push({ id: uid('p'), nodeId: folderId, space: null, x: 0, y: 0 })
  for (const p of doc.placements) if (p.space && spaces.has(p.space)) out.placements.push({ ...p })
  // 엣지 (포함 노드끼리)
  for (const e of doc.edges) if (nodeIds.has(e.from) && nodeIds.has(e.to)) out.edges.push({ ...e })
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
  for (const p of doc.placements) {
    if (spaces.has(p.space)) {
      nodeIds.add(p.nodeId)
      // 현재 공간의 직속 자식 → 루트로(space=null), 나머지는 구조 그대로
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
  for (const e of doc.edges) if (nodeIds.has(e.from) && nodeIds.has(e.to)) out.edges.push({ ...e })
  return out
}

/** 모든 컴포넌트를 한 문서로 묶어 추출 (컴포넌트 Export all). */
export function exportAllComponentsDoc(): SimpraWorldDoc {
  const out = emptyDoc()
  out.components = doc.components.map((c) => ({ ...c }))
  return out
}

/** .smk 폴더를 My Universe(최상위)로 가져오기. 루트 폴더 이름이 겹치면 "이름(1)". */
export function importWorld(incoming: SimpraWorldDoc) {
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
    })
    if (isRoot) newRootPids.push(newPid)
  }
  for (const e of incoming.edges) {
    doc.edges.push({ id: uid('e'), from: remap(e.from), to: remap(e.to) })
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
      doc = saved
    } else {
      doc = makeSampleWorld()
      set(DB_KEY, doc).catch(() => {})
    }
  } catch {
    doc = makeSampleWorld()
  }
  changed()
}
