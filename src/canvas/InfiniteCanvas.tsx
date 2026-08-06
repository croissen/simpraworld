import { useEffect, useRef } from 'react'
import type { SEdge, Shape, SpaceItem } from '../types'
import { measureTextNode, textLines, wrappedHeight } from '../textMeasure'
import { fillRich, measureRich } from './emoji'
import * as S from './InfiniteCanvas.styles'
import {
  addShapeAt,
  bumpUI,
  getSnapshot,
  cancelDrawNode,
  cancelSpine,
  canNestInto,
  commitMove,
  consumeDirty,
  addGroupRotLive,
  finishSpine,
  getDrawTool,
  getInkMode,
  isDrawKind,
  getEraserRadius,
  getPenColor,
  getPenWidth,
  addStroke,
  addFill,
  addEraseMark,
  eraseStrokesNear,
  commitStrokes,
  strokesInCurrentSpace,
  setInkMode,
  lassoSelectStrokes,
  selectedStrokesBBox,
  moveSelectedStrokesBy,
  deleteSelectedStrokes,
  clearStrokeSelection,
  getSelectedStrokeIds,
  getSelectedStrokesSnapshot,
  applyStrokeScale,
  getPanTool,
  getHandMode,
  leavePenForNav,
  getGroupRot,
  getSpineWizard,
  groupOBB,
  groupScaleSnapshot,
  isSpined,
  rigidUnit,
  rotatePidsLive,
  scaleGroupApply,
  selectSingle,
  selectedGroupId,
  setDrawTool,
  setSpineChildAnchor,
  spineDescendants,
  spineJointWorld,
  edgesInCurrentSpace,
  enterFolder,
  getAsset,
  DEFAULT_BADGE_SIZE,
  getAspectLocked,
  getBgColor,
  getCamera,
  getDoc,
  getGridBold,
  getNode,
  getShowGrid,
  getShowFrame,
  getCurrentSpace,
  getCurrentFrame,
  placementPos,
  applyEntryFrame,
  setViewport,
  startTextEdit,
  getPlacement,
  getSelectionSet,
  getSoleSelectedPid,
  isSelected,
  itemsInCurrentSpace,
  linkPlacements,
  markDirty,
  moveNodeLive,
  movePlacementToSpace,
  openContextMenu,
  openNote,
  select,
  selectMany,
  selectionGrouped,
  setCamera,
  setNodeSizeLive,
  setNodeWidthLive,
  setRotationLive,
  swapPlacementNodes,
  togglePlacementEdge,
  updateNode,
} from '../store'

// 노드 둘레 링 표시: null=없음, yellow=일반 선택, purple=유니크(공유) 선택, sibling=결속 형제(점선)
type Ring = 'yellow' | 'purple' | 'sibling' | null

// 색이 밝은지(테두리 대비색 결정용)
function isLightColor(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return true
  const v = parseInt(m[1], 16)
  return 0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255) > 150
}

const MIN_ZOOM = 0.05
const MAX_ZOOM = 8
const MIN_GRAB_PX = 14 // 작은 노드도 잡히게 최소 히트 반경
const ROT_GAP = 22 // 회전 핸들이 노드 하단에서 떨어진 거리(px)
const ROT_SNAP_DEG = 6 // 회전 스냅: 90° 배수 근처 ±이 각도 안이면 딱 붙음
const DWELL_MS = 300 // 폴더 위/노트 위에 이만큼 머물면 "넣기"·"맞바꾸기" 준비
const SWAP_ANIM_MS = 240 // 맞바꿈 시 밀려나는 노트 슬라이드 시간

// 이미지 캐시 (assetId -> HTMLImageElement)
const imgCache = new Map<string, HTMLImageElement>()
function getImg(assetId: string, thumb: string): HTMLImageElement | null {
  let im = imgCache.get(assetId)
  if (!im) {
    im = new Image()
    im.onload = () => markDirty()
    im.src = thumb
    imgCache.set(assetId, im)
  }
  return im.complete && im.naturalWidth > 0 ? im : null
}

export default function InfiniteCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let armedFolderId: string | null = null // 드래그로 들어갈 준비된 폴더
    let armedSwapPid: string | null = null // 노트→노트: 데이터 맞바꿀 준비된 대상 배치
    // 맞바꿀 때 "밀려나는" 노트가 제자리로 슬라이드하는 애니메이션
    let swapAnim: { pid: string; fromX: number; fromY: number; start: number } | null = null
    let spaceHeld = false // Space = 패닝 모드
    let marquee: { x0: number; y0: number; x1: number; y1: number } | null = null // 영역 선택/줄잇기 박스
    let dragGroup: { pid: string; x0: number; y0: number }[] | null = null // 일괄 이동용 시작좌표
    let snapX: number | null = null // 정렬 스냅 가이드(월드 X) — 다른 개체와 같은 세로선
    let snapY: number | null = null // 정렬 스냅 가이드(월드 Y) — 다른 개체와 같은 가로선
    let dragMovable = false // 이미 선택돼 있던 개체만 이번 드래그로 이동 가능(첫 클릭은 선택만)
    let lpTimer: ReturnType<typeof setTimeout> | null = null // 모바일 롱프레스(꾹) → 다중선택
    let longPressed = false
    let multiMode = false // 모바일 다중선택 모드: 켜지면 톡 탭만으로 토글 선택
    let lastPointerType = 'mouse'
    const clearLP = () => {
      if (lpTimer) clearTimeout(lpTimer)
      lpTimer = null
    }
    let linkSourcePids: string[] = [] // Ctrl+Alt 줄잇기의 시작(소스) 배치 pid들(다중 가능)

    // ── 좌표 변환 ──
    const cssW = () => canvas.clientWidth
    const cssH = () => canvas.clientHeight
    function w2s(wx: number, wy: number) {
      const c = getCamera()
      return {
        x: (wx - c.x) * c.zoom + cssW() / 2,
        y: (wy - c.y) * c.zoom + cssH() / 2,
      }
    }
    function s2w(sx: number, sy: number) {
      const c = getCamera()
      return {
        x: (sx - cssW() / 2) / c.zoom + c.x,
        y: (sy - cssH() / 2) / c.zoom + c.y,
      }
    }

    /**
     * 채우기(최초 방식): 그려진 '선(테두리)'만 벽으로 보고, 클릭한 곳이 선으로 닫힌 영역이면
     * 그 안쪽을 채운다(지움 자국으로 뚫린 테두리는 새는 걸로 판정). 바깥으로 새면 null.
     * 선 두께 절반만큼 살짝 부풀려 선 밑까지 채워 틈 없앰.
     */
    function computeFillPolygon(sx: number, sy: number): number[] | null {
      const items = strokesInCurrentSpace()
      const strokes = items.filter((s) => !s.fill && !s.erase) // 벽 = 선(테두리)만
      if (!strokes.length) return null
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity
      for (const s of strokes) {
        const hw = (s.width || 1) / 2
        for (let i = 0; i < s.pts.length; i += 2) {
          x0 = Math.min(x0, s.pts[i] - hw)
          x1 = Math.max(x1, s.pts[i] + hw)
          y0 = Math.min(y0, s.pts[i + 1] - hw)
          y1 = Math.max(y1, s.pts[i + 1] + hw)
        }
      }
      const pad = 8
      x0 -= pad
      y0 -= pad
      x1 += pad
      y1 += pad
      const bw = x1 - x0,
        bh = y1 - y0
      if (bw <= 0 || bh <= 0) return null
      const cw = s2w(sx, sy)
      if (cw.x < x0 || cw.x > x1 || cw.y < y0 || cw.y > y1) return null
      const scale = Math.min(1200 / bw, 1200 / bh, 6)
      const W = Math.max(4, Math.ceil(bw * scale)),
        H = Math.max(4, Math.ceil(bh * scale))
      const off = document.createElement('canvas')
      off.width = W
      off.height = H
      const octx = off.getContext('2d')
      if (!octx) return null
      const RX = (wx: number) => (wx - x0) * scale
      const RY = (wy: number) => (wy - y0) * scale
      // 선을 흰색으로 그리고, 지움 자국은 파냄(뚫린 테두리 반영). 채우기(면)는 무시.
      octx.clearRect(0, 0, W, H)
      octx.lineCap = 'round'
      octx.lineJoin = 'round'
      for (const s of items) {
        if (s.fill) continue
        if (s.erase) {
          octx.globalCompositeOperation = 'destination-out'
          octx.strokeStyle = '#000'
          octx.fillStyle = '#000'
        } else {
          octx.globalCompositeOperation = 'source-over'
          octx.strokeStyle = '#fff'
          octx.fillStyle = '#fff'
        }
        octx.lineWidth = Math.max(1.5, (s.width || 1) * scale)
        octx.beginPath()
        octx.moveTo(RX(s.pts[0]), RY(s.pts[1]))
        for (let i = 2; i < s.pts.length; i += 2) octx.lineTo(RX(s.pts[i]), RY(s.pts[i + 1]))
        octx.stroke()
        if (s.pts.length === 2) {
          octx.beginPath()
          octx.arc(RX(s.pts[0]), RY(s.pts[1]), octx.lineWidth / 2, 0, Math.PI * 2)
          octx.fill()
        }
      }
      octx.globalCompositeOperation = 'source-over'
      const data = octx.getImageData(0, 0, W, H).data
      const wall = new Uint8Array(W * H)
      for (let i = 0; i < W * H; i++) wall[i] = data[i * 4 + 3] > 40 ? 1 : 0 // 선(칠해진 픽셀)=벽
      const startX = Math.round(RX(cw.x)),
        startY = Math.round(RY(cw.y))
      if (startX < 0 || startY < 0 || startX >= W || startY >= H) return null
      if (wall[startY * W + startX]) return null // 선 위 클릭 → 채울 것 없음
      // 빈 곳(선 안쪽) 플러드필. 바깥 테두리에 닿으면 안 닫힌 것 → null.
      const region = new Uint8Array(W * H)
      const stack = [startY * W + startX]
      region[startY * W + startX] = 1
      let touchedBorder = false
      while (stack.length) {
        const idx = stack.pop() as number
        const x = idx % W,
          y = (idx / W) | 0
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) touchedBorder = true
        const nb = [idx - 1, idx + 1, idx - W, idx + W]
        const nx = [x - 1, x + 1, x, x]
        const ny = [y, y, y - 1, y + 1]
        for (let k = 0; k < 4; k++) {
          if (nx[k] < 0 || ny[k] < 0 || nx[k] >= W || ny[k] >= H) continue
          const ni = nb[k]
          if (!region[ni] && !wall[ni]) {
            region[ni] = 1
            stack.push(ni)
          }
        }
      }
      if (touchedBorder) return null // 안 닫힘(새는 영역) → 채우지 않음
      // 선 두께 절반+여유만큼 부풀림 → 선 밑까지 틈 없이 채움(살짝 넘칠 수 있음, 단순/안정).
      let maxW = 1
      for (const s of strokes) maxW = Math.max(maxW, s.width || 1)
      const dr = Math.min(48, Math.round((maxW * scale) / 2) + 2)
      const grown = dilateMask(region, W, H, dr)
      const contour = traceContour(grown, W, H)
      if (contour.length < 6) return null
      let out: number[] = []
      const step = Math.max(1, Math.floor(contour.length / 2 / 400))
      for (let i = 0; i < contour.length; i += 2 * step)
        out.push(x0 + contour[i] / scale, y0 + contour[i + 1] / scale)
      if (out.length < 6) return null
      out = chaikin(chaikin(out))
      return out
    }

    /** 마스크 팽창: 4방향 1px씩 r번 → 반경 r만큼 확장(선 밑까지 채움이 들어가게, 틈 방지). */
    function dilateMask(mask: Uint8Array, W: number, H: number, r: number): Uint8Array {
      let cur = mask
      for (let it = 0; it < r; it++) {
        const next = new Uint8Array(cur)
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = y * W + x
            if (cur[i]) continue
            if (
              (x > 0 && cur[i - 1]) ||
              (x < W - 1 && cur[i + 1]) ||
              (y > 0 && cur[i - W]) ||
              (y < H - 1 && cur[i + W])
            )
              next[i] = 1
          }
        }
        cur = next
      }
      return cur
    }

    /** Chaikin 코너 컷: 닫힌 폴리곤을 한 단계 부드럽게(점 2배). */
    function chaikin(poly: number[]): number[] {
      const n = poly.length / 2
      if (n < 4) return poly
      const out: number[] = []
      for (let i = 0; i < n; i++) {
        const ax = poly[i * 2]
        const ay = poly[i * 2 + 1]
        const bx = poly[((i + 1) % n) * 2]
        const by = poly[((i + 1) % n) * 2 + 1]
        out.push(ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25)
        out.push(ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75)
      }
      return out
    }

    /** Moore 이웃 경계추적: region(1=내부)의 외곽선을 픽셀 폴리곤 [x0,y0,...]으로. */
    function traceContour(region: Uint8Array, W: number, H: number): number[] {
      let start = -1
      for (let i = 0; i < W * H; i++)
        if (region[i]) {
          start = i
          break
        }
      if (start < 0) return []
      const dirs = [
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [-1, -1],
        [0, -1],
        [1, -1],
      ]
      const inReg = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && !!region[y * W + x]
      const sx = start % W,
        sy = (start / W) | 0
      const contour: number[] = []
      let cx = sx,
        cy = sy,
        back = 4
      const max = W * H * 4
      let count = 0
      do {
        contour.push(cx, cy)
        let found = false
        for (let k = 0; k < 8; k++) {
          const d = (back + 1 + k) % 8
          const nx = cx + dirs[d][0],
            ny = cy + dirs[d][1]
          if (inReg(nx, ny)) {
            back = (d + 4) % 8
            cx = nx
            cy = ny
            found = true
            break
          }
        }
        if (!found) break
        count++
      } while ((cx !== sx || cy !== sy) && count < max)
      return contour
    }

    let firstLayout = true
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
      setViewport(canvas.clientWidth, canvas.clientHeight) // 프레임 캡처/적용용 화면 크기
      if (firstLayout) {
        firstLayout = false
        applyEntryFrame() // 최초 레이아웃 확정 후 정밀 크기로 활성 우주 프레임에 fit
      }
      markDirty()
    }
    resize()
    window.addEventListener('resize', resize)

    // ── 렌더 ──
    function draw() {
      const W = canvas.clientWidth
      const H = canvas.clientHeight
      setViewport(W, H) // 프레임 캡처/적용이 항상 현재 화면 크기를 쓰게(레이아웃 지연 대비)
      const c = getCamera()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // 배경
      ctx.fillStyle = getBgColor()
      ctx.fillRect(0, 0, W, H)
      if (getShowGrid()) drawGrid(W, H)
      if (getShowFrame()) drawFrame()

      // 펜/지우개 모드일 땐 커서를 십자선으로(팬(Space) 중이면 grab 우선)
      if (!spaceHeld) {
        const im = getInkMode()
        canvas.style.cursor = im ? 'crosshair' : ''
      }

      const items = itemsInCurrentSpace()
      // 엣지는 배치(placement) 단위. 각 배치는 고유 pid → 같은 노드 복사본끼리도 참조선이 따로.
      // z순서(=items 인덱스). 엣지는 두 끝점 중 "아래에 있는 쪽" 바로 뒤에 깐다 →
      // 선은 항상 연결된 두 요소(참조 대상)보다 뒤에 있고, 한쪽을 맨앞으로 올려도
      // 선은 따라오지 않음. 끝점보다 아래의 것들(맨뒤 사진 등)은 선에 가려지지 않음.
      const itemByPid = new Map(items.map((it) => [it.pid, it]))
      const zOf = new Map(items.map((it, i) => [it.pid, i]))
      const edgesByAnchor = new Map<number, SEdge[]>()
      for (const e of edgesInCurrentSpace()) {
        const za = zOf.get(e.from)
        const zb = zOf.get(e.to)
        if (za === undefined || zb === undefined) continue
        const anchor = Math.min(za, zb)
        const arr = edgesByAnchor.get(anchor)
        if (arr) arr.push(e)
        else edgesByAnchor.set(anchor, [e])
      }
      function strokeEdges(eds: SEdge[]) {
        for (const e of eds) {
          const a = itemByPid.get(e.from)
          const b = itemByPid.get(e.to)
          if (!a || !b) continue
          ctx.strokeStyle = e.color || 'rgba(150,170,210,0.35)'
          ctx.lineWidth = Math.max(1, (e.bold ? 2.6 : 1.5) * c.zoom)
          const pa = w2s(a.x, a.y)
          const pb = w2s(b.x, b.y)
          ctx.beginPath()
          ctx.moveTo(pa.x, pa.y)
          ctx.lineTo(pb.x, pb.y)
          ctx.stroke()
        }
      }

      // 공유(유니크 카피된) 노드 = 여러 곳에 placement가 있는 노드. 전체 기준으로 카운트.
      const useCount = new Map<string, number>()
      for (const p of getDoc().placements) useCount.set(p.nodeId, (useCount.get(p.nodeId) || 0) + 1)
      const isShared = (nid: string) => (useCount.get(nid) || 0) > 1
      // 선택된 항목 중 공유 노드 → 같은 공간의 다른 placement(결속 형제)도 보라로 표시(삭제 시 함께 사라짐 안내).
      const sharedSelNodes = new Set(
        items.filter((it) => isSelected(it.pid) && isShared(it.nodeId)).map((it) => it.nodeId),
      )

      const selN = getSelectionSet().size // 2개 이상이면 선택 개체 가운데 초록 체크
      // 그룹 선택이면: 개별 링·체크 대신 하나의 박스로(=한 객체처럼).
      const grouped = selectionGrouped()
      // 노드 — 보이는 것만 (뷰포트 컬링). 각 노드를 그리기 직전에 그 노드가 위쪽 끝점인 엣지를 깐다.
      const margin = 80
      for (let zi = 0; zi < items.length; zi++) {
        const it = items[zi]
        const eds = edgesByAnchor.get(zi)
        if (eds) strokeEdges(eds)
        // 맞바꿔 밀려난 노트는 원래 자리(fromX,Y)→최종 자리(it.x,y)로 슬라이드
        let wx = it.x
        let wy = it.y
        if (swapAnim && swapAnim.pid === it.pid) {
          const t = Math.min(1, (Date.now() - swapAnim.start) / SWAP_ANIM_MS)
          const e = 1 - Math.pow(1 - t, 3) // easeOutCubic
          wx = swapAnim.fromX + (it.x - swapAnim.fromX) * e
          wy = swapAnim.fromY + (it.y - swapAnim.fromY) * e
          if (t >= 1) swapAnim = null
        }
        const p = w2s(wx, wy)
        const hw = Math.max((it.w / 2) * c.zoom, 2)
        const hh = Math.max((it.h / 2) * c.zoom, 2)
        if (p.x + hw < -margin || p.x - hw > W + margin || p.y + hh < -margin || p.y - hh > H + margin)
          continue
        // 선택: 공유 노드면 보라, 아니면 노랑. 비선택이지만 선택된 공유노드의 형제면 보라 점선(표시만).
        // 그룹 선택이면 개별 링을 안 그림(밑에서 하나의 박스로).
        const ring: Ring =
          grouped && isSelected(it.pid)
            ? null
            : isSelected(it.pid)
              ? isShared(it.nodeId)
                ? 'purple'
                : 'yellow'
              : sharedSelNodes.has(it.nodeId)
                ? 'sibling'
                : null
        drawNode(it, p.x, p.y, hw, hh, c.zoom, ring)
        // 다중선택 표시: 선택 개체 가운데 초록 체크. 그룹은 제외(하나의 객체처럼).
        if (!grouped && (selN > 1 || multiMode) && isSelected(it.pid)) {
          const r = Math.max(8, Math.min(hw, hh, 14))
          ctx.fillStyle = '#34c98a'
          ctx.beginPath()
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = Math.max(1.6, r * 0.18)
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.beginPath()
          ctx.moveTo(p.x - r * 0.45, p.y + r * 0.04)
          ctx.lineTo(p.x - r * 0.1, p.y + r * 0.4)
          ctx.lineTo(p.x + r * 0.5, p.y - r * 0.35)
          ctx.stroke()
        }
        // 드래그로 들어갈 폴더 강조
        if (it.nodeId === armedFolderId) {
          ctx.strokeStyle = '#34c98a'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.ellipse(p.x, p.y, hw + 10, hh + 10, 0, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fillStyle = '#34c98a'
          ctx.font = '12px system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText('Move here', p.x, p.y - hh - 12)
        }
        // 노트→노트 데이터 맞바꿀 대상 강조
        if (it.pid === armedSwapPid) {
          ctx.strokeStyle = '#e3b341'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.ellipse(p.x, p.y, hw + 10, hh + 10, 0, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fillStyle = '#e3b341'
          ctx.font = '12px system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText('Swap data', p.x, p.y - hh - 12)
        }
      }

      // ── 잉크: 오프스크린 레이어에 선·채우기를 그리고 '지움 자국'으로 픽셀을 파낸 뒤 합성 ──
      // (진짜 지우개처럼 픽셀 단위로 지워짐 → 굵은획/가운데/구멍 OK, 실시간, 흔들림 없음)
      const paintStroke = (
        g: CanvasRenderingContext2D,
        pts: number[],
        color: string,
        width: number,
        kind?: string,
      ) => {
        if (pts.length < 2) return
        const lw = Math.max(1, width * c.zoom)
        g.save()
        if (kind === 'highlighter') {
          g.globalAlpha = 0.4
          g.lineCap = 'butt'
        } else {
          g.globalAlpha = kind === 'pencil' ? 0.85 : 1
          g.lineCap = 'round'
        }
        g.lineJoin = 'round'
        if (pts.length === 2) {
          const q = w2s(pts[0], pts[1])
          g.fillStyle = color
          g.beginPath()
          g.arc(q.x, q.y, lw / 2, 0, Math.PI * 2)
          g.fill()
          g.restore()
          return
        }
        g.strokeStyle = color
        g.lineWidth = lw
        g.beginPath()
        const first = w2s(pts[0], pts[1])
        g.moveTo(first.x, first.y)
        const n = pts.length / 2
        for (let i = 1; i < n - 1; i++) {
          const cur = w2s(pts[i * 2], pts[i * 2 + 1])
          const nx = w2s(pts[(i + 1) * 2], pts[(i + 1) * 2 + 1])
          g.quadraticCurveTo(cur.x, cur.y, (cur.x + nx.x) / 2, (cur.y + nx.y) / 2)
        }
        const last = w2s(pts[(n - 1) * 2], pts[(n - 1) * 2 + 1])
        g.lineTo(last.x, last.y)
        g.stroke()
        g.restore()
      }
      const drawFillShape = (
        g: CanvasRenderingContext2D,
        s: { pts: number[]; color: string; kind?: string },
      ) => {
        g.save()
        g.globalAlpha = s.kind === 'highlighter' ? 0.4 : 1 // 일반 채움은 불투명(덮어쓰기 깔끔)
        g.fillStyle = s.color
        g.beginPath()
        const f0 = w2s(s.pts[0], s.pts[1])
        g.moveTo(f0.x, f0.y)
        for (let i = 2; i < s.pts.length; i += 2) {
          const q = w2s(s.pts[i], s.pts[i + 1])
          g.lineTo(q.x, q.y)
        }
        g.closePath()
        g.fill()
        g.restore()
      }
      const drawEraseMark = (g: CanvasRenderingContext2D, pts: number[], width: number) => {
        const lw = Math.max(1, width * c.zoom)
        g.strokeStyle = '#000'
        g.fillStyle = '#000'
        g.lineCap = 'round'
        g.lineJoin = 'round'
        g.lineWidth = lw
        const first = w2s(pts[0], pts[1])
        if (pts.length >= 4) {
          g.beginPath()
          g.moveTo(first.x, first.y)
          for (let i = 2; i < pts.length; i += 2) {
            const q = w2s(pts[i], pts[i + 1])
            g.lineTo(q.x, q.y)
          }
          g.stroke()
        }
        g.beginPath() // 시작점/톡 = 원
        g.arc(first.x, first.y, lw / 2, 0, Math.PI * 2)
        g.fill()
      }

      const selStrokes = getSelectedStrokeIds()
      const curStrokes = strokesInCurrentSpace()
      if (ictx && fctx) {
        if (inkLayer.width !== canvas.width || inkLayer.height !== canvas.height) {
          inkLayer.width = canvas.width
          inkLayer.height = canvas.height
          frameLayer.width = canvas.width
          frameLayer.height = canvas.height
          strokeLayer.width = canvas.width
          strokeLayer.height = canvas.height
        }
        // 올가미 이동/크기조절은 매 프레임 획이 바뀌므로 캐시 무효화(그 외엔 카메라·doc버전으로 판단)
        const liveMutating = mode === 'lassomove' || mode === 'lassoresize'
        // 획 개수도 키에 포함 → 획 지우개가 획을 지우는 '즉시' 캐시 갱신(버전 안 올려도)
        const key = `${c.x}|${c.y}|${c.zoom}|${canvas.width}|${canvas.height}|${getCurrentSpace()}|${getSnapshot()}|${curStrokes.length}`
        if (liveMutating || key !== inkCacheKey) {
          // 확정 잉크 캐시 재생성(생성 순서대로: 지움 자국은 그 전 것만 파냄)
          // ① 채우기 레이어(inkLayer): 채우기 + 지움 자국(생성순) → 지운 뒤 채운 fill 살아남음
          ictx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ictx.clearRect(0, 0, W, H)
          for (const s of curStrokes) {
            if (s.erase) {
              ictx.globalCompositeOperation = 'destination-out'
              drawEraseMark(ictx, s.pts, s.width)
              ictx.globalCompositeOperation = 'source-over'
            } else if (s.fill && s.pts.length >= 6) drawFillShape(ictx, s)
          }
          // ② 선 레이어(strokeLayer): 선 + 지움 자국(생성순) → 지운 뒤 그린 선 살아남음
          if (sctx) {
            sctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            sctx.clearRect(0, 0, W, H)
            for (const s of curStrokes) {
              if (s.erase) {
                sctx.globalCompositeOperation = 'destination-out'
                drawEraseMark(sctx, s.pts, s.width)
                sctx.globalCompositeOperation = 'source-over'
              } else if (!s.fill) paintStroke(sctx, s.pts, s.color, s.width, s.kind)
            }
            // 선 레이어를 채우기 위에 얹음 → 채우기가 선 밑으로 가 넘침 안 보임
            ictx.setTransform(1, 0, 0, 1, 0, 0)
            ictx.drawImage(strokeLayer, 0, 0)
            ictx.setTransform(dpr, 0, 0, dpr, 0, 0)
          }
          inkCacheKey = liveMutating ? '' : key // 이동 중엔 무효로 둬 다음 프레임도 재생성
        }
        // 그리는 중인 획/지우는 자국 = 캐시 위에 '하나만' 얹어 합성(전체 재렌더 X → 렉 없음)
        const liveKind = getInkMode()
        const liveDraw = mode === 'ink' && isDrawKind(liveKind) && inkPts.length >= 2
        const liveErase = mode === 'ink' && inkErasing && inkPts.length >= 2
        let layer = inkLayer
        if (liveDraw || liveErase) {
          fctx.setTransform(1, 0, 0, 1, 0, 0)
          fctx.clearRect(0, 0, canvas.width, canvas.height)
          fctx.drawImage(inkLayer, 0, 0)
          fctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          if (liveDraw) paintStroke(fctx, inkPts, getPenColor(), getPenWidth(), liveKind)
          if (liveErase) {
            fctx.globalCompositeOperation = 'destination-out'
            drawEraseMark(fctx, inkPts, getPenWidth())
            fctx.globalCompositeOperation = 'source-over'
          }
          layer = frameLayer
        }
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.drawImage(layer, 0, 0)
        ctx.restore()
      }
      // 올가미로 선택된 획: 초록 하이라이트(윤곽)
      if (selStrokes.size) {
        for (const s of curStrokes) {
          if (!selStrokes.has(s.id)) continue
          ctx.save()
          ctx.globalAlpha = 0.35
          ctx.strokeStyle = '#3ddc7f'
          ctx.lineWidth = Math.max(1, s.width * c.zoom) + 6
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.beginPath()
          const f = w2s(s.pts[0], s.pts[1])
          ctx.moveTo(f.x, f.y)
          for (let i = 2; i < s.pts.length; i += 2) {
            const q = w2s(s.pts[i], s.pts[i + 1])
            ctx.lineTo(q.x, q.y)
          }
          ctx.stroke()
          ctx.restore()
        }
        // 선택 경계 박스(점선) + 우상단 삭제 버튼
        const bb = selectedStrokesBBox()
        if (bb) {
          const tl = w2s(bb.x0, bb.y0)
          const br = w2s(bb.x1, bb.y1)
          ctx.strokeStyle = '#3ddc7f'
          ctx.lineWidth = 1.5
          ctx.setLineDash([6, 4])
          ctx.strokeRect(tl.x - 4, tl.y - 4, br.x - tl.x + 8, br.y - tl.y + 8)
          ctx.setLineDash([])
          // 코너 리사이즈 핸들(흰 원 4개) — 잡고 끌면 크기 조절
          ctx.fillStyle = '#fff'
          ctx.strokeStyle = '#3ddc7f'
          ctx.lineWidth = 1.5
          for (const cn of [tl, { x: br.x, y: tl.y }, { x: tl.x, y: br.y }, br]) {
            ctx.beginPath()
            ctx.arc(cn.x, cn.y, 5, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
          }
          // 삭제 버튼(빨간 원 + ×) — 박스 우상단. onDown 히트영역과 좌표 일치.
          const trx = br.x + 16
          const trY = tl.y - 16
          ctx.beginPath()
          ctx.arc(trx, trY, 13, 0, Math.PI * 2)
          ctx.fillStyle = '#e5484d'
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(trx - 4, trY - 4)
          ctx.lineTo(trx + 4, trY + 4)
          ctx.moveTo(trx + 4, trY - 4)
          ctx.lineTo(trx - 4, trY + 4)
          ctx.stroke()
        }
      }
      // 올가미 그리는 중: 점선 폴리곤
      if (mode === 'lasso' && lassoPts.length >= 4) {
        ctx.strokeStyle = 'rgba(61,220,127,0.9)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 4])
        ctx.beginPath()
        const f = w2s(lassoPts[0], lassoPts[1])
        ctx.moveTo(f.x, f.y)
        for (let i = 2; i < lassoPts.length; i += 2) {
          const q = w2s(lassoPts[i], lassoPts[i + 1])
          ctx.lineTo(q.x, q.y)
        }
        ctx.stroke() // 끌고 온 자취만 그림(끝↔시작 잇는 선은 안 그림 — 선택은 내부적으로 자동 닫힘)
        ctx.setLineDash([])
      }
      // 지우개 커서(반경 링) — 지우개 도구 또는 우클릭 임시 지우개 중
      if ((getInkMode() === 'eraser' || getInkMode() === 'erasePart' || rightErase) && inkCursor) {
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.arc(inkCursor.x, inkCursor.y, Math.max(2, getEraserRadius() * c.zoom), 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // 그룹 선택: OBB(회전 따라 도는 안정 박스) + 코너(크기조절) + 회전/관절
      const gh = grouped ? groupHandles() : null
      if (gh) {
        ctx.save()
        ctx.translate(gh.sc.x, gh.sc.y)
        ctx.rotate(gh.rad)
        ctx.strokeStyle = '#3ddc7f'
        ctx.lineWidth = 2
        ctx.setLineDash([])
        roundRectPath(-(gh.shw + gh.pad), -(gh.shh + gh.pad), (gh.shw + gh.pad) * 2, (gh.shh + gh.pad) * 2, 10)
        ctx.stroke()
        ctx.restore()
        // 코너 핸들(크기조절)
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = '#3ddc7f'
        ctx.lineWidth = 1.5
        for (const co of gh.corners) {
          ctx.beginPath()
          ctx.arc(co.x, co.y, 3.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }
        const gAny = [...getSelectionSet()][0]
        if (gAny && isSpined(gAny)) {
          // 척추화된 그룹: 관절점 표시(드래그로 관절 회전)
          const j = spineJointWorld(gAny)
          if (j) {
            const js = w2s(j.x, j.y)
            ctx.strokeStyle = '#e3b341'
            ctx.fillStyle = '#1a1300'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(js.x, js.y, 5, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
          }
        } else {
          // 회전 핸들
          ctx.strokeStyle = '#3ddc7f'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(gh.rotStem.x, gh.rotStem.y)
          ctx.lineTo(gh.rotHandle.x, gh.rotHandle.y)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(gh.rotHandle.x, gh.rotHandle.y, 9, 0, Math.PI * 2)
          ctx.fillStyle = '#fff'
          ctx.fill()
          ctx.stroke()
          ctx.fillStyle = '#1a7f4b'
          ctx.font = '12px system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('↻', gh.rotHandle.x, gh.rotHandle.y + 0.5)
        }
      }

      // 단일 선택 노드: 코너 리사이즈 핸들 (크기는 우측 인스펙터에 표시되므로 캔버스 라벨은 생략)
      const solePid = getSoleSelectedPid()
      if (solePid) {
        const it = items.find((i) => i.pid === solePid)
        if (it && it.shape === 'line') {
          // 선: 코너/회전 핸들 대신 양 끝점 핸들만(잡으면 각도·길이 조절)
          const ctr = w2s(it.x, it.y)
          const rot = (((((it.rotation || 0) % 360) + 360) % 360) * Math.PI) / 180
          const half = (it.w / 2) * c.zoom
          const ex = Math.cos(rot) * half
          const ey = Math.sin(rot) * half
          ctx.fillStyle = '#fff'
          ctx.strokeStyle = '#3ddc7f'
          ctx.lineWidth = 1.5
          for (const s of [-1, 1]) {
            ctx.beginPath()
            ctx.arc(ctr.x + s * ex, ctr.y + s * ey, 4.5, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
          }
        } else if (it) {
          const ctr = w2s(it.x, it.y)
          const hw = Math.max((it.w / 2) * c.zoom, 2)
          const hh = Math.max((it.h / 2) * c.zoom, 2)
          const rot = (((((it.rotation || 0) % 360) + 360) % 360) * Math.PI) / 180
          const cos = Math.cos(rot)
          const sin = Math.sin(rot)
          ctx.fillStyle = '#fff'
          ctx.strokeStyle = '#3ddc7f'
          ctx.lineWidth = 1.5
          for (const sx of [-1, 1])
            for (const sy of [-1, 1]) {
              const lx = sx * hw
              const ly = sy * hh
              const px = ctr.x + lx * cos - ly * sin // 코너를 노드 회전만큼 돌려서 표시
              const py = ctr.y + lx * sin + ly * cos
              ctx.beginPath()
              ctx.arc(px, py, 2.75, 0, Math.PI * 2) // 코너 핸들(절반 크기)
              ctx.fill()
              ctx.stroke()
            }
          // 사진·도형: 항상 화면 "아래"에 회전 핸들(개체를 돌려도 핸들은 안 돌고 밑에 유지).
          if ((it.type === 'photo' || it.type === 'shape') && !isSpined(it.pid)) {
            const bottomExt = hw * Math.abs(sin) + hh * Math.abs(cos) // 회전된 박스의 수직 반높이
            const stemX = ctr.x
            const stemY = ctr.y + bottomExt
            const hx = ctr.x // 핸들은 화면 정하단
            const hy = ctr.y + bottomExt + ROT_GAP
            ctx.strokeStyle = '#3ddc7f'
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.moveTo(stemX, stemY)
            ctx.lineTo(hx, hy)
            ctx.stroke()
            ctx.beginPath()
            ctx.arc(hx, hy, 9, 0, Math.PI * 2)
            ctx.fillStyle = '#fff'
            ctx.fill()
            ctx.stroke()
            ctx.fillStyle = '#1a7f4b'
            ctx.font = '12px system-ui, sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('↻', hx, hy + 0.5)
          }
        }
        // 척추화된 개체: 관절점(회전 축) 표시 — 노란 고리
        const joint = it && isSpined(it.pid) ? spineJointWorld(it.pid) : null
        if (joint) {
          const js = w2s(joint.x, joint.y)
          ctx.strokeStyle = '#e3b341'
          ctx.fillStyle = '#1a1300'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(js.x, js.y, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }
      }

      // 영역 선택(파랑) / 줄잇기(초록) 박스
      if (marquee) {
        const x = Math.min(marquee.x0, marquee.x1)
        const y = Math.min(marquee.y0, marquee.y1)
        const w = Math.abs(marquee.x1 - marquee.x0)
        const h = Math.abs(marquee.y1 - marquee.y0)
        const linking = mode === 'link'
        ctx.fillStyle = linking ? 'rgba(52,201,138,0.10)' : 'rgba(91,140,255,0.12)'
        ctx.strokeStyle = linking ? '#34c98a' : '#3ddc7f'
        ctx.lineWidth = 1
        ctx.fillRect(x, y, w, h)
        ctx.strokeRect(x, y, w, h)
        // 줄잇기: 각 소스 배치 중심 → 커서로 가이드 선
        if (linking && linkSourcePids.length) {
          ctx.strokeStyle = '#34c98a'
          ctx.setLineDash([5, 4])
          for (const sid of linkSourcePids) {
            const src = items.find((it) => it.pid === sid)
            if (!src) continue
            const sp = w2s(src.x, src.y)
            ctx.beginPath()
            ctx.moveTo(sp.x, sp.y)
            ctx.lineTo(marquee.x1, marquee.y1)
            ctx.stroke()
          }
          ctx.setLineDash([])
        }
      }

      // 정렬 스냅 가이드(드래그 중 같은 X/Y에 붙었을 때) — 화면 가로/세로 전체에 초록선
      if (snapX !== null || snapY !== null) {
        ctx.strokeStyle = '#3ddc7f'
        ctx.lineWidth = 1
        ctx.beginPath()
        if (snapX !== null) {
          const sx = w2s(snapX, 0).x
          ctx.moveTo(sx, 0)
          ctx.lineTo(sx, H)
        }
        if (snapY !== null) {
          const sy = w2s(0, snapY).y
          ctx.moveTo(0, sy)
          ctx.lineTo(W, sy)
        }
        ctx.stroke()
      }

      // 줌 표시
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '11px ui-monospace, monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`zoom ${(c.zoom * 100) | 0}%  ·  ${items.length} nodes`, 10, H - 8)

      // 척추화 마법사 안내 배너(상단 중앙) + step1에서 찍은 내 연결점 표시
      const wiz = getSpineWizard()
      if (wiz) {
        const msg =
          wiz.step === 1
            ? 'Spine ①  Click the joint point ON THIS shape  (Esc to cancel)'
            : 'Spine ②  Click the joint point on the OTHER shape to sew  (Esc to cancel)'
        ctx.save()
        ctx.font = '13px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        const tw = ctx.measureText(msg).width
        ctx.fillStyle = 'rgba(20,25,40,0.92)'
        roundRectPath(W / 2 - tw / 2 - 14, 12, tw + 28, 30, 8)
        ctx.fill()
        ctx.strokeStyle = '#e3b341'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.fillStyle = '#ffe9a8'
        ctx.fillText(msg, W / 2, 19)
        ctx.restore()
        if (wiz.step === 2 && wiz.childAX !== undefined && wiz.childAY !== undefined) {
          const a = w2s(wiz.childAX, wiz.childAY)
          ctx.strokeStyle = '#e3b341'
          ctx.fillStyle = '#1a1300'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(a.x, a.y, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }
      }
    }

    function drawGrid(W: number, H: number) {
      const c = getCamera()
      const step = 80 * c.zoom
      if (step < 14) return // 너무 촘촘하면 생략
      const ox = ((-c.x * c.zoom + W / 2) % step + step) % step
      const oy = ((-c.y * c.zoom + H / 2) % step + step) % step
      ctx.strokeStyle = getGridBold() ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = ox; x < W; x += step) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
      }
      for (let y = oy; y < H; y += step) {
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
      }
      ctx.stroke()
    }

    // 현재 공간의 프레임(저장된 기준 영역) 점선 테두리.
    function drawFrame() {
      const f = getCurrentFrame()
      if (!f) return
      const a = w2s(f.cx - f.w / 2, f.cy - f.h / 2) // 좌상단
      const b = w2s(f.cx + f.w / 2, f.cy + f.h / 2) // 우하단
      ctx.save()
      ctx.strokeStyle = 'rgba(120,170,255,0.7)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([8, 6])
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y)
      ctx.restore()
    }

    function drawNode(
      n: SpaceItem,
      x: number,
      y: number,
      hw: number,
      hh: number,
      zoom: number,
      ring: Ring,
    ) {
      const rad = Math.min(hw, hh) // 둥근 정도/점 크기 기준
      // LOD: 20% 미만이면 점으로 — 단, 사진은 아예 안 보이게(폴더·노트만 점)
      if (zoom < 0.2) {
        if (n.type === 'photo') return
        ctx.fillStyle = n.color === 'none' ? n.textColor || '#fff' : n.color
        ctx.beginPath()
        ctx.arc(x, y, Math.max(2, rad), 0, Math.PI * 2)
        ctx.fill()
        return
      }

      const asset = getAsset(n.assetId)
      const showImage = asset && zoom >= 0.2 // 사진은 20%까지 사진 그대로
      ctx.save()

      // 사진·도형 자유 회전 + 뒤집기(미러): 중심으로 옮겨 회전 후 scale(±1)로 좌우/위아래 반전.
      const rot = (((((n.rotation || 0) % 360) + 360) % 360) * Math.PI) / 180
      let cx = x
      let cy = y
      if (rot || n.flipX || n.flipY) {
        ctx.translate(x, y)
        if (rot) ctx.rotate(rot)
        if (n.flipX || n.flipY) ctx.scale(n.flipX ? -1 : 1, n.flipY ? -1 : 1)
        cx = 0
        cy = 0
      }

      if (showImage) {
        const im = getImg(asset!.id, asset!.thumb)
        if (im) {
          // 노드 박스(w×h)에 꽉 채움 — 비율 잠금 해제 시 늘이고/눌리게(찌부)
          const dw = hw * 2
          const dh = hh * 2
          const rr = Math.min((n.radius || 0) * zoom, dw / 2, dh / 2)
          if (rr > 0) {
            roundRectPath(cx - dw / 2, cy - dh / 2, dw, dh, rr)
            ctx.clip()
          }
          ctx.drawImage(im, cx - dw / 2, cy - dh / 2, dw, dh)
        }
      } else if (n.color !== 'none') {
        if (n.shape === 'line') {
          // 선: 박스 가로로 그은 선(두께=실제 높이×줌, 둥근 끝). 각도는 회전으로.
          ctx.strokeStyle = n.color
          ctx.lineWidth = Math.max(1, n.h * zoom) // hh는 최소2로 클램프됨 → 실제 높이로 두께 계산
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(cx - hw, cy)
          ctx.lineTo(cx + hw, cy)
          ctx.stroke()
        } else {
          ctx.fillStyle = n.color
          drawShape(n, cx, cy, hw, hh, (n.radius || 0) * zoom)
          ctx.fill()
        }
      }
      ctx.restore()

      // 텍스트 개체: 박스 안에 글자(body) 그림. 편집 중에도 그림(편집 오버레이는 글자 투명 + 커서만) → 위치 100% 동일.
      if (n.type === 'text' && n.body) {
        const fs = (n.fontSize || 20) * zoom
        if (fs >= 4) {
          const align = n.align || 'left'
          const pad = 4 * zoom
          ctx.save()
          ctx.fillStyle = n.textColor || '#ffffff'
          ctx.font = `${n.bold ? '700 ' : ''}${fs}px system-ui, sans-serif`
          ctx.textBaseline = 'top'
          ctx.textAlign = align
          const tx = align === 'center' ? x : align === 'right' ? x + hw - pad : x - hw + pad
          const lines = textLines(n, n.w) // wrap이면 고정폭 줄바꿈, 아니면 \n 분리
          const lineH = fs * 1.25
          const lead = (lineH - fs) / 2 // HTML line-height 위쪽 여백 보정 → 편집칸과 글자 위치 일치
          const totalH = lines.length * lineH
          const valign = n.valign || 'top'
          let ly =
            valign === 'middle'
              ? y - totalH / 2
              : valign === 'bottom'
                ? y + hh - pad - totalH
                : y - hh + pad
          for (const l of lines) {
            fillRich(ctx, l, tx, ly + lead, fs)
            ly += lineH
          }
          ctx.restore()
        }
      }

      // 선택/공유 링: green=일반 선택, purple=유니크(공유) 선택, sibling=결속 형제(점선, 표시만)
      // 선(line)은 감싸지 않음(양 끝 핸들만). 그 외는 전부 사각형 테두리(회전 시 같이 기울어짐).
      // 사진·도형(선 포함)은 테두리 없이 코너 크기조절 핸들만 → 폴더·노트·텍스트만 링 표시
      if (ring && n.type !== 'photo' && n.type !== 'shape') {
        const isText = n.type === 'text'
        if (ring === 'sibling') {
          ctx.strokeStyle = '#a78bfa'
          ctx.lineWidth = isText ? 1.5 : 2
          ctx.setLineDash([6, 4])
        } else {
          ctx.strokeStyle = ring === 'purple' ? '#a78bfa' : '#3ddc7f' // 일반 선택 = 초록
          ctx.lineWidth = isText ? 1.5 : 2.5 // 텍스트는 입력칸처럼 얇게(고정 px)
          ctx.setLineDash([])
        }
        const pad = isText ? 0 : 6 // 텍스트는 박스에 딱 맞게, 그 외는 살짝 여유
        const rr = Math.min((n.radius || 0) * zoom + pad, hw + pad, hh + pad)
        const rot = (((((n.rotation || 0) % 360) + 360) % 360) * Math.PI) / 180
        ctx.save()
        if (rot) {
          ctx.translate(x, y)
          ctx.rotate(rot)
          roundRectPath(-hw - pad, -hh - pad, (hw + pad) * 2, (hh + pad) * 2, rr)
        } else {
          roundRectPath(x - hw - pad, y - hh - pad, (hw + pad) * 2, (hh + pad) * 2, rr)
        }
        ctx.stroke()
        ctx.restore()
        ctx.setLineDash([])
      }

      // 좌상단 배지. 크기는 노드 크기와 무관(월드 고정 × 줌)이라 가림 비율이 일정. 줄바꿈 지원.
      if (n.badge && n.badge.trim()) {
        const fs = (n.badgeSize || DEFAULT_BADGE_SIZE) * zoom
        if (fs >= 5) {
          const lines = n.badge.split('\n').map((l) => (l.length > 24 ? l.slice(0, 23) + '…' : l))
          const noBg = n.badgeBg === 'none'
          ctx.save()
          ctx.font = `600 ${fs}px system-ui, sans-serif`
          const padX = fs * 0.42
          const padY = fs * 0.28
          const lineH = fs * 1.18
          let maxW = 0
          for (const l of lines) maxW = Math.max(maxW, measureRich(ctx, l, fs))
          const bw = maxW + padX * 2
          const bh = (lines.length - 1) * lineH + fs + padY * 2
          const bx = x - hw + 2
          const by = y - hh + 2
          if (!noBg) {
            ctx.fillStyle = n.badgeBg || '#e3b341'
            roundRectPath(bx, by, bw, bh, fs * 0.35)
            ctx.fill()
          }
          const txtColor = n.badgeColor || (noBg ? '#fff' : '#1a1300')
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          if (noBg || n.emphasize) {
            ctx.shadowColor = isLightColor(txtColor) ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)'
            ctx.shadowBlur = Math.max(2, fs * 0.25)
          }
          ctx.fillStyle = txtColor
          let ly = by + padY
          for (const l of lines) {
            fillRich(ctx, l, bx + padX, ly, fs)
            if (n.emphasize) fillRich(ctx, l, bx + padX, ly, fs) // 한 번 더 → 그림자 또렷
            ly += lineH
          }
          ctx.restore()
        }
      }

      // 이름 (줌 충분할 때만). 사진·텍스트 개체는 아래 라벨 없이(텍스트는 박스 안 글자만). hideName=숨김.
      if (zoom >= 0.3 && n.type !== 'photo' && n.type !== 'text' && n.type !== 'shape' && !n.hideName) {
        const fontPx = Math.max(11, Math.min(16, rad * 0.5))
        const tx = x
        const ty = y + hh + 4
        ctx.font = `${fontPx}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        // 강조: 부드러운 그림자로 살짝 들어올림(테두리로 덮지 않음) → 흰 배경서도 보임
        ctx.fillStyle = n.textColor || '#e8ecf3'
        if (n.emphasize) {
          ctx.save()
          ctx.shadowColor = isLightColor(n.textColor || '#e8ecf3') ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)'
          ctx.shadowBlur = Math.max(2, fontPx * 0.3)
          ctx.shadowOffsetY = Math.max(0.5, fontPx * 0.05)
          fillRich(ctx, n.name, tx, ty, fontPx)
          fillRich(ctx, n.name, tx, ty, fontPx) // 한 번 더 → 그림자 또렷
          ctx.restore()
        } else {
          fillRich(ctx, n.name, tx, ty, fontPx)
        }
      }
    }

    function drawShape(n: SpaceItem, x: number, y: number, hw: number, hh: number, rr = 0) {
      ctx.beginPath()
      switch (n.shape) {
        case 'circle':
          ctx.ellipse(x, y, hw, hh, 0, 0, Math.PI * 2)
          break
        case 'triangle':
          ctx.moveTo(x, y - hh)
          ctx.lineTo(x + hw, y + hh)
          ctx.lineTo(x - hw, y + hh)
          ctx.closePath()
          break
        case 'hexagon':
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i - Math.PI / 6
            const px = x + hw * Math.cos(a)
            const py = y + hh * Math.sin(a)
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
          }
          ctx.closePath()
          break
        default:
          roundRectPath(x - hw, y - hh, hw * 2, hh * 2, Math.min(rr, hw, hh))
      }
    }

    function roundRectPath(x: number, y: number, w: number, h: number, rad: number) {
      const rr = Math.min(rad, w / 2, h / 2)
      ctx.beginPath()
      ctx.moveTo(x + rr, y)
      ctx.arcTo(x + w, y, x + w, y + h, rr)
      ctx.arcTo(x + w, y + h, x, y + h, rr)
      ctx.arcTo(x, y + h, x, y, rr)
      ctx.arcTo(x, y, x + w, y, rr)
      ctx.closePath()
    }

    // ── 렌더 루프 (dirty일 때만 = 배터리 절약, iOS 친화) ──
    function loop() {
      // 그리기 도구·관절 지정 중이면 십자 커서(스페이스 팬 커서는 건드리지 않음)
      if (getDrawTool() || getSpineWizard()) {
        if (canvas.style.cursor !== 'crosshair') canvas.style.cursor = 'crosshair'
      } else if (canvas.style.cursor === 'crosshair') {
        canvas.style.cursor = ''
      }
      if (swapAnim) markDirty() // 애니메이션 동안엔 매 프레임 다시 그림
      if (consumeDirty()) draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // ── 히트 테스트 ── (excludePid: 특정 배치는 건너뜀 — 척추화 2단계에서 자식 제외용)
    function hitTest(sx: number, sy: number, excludePid?: string): SpaceItem | null {
      const c = getCamera()
      const list = itemsInCurrentSpace()
      for (let i = list.length - 1; i >= 0; i--) {
        const it = list[i]
        if (excludePid && it.pid === excludePid) continue
        const p = w2s(it.x, it.y)
        // 모든 개체를 전체 영역으로 히트(가장자리 클릭도 선택). 위→아래(최상단 우선) 순회라
        // 큰 개체 위에 놓인 요소는 그 요소가 먼저 잡혀서 삼킴 문제 없음.
        const hw = Math.max((it.w / 2) * c.zoom, MIN_GRAB_PX)
        const hh = Math.max((it.h / 2) * c.zoom, MIN_GRAB_PX)
        let dx = sx - p.x
        let dy = sy - p.y
        const rot = (((((it.rotation || 0) % 360) + 360) % 360) * Math.PI) / 180
        if (rot) {
          // 커서를 노드 로컬축으로 역회전 → 축정렬 박스 판정
          const cos = Math.cos(-rot)
          const sin = Math.sin(-rot)
          const rx = dx * cos - dy * sin
          const ry = dx * sin + dy * cos
          dx = rx
          dy = ry
        }
        if (Math.abs(dx) <= hw && Math.abs(dy) <= hh) return it
      }
      return null
    }

    // ── 입력 (Pointer = 마우스+터치 통합) ──
    const pointers = new Map<number, { x: number; y: number }>()
    let mode:
      | 'none'
      | 'pan'
      | 'drag'
      | 'pinch'
      | 'marquee'
      | 'link'
      | 'resize'
      | 'rotate'
      | 'draw'
      | 'ink'
      | 'lasso'
      | 'lassomove'
      | 'lassoresize'
      | 'lineedit'
      | 'jointrotate'
      | 'groupresize' = 'none'
    // 도형 그리기: 방금 만든 도형 + 드래그 시작점(월드)
    let drawOp: { nodeId: string; pid: string; tool: Shape; startX: number; startY: number } | null =
      null
    // 잉크(펜 필기): 진행 중 획의 월드좌표 점열 [x0,y0,x1,y1,…] / 지우개로 뭔가 지웠는지 / 지우개 커서(화면)
    let inkPts: number[] = []
    let inkErasedAny = false
    let inkCursor: { x: number; y: number } | null = null
    let lastEraseW: { x: number; y: number } | null = null // 획 지우개: 직전 지운 위치(월드) → 선분으로 이어 지움
    let inkErasing = false // area 지우개로 지움 자국을 '그리는 중'(inkPts에 경로 누적)
    // 확정 잉크 캐시 레이어(카메라·내용 바뀔 때만 재생성 → 그리는 중엔 재렌더 안 함, 렉 방지)
    const inkLayer = document.createElement('canvas')
    const ictx = inkLayer.getContext('2d')
    let inkCacheKey = '' // 캐시 유효성 키(카메라·크기·공간·doc버전)
    // 프레임 합성용(캐시 + 지금 그리는 획 하나)
    const frameLayer = document.createElement('canvas')
    const fctx = frameLayer.getContext('2d')
    // 선 레이어(채우기 위에 얹음). 채우기·선을 따로 그려 각각 지우개 적용 → 넘침X + 지운뒤 재채움 둘 다.
    const strokeLayer = document.createElement('canvas')
    const sctx = strokeLayer.getContext('2d')
    // 터치로 그릴 때: 손가락이 살짝 움직이기 전까진 획을 '대기'(월드 시작점만 보관).
    // 그 사이 두 번째 손가락이 오면 pinch(팬/줌)로 넘어가 그림이 안 그려짐. 마우스·스타일러스는 즉시 그림.
    let inkTouchPending: { wx: number; wy: number } | null = null
    // 팜 리젝션: 현재 획을 시작한 포인터 id와 그게 펜인지. 펜으로 필기하는 동안 손바닥/손가락(touch)이
    // 닿아도 무시 → 두 번째 포인터가 핀치줌으로 오인돼 획이 통째로 취소되던 현상 방지.
    let inkPointerId: number | null = null
    let inkIsPen = false
    // 우클릭 임시 지우개(펜 활성 중 우클릭 드래그 = 마지막에 고른 지우개로 지움)
    let rightErase = false
    // 올가미: 그리는 중인 폴리곤(월드 점열) / 선택 이동 시작점(월드) / 이번 드래그 이동 여부
    let lassoPts: number[] = []
    let lassoLast: { x: number; y: number } | null = null
    let lassoMoved = false
    // 올가미 선택 리사이즈: 고정점(반대 코너 월드) + 시작거리 + 선택 획 원본 스냅샷
    let lassoResize: {
      pivotX: number
      pivotY: number
      startDist: number
      snap: { id: string; pts: number[]; width: number }[]
    } | null = null
    // 코너 리사이즈: 고정점(anchor 월드좌표) + 방향부호(sx,sy) + 비율잠금 + 노드 회전각(rad)
    let resizeOp: {
      pid: string
      nodeId: string
      ax: number
      ay: number
      sx: number
      sy: number
      ratio: number
      lock: boolean
      rot: number
    } | null = null
    // 사진 회전: 회전 중심(화면좌표)
    // 단일 회전: 중심(화면) + 직전 각도 + 스냅 안 된 누적 회전(raw) → 아래 고정 핸들이라 증분식
    let rotateOp: {
      pid: string
      nodeId: string
      cx: number
      cy: number
      lastAng: number
      raw: number
    } | null = null
    // 선 끝점 편집: 반대쪽 끝(고정점, 월드좌표)
    let lineOp: { pid: string; nodeId: string; fixedX: number; fixedY: number } | null = null
    // 관절/그룹 회전: 함께 돌 배치들(pids) + 축(pivot)의 월드·화면 좌표 + 직전 각도(증분)
    let jointOp: {
      pid: string // 확정(commit)용 대표
      pids: string[] // 함께 회전할 배치들(강체 단위)
      gid?: string // 그룹이면 그룹 회전각도 함께 누적
      pivotX: number
      pivotY: number
      pivSX: number
      pivSY: number
      lastAng: number
      raw: number // 누적 회전각(스냅 전) — 시작 절대각에서 누적
      applied: number // 마지막으로 실제 적용한(스냅된) 각도
    } | null = null
    // 그룹 크기조절: 고정점(반대 코너 월드) + 시작 거리 + 멤버 원본 스냅샷
    let groupResizeOp: {
      gid: string
      pivotX: number
      pivotY: number
      startDist: number
      snap: { pid: string; nodeId: string; x: number; y: number; w: number; h: number }[]
    } | null = null
    const HANDLE = 9 // 코너 핸들 히트 반경(px)
    let dragItem: SpaceItem | null = null
    let moved = false
    let downAt = { x: 0, y: 0 }
    let lastTapTime = 0
    let lastTapId: string | null = null
    let lastDownTime = 0 // 그룹 멤버 더블클릭(단독선택) 감지용 — onUp 더블탭과 분리
    let lastDownId: string | null = null
    let pinchPrev = { dist: 0, cx: 0, cy: 0 }
    // 드래그로 폴더에 넣기 / 노트끼리 데이터 맞바꾸기 (드웰)
    let dwellTarget: { pid: string; since: number } | null = null

    /** 커서 아래에서 dragItem을 넣을 수 있는 폴더 찾기 (자기 자신·순환 제외) */
    function folderUnder(sx: number, sy: number, drag: SpaceItem): SpaceItem | null {
      const c = getCamera()
      const list = itemsInCurrentSpace()
      for (let i = list.length - 1; i >= 0; i--) {
        const it = list[i]
        if (it.pid === drag.pid || it.type !== 'folder' || it.locked) continue
        if (!canNestInto(drag.nodeId, it.nodeId)) continue
        const pp = w2s(it.x, it.y)
        const hw = Math.max((it.w / 2) * c.zoom, MIN_GRAB_PX)
        const hh = Math.max((it.h / 2) * c.zoom, MIN_GRAB_PX)
        if (Math.abs(sx - pp.x) <= hw && Math.abs(sy - pp.y) <= hh) return it
      }
      return null
    }

    /** 커서 아래에서 dragItem(노트)과 데이터 맞바꿀 다른 노트 찾기 (자기 자신 제외) */
    function noteUnder(sx: number, sy: number, drag: SpaceItem): SpaceItem | null {
      if (drag.type !== 'memo') return null
      const c = getCamera()
      const list = itemsInCurrentSpace()
      for (let i = list.length - 1; i >= 0; i--) {
        const it = list[i]
        if (it.pid === drag.pid || it.type !== 'memo' || it.locked) continue // 잠긴 개체는 교체 대상 아님
        const pp = w2s(it.x, it.y)
        const hw = Math.max((it.w / 2) * c.zoom, MIN_GRAB_PX)
        const hh = Math.max((it.h / 2) * c.zoom, MIN_GRAB_PX)
        if (Math.abs(sx - pp.x) <= hw && Math.abs(sy - pp.y) <= hh) return it
      }
      return null
    }

    function localPos(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    /** 단일 선택 선(line)의 양 끝점을 (px,py)가 잡았는지 → 반대쪽 끝(고정점) 반환 */
    function lineHandleAt(px: number, py: number) {
      const pid = getSoleSelectedPid()
      if (!pid) return null
      const it = itemsInCurrentSpace().find((i) => i.pid === pid)
      if (!it || it.shape !== 'line') return null
      const c = getCamera()
      const ctr = w2s(it.x, it.y)
      const rot = (((((it.rotation || 0) % 360) + 360) % 360) * Math.PI) / 180
      const half = (it.w / 2) * c.zoom
      const ex = Math.cos(rot) * half
      const ey = Math.sin(rot) * half
      const hw = it.w / 2 // 월드 반길이(고정점 계산용)
      const ux = Math.cos(rot)
      const uy = Math.sin(rot)
      for (const s of [-1, 1]) {
        if (Math.hypot(px - (ctr.x + s * ex), py - (ctr.y + s * ey)) <= 12) {
          // 잡은 끝의 반대쪽(-s)이 고정점
          return {
            pid: it.pid,
            nodeId: it.nodeId,
            fixedX: it.x - s * ux * hw,
            fixedY: it.y - s * uy * hw,
          }
        }
      }
      return null
    }

    /** 선택된 그룹의 OBB 화면 좌표·코너·회전핸들 위치(회전 따라 도는 안정 박스) */
    function groupHandles() {
      const gid = selectedGroupId()
      if (!gid) return null
      const obb = groupOBB(gid)
      if (!obb) return null
      const c = getCamera()
      const sc = w2s(obb.cx, obb.cy)
      const shw = obb.hw * c.zoom
      const shh = obb.hh * c.zoom
      const rad = (obb.rot * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      const pad = 8
      const local = (lx: number, ly: number) => ({ x: sc.x + lx * cos - ly * sin, y: sc.y + lx * sin + ly * cos })
      const corners = [
        { sx: -1, sy: -1, ...local(-(shw + pad), -(shh + pad)) },
        { sx: 1, sy: -1, ...local(shw + pad, -(shh + pad)) },
        { sx: -1, sy: 1, ...local(-(shw + pad), shh + pad) },
        { sx: 1, sy: 1, ...local(shw + pad, shh + pad) },
      ]
      return { gid, obb, sc, shw, shh, rad, cos, sin, pad, corners, rotStem: local(0, shh + pad), rotHandle: local(0, shh + pad + ROT_GAP) }
    }

    /** 그룹 회전 핸들 잡았는지 */
    function groupRotateHandleAt(px: number, py: number) {
      const gh = groupHandles()
      if (!gh) return null
      const anyPid = [...getSelectionSet()][0]
      if (anyPid && isSpined(anyPid)) return null // 척추화된 그룹은 드래그로 관절 회전
      if (Math.hypot(px - gh.rotHandle.x, py - gh.rotHandle.y) > 12) return null
      return {
        pid: anyPid,
        pids: rigidUnit(anyPid),
        gid: gh.gid,
        pivotX: gh.obb.cx,
        pivotY: gh.obb.cy,
        pivSX: gh.sc.x,
        pivSY: gh.sc.y,
      }
    }

    /** 그룹 코너(크기조절) 핸들 잡았는지 → 고정점(반대 코너 월드)·시작거리·스냅샷 */
    function groupCornerAt(px: number, py: number) {
      const gh = groupHandles()
      if (!gh) return null
      for (const co of gh.corners) {
        if (Math.abs(px - co.x) <= HANDLE && Math.abs(py - co.y) <= HANDLE) {
          // 반대 코너(월드) = 고정점
          const oppX = gh.obb.cx + -co.sx * gh.obb.hw * gh.cos - -co.sy * gh.obb.hh * gh.sin
          const oppY = gh.obb.cy + -co.sx * gh.obb.hw * gh.sin + -co.sy * gh.obb.hh * gh.cos
          const grab = s2w(co.x, co.y)
          return {
            gid: gh.gid,
            pivotX: oppX,
            pivotY: oppY,
            startDist: Math.max(1, Math.hypot(grab.x - oppX, grab.y - oppY)),
            snap: groupScaleSnapshot(gh.gid),
          }
        }
      }
      return null
    }

    /** 단일 선택 노드의 코너 핸들을 (px,py)가 잡았는지 → 리사이즈 정보 반환 */
    function cornerHandleAt(px: number, py: number) {
      const pid = getSoleSelectedPid()
      if (!pid) return null
      const it = itemsInCurrentSpace().find((i) => i.pid === pid)
      if (!it || it.shape === 'line') return null // 선은 코너 리사이즈 없음(끝점만)
      const c = getCamera()
      const ctr = w2s(it.x, it.y)
      const hw = Math.max((it.w / 2) * c.zoom, 2)
      const hh = Math.max((it.h / 2) * c.zoom, 2)
      const rot = (((((it.rotation || 0) % 360) + 360) % 360) * Math.PI) / 180
      const cos = Math.cos(rot)
      const sin = Math.sin(rot)
      const wu = it.w / 2 // 월드 반가로/반세로
      const wv = it.h / 2
      for (const co of [
        { sx: -1, sy: -1 },
        { sx: 1, sy: -1 },
        { sx: -1, sy: 1 },
        { sx: 1, sy: 1 },
      ]) {
        // 코너 화면 위치(노드 회전 반영)
        const lx = co.sx * hw
        const ly = co.sy * hh
        const cxp = ctr.x + lx * cos - ly * sin
        const cyp = ctr.y + lx * sin + ly * cos
        if (Math.abs(px - cxp) <= HANDLE && Math.abs(py - cyp) <= HANDLE) {
          // 반대편 코너(고정점)를 로컬축으로 월드에서 계산: C + (-sx·wu)·u + (-sy·wv)·v
          const a = -co.sx * wu
          const b = -co.sy * wv
          return {
            pid: it.pid,
            nodeId: it.nodeId,
            sx: co.sx,
            sy: co.sy,
            ax: it.x + a * cos - b * sin,
            ay: it.y + a * sin + b * cos,
            ratio: it.w / Math.max(1, it.h),
            // 텍스트는 자기 lock(비율 유지+최소 글자), 그 외는 인스펙터 공통 비율락
            lock: it.type === 'text' ? !!getNode(it.nodeId)?.lock : getAspectLocked(),
            rot,
          }
        }
      }
      return null
    }

    /** 단일 선택 사진의 회전 핸들(하단 동그라미)을 (px,py)가 잡았는지 */
    function rotateHandleAt(px: number, py: number) {
      const pid = getSoleSelectedPid()
      if (!pid) return null
      const it = itemsInCurrentSpace().find((i) => i.pid === pid)
      if (!it || (it.type !== 'photo' && it.type !== 'shape') || it.shape === 'line' || isSpined(it.pid))
        return null
      const c = getCamera()
      const ctr = w2s(it.x, it.y)
      const hw = Math.max((it.w / 2) * c.zoom, 2)
      const hh = Math.max((it.h / 2) * c.zoom, 2)
      const rot = (((((it.rotation || 0) % 360) + 360) % 360) * Math.PI) / 180
      const bottomExt = hw * Math.abs(Math.sin(rot)) + hh * Math.abs(Math.cos(rot))
      const hx = ctr.x // 항상 화면 정하단
      const hy = ctr.y + bottomExt + ROT_GAP
      if (Math.hypot(px - hx, py - hy) <= 12)
        return { pid: it.pid, nodeId: it.nodeId, cx: ctr.x, cy: ctr.y }
      return null
    }

    /** 화면상 박스(marquee)에 걸치거나 들어가는 항목들 (AABB 교차) */
    function itemsIntersecting(box: { x0: number; y0: number; x1: number; y1: number }) {
      const c = getCamera()
      const rx0 = Math.min(box.x0, box.x1)
      const rx1 = Math.max(box.x0, box.x1)
      const ry0 = Math.min(box.y0, box.y1)
      const ry1 = Math.max(box.y0, box.y1)
      return itemsInCurrentSpace().filter((it) => {
        if (it.locked) return false // 잠긴 개체(절대개체)는 드래그 선택에 안 걸림
        const pp = w2s(it.x, it.y)
        const hw = Math.max((it.w / 2) * c.zoom, 2)
        const hh = Math.max((it.h / 2) * c.zoom, 2)
        return pp.x + hw >= rx0 && pp.x - hw <= rx1 && pp.y + hh >= ry0 && pp.y - hh <= ry1
      })
    }

    function onDown(e: PointerEvent) {
      lastPointerType = e.pointerType || 'mouse'
      // 팜 리젝션: 펜으로 필기 중엔 손바닥/손가락(touch) 접촉을 완전히 무시(캡처·핀치 안 함) → 획 안 끊김.
      if (mode === 'ink' && inkIsPen && e.pointerType === 'touch') return
      if (e.button === 2) {
        // 펜 활성 중 우클릭 = 임시 지우개(마지막에 고른 지우개 종류로). 아니면 컨텍스트 메뉴.
        if (getInkMode()) {
          try {
            canvas.setPointerCapture(e.pointerId)
          } catch {
            /* 무시 */
          }
          const p = localPos(e)
          pointers.set(e.pointerId, p)
          downAt = p
          moved = false
          mode = 'ink'
          rightErase = true
          inkCursor = p
          const w = s2w(p.x, p.y)
          const r = getEraserRadius()
          inkErasedAny = eraseStrokesNear(w.x, w.y, w.x, w.y, r) // 우클릭 = 획 통째 지우개
          lastEraseW = { x: w.x, y: w.y }
          markDirty()
        }
        return // 컨텍스트 메뉴는 열지 않음(onContextMenu가 잉크 중엔 막음)
      }
      try {
        canvas.setPointerCapture(e.pointerId)
      } catch {
        /* 일부 환경에서 비활성 포인터 캡처 시 예외 → 무시(핸들러 중단 방지) */
      }
      const p = localPos(e)
      pointers.set(e.pointerId, p)

      if (pointers.size === 2) {
        mode = 'pinch'
        const pts = [...pointers.values()]
        pinchPrev = {
          dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
          cx: (pts[0].x + pts[1].x) / 2,
          cy: (pts[0].y + pts[1].y) / 2,
        }
        dragItem = null
        dwellTarget = null
        armedFolderId = null
        armedSwapPid = null
        inkPts = [] // 두 손가락 = 팬/줌 → 진행 중이던 필기 획은 버림
        inkTouchPending = null // 대기 중이던 터치 필기도 취소(그림 X, 화면만 이동)
        clearLP()
        return
      }

      moved = false
      downAt = p
      dragGroup = null
      const touch = e.pointerType === 'touch' // 모바일: 빈 곳 = 마퀴 대신 공간 슬라이드(팬)

      // 척추화 마법사: ①내 연결점 → ②상대 연결점(그 아래 도형=부모)으로 꿰맴
      const wiz = getSpineWizard()
      if (wiz) {
        const w = s2w(p.x, p.y)
        if (wiz.step === 1) {
          setSpineChildAnchor(w.x, w.y) // 내 연결점
        } else {
          const target = hitTest(p.x, p.y, wiz.childPid) // 상대 도형(부모), 자식은 제외
          if (target) finishSpine(target.pid, w.x, w.y)
          else cancelSpine() // 빈 곳 클릭 → 취소
        }
        dragItem = null
        return
      }

      // 화면이동(손) 도구: 한 손가락/드래그 = 화면 이동(그리기·선택 무시). Space 팬과 동일.
      if (getPanTool() && e.button !== 2) {
        mode = 'pan'
        dragItem = null
        return
      }

      // 잉크 모드: 이 드래그가 필기/지우기/올가미가 됨(다른 조작 무시).
      // 단, Space 누름 / 가운데(휠)버튼이면 그리지 말고 아래 팬 핸들러로 넘김(화면 이동).
      // 펜은 '펜을 켠 상태(inkMode)'에서만 그린다 — 화면 터치로 자동 전환하지 않음.
      const ink = getInkMode()
      // 펜 팔레트(잉크모드) 열림 + 손가락 + 핸드모드 꺼짐 → 손가락은 필기 안 하고 내비/선택.
      //  · 빈 곳 = 화면이동(펜 유지)  · 개체 위 = 아래 일반 선택/드래그로(탭 선택 시 펜 끔은 onUp에서)
      const fingerNav = !!ink && e.pointerType === 'touch' && !getHandMode()
      if (fingerNav && !spaceHeld && e.button !== 1 && !hitTest(p.x, p.y)) {
        mode = 'pan'
        dragItem = null
        return
      }
      if (ink && !spaceHeld && e.button !== 1 && !fingerNav) {
        dragItem = null
        const w = s2w(p.x, p.y)
        inkPointerId = e.pointerId // 이 획을 시작한 포인터(팜 리젝션 기준)
        inkIsPen = e.pointerType === 'pen'
        if (isDrawKind(ink)) {
          mode = 'ink'
          if (e.pointerType === 'touch') {
            // 터치: 바로 시작 안 하고 대기 → 두 손가락이면 팬으로 넘어감
            inkTouchPending = { wx: w.x, wy: w.y }
            inkPts = []
          } else {
            inkPts = [w.x, w.y] // 마우스·스타일러스: 즉시(톡 = 점 하나)
          }
        } else if (ink === 'eraser' || ink === 'erasePart') {
          mode = 'ink'
          inkCursor = p
          const r = getEraserRadius()
          if (ink === 'erasePart') {
            inkErasing = true // 지움 자국을 그리기 시작(실시간 destination-out)
            inkPts = [w.x, w.y]
          } else {
            inkErasedAny = eraseStrokesNear(w.x, w.y, w.x, w.y, r) // 획 통째 지우개
            lastEraseW = { x: w.x, y: w.y }
          }
        } else if (ink === 'lasso') {
          const bb = selectedStrokesBBox()
          if (bb) {
            // 선택 박스 우상단 '삭제' 버튼 눌렀나?
            const btn = w2s(bb.x1, bb.y0)
            if (Math.hypot(p.x - (btn.x + 16), p.y - (btn.y - 16)) <= 14) {
              deleteSelectedStrokes()
              mode = 'none'
              markDirty()
              return
            }
            // 코너 핸들 잡았나? → 크기 조절(반대 코너 고정, 거리비율 균일 스케일)
            const corners: [number, number][] = [
              [bb.x0, bb.y0],
              [bb.x1, bb.y0],
              [bb.x0, bb.y1],
              [bb.x1, bb.y1],
            ]
            for (const [cxw, cyw] of corners) {
              const sc = w2s(cxw, cyw)
              if (Math.hypot(p.x - sc.x, p.y - sc.y) <= 11) {
                const pivotX = cxw === bb.x0 ? bb.x1 : bb.x0
                const pivotY = cyw === bb.y0 ? bb.y1 : bb.y0
                lassoResize = {
                  pivotX,
                  pivotY,
                  startDist: Math.max(1, Math.hypot(w.x - pivotX, w.y - pivotY)),
                  snap: getSelectedStrokesSnapshot(),
                }
                mode = 'lassoresize'
                markDirty()
                return
              }
            }
            // 선택 박스 안을 눌렀으면 → 이동
            if (w.x >= bb.x0 && w.x <= bb.x1 && w.y >= bb.y0 && w.y <= bb.y1) {
              mode = 'lassomove'
              lassoLast = w
              lassoMoved = false
              markDirty()
              return
            }
          }
          // 그 외 → 기존 선택 해제하고 새 올가미 시작
          clearStrokeSelection()
          mode = 'lasso'
          lassoPts = [w.x, w.y]
        } else if (ink === 'fill') {
          // 채우기: 클릭한 곳이 획으로 닫힌 영역이면 그 안을 현재 색으로 채움(즉시)
          const poly = computeFillPolygon(p.x, p.y)
          if (poly) addFill(poly, getPenColor())
          mode = 'none'
        }
        markDirty()
        return
      }

      // 도형 그리기 도구가 켜져 있으면: 이 드래그로 도형을 그림(다른 조작 무시)
      const tool = getDrawTool()
      if (tool) {
        const wpt = s2w(p.x, p.y)
        const created = addShapeAt(tool, wpt.x, wpt.y)
        drawOp = { ...created, tool, startX: wpt.x, startY: wpt.y }
        mode = 'draw'
        dragItem = null
        return
      }

      // Ctrl+Alt = 줄잇기: 선택된 모든 배치(소스)에서 대상으로 선(클릭=연결/토글 · 박스=여러 연결)
      if (e.ctrlKey && e.altKey) {
        const srcs = [...getSelectionSet()] // placement id 기준 (배치 단위 참조선)
        if (srcs.length) {
          mode = 'link'
          linkSourcePids = srcs
          dragItem = null
          marquee = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
          return
        }
      }

      // 패닝: Space 누른 채 드래그 또는 휠(가운데) 버튼
      if (spaceHeld || e.button === 1) {
        mode = 'pan'
        dragItem = null
        return
      }

      // 그룹 코너 핸들 잡으면 = 그룹 전체 크기조절(도형처럼)
      const gCorner = groupCornerAt(p.x, p.y)
      if (gCorner) {
        mode = 'groupresize'
        groupResizeOp = gCorner
        dragItem = null
        return
      }

      // 그룹 회전 핸들(그룹 박스 아래) 잡으면 = 그룹 전체를 중심축으로 회전
      const gHandle = groupRotateHandleAt(p.x, p.y)
      if (gHandle) {
        mode = 'jointrotate'
        jointOp = {
          ...gHandle,
          lastAng: (Math.atan2(p.y - gHandle.pivSY, p.x - gHandle.pivSX) * 180) / Math.PI,
          raw: getGroupRot(gHandle.gid), // 시작 절대각(그룹 회전각)에서 누적 → 절대 90° 스냅
          applied: getGroupRot(gHandle.gid),
        }
        dragItem = null
        return
      }

      // 단일 선택 사진의 회전 핸들 잡으면 = 회전 (코너보다 먼저 검사)
      const rHandle = rotateHandleAt(p.x, p.y)
      if (rHandle && !getPlacement(rHandle.pid)?.locked) {
        // 척추화됐으면 관절이 축, 아니면 자식이 있을 때 자기 중심이 축(하위 함께 회전)
        const joint = isSpined(rHandle.pid) ? spineJointWorld(rHandle.pid) : null
        const hasKids = spineDescendants(rHandle.pid).length > 0
        if (joint || hasKids) {
          const piv = joint ?? s2w(rHandle.cx, rHandle.cy) // 관절 없으면 자기 중심
          const ps = joint ? w2s(joint.x, joint.y) : { x: rHandle.cx, y: rHandle.cy }
          mode = 'jointrotate'
          jointOp = {
            pid: rHandle.pid,
            pids: rigidUnit(rHandle.pid),
            pivotX: piv.x,
            pivotY: piv.y,
            pivSX: ps.x,
            pivSY: ps.y,
            lastAng: (Math.atan2(p.y - ps.y, p.x - ps.x) * 180) / Math.PI,
            raw: 0,
            applied: 0,
          }
        } else {
          mode = 'rotate'
          rotateOp = {
            ...rHandle,
            lastAng: (Math.atan2(p.y - rHandle.cy, p.x - rHandle.cx) * 180) / Math.PI,
            raw: getNode(rHandle.nodeId)?.rotation || 0,
          }
        }
        dragItem = null
        return
      }

      // 단일 선택 선의 끝점 잡으면 = 각도·길이 조절
      const lHandle = lineHandleAt(p.x, p.y)
      if (lHandle && !getPlacement(lHandle.pid)?.locked) {
        mode = 'lineedit'
        lineOp = lHandle
        dragItem = null
        return
      }

      // 단일 선택 노드의 코너 핸들 잡으면 = 리사이즈
      const handle = cornerHandleAt(p.x, p.y)
      if (handle && !getPlacement(handle.pid)?.locked) {
        mode = 'resize'
        resizeOp = handle
        dragItem = null
        // 락 안 걸린 텍스트는 크기 조절하는 순간 폭 자동줄바꿈(wrap) 모드로
        const hn = getNode(handle.nodeId)
        if (hn?.type === 'text' && !hn.lock && !hn.wrap) updateNode(hn.id, { wrap: true })
        return
      }

      const hit = hitTest(p.x, p.y)
      if (hit && getPlacement(hit.pid)?.locked) {
        // 잠긴 절대개체(배경 등): 단일클릭/드래그로는 안 잡힘. 더블클릭해야 선택.
        const now = Date.now()
        const isDbl = lastTapId === hit.pid && now - lastTapTime < 350
        lastTapId = hit.pid
        lastTapTime = now
        if (isDbl) {
          select(hit.pid)
          mode = 'none'
          dragItem = null
          return
        }
        // 단일클릭 → 모바일은 팬, PC는 빈곳 마퀴
        if (touch) {
          mode = 'pan'
          dragItem = null
        } else {
          mode = 'marquee'
          dragItem = null
          marquee = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
        }
      } else if (hit) {
        // 그룹 멤버를 더블클릭 = 그 하나만 단독 선택(그룹은 유지) → 개별 편집
        const nowD = Date.now()
        const dblGroup =
          !e.shiftKey &&
          lastDownId === hit.pid &&
          nowD - lastDownTime < 350 &&
          !!getPlacement(hit.pid)?.groupId &&
          isSelected(hit.pid)
        lastDownId = hit.pid
        lastDownTime = nowD
        if (dblGroup) {
          selectSingle(hit.pid)
          mode = 'none'
          dragItem = null
          return
        }
        // 이미 선택된 척추화 개체를 잡고 끌면 = 관절 축으로 회전(포즈). 하위도 함께.
        if (isSpined(hit.pid) && isSelected(hit.pid) && !e.shiftKey) {
          const joint = spineJointWorld(hit.pid)
          if (joint) {
            const js = w2s(joint.x, joint.y)
            mode = 'jointrotate'
            jointOp = {
              pid: hit.pid,
              pids: rigidUnit(hit.pid), // 그룹이면 그룹 전체가 관절 축으로 함께 회전
              gid: getPlacement(hit.pid)?.groupId,
              pivotX: joint.x,
              pivotY: joint.y,
              pivSX: js.x,
              pivSY: js.y,
              lastAng: (Math.atan2(p.y - js.y, p.x - js.x) * 180) / Math.PI,
              raw: getGroupRot(getPlacement(hit.pid)?.groupId || ''),
              applied: getGroupRot(getPlacement(hit.pid)?.groupId || ''),
            }
            dragItem = null
            return
          }
        }
        mode = 'drag'
        dragItem = hit
        // 이미 선택돼 있던 개체만 이번에 이동 가능. 아직 선택 안 됐으면 이번 누름은 "선택만"(이동 X).
        dragMovable = isSelected(hit.pid) && !e.shiftKey
        // 모바일: 꾹 누르면(롱프레스) 다중선택 토글
        if (touch) {
          longPressed = false
          clearLP()
          lpTimer = setTimeout(() => {
            if (!isSelected(hit.pid)) select(hit.pid, true) // 꾹 → 선택에 추가
            multiMode = true // 이후엔 톡 탭만으로 토글
            longPressed = true
            markDirty()
          }, 450)
        }
      } else if (touch) {
        // 모바일: 빈 곳 드래그 = 공간 슬라이드(팬). (빈 곳 꾹 "Paste here" 메뉴는 제거)
        mode = 'pan'
        dragItem = null
        longPressed = false
        clearLP()
      } else {
        // PC: 빈 곳 드래그 = 영역 선택(마퀴)
        mode = 'marquee'
        dragItem = null
        marquee = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
      }
    }

    function onMove(e: PointerEvent) {
      if (!pointers.has(e.pointerId)) return
      const p = localPos(e)
      pointers.set(e.pointerId, p)

      if (mode === 'pinch' && pointers.size >= 2) {
        const pts = [...pointers.values()]
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        const cx = (pts[0].x + pts[1].x) / 2
        const cy = (pts[0].y + pts[1].y) / 2
        const c = getCamera()
        // 벌린 정도 변화 → 줌
        let zoom = c.zoom * (dist / (pinchPrev.dist || dist))
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
        // 직전 프레임 중심 아래에 있던 월드점을, 새 중심 위치로 옮김 → 두 손가락 이동이 곧 화면 이동(팬).
        const wx = (pinchPrev.cx - cssW() / 2) / c.zoom + c.x
        const wy = (pinchPrev.cy - cssH() / 2) / c.zoom + c.y
        const nx = wx - (cx - cssW() / 2) / zoom
        const ny = wy - (cy - cssH() / 2) / zoom
        setCamera({ x: nx, y: ny, zoom })
        pinchPrev = { dist, cx, cy }
        return
      }

      if (Math.hypot(p.x - downAt.x, p.y - downAt.y) > 3) {
        moved = true
        clearLP() // 움직이면 롱프레스 취소
      }

      // 잉크: 중간 좌표(getCoalescedEvents)까지 촘촘히 받아 매끈하게
      if (mode === 'ink') {
        const evs = e.getCoalescedEvents?.() ?? []
        const samples = evs.length ? evs : [e]
        // 우클릭 임시 지우개: 펜 종류와 무관하게 마지막 지우개로 지움
        if (rightErase) {
          const r = getEraserRadius()
          for (const ce of samples) {
            const lp = localPos(ce)
            const w = s2w(lp.x, lp.y)
            const f = lastEraseW ?? w
            if (eraseStrokesNear(f.x, f.y, w.x, w.y, r)) inkErasedAny = true
            lastEraseW = w
          }
          inkCursor = p
          markDirty()
          return
        }
        const im = getInkMode()
        // 터치 대기: 살짝(8px) 움직여야 실제로 획 시작(그 전에 두 손가락 오면 팬).
        if (inkTouchPending) {
          if (Math.hypot(p.x - downAt.x, p.y - downAt.y) < 8) {
            markDirty()
            return
          }
          inkPts = [inkTouchPending.wx, inkTouchPending.wy]
          inkTouchPending = null
        }
        if (im === 'highlighter') {
          // 형광펜: 곡선 없이 시작점→현재점 '일자'(책에 형광펜 긋듯). 끝점만 갱신.
          const w = s2w(p.x, p.y)
          inkPts = [inkPts[0], inkPts[1], w.x, w.y]
        } else if (isDrawKind(im)) {
          for (const ce of samples) {
            const lp = localPos(ce)
            const w = s2w(lp.x, lp.y)
            const n = inkPts.length
            // 너무 촘촘한 점은 건너뜀(월드 0.5px 미만) → 데이터·렌더 절약
            if (n >= 2 && Math.hypot(w.x - inkPts[n - 2], w.y - inkPts[n - 1]) < 0.5 / getCamera().zoom)
              continue
            inkPts.push(w.x, w.y)
          }
        } else {
          const r = getEraserRadius()
          if (im === 'erasePart') {
            for (const ce of samples) {
              const lp = localPos(ce)
              const w = s2w(lp.x, lp.y)
              const n = inkPts.length
              if (n >= 2 && Math.hypot(w.x - inkPts[n - 2], w.y - inkPts[n - 1]) < 0.5 / getCamera().zoom)
                continue
              inkPts.push(w.x, w.y) // 지움 자국 경로 누적(실시간 렌더)
            }
          } else {
            for (const ce of samples) {
              const lp = localPos(ce)
              const w = s2w(lp.x, lp.y)
              const f = lastEraseW ?? w
              if (eraseStrokesNear(f.x, f.y, w.x, w.y, r)) inkErasedAny = true
              lastEraseW = w
            }
          }
          inkCursor = p
        }
        markDirty()
        return
      }
      if (mode === 'lasso') {
        const w = s2w(p.x, p.y)
        const n = lassoPts.length
        if (!(n >= 2 && Math.hypot(w.x - lassoPts[n - 2], w.y - lassoPts[n - 1]) < 2 / getCamera().zoom))
          lassoPts.push(w.x, w.y)
        markDirty()
        return
      }
      if (mode === 'lassomove' && lassoLast) {
        const w = s2w(p.x, p.y)
        moveSelectedStrokesBy(w.x - lassoLast.x, w.y - lassoLast.y)
        lassoLast = w
        lassoMoved = true
        markDirty()
        return
      }
      if (mode === 'lassoresize' && lassoResize) {
        const w = s2w(p.x, p.y)
        const k = Math.hypot(w.x - lassoResize.pivotX, w.y - lassoResize.pivotY) / lassoResize.startDist
        applyStrokeScale(lassoResize.snap, lassoResize.pivotX, lassoResize.pivotY, Math.max(0.05, k))
        lassoMoved = true
        markDirty()
        return
      }

      if (mode === 'pan') {
        const c = getCamera()
        const dx = (p.x - downAt.x) / c.zoom
        const dy = (p.y - downAt.y) / c.zoom
        setCamera({ x: c.x - dx, y: c.y - dy, zoom: c.zoom })
        downAt = p
      } else if (mode === 'resize' && resizeOp) {
        const w = s2w(p.x, p.y)
        const rnode = getNode(resizeOp.nodeId)
        const isTextNode = rnode?.type === 'text'
        // 노드 로컬축(회전 반영). rot=0이면 u=(1,0),v=(0,1) → 기존 축정렬과 동일.
        const cos = Math.cos(resizeOp.rot)
        const sin = Math.sin(resizeOp.rot)
        const dx = w.x - resizeOp.ax
        const dy = w.y - resizeOp.ay
        const du = dx * cos + dy * sin // 로컬 x 성분(가로)
        const dv = -dx * sin + dy * cos // 로컬 y 성분(세로)
        // 텍스트: 락=비율유지+글자 최소 / 언락=폭 자유 + 폭에 맞춰 줄바꿈(높이 자동)
        let minW = 8
        if (isTextNode) minW = rnode!.lock || !rnode!.wrap ? measureTextNode(rnode!).w : 40
        const newW = Math.max(minW, Math.abs(du))
        let newH: number
        if (resizeOp.lock) {
          newH = newW / resizeOp.ratio // 비율 유지(사진·락 텍스트)
          if (isTextNode) newH = Math.max(newH, measureTextNode(rnode!).h)
        } else {
          let minH = 8
          if (isTextNode) minH = rnode!.wrap ? wrappedHeight(rnode!, newW) : measureTextNode(rnode!).h
          newH = Math.max(minH, Math.abs(dv))
        }
        setNodeSizeLive(resizeOp.nodeId, newW, newH)
        // 새 중심 = 고정점 + (sx·newW/2)·u + (sy·newH/2)·v
        const au = (resizeOp.sx * newW) / 2
        const av = (resizeOp.sy * newH) / 2
        moveNodeLive(
          resizeOp.pid,
          resizeOp.ax + au * cos - av * sin,
          resizeOp.ay + au * sin + av * cos,
        )
        markDirty()
      } else if (mode === 'rotate' && rotateOp) {
        // 아래 고정 핸들 → 증분식: 커서 각도 변화만큼 raw에 누적, 출력만 90° 스냅(자석, 탈출 가능)
        const ang = (Math.atan2(p.y - rotateOp.cy, p.x - rotateOp.cx) * 180) / Math.PI
        rotateOp.raw += ang - rotateOp.lastAng
        rotateOp.lastAng = ang
        let deg = rotateOp.raw
        const nearest = Math.round(deg / 90) * 90
        if (Math.abs(deg - nearest) < ROT_SNAP_DEG) deg = nearest
        setRotationLive(rotateOp.nodeId, deg)
        markDirty()
      } else if (mode === 'jointrotate' && jointOp) {
        // 축 중심 증분 회전 + 90° 스냅(자석). raw에 누적, 출력은 90° 배수에 스냅해 그 차이만큼만 회전.
        const ang = (Math.atan2(p.y - jointOp.pivSY, p.x - jointOp.pivSX) * 180) / Math.PI
        jointOp.raw += ang - jointOp.lastAng
        jointOp.lastAng = ang
        let target = jointOp.raw
        const nearest = Math.round(target / 90) * 90
        if (Math.abs(target - nearest) < ROT_SNAP_DEG) target = nearest
        const dd = target - jointOp.applied // 지난 적용값과의 차이만큼만 실제 회전
        jointOp.applied = target
        rotatePidsLive(jointOp.pids, jointOp.pivotX, jointOp.pivotY, dd)
        if (jointOp.gid) addGroupRotLive(jointOp.gid, dd) // 그룹 박스도 함께 돌게
        markDirty()
      } else if (mode === 'groupresize' && groupResizeOp) {
        // 그룹 크기조절: 반대 코너 고정, 거리 비율로 균일 스케일
        const wpt = s2w(p.x, p.y)
        const dist = Math.hypot(wpt.x - groupResizeOp.pivotX, wpt.y - groupResizeOp.pivotY)
        scaleGroupApply(
          groupResizeOp.snap,
          dist / groupResizeOp.startDist,
          groupResizeOp.pivotX,
          groupResizeOp.pivotY,
        )
        markDirty()
      } else if (mode === 'draw' && drawOp) {
        // 도형 그리기: 시작점→현재점으로 크기(선이면 길이·각도) 결정
        const wpt = s2w(p.x, p.y)
        const ax = drawOp.startX
        const ay = drawOp.startY
        if (drawOp.tool === 'line') {
          const dx = wpt.x - ax
          const dy = wpt.y - ay
          setNodeWidthLive(drawOp.nodeId, Math.hypot(dx, dy)) // 길이만(두께 유지)
          moveNodeLive(drawOp.pid, (ax + wpt.x) / 2, (ay + wpt.y) / 2) // 중심=양끝 중점
          setRotationLive(drawOp.nodeId, (Math.atan2(dy, dx) * 180) / Math.PI)
        } else {
          const w = Math.abs(wpt.x - ax)
          const h = Math.abs(wpt.y - ay)
          setNodeSizeLive(drawOp.nodeId, w, h)
          moveNodeLive(drawOp.pid, (ax + wpt.x) / 2, (ay + wpt.y) / 2) // 시작~현재 박스 중심
        }
        markDirty()
      } else if (mode === 'lineedit' && lineOp) {
        // 선 끝점 편집: 고정점→현재점으로 길이·각도 갱신(두께 유지)
        const wpt = s2w(p.x, p.y)
        const dx = wpt.x - lineOp.fixedX
        const dy = wpt.y - lineOp.fixedY
        setNodeWidthLive(lineOp.nodeId, Math.hypot(dx, dy))
        moveNodeLive(lineOp.pid, (lineOp.fixedX + wpt.x) / 2, (lineOp.fixedY + wpt.y) / 2)
        setRotationLive(lineOp.nodeId, (Math.atan2(dy, dx) * 180) / Math.PI)
        markDirty()
      } else if ((mode === 'marquee' || mode === 'link') && marquee) {
        marquee.x1 = p.x
        marquee.y1 = p.y
        markDirty()
      } else if (mode === 'drag' && dragItem) {
        if (!dragMovable) return // 아직 선택 안 됐던 개체 → 이동 안 함(이번엔 선택만)
        // 첫 이동 시 일괄이동 그룹 확정: 선택에 dragItem 포함 보장
        if (!dragGroup) {
          const set = new Set(getSelectionSet())
          set.add(dragItem.pid)
          // 척추 하위(자식·손자…)도 함께 이동 → 부모 움직이면 자식 따라감
          for (const pid of [...set]) for (const d of spineDescendants(pid)) set.add(d)
          dragGroup = [...set]
            .map((pid) => {
              const pl = getPlacement(pid)
              if (!pl) return null
              const pos = placementPos(pl) // 현재 기기 좌표에서 출발
              return { pid, x0: pos.x, y0: pos.y }
            })
            .filter((g): g is { pid: string; x0: number; y0: number } => !!g)
        }
        const c = getCamera()
        let dwx = (p.x - downAt.x) / c.zoom
        let dwy = (p.y - downAt.y) / c.zoom
        // 정렬 스냅: 주 개체 중심이 다른 개체 중심 X/Y에 가까우면(6px 이내) 그 선에 붙임(자석).
        // 더 끌면(6px 초과) 자연히 풀려서 계속 이동.
        snapX = null
        snapY = null
        const prim = dragGroup.find((g) => g.pid === dragItem!.pid) ?? dragGroup[0]
        if (prim) {
          const groupPids = new Set(dragGroup.map((g) => g.pid))
          const curX = prim.x0 + dwx
          const curY = prim.y0 + dwy
          const tol = 6 / c.zoom
          let bestXd = tol
          let bestYd = tol
          for (const it of itemsInCurrentSpace()) {
            if (groupPids.has(it.pid)) continue
            const dxa = Math.abs(it.x - curX)
            if (dxa < bestXd) {
              bestXd = dxa
              snapX = it.x
            }
            const dya = Math.abs(it.y - curY)
            if (dya < bestYd) {
              bestYd = dya
              snapY = it.y
            }
          }
          if (snapX !== null) dwx += snapX - curX
          if (snapY !== null) dwy += snapY - curY
        }
        for (const g of dragGroup) moveNodeLive(g.pid, g.x0 + dwx, g.y0 + dwy)
        // 드롭 준비는 단일 드래그일 때만 (그룹 드롭은 복잡 → 제외). 폴더(넣기) 우선, 없으면 노트(맞바꾸기)
        if (dragGroup.length === 1) {
          const overFolder = folderUnder(p.x, p.y, dragItem)
          const overNote = overFolder ? null : noteUnder(p.x, p.y, dragItem)
          const target = overFolder ?? overNote
          if (target) {
            if (dwellTarget?.pid !== target.pid) {
              dwellTarget = { pid: target.pid, since: Date.now() }
              armedFolderId = null
              armedSwapPid = null
            } else if (Date.now() - dwellTarget.since >= DWELL_MS) {
              if (overFolder) armedFolderId = target.nodeId
              else armedSwapPid = target.pid
            }
          } else {
            dwellTarget = null
            armedFolderId = null
            armedSwapPid = null
          }
        }
        markDirty()
      }
    }

    function onUp(e: PointerEvent) {
      // 팜 리젝션: 펜 필기 중 무시했던 손바닥/손가락(touch)이 떼질 때 → 획을 조기 커밋하지 않게 무시.
      if (mode === 'ink' && inkIsPen && e.pointerType === 'touch' && e.pointerId !== inkPointerId) return
      pointers.delete(e.pointerId)

      if (mode === 'drag' && dragItem) {
        clearLP()
        if (longPressed) {
          longPressed = false // 롱프레스로 다중선택 완료 → 탭/이동 처리 건너뜀
        } else if (!moved) {
          leavePenForNav() // 손가락으로 개체 탭(선택/열기) → 펜 끔(핸드모드 아니면). 팬/줌은 펜 유지.
          if (multiMode) {
            // 다중선택 모드: 톡 탭으로 토글 (추가/해제)
            select(dragItem.pid, true)
          } else {
            // 탭 = 선택, 더블탭(폴더=진입/메모=노트팝업). 사진은 더블클릭해도 편집창 안 뜸.
            const now = Date.now()
            if (!e.shiftKey && lastTapId === dragItem.pid && now - lastTapTime < 350) {
              if (dragItem.type === 'folder') enterFolder(dragItem.nodeId)
              else if (dragItem.type === 'memo') openNote(dragItem.nodeId, dragItem.pid)
              else if (dragItem.type === 'text') startTextEdit(dragItem.pid)
            } else {
              select(dragItem.pid, e.shiftKey) // Shift = 토글(다중), 아니면 단독
            }
            lastTapTime = now
            lastTapId = dragItem.pid
          }
        } else if (!dragMovable) {
          // 아직 선택 안 됐던 개체를 끌었음 → 이동 말고 선택만(다음 누름부터 이동)
          select(dragItem.pid, e.shiftKey)
        } else if (dragGroup && dragGroup.length === 1 && armedFolderId) {
          movePlacementToSpace(dragItem.pid, armedFolderId) // 폴더로 이동(참조 아님)
          select(null)
        } else if (dragGroup && dragGroup.length === 1 && armedSwapPid) {
          // 노트→노트: 데이터만 맞바꿈. 끌고 온 노트는 원위치로 되돌리고 nodeId만 교환.
          // 끌고 온 노트(데이터)는 대상 자리에 바로 들어가고, 밀려난 노트는 대상 자리→원래 자리로 슬라이드.
          const g = dragGroup[0]
          const target = getPlacement(armedSwapPid)
          const fromX = target?.x ?? g.x0
          const fromY = target?.y ?? g.y0
          moveNodeLive(g.pid, g.x0, g.y0)
          commitMove(g.pid)
          swapPlacementNodes(dragItem.pid, armedSwapPid)
          swapAnim = { pid: dragItem.pid, fromX, fromY, start: Date.now() }
          select(null)
        } else if (dragGroup) {
          for (const g of dragGroup) commitMove(g.pid) // 일괄 이동 확정
        }
      } else if (mode === 'marquee' && marquee) {
        const hits = itemsIntersecting(marquee).map((it) => it.pid)
        if (e.shiftKey) selectMany([...new Set([...getSelectionSet(), ...hits])])
        else selectMany(hits) // 빈 영역이면 hits=[] → 선택 해제
      } else if (mode === 'link' && marquee && linkSourcePids.length) {
        const srcs = linkSourcePids
        const single = srcs.length === 1
        if (!moved) {
          // 클릭 = 대상 배치에 연결. 소스 1개면 토글, 여러 개면 전부 연결(추가).
          const hit = hitTest(marquee.x1, marquee.y1)
          if (hit) {
            for (const s of srcs) {
              if (s === hit.pid) continue
              single ? togglePlacementEdge(s, hit.pid) : linkPlacements(s, hit.pid)
            }
          }
        } else {
          // 박스 = 걸친 배치 전부에 각 소스로부터 줄 추가
          for (const it of itemsIntersecting(marquee))
            for (const s of srcs) if (s !== it.pid) linkPlacements(s, it.pid)
        }
      } else if (mode === 'resize' && resizeOp) {
        commitMove(resizeOp.pid) // 크기·위치 확정(저장 + 재렌더)
      } else if (mode === 'rotate' && rotateOp) {
        updateNode(rotateOp.nodeId, {}) // 회전각 확정(되돌리기 1스텝 + 저장)
      } else if (mode === 'draw' && drawOp) {
        const dn = getNode(drawOp.nodeId)
        // 드래그 없이 톡 눌렀거나 너무 작으면 → 기본 크기 도형 하나
        const tiny = !dn || (drawOp.tool === 'line' ? dn.w < 12 : dn.w < 12 && dn.h < 12)
        if (!moved || tiny) {
          if (drawOp.tool === 'line') {
            setNodeWidthLive(drawOp.nodeId, 120) // 두께(1) 유지, 길이만 기본
            setRotationLive(drawOp.nodeId, 0)
            moveNodeLive(drawOp.pid, drawOp.startX + 60, drawOp.startY)
          } else {
            setNodeSizeLive(drawOp.nodeId, 68, 68)
            moveNodeLive(drawOp.pid, drawOp.startX, drawOp.startY)
          }
        }
        commitMove(drawOp.pid) // 생성+크기 확정 → 히스토리 1스텝 + 저장
        setDrawTool(null) // 도구는 1회성(다시 그리려면 메뉴에서 다시 선택)
      } else if (mode === 'ink') {
        if (rightErase) {
          if (inkErasedAny) commitStrokes() // 우클릭 임시 지우개: 지운 것만 확정
        } else {
          const im = getInkMode()
          if (isDrawKind(im)) {
            addStroke(inkPts, getPenColor(), getPenWidth(), im) // 획 확정(되돌리기 1스텝 + 저장)
          } else if (im === 'erasePart') {
            if (inkErasing && inkPts.length >= 2) addEraseMark(inkPts, getPenWidth()) // 지움 자국 확정
          } else if (inkErasedAny) {
            commitStrokes() // 지운 게 있으면 1스텝으로 확정
          }
        }
        // 도구 모드는 유지(연속 사용) — inkMode는 그대로 둠
      } else if (mode === 'lasso') {
        lassoSelectStrokes(lassoPts) // 폴리곤(자동 닫힘) 안의 획 선택
      } else if (mode === 'lassomove') {
        if (lassoMoved) commitStrokes() // 이동했으면 되돌리기 1스텝 확정
      } else if (mode === 'lassoresize') {
        if (lassoMoved) commitStrokes() // 크기 조절했으면 확정
      } else if (mode === 'lineedit' && lineOp) {
        commitMove(lineOp.pid) // 각도·길이·회전 확정(되돌리기 1스텝 + 저장)
      } else if (mode === 'jointrotate' && jointOp) {
        commitMove(jointOp.pid) // 관절 회전 확정(하위 전체 스냅샷 저장 + 되돌리기 1스텝)
      } else if (mode === 'groupresize' && groupResizeOp) {
        const rep = groupResizeOp.snap[0]?.pid
        if (rep) commitMove(rep) // 그룹 크기 확정
      } else if (mode === 'pan') {
        clearLP()
        if (longPressed) {
          longPressed = false // 빈 곳 꾹 붙여넣기 완료 → 선택 유지(붙여넣은 것 선택됨)
        } else if (moved) {
          bumpUI() // 팬 후 좌표 표시 갱신
        } else if (e.pointerType === 'touch') {
          multiMode = false // 빈 곳 탭 = 다중선택 모드 종료
          select(null) // 선택 해제
        }
      }
      dwellTarget = null
      armedFolderId = null
      armedSwapPid = null
      dragGroup = null
      dragMovable = false
      snapX = null // 정렬 가이드 해제
      snapY = null
      clearLP()
      marquee = null
      linkSourcePids = []
      resizeOp = null
      rotateOp = null
      drawOp = null
      lineOp = null
      jointOp = null
      groupResizeOp = null
      inkPts = []
      inkErasing = false
      inkErasedAny = false
      inkCursor = null
      lastEraseW = null
      inkTouchPending = null
      inkPointerId = null
      inkIsPen = false
      rightErase = false
      lassoPts = []
      lassoLast = null
      lassoMoved = false
      lassoResize = null
      markDirty()

      if (pointers.size === 0) {
        mode = 'none'
        dragItem = null
      } else if (pointers.size === 1) {
        mode = 'pan'
        downAt = [...pointers.values()][0]
      }
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const c = getCamera()
      const before = s2w(sx, sy)
      const factor = Math.exp(-e.deltaY * 0.0015)
      let zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, c.zoom * factor))
      // 커서 아래 월드점 고정
      const nx = before.x - (sx - cssW() / 2) / zoom
      const ny = before.y - (sy - cssH() / 2) / zoom
      setCamera({ x: nx, y: ny, zoom })
    }

    // 더블클릭 진입/노트열기는 onUp의 더블탭 감지(pointer)로만 처리한다.
    // ⚠️ 네이티브 'dblclick'까지 쓰면 한 번의 더블클릭에 enterFolder가 두 번 불려서,
    //    1폴더 진입 직후 같은 좌표의 2폴더까지 들어가버리는 삑사리가 났음 → 제거함.

    // 우클릭 = 커스텀 컨텍스트 메뉴(피그마식). 노드 위면 그 노드 선택.
    function onContextMenu(e: MouseEvent) {
      e.preventDefault()
      if (getInkMode()) return // 펜 활성 중 우클릭 = 임시 지우개 → 메뉴 안 열림
      if (lastPointerType === 'touch') return // 모바일 꾹누름=다중선택, 컨텍스트메뉴는 톱니바퀴 버튼으로
      const rect = canvas.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const hit = hitTest(sx, sy)
      const w = s2w(sx, sy)
      if (hit && !isSelected(hit.pid)) select(hit.pid) // 이미 선택된 항목이면 다중선택 유지
      openContextMenu({
        x: e.clientX,
        y: e.clientY,
        wx: w.x,
        wy: w.y,
        pid: hit?.pid ?? null,
        nodeId: hit?.nodeId ?? null,
      })
    }

    // Space = 패닝 모드 (누르는 동안). 입력칸 포커스 땐 무시.
    function isTyping() {
      const el = document.activeElement as HTMLElement | null
      const tag = (el?.tagName || '').toLowerCase()
      return tag === 'input' || tag === 'textarea' || !!el?.isContentEditable
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !spaceHeld && !isTyping()) {
        spaceHeld = true
        e.preventDefault()
        canvas.style.cursor = 'grab'
      }
      // Esc = 도형 그리기·척추화 취소
      if (e.code === 'Escape') {
        if (mode === 'draw' && drawOp) {
          cancelDrawNode(drawOp.nodeId, drawOp.pid)
          drawOp = null
          mode = 'none'
        }
        if (getDrawTool()) setDrawTool(null)
        if (getSpineWizard()) cancelSpine()
        // Esc: 올가미 선택이 있으면 선택만 해제, 아니면 필기 도구 끄기
        if (getSelectedStrokeIds().size) {
          clearStrokeSelection()
          lassoPts = []
        } else if (getInkMode()) {
          inkPts = []
          inkErasedAny = false
          inkErasing = false
          inkCursor = null
          inkTouchPending = null
          if (mode === 'ink' || mode === 'lasso' || mode === 'lassomove') mode = 'none'
          setInkMode(null)
        }
      }
      // Delete/Backspace = 올가미로 고른 필기 삭제(입력칸 포커스 아닐 때)
      if ((e.code === 'Delete' || e.code === 'Backspace') && !isTyping() && getSelectedStrokeIds().size) {
        e.preventDefault()
        deleteSelectedStrokes()
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        spaceHeld = false
        canvas.style.cursor = ''
      }
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', onContextMenu)
    canvas.addEventListener('auxclick', (e) => e.preventDefault()) // 가운데클릭 기본동작 방지
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  return <S.Canvas ref={ref} />
}
