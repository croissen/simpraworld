import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import {
  DEFAULT_BADGE_SIZE,
  addAsset,
  addNoteStroke,
  applyNoteStrokeGeom,
  closeNote,
  deleteNoteStrokes,
  eraseNoteStrokesNear,
  moveNoteStrokes,
  getAsset,
  getEraserRadius,
  getInkColor,
  getInkMode,
  getInkSmooth,
  getInkWidth,
  getNode,
  getNoteEditorPid,
  getNoteStrokes,
  getPanTool,
  getHandMode,
  getPlacement,
  getSnapshot,
  searchNotesInCurrentSpace,
  setInkMode,
  subscribe,
  swapInNote,
  updateNode,
} from '../store'
import { uid } from '../types'
import type { SNode } from '../types'
import { makeStabilizer } from '../oneEuro'
import { toBlob } from 'html-to-image'
import { Capacitor } from '@capacitor/core'
import { saveImageToGallery, shareFileNative } from '../nativeShare'
import { fileToImage, pickImageFile } from '../image'
import { useIsMobile, useIsTouch } from '../useIsMobile'
import ConfirmModal from './ConfirmModal'
import TagRow from './TagRow'
import * as S from './NoteEditor.styles'

// 배지 편집 팝업: 내용(줄바꿈) / 폰트크기(직접 입력) / 글자색 / 배경색(+배경 없음).
// 편집 중엔 로컬 초안만 → Done 눌러야 저장(그래서 사이즈도 자유롭게 지우고 다시 입력 가능).
function BadgeEditor({ node, onClose }: { node: SNode; onClose: () => void }) {
  const [text, setText] = useState(node.badge ?? '')
  const [sizeText, setSizeText] = useState(String(node.badgeSize || DEFAULT_BADGE_SIZE))
  const [color, setColor] = useState(node.badgeColor || '#1a1300')
  const [noBg, setNoBg] = useState(node.badgeBg === 'none')
  const [bg, setBg] = useState(node.badgeBg && node.badgeBg !== 'none' ? node.badgeBg : '#e3b341')
  const areaRef = useRef<HTMLTextAreaElement>(null)

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }
  useEffect(() => {
    if (areaRef.current) grow(areaRef.current)
  }, [])

  const save = () => {
    if (!text.trim()) {
      updateNode(node.id, { badge: undefined }) // 빈 배지는 제거
    } else {
      const s = parseInt(sizeText, 10)
      updateNode(node.id, {
        badge: text,
        badgeSize: isNaN(s) ? DEFAULT_BADGE_SIZE : Math.max(4, Math.min(400, s)),
        badgeColor: color,
        badgeBg: noBg ? 'none' : bg,
      })
    }
    onClose()
  }

  return (
    <S.BadgePop onClick={(e) => e.stopPropagation()}>
      <S.PopRow>
        <S.PopArea
          ref={areaRef}
          rows={1}
          autoFocus
          value={text}
          placeholder="badge text"
          onChange={(e) => {
            setText(e.target.value)
            grow(e.target)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              onClose() // 취소(저장 안 함)
            }
          }}
        />
        <S.PopX onClick={onClose} title="Close">
          ✕
        </S.PopX>
      </S.PopRow>
      <S.PopRow>
        <S.PopLabel>Size</S.PopLabel>
        <S.PopInput
          inputMode="numeric"
          value={sizeText}
          placeholder="14"
          onChange={(e) => setSizeText(e.target.value.replace(/[^0-9]/g, ''))}
        />
      </S.PopRow>
      <S.PopRow>
        <S.PopLabel>Text</S.PopLabel>
        <S.PopColor type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <S.PopLabel style={{ width: 'auto' }}>Bg</S.PopLabel>
        <S.PopColor
          type="color"
          value={bg}
          onChange={(e) => {
            setBg(e.target.value)
            setNoBg(false)
          }}
        />
        <S.PopBtn $on={noBg} onClick={() => setNoBg((v) => !v)}>
          No bg
        </S.PopBtn>
      </S.PopRow>
      <S.PopRow>
        <S.PopBtn style={{ flex: 1, textAlign: 'center' }} onClick={save}>
          Done
        </S.PopBtn>
      </S.PopRow>
    </S.BadgePop>
  )
}


const MAX_TAGS = 10 // 해시태그 최대 개수

// '#생산부 #1년차' 같은 입력 → ['생산부','1년차'] (중복·빈값 제거, '#' 제거)
function parseTags(text: string): string[] {
  const out: string[] = []
  for (const raw of text.split(/[\s,]+/)) {
    const t = raw.replace(/^#+/, '').trim()
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}

// 메모 편집 팝업: 왼쪽=정사각 사진+교체+태그검색, 오른쪽=제목/본문/태그.
export default function NoteEditor({ nodeId }: { nodeId: string }) {
  // 모바일 노트 UI(핀치줌·팬)는 '세로 폰'에서만 — 터치 + 좁은폭.
  // 가로 폰/태블릿/PC 좁은창은 아래 PC 노트를 화면에 맞춰(작게) 연다.
  const isMobile = useIsMobile('(max-width: 640px) and (hover: none) and (pointer: coarse)')
  // 터치기기 판정(가로폰·태블릿 포함) — 손가락 필기 여부(핸드모드) 게이트용.
  const touch = useIsTouch()
  const slotPid = getNoteEditorPid()
  const [viewedId, setViewedId] = useState(nodeId)
  const [query, setQuery] = useState('')
  const [tagText, setTagText] = useState('')
  const [editingBadge, setEditingBadge] = useState(false)
  const [editLocked, setEditLocked] = useState(true) // 모바일: 기본 읽기전용(키패드 안 뜸)
  const [photoMenu, setPhotoMenu] = useState(false) // PC 사진 클릭 메뉴
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 }) // 메뉴를 띄울 위치(사진박스 중앙)
  const [confirmDel, setConfirmDel] = useState(false)
  const [viewPhoto, setViewPhoto] = useState(false) // 모바일 사진 크게보기
  const [shareOpen, setShareOpen] = useState(false) // 공유 팝업
  const [capturing, setCapturing] = useState(false) // 캡처 중(버튼 숨김)
  const [shareMode, setShareMode] = useState<null | 'gallery' | 'share' | 'clipboard'>(null)
  const native = Capacitor.isNativePlatform() // 앱(안드/iOS)이면 갤러리 저장·공유 시트 사용
  const [shareFull, setShareFull] = useState(false) // 공유: 여백까지 전체(true) vs 기본 노트영역(false)
  const capDims = useRef({ vpW: 0, vpH: 0, contentH: 0 }) // 캡처 기준 치수(캡처 직전 측정)
  // 모바일 포커스 모드: 'content'=내용만, 'tags'=해시태그만, 'none'=전체(제목/검색/보기)
  const [focusMode, setFocusMode] = useState<'none' | 'content' | 'tags'>('none')
  // 소프트 키보드 높이(px). Tab 버튼을 키보드 바로 위에 고정하는 데 사용(0=키보드 닫힘).
  const [kbInset, setKbInset] = useState(0)
  const thumbRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null) // 실제 메모창(캡처 대상)
  const overlayRef = useRef<HTMLDivElement>(null) // 모바일: 키보드 위 보이는 영역에 편집기 맞추기

  // 모바일 키보드 대응:
  //  - 내용/태그 편집(focusMode≠none) + 키보드 열림 → 보이는 영역(visualViewport)에 맞춰 편집기를 키보드 위로.
  //  - 제목/검색(none) → 화면 안 줄임(전체 유지, 키보드가 아래를 가려도 OK).
  //  - 키보드 닫히면 → 즉시 원래 화면 복귀(스타일 리셋 + 포커스 모드 해제).
  useEffect(() => {
    const vv = window.visualViewport
    const el = overlayRef.current
    if (!vv || !el) return
    const reset = () => {
      el.style.height = ''
      el.style.top = ''
      el.style.bottom = ''
    }
    const sync = () => {
      const kbOpen = window.innerHeight - vv.height > 120
      // 키보드가 가리는 하단 높이 = 레이아웃 뷰포트 바닥 - 보이는 뷰포트 바닥
      setKbInset(kbOpen ? Math.max(0, window.innerHeight - vv.offsetTop - vv.height) : 0)
      if (!kbOpen) {
        reset()
        if (focusMode !== 'none') setFocusMode('none') // 키보드 닫힘 → 원래 화면
      } else if (focusMode !== 'none') {
        el.style.height = vv.height + 'px'
        el.style.top = vv.offsetTop + 'px'
        el.style.bottom = 'auto'
      } else {
        reset() // 제목/검색 편집 중엔 안 줄임
      }
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [focusMode])

  // 다른 노트로 새로 열리면 미리보기/검색 초기화
  useEffect(() => {
    setViewedId(nodeId)
    setQuery('')
  }, [nodeId])

  // 보고 있는 노트가 바뀌면 입력 중이던 태그·배지 편집 상태 초기화 + 다시 읽기전용
  useEffect(() => {
    setTagText('')
    setEditingBadge(false)
    setEditLocked(true)
    setPhotoMenu(false)
  }, [viewedId])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNote()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // ── 노트 안 필기(펜) ─────────────────────────────────────────
  // 텍스트 위에 겹쳐 그림. 획은 본문 "콘텐츠 좌표"(스크롤 포함)로 저장 → 글과 함께 스크롤.
  // 색·굵기·펜/형광펜/지우개는 기존 펜 팔레트(전역 잉크모드)를 그대로 재사용.
  const [penMode, setPenMode] = useState(false)
  const [zoomPct, setZoomPct] = useState(100) // 현재 확대 퍼센트(표시용)
  const drawRef = useRef<HTMLCanvasElement>(null) // 필기 레이어(본문 위 오버레이, CSS 변형 없음=좌표 기준)
  const capInkRef = useRef<HTMLCanvasElement>(null) // 공유 캡처용 필기 캔버스(CapBody 위에 덮음)
  const bodyRef = useRef<HTMLTextAreaElement>(null) // 본문 textarea(스크롤=세로 이동, CSS scale로 확대)
  const curStroke = useRef<number[] | null>(null) // 그리는 중인 획(콘텐츠 좌표 평탄배열)
  const smoother = useRef(makeStabilizer(0)) // 손떨림 보정(획 시작마다 현재 강도로 새로 생성)
  const curErase = useRef(false) // 그리는 중인 획이 'Area 지우개'(destination-out 자국)인가
  const erasing = useRef(false) // 'Stroke 지우개'(획 통째 삭제) 진행 중인가
  const lastErase = useRef<{ x: number; y: number } | null>(null) // Stroke 지우개 이동 선분 시작점
  const eraseCursor = useRef<{ x: number; y: number } | null>(null) // 지우개 반경 링 위치(콘텐츠 좌표)
  // 확대/이동: zoom=배율, panX/panY=이동(px). 획은 콘텐츠 좌표로 저장(확대·이동과 무관).
  // 이동 범위는 (텍스트 영역 + 상하좌우 여백)으로 제한 — 무한캔버스가 아님.
  const zoomRef = useRef(1)
  const panXRef = useRef(0)
  const panYRef = useRef(0)
  const contentWRef = useRef(0) // 펜 모드 진입 시 측정한 본문 폭(px)
  const contentHRef = useRef(0) // 펜 모드 진입 시 측정한 본문 전체 높이(px)
  const pointers = useRef(new Map<number, { x: number; y: number }>()) // 현재 눌린 포인터들(멀티터치)
  const pinch = useRef<{ dist: number; startZoom: number; cx: number; cy: number } | null>(null)
  const pinchLatch = useRef(false) // 핀치 후 남은 손가락으로 실수 드로잉 방지
  const panDrag = useRef<{ x: number; y: number } | null>(null) // 화면이동(손) 도구: 한 손가락 드래그 이동
  // 팜 리젝션: 펜으로 필기 중엔 손바닥/손가락(touch) 접촉을 무시(핀치 오인→획 취소 방지).
  const notePenId = useRef<number | null>(null) // 현재 획을 시작한 포인터 id
  const noteInkIsPen = useRef(false) // 그 포인터가 펜인가
  const PAN_MARGIN = 1 // 텍스트 영역 대비 상하좌우 여백 배수(보이는 영역=1 → 각 변에 1배씩)
  // 올가미(lasso): 획을 올가미로 감싸 선택 → 드래그로 이동 / 삭제.
  const [lassoSel, setLassoSel] = useState<string[]>([]) // 선택된 노트 획 id
  const [lassoDrag, setLassoDrag] = useState(false) // 선택 이동 중(삭제 버튼 잠깐 숨김)
  const lassoPath = useRef<number[] | null>(null) // 그리는 중인 올가미 경로(콘텐츠 좌표)
  const lassoMove = useRef<{ x: number; y: number } | null>(null) // 선택 이동 직전점
  // 선택 크기조절: 반대 코너(pivot) 고정 + 시작거리 대비 비율로 균일 스케일. snap=시작 시 점/굵기 복사본.
  const lassoResize = useRef<{
    pivotX: number
    pivotY: number
    startDist: number
    snap: Map<string, { pts: number[]; width: number }>
  } | null>(null)
  const LASSO_PAD = 6 // 선택 박스 여백(콘텐츠)

  // 점이 다각형(평탄배열) 안에 있는지(레이 캐스팅).
  const pointInPoly = (x: number, y: number, poly: number[]) => {
    let inside = false
    for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
      const xi = poly[i]
      const yi = poly[i + 1]
      const xj = poly[j]
      const yj = poly[j + 1]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }
  // 선택된 획들의 경계상자(콘텐츠 좌표). 없으면 null.
  const lassoBBox = () => {
    if (!lassoSel.length) return null
    const ids = new Set(lassoSel)
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (const s of getNoteStrokes(viewedId)) {
      if (!ids.has(s.id)) continue
      for (let i = 0; i < s.pts.length; i += 2) {
        x0 = Math.min(x0, s.pts[i])
        x1 = Math.max(x1, s.pts[i])
        y0 = Math.min(y0, s.pts[i + 1])
        y1 = Math.max(y1, s.pts[i + 1])
      }
    }
    return x1 >= x0 ? { x0, y0, x1, y1 } : null
  }

  // 화면(캔버스 로컬)좌표: 캔버스는 CSS 변형이 없어 rect가 안정적.
  const localXY = (e: { clientX: number; clientY: number }) => {
    const r = drawRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  // 캔버스 로컬좌표 → 콘텐츠 좌표. screenX=cx*zoom+panX, screenY=cy*zoom+panY.
  const toContent = (lx: number, ly: number) => {
    const z = zoomRef.current
    return { x: (lx - panXRef.current) / z, y: (ly - panYRef.current) / z }
  }
  // 이동 범위 제한: 보이는 뷰포트가 (텍스트영역 + 여백) 밖으로 안 나가게 panX/panY를 클램프.
  const clampPan = () => {
    const cv = drawRef.current
    if (!cv) return
    const z = zoomRef.current
    const vpW = cv.clientWidth
    const vpH = cv.clientHeight
    const cW = contentWRef.current || vpW
    const cH = Math.max(contentHRef.current || vpH, vpH)
    const rL = -PAN_MARGIN * vpW // 영역(콘텐츠 좌표) 좌/우/상/하 경계
    const rR = cW + PAN_MARGIN * vpW
    const rT = -PAN_MARGIN * vpH
    const rB = cH + PAN_MARGIN * vpH
    let minX = vpW - rR * z
    let maxX = -rL * z
    let minY = vpH - rB * z
    let maxY = -rT * z
    if (minX > maxX) minX = maxX = (minX + maxX) / 2 // 영역이 뷰포트보다 작으면 가운데 고정
    if (minY > maxY) minY = maxY = (minY + maxY) / 2
    panXRef.current = Math.min(maxX, Math.max(minX, panXRef.current))
    panYRef.current = Math.min(maxY, Math.max(minY, panYRef.current))
  }
  // textarea에 확대/이동 반영(펜 모드만). 캔버스는 paintInk에서 같은 변형으로 그림.
  const applyView = () => {
    const ta = bodyRef.current
    if (ta) {
      if (penMode && isMobile) {
        ta.style.transformOrigin = '0 0'
        ta.style.transform = `translate(${panXRef.current}px, ${panYRef.current}px) scale(${zoomRef.current})`
      } else {
        ta.style.transform = ''
      }
    }
    paintInk()
  }

  // 한 획을 콘텐츠 좌표로 그림. erase면 destination-out으로 앞선 픽셀을 파냄(캔버스와 동일).
  const strokeOne = (
    ctx: CanvasRenderingContext2D,
    pts: number[],
    color: string,
    width: number,
    kind: 'pen' | 'highlighter' | 'erase',
  ) => {
    if (pts.length < 2) return
    ctx.save()
    if (kind === 'erase') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = '#000'
      ctx.fillStyle = '#000'
    } else {
      ctx.globalAlpha = kind === 'highlighter' ? 0.4 : 1
      ctx.strokeStyle = color
      ctx.fillStyle = color
    }
    ctx.lineWidth = width
    // 형광펜은 납작한 끝(butt)=네모 밴드(캔버스와 동일). 펜·지우개는 둥근 끝.
    ctx.lineCap = kind === 'highlighter' ? 'butt' : 'round'
    ctx.lineJoin = 'round'
    const n = pts.length / 2
    if (n === 1) {
      ctx.beginPath()
      ctx.arc(pts[0], pts[1], Math.max(0.5, width / 2), 0, Math.PI * 2) // 점 하나(톡)
      ctx.fill()
    } else if (n === 2) {
      ctx.beginPath()
      ctx.moveTo(pts[0], pts[1]) // 2점(형광펜·직선)
      ctx.lineTo(pts[2], pts[3])
      ctx.stroke()
    } else {
      // 중점을 지나는 2차 베지어로 매끄럽게(각지지 않게) — 캔버스 필기와 동일.
      ctx.beginPath()
      ctx.moveTo(pts[0], pts[1])
      for (let i = 1; i < n - 1; i++) {
        const cx = pts[i * 2]
        const cy = pts[i * 2 + 1]
        const nx = pts[(i + 1) * 2]
        const ny = pts[(i + 1) * 2 + 1]
        ctx.quadraticCurveTo(cx, cy, (cx + nx) / 2, (cy + ny) / 2)
      }
      ctx.lineTo(pts[(n - 1) * 2], pts[(n - 1) * 2 + 1])
      ctx.stroke()
    }
    ctx.restore()
  }

  // 저장된 획 + 그리는 중인 획을 다시 그림. ctx 변형(zoom·panX·scroll)으로 확대/이동을 반영(선명하게).
  const paintInk = () => {
    const cv = drawRef.current
    const ta = bodyRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ta || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cw = Math.max(1, Math.round(cv.clientWidth * dpr))
    const ch = Math.max(1, Math.round(cv.clientHeight * dpr))
    if (cv.width !== cw || cv.height !== ch) {
      cv.width = cw
      cv.height = ch
    }
    // 키보드 모드 + PC(확대 없음): 네이티브 스크롤만 → panY를 scrollTop과 동기화(필기가 글과 함께 스크롤).
    if (!penMode || !isMobile) {
      zoomRef.current = 1
      panXRef.current = 0
      panYRef.current = -ta.scrollTop
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, cv.width, cv.height)
    const z = zoomRef.current
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * panXRef.current, dpr * panYRef.current)
    // PC: 텍스트 영역(내용 전체) 밖의 획(모바일 여백 낙서)은 숨김 → 텍스트 영역 낙서만 보임.
    if (!isMobile) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, ta.clientWidth, ta.scrollHeight)
      ctx.clip()
    }
    for (const s of getNoteStrokes(viewedId))
      strokeOne(ctx, s.pts, s.color, s.width, s.erase ? 'erase' : s.kind === 'highlighter' ? 'highlighter' : 'pen')
    if (curStroke.current)
      strokeOne(
        ctx,
        curStroke.current,
        getInkColor(),
        getInkWidth(),
        curErase.current ? 'erase' : getInkMode() === 'highlighter' ? 'highlighter' : 'pen',
      )
    if (!isMobile) ctx.restore() // 클리핑 해제(선택 박스·핸들은 안 잘리게)
    // 올가미: 그리는 중인 경로 + 선택 획 경계상자(파란 점선).
    if (lassoPath.current && lassoPath.current.length >= 4) {
      const lp = lassoPath.current
      ctx.save()
      ctx.setLineDash([5 / z, 4 / z])
      ctx.lineWidth = 1.5 / z
      ctx.strokeStyle = 'rgba(60,120,220,0.9)'
      ctx.beginPath()
      ctx.moveTo(lp[0], lp[1])
      for (let i = 2; i < lp.length; i += 2) ctx.lineTo(lp[i], lp[i + 1])
      ctx.stroke()
      ctx.restore()
    }
    const lb = lassoBBox()
    if (lb) {
      const p = LASSO_PAD
      ctx.save()
      ctx.setLineDash([6 / z, 4 / z])
      ctx.lineWidth = 1.5 / z
      ctx.strokeStyle = 'rgba(60,120,220,0.9)'
      ctx.strokeRect(lb.x0 - p, lb.y0 - p, lb.x1 - lb.x0 + p * 2, lb.y1 - lb.y0 + p * 2)
      ctx.setLineDash([])
      // 4코너 크기조절 핸들(작은 사각형). 화면상 크기 일정하게 1/z.
      const hs = 5 / z
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = 'rgba(60,120,220,0.95)'
      ctx.lineWidth = 1.5 / z
      for (const [hx, hy] of [
        [lb.x0 - p, lb.y0 - p],
        [lb.x1 + p, lb.y0 - p],
        [lb.x0 - p, lb.y1 + p],
        [lb.x1 + p, lb.y1 + p],
      ]) {
        ctx.beginPath()
        ctx.rect(hx - hs, hy - hs, hs * 2, hs * 2)
        ctx.fill()
        ctx.stroke()
      }
      ctx.restore()
    }
    // 본문 텍스트 영역 경계를 은은한 점선으로(모바일 전용 — 여백으로 나갔을 때 위치 감).
    if (penMode && isMobile) {
      const fw = contentWRef.current || cv.clientWidth
      const fh = contentHRef.current || cv.clientHeight
      ctx.save()
      ctx.setLineDash([6 / z, 5 / z])
      ctx.lineWidth = 1 / z
      ctx.strokeStyle = 'rgba(0,0,0,0.16)'
      ctx.strokeRect(0, 0, fw, fh)
      ctx.restore()
    }
    // 지우개 반경 링 — 어디를/얼마나 지우는지 표시(선폭은 확대와 무관하게 일정).
    const m = getInkMode()
    if (eraseCursor.current && (erasing.current || m === 'eraser' || m === 'erasePart')) {
      ctx.save()
      ctx.setLineDash([4 / z, 3 / z])
      ctx.lineWidth = 1.5 / z
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'
      ctx.beginPath()
      ctx.arc(eraseCursor.current.x, eraseCursor.current.y, Math.max(3, getEraserRadius()), 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  // 매 렌더마다 다시 그림(획 몇 개라 가벼움 → 노트 전환·타이핑에도 항상 최신).
  useEffect(() => {
    paintInk()
  })

  // 창 크기 변경(리사이즈)엔 React 재렌더가 없어 캔버스 비트맵이 늘어남(찹쌀떡). ResizeObserver로 즉시 다시 그림.
  const paintRef = useRef(paintInk)
  paintRef.current = paintInk // 항상 최신 클로저 참조(penMode·pan 등 반영)
  useEffect(() => {
    const cv = drawRef.current
    if (!cv || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => paintRef.current())
    ro.observe(cv)
    return () => ro.disconnect()
  }, [])

  // 펜 모드 토글: 잉크모드(팔레트) 켬/끔 + 본문을 전체 높이로 펴서 panX/panY로 이동 가능하게.
  useEffect(() => {
    const ta = bodyRef.current
    pointers.current.clear()
    pinch.current = null
    pinchLatch.current = false
    lassoPath.current = null
    lassoMove.current = null
    lassoResize.current = null
    setLassoSel([])
    setLassoDrag(false)
    zoomRef.current = 1
    panXRef.current = 0
    if (penMode) {
      if (ta) {
        // 이동 범위 기준: 현재 본문 폭/전체 높이 측정.
        contentWRef.current = ta.clientWidth
        contentHRef.current = ta.scrollHeight
        panYRef.current = -ta.scrollTop // 보던 위치 유지
        // 모바일만: 본문을 전체 높이로 펴 여백까지 이동 가능(PC는 100% 고정 → 네이티브 스크롤).
        if (isMobile) {
          ta.style.height = ta.scrollHeight + 'px'
          ta.style.overflow = 'hidden'
        }
        ta.blur()
      }
      if (!getInkMode()) setInkMode('pen')
      if (isMobile) clampPan()
    } else {
      if (ta) {
        ta.style.height = '' // 키보드 모드: 원래 높이·네이티브 스크롤 복원
        ta.style.overflow = ''
        ta.scrollTop = Math.max(0, -panYRef.current)
      }
      panYRef.current = -(ta?.scrollTop ?? 0)
      if (getInkMode()) setInkMode(null)
    }
    setZoomPct(Math.round(zoomRef.current * 100))
    applyView()
  }, [penMode])
  // 하단 펜 버튼(전역 잉크모드) ↔ 노트 내 키보드/펜 토글 양방향 동기화.
  // 잉크모드가 바깥(하단 펜 조이스틱)에서 바뀌면 penMode도 따라오게 한다.
  // (penMode→잉크모드는 위 [penMode] 이펙트가 담당 → 아래 이펙트는 [penMode] 다음에 선언해
  //  마운트 시 "노트는 키보드로 열기"가 먼저 적용되게 함.)
  const inkVer = useSyncExternalStore(subscribe, getSnapshot)
  useEffect(() => {
    const want = !!getInkMode()
    setPenMode((p) => (p === want ? p : want))
  }, [inkVer])
  // 편집기 닫힐 때 잉크모드 정리(캔버스가 그리기 상태로 남지 않게).
  useEffect(
    () => () => {
      if (getInkMode()) setInkMode(null)
    },
    [],
  )

  // 핀치 시작/재기준(손가락 수 변동 시): 두 손가락 거리·중점(콘텐츠)을 기준으로 잡음.
  const beginPinch = () => {
    const ps = [...pointers.current.values()]
    if (ps.length < 2) return
    const [a, b] = ps
    const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))
    const c = toContent((a.x + b.x) / 2, (a.y + b.y) / 2)
    pinch.current = { dist, startZoom: zoomRef.current, cx: c.x, cy: c.y }
  }
  const updatePinch = () => {
    const p = pinch.current
    const ps = [...pointers.current.values()]
    if (!p || ps.length < 2) return
    const [a, b] = ps
    const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const z = Math.min(8, Math.max(0.5, (p.startZoom * dist) / p.dist))
    // 기준 콘텐츠점(p.cx,p.cy)이 현재 두 손가락 중점(mx,my)에 계속 붙어있게 panX·panY 역산.
    zoomRef.current = z
    panXRef.current = mx - p.cx * z
    panYRef.current = my - p.cy * z
    clampPan() // 영역 밖으로 못 나가게
    setZoomPct(Math.round(z * 100))
    applyView()
  }

  // 그리던 획을 확정한다(되돌리기 1스텝). up 이벤트가 유실돼도 이 획이 사라지지 않게 재사용.
  const commitPendingStroke = () => {
    const pts = curStroke.current
    if (!pts) return
    if (pts.length >= 2)
      addNoteStroke(
        viewedId,
        curErase.current
          ? { id: uid('nk'), pts, color: '#000', width: getInkWidth(), erase: true }
          : {
              id: uid('nk'),
              pts,
              color: getInkColor(),
              width: getInkWidth(),
              kind: getInkMode() === 'highlighter' ? 'highlighter' : 'pen',
            },
      )
    curStroke.current = null
    curErase.current = false
  }
  const inkDown = (e: React.PointerEvent) => {
    if (!penMode || !drawRef.current) return
    // 삼성 S펜 등: 앞 획의 up이 유실됐는데(또는 up이 'touch'/다른 id로 와서 무시됨) 새 펜이 눌린 경우.
    // 펜 접촉은 동시에 둘일 수 없으므로 = 앞 획이 안 끝난 것 → 그 획을 확정하고 상태를 초기화한다.
    // (안 하면 새 펜이 두 번째 포인터=핀치로 오인돼 그리던 획이 통째로 사라짐.)
    if (e.pointerType === 'pen' && noteInkIsPen.current && e.pointerId !== notePenId.current) {
      commitPendingStroke()
      notePenId.current = null
      noteInkIsPen.current = false
      pointers.current.clear()
      paintInk()
    }
    // 팜 리젝션: 펜으로 필기 중엔 손바닥/손가락(touch) 접촉을 무시 → 핀치 오인으로 획이 안 끊기게.
    if (noteInkIsPen.current && e.pointerType === 'touch') return
    try {
      drawRef.current.setPointerCapture?.(e.pointerId)
    } catch {
      /* 비활성 포인터 캡처 예외 무시 */
    }
    pointers.current.set(e.pointerId, localXY(e))
    // 모바일 두 손가락 이상 = 확대/이동(그리기 아님). PC는 확대 없음(무시). 진행 중이던 획은 버림.
    if (isMobile && pointers.current.size >= 2) {
      curStroke.current = null
      curErase.current = false
      erasing.current = false
      eraseCursor.current = null
      lassoPath.current = null
      lassoMove.current = null
      lassoResize.current = null
      pinchLatch.current = true
      beginPinch()
      paintInk()
      return
    }
    // 노트 필기(터치기기): 손가락은 기본 '화면이동'(핸드모드 켜야 손도 그림), 펜(S펜)은 항상 필기.
    // 가로폰/태블릿(PC 노트 UI)에서도 동일 — 손가락 버튼 없이는 손으로 안 그려짐.
    if (touch && (getPanTool() || (e.pointerType !== 'pen' && !getHandMode()))) {
      panDrag.current = localXY(e)
      return
    }
    // 여기부터 실제 필기/지우기/올가미 → 이 포인터를 '현재 획 포인터'로 기록(팜 리젝션 기준).
    // 새 획 시작 전, 앞 획이 커밋 안 된 채 남아 있으면(up 유실 등) 먼저 확정 → 사라지지 않게.
    commitPendingStroke()
    notePenId.current = e.pointerId
    noteInkIsPen.current = e.pointerType === 'pen'
    const lp = localXY(e)
    const { x, y } = toContent(lp.x, lp.y)
    eraseCursor.current = { x, y }
    const m = getInkMode()
    // 올가미: 선택 안(박스)을 누르면 이동, 아니면 새 올가미 그리기 시작.
    if (m === 'lasso') {
      const box = lassoBBox()
      if (box && lassoSel.length) {
        const p = LASSO_PAD
        const hitR = 12 / zoomRef.current // 코너 핸들 히트 반경(콘텐츠)
        // [코너x, 코너y, 반대코너(pivot)x, pivot y]
        const corners = [
          [box.x0 - p, box.y0 - p, box.x1 + p, box.y1 + p],
          [box.x1 + p, box.y0 - p, box.x0 - p, box.y1 + p],
          [box.x0 - p, box.y1 + p, box.x1 + p, box.y0 - p],
          [box.x1 + p, box.y1 + p, box.x0 - p, box.y0 - p],
        ]
        for (const [cx, cy, pvx, pvy] of corners) {
          if (Math.hypot(x - cx, y - cy) <= hitR) {
            const snap = new Map<string, { pts: number[]; width: number }>()
            const ids = new Set(lassoSel)
            for (const s of getNoteStrokes(viewedId))
              if (ids.has(s.id)) snap.set(s.id, { pts: s.pts.slice(), width: s.width })
            lassoResize.current = { pivotX: pvx, pivotY: pvy, startDist: Math.max(1, Math.hypot(x - pvx, y - pvy)), snap }
            setLassoDrag(true)
            paintInk()
            return
          }
        }
        // 코너 아니면 박스 안=이동
        if (x >= box.x0 - p && x <= box.x1 + p && y >= box.y0 - p && y <= box.y1 + p) {
          lassoMove.current = { x, y }
          setLassoDrag(true)
          paintInk()
          return
        }
      }
      setLassoSel([]) // 밖을 누르면 새 올가미
      lassoPath.current = [x, y]
      paintInk()
      return
    }
    if (lassoSel.length) setLassoSel([]) // 다른 도구로 그리기 시작하면 선택 해제
    // PC 우클릭 또는 Stroke 지우개 = 닿는 획을 통째로 삭제(이동 선분 기준).
    if (e.button === 2 || m === 'eraser') {
      erasing.current = true
      lastErase.current = { x, y }
      eraseNoteStrokesNear(viewedId, x, y, x, y, getEraserRadius())
    } else if (m === 'erasePart') {
      curErase.current = true
      curStroke.current = [x, y]
      smoother.current = makeStabilizer(0) // 지우개는 보정 안 함
    } else if (m !== 'fill') {
      curErase.current = false
      curStroke.current = [x, y]
      // 손떨림 보정 시작(형광펜은 직선이라 제외 → 0)
      smoother.current = makeStabilizer(m === 'highlighter' ? 0 : getInkSmooth())
    }
    paintInk()
  }
  const inkMove = (e: React.PointerEvent) => {
    if (!penMode || !drawRef.current) return
    // 팜 리젝션: 펜 필기 중 무시 대상(다른 손가락)의 move는 획을 오염시키지 않게 무시.
    if (noteInkIsPen.current && e.pointerType === 'touch' && e.pointerId !== notePenId.current) return
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, localXY(e))
    if (isMobile && pointers.current.size >= 2) {
      updatePinch() // 두 손가락 = 확대/이동
      return
    }
    // 화면이동 도구: 한 손가락 드래그 = 이동
    if (panDrag.current) {
      const l = localXY(e)
      panXRef.current += l.x - panDrag.current.x
      panYRef.current += l.y - panDrag.current.y
      panDrag.current = l
      clampPan()
      applyView()
      return
    }
    if (pinchLatch.current) return // 핀치 후 남은 한 손가락은 그리지 않음
    const lp = localXY(e)
    const { x, y } = toContent(lp.x, lp.y)
    eraseCursor.current = { x, y }
    // 올가미 크기조절(반대코너 고정, 균일 스케일)
    if (lassoResize.current) {
      const r = lassoResize.current
      const scale = Math.max(0.05, Math.hypot(x - r.pivotX, y - r.pivotY) / r.startDist)
      const geom = new Map<string, { pts: number[]; width: number }>()
      for (const [id, snap] of r.snap) {
        const pts = new Array(snap.pts.length)
        for (let i = 0; i < snap.pts.length; i += 2) {
          pts[i] = r.pivotX + (snap.pts[i] - r.pivotX) * scale
          pts[i + 1] = r.pivotY + (snap.pts[i + 1] - r.pivotY) * scale
        }
        geom.set(id, { pts, width: Math.max(1, snap.width * scale) })
      }
      applyNoteStrokeGeom(viewedId, geom, false)
      paintInk()
      return
    }
    // 올가미 이동/그리기
    if (lassoMove.current) {
      moveNoteStrokes(viewedId, new Set(lassoSel), x - lassoMove.current.x, y - lassoMove.current.y, false)
      lassoMove.current = { x, y }
      paintInk()
      return
    }
    if (lassoPath.current) {
      lassoPath.current.push(x, y)
      paintInk()
      return
    }
    if (erasing.current) {
      const f = lastErase.current ?? { x, y }
      eraseNoteStrokesNear(viewedId, f.x, f.y, x, y, getEraserRadius())
      lastErase.current = { x, y }
    } else if (curStroke.current) {
      // 형광펜 = 직선(시작점→현재점 2점). 펜·Area지우개 = 점 누적. 캔버스와 동일.
      if (!curErase.current && getInkMode() === 'highlighter') {
        curStroke.current = [curStroke.current[0], curStroke.current[1], x, y]
      } else {
        // 빠르게 그려도 매끈하게: 포인터 사이 중간 이벤트(getCoalescedEvents)까지 촘촘히 받음.
        const ne = e.nativeEvent as PointerEvent
        const evs = ne.getCoalescedEvents?.()
        const samples = evs && evs.length ? evs : [ne]
        const minGap = 0.6 / zoomRef.current // 너무 촘촘한 점은 건너뜀
        for (const ce of samples) {
          const l = localXY(ce)
          const r = toContent(l.x, l.y)
          const c = smoother.current.filter(r.x, r.y, ce.timeStamp) // 손떨림 보정(강도 0이면 원본)
          const k = curStroke.current.length
          if (k >= 2 && Math.hypot(c.x - curStroke.current[k - 2], c.y - curStroke.current[k - 1]) < minGap)
            continue
          curStroke.current.push(c.x, c.y)
        }
      }
    }
    paintInk()
  }
  const inkLeave = () => {
    eraseCursor.current = null
    paintInk()
  }
  const inkUp = (e: React.PointerEvent) => {
    // 팜 리젝션: 무시했던 손가락의 up은 획을 조기 확정하지 않게 무시. 펜(획 포인터)이 떼지면 기록 해제.
    if (noteInkIsPen.current && e.pointerType === 'touch' && e.pointerId !== notePenId.current) return
    if (e.pointerId === notePenId.current) {
      notePenId.current = null
      noteInkIsPen.current = false
    }
    pointers.current.delete(e.pointerId)
    if (isMobile && pointers.current.size >= 2) {
      beginPinch() // 3→2 등: 남은 두 손가락으로 재기준
      return
    }
    if (isMobile && pointers.current.size === 1) {
      pinch.current = null // 1개 남음: 핀치 종료(그리진 않음, pinchLatch 유지)
      return
    }
    // 모두 뗌
    pinch.current = null
    eraseCursor.current = null
    if (panDrag.current) {
      panDrag.current = null
      return
    }
    if (pinchLatch.current) {
      pinchLatch.current = false // 핀치였음 → 이번 제스처는 획 확정 안 함
      lassoPath.current = null
      lassoMove.current = null
      lassoResize.current = null
      setLassoDrag(false)
      paintInk()
      return
    }
    // 올가미 크기조절 확정
    if (lassoResize.current) {
      lassoResize.current = null
      setLassoDrag(false)
      moveNoteStrokes(viewedId, new Set(lassoSel), 0, 0, true) // 결과 저장·되돌리기 1스텝
      return
    }
    // 올가미 이동 확정
    if (lassoMove.current) {
      lassoMove.current = null
      setLassoDrag(false)
      moveNoteStrokes(viewedId, new Set(lassoSel), 0, 0, true) // 저장·되돌리기 1스텝
      return
    }
    // 올가미 그리기 완료 → 다각형 안의 획 선택
    if (lassoPath.current) {
      const poly = lassoPath.current
      const ids: string[] = []
      if (poly.length >= 6) {
        for (const s of getNoteStrokes(viewedId)) {
          if (s.erase) continue
          for (let i = 0; i < s.pts.length; i += 2)
            if (pointInPoly(s.pts[i], s.pts[i + 1], poly)) {
              ids.push(s.id)
              break
            }
        }
      }
      lassoPath.current = null
      setLassoSel(ids)
      paintInk()
      return
    }
    if (erasing.current) {
      erasing.current = false
      lastErase.current = null
      paintInk()
      return
    }
    if (curStroke.current) {
      commitPendingStroke()
      paintInk()
    }
  }
  // PC 펜 모드: 휠로 본문 스크롤(확대·여백 없음, 100% 고정). 캔버스가 본문을 덮어 네이티브 스크롤이 안 닿으므로 직접 스크롤.
  const inkWheel = (e: React.WheelEvent) => {
    if (!penMode || isMobile) return
    const ta = bodyRef.current
    if (!ta) return
    e.preventDefault()
    ta.scrollTop = Math.max(0, Math.min(ta.scrollHeight - ta.clientHeight, ta.scrollTop + e.deltaY))
    panYRef.current = -ta.scrollTop
    paintInk()
  }
  const resetZoom = () => {
    zoomRef.current = 1
    panXRef.current = 0
    panYRef.current = 0
    clampPan()
    setZoomPct(100)
    applyView()
  }
  // 본문 위에 얹는 필기 레이어 + 펜/키보드 토글(모바일·데스크톱 공통).
  // ⚠️ 캡처(공유) 중엔 캔버스(그림)는 남기고 버튼만 숨긴다(안 그러면 공유 이미지에 필기가 빠짐).
  const inkOverlay = (
    <>
      <S.InkCanvas
        ref={drawRef}
        style={{ pointerEvents: penMode && !capturing ? 'auto' : 'none' }}
        onPointerDown={inkDown}
        onPointerMove={inkMove}
        onPointerUp={inkUp}
        onPointerCancel={inkUp}
        onPointerLeave={inkLeave}
        onWheel={inkWheel} // 데스크톱: 휠 이동 / Ctrl+휠 확대
        onContextMenu={(e) => e.preventDefault()} // 우클릭 지우개 → 브라우저 메뉴 안 뜨게
      />
      {!capturing && (
      <>
      <S.InkToggle>
        <button data-on={!penMode} onClick={() => setPenMode(false)} title="Keyboard">
          ⌨
        </button>
        <button data-on={penMode} onClick={() => setPenMode(true)} title="Pen">
          ✎
        </button>
      </S.InkToggle>
      {/* 확대 퍼센트(두 손가락으로 확대·이동). 탭하면 100%로. 펜 모드에서만. */}
      {penMode && (
        <S.ZoomTag onClick={resetZoom} title="Tap to reset to 100%">
          {zoomPct}%
        </S.ZoomTag>
      )}
      {/* 올가미 선택 삭제 버튼 — 선택 박스 우상단(이동 중엔 숨김). */}
      {penMode &&
        lassoSel.length > 0 &&
        !lassoDrag &&
        (() => {
          const lb = lassoBBox()
          if (!lb) return null
          const sx = lb.x1 * zoomRef.current + panXRef.current
          const sy = lb.y0 * zoomRef.current + panYRef.current
          return (
            <S.LassoDel
              style={{ left: Math.round(sx) + 4, top: Math.round(sy) - 32 }}
              onPointerDown={(e) => {
                e.stopPropagation()
                deleteNoteStrokes(viewedId, new Set(lassoSel))
                setLassoSel([])
              }}
            >
              🗑
            </S.LassoDel>
          )
        })()}
      </>
      )}
    </>
  )

  const n = getNode(viewedId)
  if (!n) return null

  const addTags = () => {
    const toks = parseTags(tagText)
    if (!toks.length) return
    const merged = [...(n.tags || [])]
    for (const t of toks) if (!merged.includes(t) && merged.length < MAX_TAGS) merged.push(t) // 최대 10개
    updateNode(n.id, { tags: merged })
    setTagText('')
  }
  const tagsFull = (n.tags?.length ?? 0) >= MAX_TAGS // 10개 다 참 → 입력 막고 'Max' 표시
  // 태그 입력칸 안내문(영어): 가득 차면 한도 안내, 아니면 최대 개수 표기
  const tagPlaceholder = tagsFull
    ? `Max ${MAX_TAGS} tags`
    : n.tags?.length
      ? `Add tag… (max ${MAX_TAGS})`
      : `Type #tag then Enter (max ${MAX_TAGS})`
  const removeTag = (t: string) => updateNode(n.id, { tags: (n.tags || []).filter((x) => x !== t) })

  // 태그 입력 키 처리: Enter/콤마=추가(한글 조합 중 제외), 빈 칸에서 Backspace=마지막 태그 삭제
  const onTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && !e.nativeEvent.isComposing) {
      e.preventDefault()
      e.stopPropagation()
      addTags()
    } else if (e.key === 'Backspace' && tagText === '' && (n.tags?.length ?? 0) > 0) {
      e.preventDefault()
      updateNode(n.id, { tags: (n.tags || []).slice(0, -1) }) // 마지막 태그부터 하나씩
    }
  }

  // 해시태그 칩(드래그 정렬은 TagRow가 처리)
  const renderTags = () => (
    <TagRow
      tags={n.tags || []}
      onReorder={(tags) => updateNode(n.id, { tags })}
      onRemove={removeTag}
    />
  )
  // 교체 실행 + 검색란 비우기(스와이프로 교체했으면 검색어 초기화)
  const doSwap = () => {
    if (!slotPid) return
    swapInNote(slotPid, viewedId)
    setQuery('')
  }
  // 노트 공유 팝업 열기
  const doShare = () => setShareOpen(true)

  // 노트명_YYMMDDHHMMSS.png → 매번 다른 이름이라 "다시 다운로드" 안 뜸
  const imgFilename = () => {
    const d = new Date()
    const p = (v: number) => String(v).padStart(2, '0')
    const ts = `${p(d.getFullYear() % 100)}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
    return `${(n.name || 'note').trim()}_${ts}.png`
  }
  // 이미지 다운로드(웹/PC 폴백). 네이티브는 shareFileNative(공유 시트)로 처리.
  const downloadImage = (blob: Blob, filename = imgFilename()) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  // 텍스트 복사(HTTPS=Clipboard API, HTTP=레거시 execCommand 폴백)
  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      /* fall through */
    }
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }

  // 갤러리/클립보드: capturing(버튼 숨김+해시태그 위로) 모드를 켜고, 그 렌더가 "커밋된 뒤"에 캡처
  // 캡처 직전 기준 치수 측정(캔버스=기본 뷰포트, 본문 전체높이). textarea 숨겨지기 전에.
  const beginShare = (mode: 'gallery' | 'share' | 'clipboard', full: boolean) => {
    setShareOpen(false)
    const cv = drawRef.current
    const ta = bodyRef.current
    const vpW = cv?.clientWidth || 300
    const vpH = cv?.clientHeight || 300
    capDims.current = { vpW, vpH, contentH: Math.max(ta?.scrollHeight || vpH, vpH) }
    setShareFull(full)
    setShareMode(mode)
    setCapturing(true)
  }
  const shareGallery = () => beginShare('gallery', false)
  const shareGalleryFull = () => beginShare('gallery', true)
  const shareSheet = () => beginShare('share', false)
  const shareClipboard = () => beginShare('clipboard', false)

  // capturing 모드 렌더가 적용된 뒤(effect = 커밋 이후) 캡처 → 버튼 숨김/해시태그 이동이 항상 반영됨
  useEffect(() => {
    if (!capturing || !shareMode) return
    let cancelled = false
    ;(async () => {
      // 커밋 이후(effect) + 약간의 지연으로 레이아웃 확정 후 캡처(rAF 비의존)
      await new Promise((r) => setTimeout(r, 60))
      try {
        await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready
      } catch {
        /* 무시 */
      }
      // 필기 획을 캡처용 캔버스(CapBody 위)에 그려 넣음 → 공유 이미지에 그림 포함
      const cap = capInkRef.current
      const cctx = cap?.getContext('2d')
      if (cap && cctx) {
        const w = cap.clientWidth
        const h = cap.clientHeight
        const dpr = 2
        // 전체(full)면 상/좌 여백만큼 원점을 밀어 음수좌표(위·왼쪽 여백) 그림도 들어오게
        const ox = shareFull ? Math.round(PAN_MARGIN * capDims.current.vpW) : 0
        const oy = shareFull ? Math.round(PAN_MARGIN * capDims.current.vpH) : 0
        cap.width = Math.max(1, Math.round(w * dpr))
        cap.height = Math.max(1, Math.round(h * dpr))
        cctx.setTransform(dpr, 0, 0, dpr, dpr * ox, dpr * oy)
        cctx.clearRect(-ox, -oy, w, h)
        for (const s of getNoteStrokes(viewedId))
          strokeOne(cctx, s.pts, s.color, s.width, s.erase ? 'erase' : s.kind === 'highlighter' ? 'highlighter' : 'pen')
      }
      let blob: Blob | null = null
      try {
        if (paperRef.current)
          blob = await toBlob(paperRef.current, { pixelRatio: 2, backgroundColor: '#f3f1ea' })
      } catch (e) {
        console.warn('capture failed', e)
      }
      if (cancelled) return
      const mode = shareMode
      setCapturing(false)
      setShareMode(null)
      setShareFull(false)
      if (!blob) return
      const fn = imgFilename()
      if (mode === 'gallery') {
        // 앱: 갤러리(사진)에 바로 저장. 웹/PC: <a download>.
        if (native) {
          try {
            await saveImageToGallery(blob, fn)
            alert('Saved to gallery')
          } catch (e) {
            console.warn('gallery save failed', e)
            alert('Gallery save failed: ' + ((e as Error).message || ''))
          }
        } else {
          downloadImage(blob, fn)
        }
      } else if (mode === 'share') {
        // 앱: 시스템 공유 시트(타 앱 전송). 웹/PC: 공유 시트가 없어 다운로드로.
        if (native) {
          try {
            await shareFileNative(blob, fn)
          } catch (e) {
            console.warn('share failed', e)
          }
        } else {
          downloadImage(blob, fn)
        }
      } else {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          alert('Image copied to clipboard')
        } catch {
          alert('Could not copy image — clipboard image copy needs HTTPS')
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturing, shareMode])

  // 텍스트: 제목 / 내용 / 해시태그 형식으로 복사
  const shareText = async () => {
    setShareOpen(false)
    const tagLine = (n.tags || []).map((t) => '#' + t).join(' ')
    const text = [n.name?.trim(), n.body?.trim(), tagLine].filter(Boolean).join('\n\n')
    alert((await copyText(text)) ? 'Text copied' : 'Copy failed')
  }

  // 모바일 읽기전용 영역 더블탭 → 그 자리에서 바로 수정+키패드(제스처 안에서 readOnly 해제+focus)
  const enterEdit = (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!isMobile || !editLocked) return
    const el = e.currentTarget
    el.readOnly = false
    el.blur() // 이미 포커스된 상태(특히 textarea)면 focus가 무시되므로 강제 재포커스 → 키패드 즉시
    el.focus()
    setEditLocked(false)
  }

  // 본문 키 처리. Tab만 처리(표 칸 맞춤용 탭 문자 삽입).
  // (자동 넘버링/불릿 이어가기 기능은 제거됨 — Enter는 순수 줄바꿈만)
  const onBodyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab = 탭 문자 삽입(표 칸 맞춤용). textarea 기본(포커스 이동) 막음.
    if (e.key === 'Tab') {
      e.preventDefault()
      document.execCommand('insertText', false, '\t')
    }
  }

  // 본문 입력: 입력값 그대로 저장(특수 처리 없음).
  const onBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNode(n.id, { body: e.target.value })
  }

  // 모바일용 Tab 버튼: 소프트 키보드엔 Tab 키가 없어서 직접 삽입한다.
  // pointerdown에서 preventDefault → 본문 textarea 포커스(=키보드) 유지한 채 커서 위치에 탭 삽입.
  const insertTabFromButton = (e: React.PointerEvent) => {
    e.preventDefault()
    const el = document.activeElement
    if (el && el.tagName === 'TEXTAREA') document.execCommand('insertText', false, '\t')
  }

  // 자리에 실제로 꽂힌 노트 (교체 가능 여부 판단용)
  const slotNodeId = slotPid ? getPlacement(slotPid)?.nodeId : nodeId
  const canSwap = !!slotPid && viewedId !== slotNodeId
  const asset = n.assetId ? getAsset(n.assetId) : undefined
  const results = searchNotesInCurrentSpace(query, viewedId)
  const searching = !!query.trim()
  // 검색 중이면(수정 안 하는 상태) 편집 잠금. 제목/본문/태그 입력 잠금(검색·배지는 항상 가능)
  const locked = isMobile && (editLocked || searching)
  const backToNote = () => {
    setQuery('')
    setViewedId(slotNodeId || nodeId) // 원래 노트로 돌아오기
  }

  // 검색 입력 + 오른쪽 초기화(✕) 버튼
  const searchRow = (
    <S.SearchRow>
      <S.Search
        value={query}
        placeholder="Search this space by #tag"
        onChange={(e) => setQuery(e.target.value)}
      />
      {searching && (
        <S.ClearBtn onClick={() => setQuery('')} title="Clear search">
          🗑
        </S.ClearBtn>
      )}
    </S.SearchRow>
  )

  // 사진 교체: 이미지 골라 새 에셋으로 교체
  const replacePhoto = async () => {
    setPhotoMenu(false)
    const file = await pickImageFile()
    if (!file) return
    const img = await fileToImage(file)
    const a = { id: uid('a'), kind: 'image' as const, mime: img.mime, thumb: img.thumb }
    addAsset(a)
    updateNode(n.id, { assetId: a.id, shape: 'image' })
  }
  const deletePhoto = () => {
    updateNode(n.id, { assetId: undefined })
    setConfirmDel(false)
  }

  // 사진 클릭 메뉴 / 삭제 확인 / 크게보기 (PC·모바일 공통 오버레이)
  const extras = (
    <>
      {photoMenu && isMobile && <S.PhotoMask onClick={() => setPhotoMenu(false)} />}
      {photoMenu && !isMobile && (
        <>
          <S.PhotoMask onClick={() => setPhotoMenu(false)} />
          <S.PhotoMenu style={{ left: menuPos.x, top: menuPos.y }}>
            <S.PhotoMenuItem onClick={replacePhoto}>{asset ? 'Replace image' : 'Add image'}</S.PhotoMenuItem>
            {asset && (
              <S.PhotoMenuItem
                $danger
                onClick={() => {
                  setPhotoMenu(false)
                  setConfirmDel(true)
                }}
              >
                Delete image
              </S.PhotoMenuItem>
            )}
          </S.PhotoMenu>
        </>
      )}
      {confirmDel && (
        <ConfirmModal
          message="Delete this image?"
          confirmLabel="Delete"
          onConfirm={deletePhoto}
          onCancel={() => setConfirmDel(false)}
        />
      )}
      {viewPhoto && asset && (
        <S.FullView onClick={() => setViewPhoto(false)}>
          <img src={asset.thumb} alt={n.name} />
        </S.FullView>
      )}
      {shareOpen && (
        <S.SharePop onClick={() => setShareOpen(false)}>
          <S.ShareSheet onClick={(e) => e.stopPropagation()}>
            {native ? (
              <>
                {/* 앱: 갤러리에 바로 저장 + 시스템 공유(타 앱 전송) 둘 다 제공 */}
                <S.ShareItem onClick={shareGallery}>🖼 Save to gallery</S.ShareItem>
                {isMobile && (
                  <S.ShareItem onClick={shareGalleryFull}>🖼 Save to gallery (full)</S.ShareItem>
                )}
                <S.ShareItem onClick={shareSheet}>📤 Share</S.ShareItem>
              </>
            ) : (
              <>
                <S.ShareItem onClick={shareGallery}>🖼 Save image</S.ShareItem>
                {/* 'full'은 여백 낙서까지 포함 → 여백 낙서는 모바일 전용이라 PC에선 숨김 */}
                {isMobile && (
                  <S.ShareItem onClick={shareGalleryFull}>🖼 Save full image</S.ShareItem>
                )}
                {/* 모바일은 이미지 클립보드 복사가 안 돼서 제외 */}
                {!isMobile && <S.ShareItem onClick={shareClipboard}>📋 Copy image</S.ShareItem>}
              </>
            )}
            <S.ShareItem onClick={shareText}>📝 Copy text</S.ShareItem>
          </S.ShareSheet>
        </S.SharePop>
      )}
    </>
  )

  // 배지 미리보기(편집 아닐 때): 있으면 칩, 없으면 흰 점. (사진 메뉴와 안 겹치게 stopPropagation)
  const badgeChip = editingBadge ? null : n.badge?.trim() ? (
    <S.Badge
      onClick={(e) => {
        e.stopPropagation()
        setEditingBadge(true)
      }}
      title="Edit badge"
      style={{
        background: n.badgeBg === 'none' ? 'transparent' : n.badgeBg || '#e3b341',
        color: n.badgeColor || (n.badgeBg === 'none' ? '#fff' : '#1a1300'),
        textShadow: n.badgeBg === 'none' ? '0 1px 3px #000' : 'none',
      }}
    >
      {n.badge}
    </S.Badge>
  ) : (
    <S.BadgeDot
      onClick={(e) => {
        e.stopPropagation()
        setEditingBadge(true)
      }}
      title="Add a badge"
    />
  )

  const tagBar = (
    <S.TagBar>
      {(n.tags?.length ?? 0) > 0 && <S.TagChips>{renderTags()}</S.TagChips>}
      <S.TagInput
        value={tagText}
        readOnly={locked || tagsFull} // 잠금 또는 10개 다 차면 입력 막음
        enterKeyHint="done"
        onDoubleClick={enterEdit}
        placeholder={tagPlaceholder}
        onChange={(e) => setTagText(e.target.value)}
        onKeyDown={onTagKeyDown}
        onFocus={() => isMobile && setFocusMode('tags')} // 해시태그 편집 → 태그만(모바일)
        // 모바일은 키보드 Enter("이동")가 keydown으로 안 잡혀도, 포커스 벗어날 때 확정 추가
        onBlur={() => {
          addTags()
          if (isMobile) setFocusMode('none')
        }}
      />
    </S.TagBar>
  )

  // 캡처용: 해시태그 칩(위치 이동) / 본문 전체(div, 안 잘림)
  const capTags =
    capturing && n.tags?.length ? (
      <S.CapTags>
        {n.tags.map((t) => (
          <S.CapTag key={t}>#{t}</S.CapTag>
        ))}
      </S.CapTags>
    ) : null
  // 공유 캡처: 본문(CapBody) + 그 위 필기 캔버스를 영역 크기로 렌더.
  // 기본(Save image)=노트 기본영역[0..bodyW]×[0..baseH]. 전체(Save full)=상하좌우 여백(PAN_MARGIN)까지.
  const capReg = (() => {
    const { vpW, vpH, contentH } = capDims.current
    const baseH = Math.max(contentH, vpH)
    const Mx = Math.round(PAN_MARGIN * vpW)
    const My = Math.round(PAN_MARGIN * vpH)
    return shareFull
      ? { w: vpW + 2 * Mx, h: baseH + 2 * My, ox: Mx, oy: My, bw: vpW, bh: baseH }
      : { w: vpW, h: baseH, ox: 0, oy: 0, bw: vpW, bh: baseH }
  })()
  const capBody = capturing ? (
    <S.CapWrap style={{ width: capReg.w, height: capReg.h }}>
      <S.CapBody style={{ position: 'absolute', left: capReg.ox, top: capReg.oy, width: capReg.bw, height: capReg.bh }}>
        {n.body || ''}
      </S.CapBody>
      <S.InkCanvas ref={capInkRef} style={{ pointerEvents: 'none' }} />
    </S.CapWrap>
  ) : null

  // ── 모바일 레이아웃: [작은 사진 | 제목/검색 + X] → 본문이 나머지 채움 ──
  if (isMobile) {
    return createPortal(
      <S.Overlay ref={overlayRef}>
        <S.MPaper ref={paperRef} $cap={capturing}>
          {editingBadge && (
            <S.MBadgeWrap>
              <BadgeEditor node={n} onClose={() => setEditingBadge(false)} />
            </S.MBadgeWrap>
          )}
          <S.MHead>
            <S.MThumb onClick={() => setPhotoMenu(true)} title="Photo">
              {asset ? <img src={asset.thumb} alt={n.name} /> : <span className="ph">No image</span>}
              {badgeChip}
              {photoMenu && (
                <S.MThumbMenu
                  onClick={(e) => {
                    e.stopPropagation()
                    setPhotoMenu(false)
                  }}
                >
                  {asset && (
                    <S.PBtn
                      $c="del"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPhotoMenu(false)
                        setConfirmDel(true)
                      }}
                      title="Delete"
                    >
                      🗑
                    </S.PBtn>
                  )}
                  <S.PBtn $c="rep" onClick={(e) => (e.stopPropagation(), replacePhoto())} title="Replace">
                    🔄
                  </S.PBtn>
                  {asset && (
                    <S.PBtn
                      $c="view"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPhotoMenu(false)
                        setViewPhoto(true)
                      }}
                      title="View"
                    >
                      👁
                    </S.PBtn>
                  )}
                </S.MThumbMenu>
              )}
            </S.MThumb>
            <S.MMeta>
              <S.MTitleRow>
                <S.Title
                  value={n.name}
                  placeholder="Untitled"
                  readOnly={locked}
                  onDoubleClick={enterEdit}
                  onChange={(e) => updateNode(n.id, { name: e.target.value })}
                />
                {searching ? (
                  // 검색 중 = 수정 안 함 → 연필/눈 대신 "노트로 되돌아오기"
                  <S.Revert onClick={backToNote} title="Back to note">
                    ↩
                  </S.Revert>
                ) : (
                  <>
                    {canSwap && slotNodeId && (
                      <S.Revert onClick={() => setViewedId(slotNodeId)} title="Back to original">
                        ↩
                      </S.Revert>
                    )}
                    <S.Revert
                      onClick={() => setEditLocked((v) => !v)}
                      title={editLocked ? 'Edit' : 'View (lock editing)'}
                    >
                      {editLocked ? '✎' : '👁'}
                    </S.Revert>
                  </>
                )}
                <S.Close onClick={closeNote} title="Close">
                  ✕
                </S.Close>
              </S.MTitleRow>
              {capTags}
              {searchRow}
              {canSwap ? (
                <S.ActionRow>
                  <S.SwapBtn style={{ flex: 8 }} onClick={doSwap}>
                    ⇄ Swap in
                  </S.SwapBtn>
                  <S.ShareBtn style={{ flex: 2 }} onClick={doShare} title="Share this note">
                    📤
                  </S.ShareBtn>
                </S.ActionRow>
              ) : (
                <S.ShareBtn style={{ width: '100%' }} onClick={doShare} title="Share this note">
                  📤 Share
                </S.ShareBtn>
              )}
            </S.MMeta>
          </S.MHead>

          {query.trim() && (
            <S.MResults>
              {results.length === 0 ? (
                <S.Empty>No results</S.Empty>
              ) : (
                results.map((r) => {
                  const ra = r.assetId ? getAsset(r.assetId) : undefined
                  return (
                    <S.ResultItem key={r.id} $on={r.id === viewedId} onClick={() => setViewedId(r.id)}>
                      {ra ? <img className="t" src={ra.thumb} alt="" /> : <span className="t" />}
                      <span className="m">
                        <div className="nm">{r.name || 'Untitled'}</div>
                        {r.tags?.length ? (
                          <div className="tg">{r.tags.map((t) => '#' + t).join(' ')}</div>
                        ) : null}
                      </span>
                    </S.ResultItem>
                  )
                })
              )}
            </S.MResults>
          )}

          <S.BodyWrap>
            <S.Body
              ref={bodyRef}
              value={n.body ?? ''}
              placeholder={
                locked ? (getNoteStrokes(viewedId).length ? '' : 'Double-tap to edit') : 'Write your note…'
              }
              readOnly={locked}
              onDoubleClick={enterEdit} // 더블탭 → 바로 수정+키패드
              onKeyDown={onBodyKeyDown}
              onChange={onBodyChange}
              onScroll={paintInk} // 스크롤하면 필기도 같이 이동
              onFocus={() => setFocusMode('content')} // 키보드 리사이즈 판단용(섹션 숨김은 안 함)
              onBlur={() => setFocusMode('none')}
            />
            {inkOverlay}
            {!locked && !capturing && (
              // 키보드가 열려 있으면(kbInset>0) 화면에 고정해 키보드 바로 위에 띄운다.
              // (기본은 소프트 키보드가 visual viewport만 줄여서 position:fixed 버튼이 키보드 뒤에 깔림)
              <S.TabKey
                onPointerDown={insertTabFromButton}
                title="Insert tab (align columns)"
                style={
                  kbInset > 0
                    ? { position: 'fixed', bottom: kbInset + 10, right: 16, zIndex: 200 }
                    : undefined
                }
              >
                ⇥ Tab
              </S.TabKey>
            )}
          </S.BodyWrap>
          {capBody}
          {tagBar}
        </S.MPaper>
        {extras}
      </S.Overlay>,
      document.body,
    )
  }

  return createPortal(
    <S.Overlay ref={overlayRef}>
      <S.Paper ref={paperRef} $cap={capturing}>
        <S.Left>
          <S.Thumb
            ref={thumbRef}
            onClick={() => {
              const r = thumbRef.current?.getBoundingClientRect()
              if (r) setMenuPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
              setPhotoMenu(true)
            }}
            title="Photo: replace / delete"
          >
            {asset ? <img src={asset.thumb} alt={n.name} /> : <span className="ph">No image</span>}
            {badgeChip}
            {editingBadge && <BadgeEditor node={n} onClose={() => setEditingBadge(false)} />}
          </S.Thumb>
          {capTags}
          {canSwap ? (
            <S.ActionRow>
              <S.SwapBtn
                style={{ flex: 8 }}
                onClick={doSwap}
                title="Bring this note into the slot; the current one goes to the library"
              >
                ⇄ Swap in
              </S.SwapBtn>
              <S.ShareBtn style={{ flex: 2 }} onClick={doShare} title="Share this note">
                📤
              </S.ShareBtn>
            </S.ActionRow>
          ) : (
            <S.ShareBtn style={{ width: '100%' }} onClick={doShare} title="Share this note">
              📤 Share
            </S.ShareBtn>
          )}
          {searchRow}
          <S.Results>
            {results.length === 0 ? (
              <S.Empty>{query ? 'No results' : 'No other notes in this space'}</S.Empty>
            ) : (
              results.map((r) => {
                const ra = r.assetId ? getAsset(r.assetId) : undefined
                return (
                  <S.ResultItem key={r.id} $on={r.id === viewedId} onClick={() => setViewedId(r.id)}>
                    {ra ? (
                      <img className="t" src={ra.thumb} alt="" />
                    ) : (
                      <span className="t" />
                    )}
                    <span className="m">
                      <div className="nm">{r.name || 'Untitled'}</div>
                      {r.tags?.length ? <div className="tg">{r.tags.map((t) => '#' + t).join(' ')}</div> : null}
                    </span>
                  </S.ResultItem>
                )
              })
            )}
          </S.Results>
        </S.Left>

        <S.Right>
          <S.Bar>
            <S.Title
              value={n.name}
              placeholder="Untitled"
              onChange={(e) => updateNode(n.id, { name: e.target.value })}
            />
            {canSwap && slotNodeId && (
              <S.Revert
                onClick={() => setViewedId(slotNodeId)}
                title="Back to the original note in this slot"
              >
                ↩
              </S.Revert>
            )}
            <S.Close onClick={closeNote} title="Close (Esc)">✕</S.Close>
          </S.Bar>
          <S.BodyWrap>
            <S.Body
              ref={bodyRef}
              value={n.body ?? ''}
              placeholder="Write your note…"
              onKeyDown={onBodyKeyDown}
              onChange={onBodyChange}
              onScroll={paintInk} // 스크롤하면 필기도 같이 이동
            />
            {inkOverlay}
          </S.BodyWrap>
          {capBody}
          <S.TagBar>
            {(n.tags?.length ?? 0) > 0 && <S.TagChips>{renderTags()}</S.TagChips>}
            <S.TagInput
              value={tagText}
              readOnly={tagsFull} // 10개 다 차면 입력 막음
              enterKeyHint="done"
              placeholder={tagPlaceholder}
              onChange={(e) => setTagText(e.target.value)}
              onKeyDown={onTagKeyDown}
              onBlur={addTags}
            />
          </S.TagBar>
        </S.Right>
      </S.Paper>
      {extras}
    </S.Overlay>,
    document.body,
  )
}
