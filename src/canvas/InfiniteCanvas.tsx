import { useEffect, useRef } from 'react'
import type { SpaceItem } from '../types'
import * as S from './InfiniteCanvas.styles'
import {
  bumpUI,
  canNestInto,
  commitMove,
  consumeDirty,
  edgesInCurrentSpace,
  enterFolder,
  getAsset,
  getAspectLocked,
  getCamera,
  getDoc,
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
  setCamera,
  setNodeSizeLive,
  swapPlacementNodes,
  togglePlacementEdge,
} from '../store'

// 노드 둘레 링 표시: null=없음, yellow=일반 선택, purple=유니크(공유) 선택, sibling=결속 형제(점선)
type Ring = 'yellow' | 'purple' | 'sibling' | null

const MIN_ZOOM = 0.05
const MAX_ZOOM = 8
const MIN_GRAB_PX = 14 // 작은 노드도 잡히게 최소 히트 반경
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

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
      markDirty()
    }
    resize()
    window.addEventListener('resize', resize)

    // ── 렌더 ──
    function draw() {
      const W = canvas.clientWidth
      const H = canvas.clientHeight
      const c = getCamera()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // 배경
      ctx.fillStyle = '#0f1115'
      ctx.fillRect(0, 0, W, H)
      drawGrid(W, H)

      const items = itemsInCurrentSpace()
      // 엣지는 배치(placement) 단위. 각 배치는 고유 pid → 같은 노드 복사본끼리도 참조선이 따로.
      // z순서(=items 인덱스). 엣지는 두 끝점 중 "아래에 있는 쪽" 바로 뒤에 깐다 →
      // 선은 항상 연결된 두 요소(참조 대상)보다 뒤에 있고, 한쪽을 맨앞으로 올려도
      // 선은 따라오지 않음. 끝점보다 아래의 것들(맨뒤 사진 등)은 선에 가려지지 않음.
      const itemByPid = new Map(items.map((it) => [it.pid, it]))
      const zOf = new Map(items.map((it, i) => [it.pid, i]))
      const edgesByAnchor = new Map<number, { from: string; to: string }[]>()
      for (const e of edgesInCurrentSpace()) {
        const za = zOf.get(e.from)
        const zb = zOf.get(e.to)
        if (za === undefined || zb === undefined) continue
        const anchor = Math.min(za, zb)
        const arr = edgesByAnchor.get(anchor)
        if (arr) arr.push(e)
        else edgesByAnchor.set(anchor, [e])
      }
      function strokeEdges(eds: { from: string; to: string }[]) {
        ctx.strokeStyle = 'rgba(150,170,210,0.35)'
        ctx.lineWidth = Math.max(1, 1.5 * c.zoom)
        for (const e of eds) {
          const a = itemByPid.get(e.from)
          const b = itemByPid.get(e.to)
          if (!a || !b) continue
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
        const ring: Ring = isSelected(it.pid)
          ? isShared(it.nodeId)
            ? 'purple'
            : 'yellow'
          : sharedSelNodes.has(it.nodeId)
            ? 'sibling'
            : null
        drawNode(it, p.x, p.y, hw, hh, c.zoom, ring)
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

      // 단일 선택 노드: 코너 리사이즈 핸들 (크기는 우측 인스펙터에 표시되므로 캔버스 라벨은 생략)
      const solePid = getSoleSelectedPid()
      if (solePid) {
        const it = items.find((i) => i.pid === solePid)
        if (it) {
          const ctr = w2s(it.x, it.y)
          const hw = Math.max((it.w / 2) * c.zoom, 2)
          const hh = Math.max((it.h / 2) * c.zoom, 2)
          ctx.fillStyle = '#fff'
          ctx.strokeStyle = '#5b8cff'
          ctx.lineWidth = 1.5
          for (const cx of [ctr.x - hw, ctr.x + hw])
            for (const cy of [ctr.y - hh, ctr.y + hh]) {
              ctx.beginPath()
              ctx.rect(cx - 4, cy - 4, 8, 8)
              ctx.fill()
              ctx.stroke()
            }
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
        ctx.strokeStyle = linking ? '#34c98a' : '#5b8cff'
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

      // 줌 표시
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '11px ui-monospace, monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`zoom ${(c.zoom * 100) | 0}%  ·  ${items.length} nodes`, 10, H - 8)
    }

    function drawGrid(W: number, H: number) {
      const c = getCamera()
      const step = 80 * c.zoom
      if (step < 14) return // 너무 촘촘하면 생략
      const ox = ((-c.x * c.zoom + W / 2) % step + step) % step
      const oy = ((-c.y * c.zoom + H / 2) % step + step) % step
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
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
      // LOD: 20% 미만일 때만 점으로
      if (zoom < 0.2) {
        ctx.fillStyle = n.color
        ctx.beginPath()
        ctx.arc(x, y, Math.max(2, rad), 0, Math.PI * 2)
        ctx.fill()
        return
      }

      const asset = getAsset(n.assetId)
      const showImage = asset && zoom >= 0.2 // 사진은 20%까지 사진 그대로
      ctx.save()

      if (showImage) {
        const im = getImg(asset!.id, asset!.thumb)
        if (im) {
          // 노드 박스(w×h)에 꽉 채움 — 비율 잠금 해제 시 늘이고/눌리게(찌부)
          const dw = hw * 2
          const dh = hh * 2
          const rr = Math.min((n.radius || 0) * zoom, dw / 2, dh / 2)
          if (rr > 0) {
            roundRectPath(x - dw / 2, y - dh / 2, dw, dh, rr)
            ctx.clip()
          }
          ctx.drawImage(im, x - dw / 2, y - dh / 2, dw, dh)
        }
      } else {
        ctx.fillStyle = n.color
        drawShape(n, x, y, hw, hh, (n.radius || 0) * zoom)
        ctx.fill()
        // 폴더 표시(좌상단 탭)
        if (n.type === 'folder' && zoom >= 0.3) {
          ctx.fillStyle = 'rgba(255,255,255,0.55)'
          ctx.fillRect(x - hw * 0.7, y - hh * 0.95, hw * 0.6, hh * 0.22)
        }
      }
      ctx.restore()

      // 선택/공유 링: yellow=일반 선택, purple=유니크(공유) 선택, sibling=결속 형제(점선, 표시만)
      if (ring) {
        if (ring === 'sibling') {
          ctx.strokeStyle = '#a78bfa'
          ctx.lineWidth = 2
          ctx.setLineDash([6, 4])
        } else {
          ctx.strokeStyle = ring === 'purple' ? '#a78bfa' : '#ffd166'
          ctx.lineWidth = 2.5
          ctx.setLineDash([])
        }
        ctx.beginPath()
        ctx.ellipse(x, y, hw + 6, hh + 6, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // 이름 (줌 충분할 때만)
      if (zoom >= 0.3) {
        ctx.fillStyle = n.textColor || '#e8ecf3'
        ctx.font = `${Math.max(11, Math.min(16, rad * 0.5))}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(n.name, x, y + hh + 4)
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
      if (swapAnim) markDirty() // 애니메이션 동안엔 매 프레임 다시 그림
      if (consumeDirty()) draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // ── 히트 테스트 ──
    function hitTest(sx: number, sy: number): SpaceItem | null {
      const c = getCamera()
      const list = itemsInCurrentSpace()
      for (let i = list.length - 1; i >= 0; i--) {
        const it = list[i]
        const p = w2s(it.x, it.y)
        const hw = Math.max((it.w / 2) * c.zoom, MIN_GRAB_PX)
        const hh = Math.max((it.h / 2) * c.zoom, MIN_GRAB_PX)
        if (Math.abs(sx - p.x) <= hw && Math.abs(sy - p.y) <= hh) return it
      }
      return null
    }

    // ── 입력 (Pointer = 마우스+터치 통합) ──
    const pointers = new Map<number, { x: number; y: number }>()
    let mode: 'none' | 'pan' | 'drag' | 'pinch' | 'marquee' | 'link' | 'resize' = 'none'
    // 코너 리사이즈: 고정점(anchor 월드좌표) + 방향부호(sx,sy) + 비율잠금
    let resizeOp: {
      pid: string
      nodeId: string
      ax: number
      ay: number
      sx: number
      sy: number
      ratio: number
      lock: boolean
    } | null = null
    const HANDLE = 9 // 코너 핸들 히트 반경(px)
    let dragItem: SpaceItem | null = null
    let moved = false
    let downAt = { x: 0, y: 0 }
    let lastTapTime = 0
    let lastTapId: string | null = null
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

    /** 단일 선택 노드의 코너 핸들을 (px,py)가 잡았는지 → 리사이즈 정보 반환 */
    function cornerHandleAt(px: number, py: number) {
      const pid = getSoleSelectedPid()
      if (!pid) return null
      const it = itemsInCurrentSpace().find((i) => i.pid === pid)
      if (!it) return null
      const c = getCamera()
      const ctr = w2s(it.x, it.y)
      const hw = Math.max((it.w / 2) * c.zoom, 2)
      const hh = Math.max((it.h / 2) * c.zoom, 2)
      const corners = [
        { sx: -1, sy: -1, x: ctr.x - hw, y: ctr.y - hh },
        { sx: 1, sy: -1, x: ctr.x + hw, y: ctr.y - hh },
        { sx: -1, sy: 1, x: ctr.x - hw, y: ctr.y + hh },
        { sx: 1, sy: 1, x: ctr.x + hw, y: ctr.y + hh },
      ]
      for (const co of corners) {
        if (Math.abs(px - co.x) <= HANDLE && Math.abs(py - co.y) <= HANDLE) {
          return {
            pid: it.pid,
            nodeId: it.nodeId,
            sx: co.sx,
            sy: co.sy,
            ax: it.x - co.sx * (it.w / 2), // 반대편 코너(고정점) 월드좌표
            ay: it.y - co.sy * (it.h / 2),
            ratio: it.w / Math.max(1, it.h),
            lock: getAspectLocked(), // 인스펙터 🔒 토글을 그대로 따름(사진·도형 공통)
          }
        }
      }
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
      if (e.button === 2) return // 우클릭 = 컨텍스트 메뉴(onContextMenu가 처리)
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
        return
      }

      moved = false
      downAt = p
      dragGroup = null

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

      // 단일 선택 노드의 코너 핸들 잡으면 = 리사이즈
      const handle = cornerHandleAt(p.x, p.y)
      if (handle && !getPlacement(handle.pid)?.locked) {
        mode = 'resize'
        resizeOp = handle
        dragItem = null
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
        // 단일클릭 → 빈 곳처럼 마퀴(잠긴개체는 마퀴 대상에서 제외 → 결국 선택 해제)
        mode = 'marquee'
        dragItem = null
        marquee = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
      } else if (hit) {
        mode = 'drag'
        dragItem = hit
        // 선택 안 된 항목을 그냥 누르면 그것만 단독 선택(드래그 준비). Shift면 up에서 토글.
        if (!e.shiftKey && !isSelected(hit.pid)) select(hit.pid)
      } else {
        // 빈 곳 드래그 = 영역 선택(마퀴)
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
        // 핀치 중심 월드 좌표 고정하며 줌
        const before = s2w(cx, cy)
        let zoom = c.zoom * (dist / (pinchPrev.dist || dist))
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
        // 중심 이동(두 손가락 평행이동)도 반영
        const ncx = c.x + (before.x - ((cx - cssW() / 2) / zoom + c.x))
        const ncy = c.y + (before.y - ((cy - cssH() / 2) / zoom + c.y))
        setCamera({ x: ncx, y: ncy, zoom })
        pinchPrev = { dist, cx, cy }
        return
      }

      if (Math.hypot(p.x - downAt.x, p.y - downAt.y) > 3) moved = true

      if (mode === 'pan') {
        const c = getCamera()
        const dx = (p.x - downAt.x) / c.zoom
        const dy = (p.y - downAt.y) / c.zoom
        setCamera({ x: c.x - dx, y: c.y - dy, zoom: c.zoom })
        downAt = p
      } else if (mode === 'resize' && resizeOp) {
        const w = s2w(p.x, p.y)
        const newW = Math.max(8, Math.abs(w.x - resizeOp.ax))
        let newH = Math.max(8, Math.abs(w.y - resizeOp.ay))
        if (resizeOp.lock) newH = newW / resizeOp.ratio // 사진=비율 유지(가로 기준)
        setNodeSizeLive(resizeOp.nodeId, newW, newH)
        moveNodeLive(
          resizeOp.pid,
          resizeOp.ax + (resizeOp.sx * newW) / 2,
          resizeOp.ay + (resizeOp.sy * newH) / 2,
        )
        markDirty()
      } else if ((mode === 'marquee' || mode === 'link') && marquee) {
        marquee.x1 = p.x
        marquee.y1 = p.y
        markDirty()
      } else if (mode === 'drag' && dragItem) {
        // 첫 이동 시 일괄이동 그룹 확정: 선택에 dragItem 포함 보장
        if (!dragGroup) {
          const set = new Set(getSelectionSet())
          set.add(dragItem.pid)
          dragGroup = [...set]
            .map((pid) => {
              const pl = getPlacement(pid)
              return pl ? { pid, x0: pl.x, y0: pl.y } : null
            })
            .filter((g): g is { pid: string; x0: number; y0: number } => !!g)
        }
        const c = getCamera()
        const dwx = (p.x - downAt.x) / c.zoom
        const dwy = (p.y - downAt.y) / c.zoom
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
      pointers.delete(e.pointerId)

      if (mode === 'drag' && dragItem) {
        if (!moved) {
          // 탭 = 선택, 더블탭(폴더=진입/메모=노트팝업)
          const now = Date.now()
          if (!e.shiftKey && lastTapId === dragItem.pid && now - lastTapTime < 350) {
            if (dragItem.type === 'folder') enterFolder(dragItem.nodeId)
            else openNote(dragItem.nodeId)
          } else {
            select(dragItem.pid, e.shiftKey) // Shift = 토글(다중), 아니면 단독
          }
          lastTapTime = now
          lastTapId = dragItem.pid
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
      } else if (mode === 'pan' && moved) {
        bumpUI() // 팬 후 좌표 표시 갱신
      }
      dwellTarget = null
      armedFolderId = null
      armedSwapPid = null
      dragGroup = null
      marquee = null
      linkSourcePids = []
      resizeOp = null
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
