// 이모지(특히 국기)를 캔버스에 "그릴 때만" Twemoji 이미지로 치환한다.
// ── 왜 필요한가 ──
//  Windows 기본 이모지 폰트(Segoe UI Emoji)에는 국기 글리프가 없어서 🇪🇨 → 'EC' 처럼
//  알파벳 두 글자로 떨어진다(OS 한계, 이 앱만의 문제 아님). 데이터(문자열)는 유니코드 그대로
//  두고, fillText 로 그리는 "순간에만" 이모지 구간을 이미지로 바꿔 그린다. → 복사/저장/검색은
//  전부 텍스트, 화면 픽셀만 이미지. 오프라인/이미지 실패 시엔 원래 글자로 폴백(=지금과 동일).
import { markDirty } from '../store'

// Twemoji(유지보수 포크) 72px PNG. jsdelivr는 CORS(*) 라 캔버스가 오염되지 않음(export 안전).
const BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/'

const RI = /\p{Regional_Indicator}/u // 국기(지역표시문자)
const PICTO = /\p{Extended_Pictographic}/u // 일반 이모지
const hasEmoji = (s: string) => RI.test(s) || PICTO.test(s)

// ── 플랫폼 기능 감지 ──
// 이 OS가 국기 이모지를 native로 그릴 수 있나? (Mac/iOS/안드 = 가능, Windows = 불가)
// 작은 캔버스에 🇨🇦(빨강 포함)를 그려보고 컬러 픽셀이 있으면 native 지원. 'CA' 글자면 흑백뿐.
// → 지원되면 Twemoji 치환을 끄고 native 렌더 그대로(다운로드·스타일 변경 없음).
let _native: boolean | null = null
export function supportsNativeEmoji(): boolean {
  if (_native !== null) return _native
  try {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 24
    const c = cv.getContext('2d', { willReadFrequently: true })!
    c.fillStyle = '#000'
    c.textBaseline = 'top'
    c.font = '20px sans-serif'
    c.fillText('🇨🇦', 0, 0)
    const d = c.getImageData(0, 0, 24, 24).data
    _native = false
    for (let i = 0; i < d.length; i += 4) {
      // 빨강(국기) 픽셀: r 높고 g·b 낮음. 폴백 'CA' 글자(검정)면 안 걸림.
      if (d[i + 3] > 0 && d[i] > 100 && d[i + 1] < 90 && d[i + 2] < 90) {
        _native = true
        break
      }
    }
  } catch {
    _native = false // 감지 실패 시 안전하게 폴백 켬
  }
  return _native
}

type Seg = { emoji: false; t: string } | { emoji: true; code: string; raw: string }

// 그래핌 단위 분리(국기=코드포인트 2개가 한 글자로 합쳐짐). Intl.Segmenter 없으면 코드포인트 단위 폴백.
// (타입 lib에 Segmenter 정의가 없을 수 있어 any 로 접근)
let _seg: { segment(s: string): Iterable<{ segment: string }> } | null = null
function graphemes(s: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => typeof _seg }).Segmenter
  if (Seg) {
    _seg = _seg || new Seg(undefined, { granularity: 'grapheme' })
    return [..._seg!.segment(s)].map((x) => x.segment)
  }
  return Array.from(s)
}

const isEmojiGrapheme = (g: string) => RI.test(g) || PICTO.test(g)

// Twemoji 파일명 규칙: 코드포인트 hex를 '-'로 잇기. ZWJ 없는 클러스터는 U+FE0F(표현 셀렉터) 제거.
function toCodePoint(g: string): string {
  const base = g.indexOf('‍') < 0 ? g.replace(/️/g, '') : g
  const out: string[] = []
  for (const ch of base) out.push(ch.codePointAt(0)!.toString(16))
  return out.join('-')
}

// ── DOM 텍스트용 컬러 이모지 웹폰트 ──
// 캔버스는 위 Twemoji 이미지로 처리하지만, DOM(메모 textarea·입력칸·제목)은 시스템 폰트로 그려져
// Windows에선 국기가 'DE'로 깨진다. native 지원이 없을 때만 Noto Color Emoji 웹폰트를 주입한다.
// (font-family 스택엔 항상 들어있고, @font-face 링크는 필요할 때만 받음 → Mac은 다운로드 0.)
export function ensureEmojiFont(): void {
  if (typeof document === 'undefined') return
  if (supportsNativeEmoji()) return // Mac/모바일 = native → 웹폰트 불필요
  if (document.getElementById('noto-color-emoji')) return
  const link = document.createElement('link')
  link.id = 'noto-color-emoji'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap'
  document.head.appendChild(link)
}

// 문자열 → 텍스트/이모지 세그먼트(연속 텍스트는 한 덩어리로 합침). 같은 문자열은 캐시.
const segCache = new Map<string, Seg[]>()
function segment(text: string): Seg[] {
  const hit = segCache.get(text)
  if (hit) return hit
  const out: Seg[] = []
  let buf = ''
  for (const g of graphemes(text)) {
    if (isEmojiGrapheme(g)) {
      if (buf) (out.push({ emoji: false, t: buf }), (buf = ''))
      out.push({ emoji: true, code: toCodePoint(g), raw: g })
    } else buf += g
  }
  if (buf) out.push({ emoji: false, t: buf })
  if (segCache.size > 2000) segCache.clear()
  segCache.set(text, out)
  return out
}

// 이모지 이미지 캐시. undefined=미요청, null=로딩중/실패(폴백). 로드 완료 시 markDirty로 재렌더.
const imgCache = new Map<string, HTMLImageElement | null>()
function emojiImg(code: string): HTMLImageElement | null {
  const hit = imgCache.get(code)
  if (hit !== undefined) return hit
  imgCache.set(code, null)
  const im = new Image()
  im.crossOrigin = 'anonymous'
  im.onload = () => {
    imgCache.set(code, im)
    markDirty()
  }
  im.onerror = () => imgCache.set(code, null) // 실패 → null 유지(텍스트 폴백)
  im.src = BASE + code + '.png'
  return null
}

// 이모지는 정사각형 박스로 그린다(폭 = 글자 높이에 맞춤).
const EMOJI_W = 1.1 // fontPx 대비 가로폭
const EMOJI_YOFF = -0.06 // textBaseline='top' 기준 살짝 위로

/** fillRich/measureRich 가 쓰는 세그먼트 폭 합. 이모지는 정사각형 폭으로 계산(자체 일관성 유지). */
function widthOf(ctx: CanvasRenderingContext2D, segs: Seg[], fontPx: number): number {
  const es = fontPx * EMOJI_W
  let w = 0
  for (const s of segs) w += s.emoji ? es : ctx.measureText(s.t).width
  return w
}

/** 이모지 포함 가능성이 있는 텍스트의 그릴 폭(배지 배경 크기 등에 사용). */
export function measureRich(ctx: CanvasRenderingContext2D, text: string, fontPx: number): number {
  if (supportsNativeEmoji() || !hasEmoji(text)) return ctx.measureText(text).width
  return widthOf(ctx, segment(text), fontPx)
}

/**
 * ctx.fillText 대체. 이모지가 없으면 그대로 fillText(빠른 경로).
 * 있으면 텍스트 구간은 fillText, 이모지 구간은 Twemoji 이미지로 그린다.
 * 현재 ctx.textAlign(left/center/right)·fillStyle·font 를 존중. textBaseline 은 'top' 가정(모든 호출부가 top).
 */
export function fillRich(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontPx: number,
): void {
  if (supportsNativeEmoji() || !hasEmoji(text)) {
    ctx.fillText(text, x, y) // native 지원(Mac/모바일) 또는 이모지 없음 → 그대로
    return
  }
  const segs = segment(text)
  const align = ctx.textAlign
  const total = widthOf(ctx, segs, fontPx)
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x
  const es = fontPx * EMOJI_W
  const ey = y + fontPx * EMOJI_YOFF
  const savedAlign = ctx.textAlign
  ctx.textAlign = 'left' // 세그먼트는 좌→우로 직접 배치
  for (const s of segs) {
    if (s.emoji) {
      const im = emojiImg(s.code)
      if (im) ctx.drawImage(im, cx, ey, es, es)
      else ctx.fillText(s.raw, cx, y) // 로딩 전/실패: 원래 글자(국기는 'EC'로 폴백)
      cx += es
    } else {
      ctx.fillText(s.t, cx, y)
      cx += ctx.measureText(s.t).width
    }
  }
  ctx.textAlign = savedAlign
}
