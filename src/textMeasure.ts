// 텍스트 개체 크기/줄바꿈 계산(월드 단위). 캔버스 렌더의 글꼴/패딩과 동일하게 맞춤.
// ── 성능: 결과를 (내용/글꼴/폭) 키로 캐싱한다. 줄바꿈 결과는 줌/팬과 무관(폭이 월드 고정)이라
//    팬·줌 중 매 프레임 재계산 없이 캐시 히트 → measureText 반복(글자당 1회) 폭발을 막는다.
let mctx: CanvasRenderingContext2D | null = null

type TextLike = { body?: string; fontSize?: number; bold?: boolean; wrap?: boolean }

const PAD = 8 // 좌우/상하 패딩(렌더의 4px*2)

function ctxFor(n: TextLike): CanvasRenderingContext2D | null {
  if (!mctx) mctx = document.createElement('canvas').getContext('2d')
  if (mctx) mctx.font = `${n.bold ? '700 ' : ''}${n.fontSize || 20}px system-ui, sans-serif`
  return mctx
}

// ── 캐시 (내용이 바뀌면 키가 달라져 자동 무효화). 폭주 방지로 상한 넘으면 통째로 비운다. ──
const CACHE_MAX = 4000
const wrapCache = new Map<string, string[]>()
const measureCache = new Map<string, { w: number; h: number }>()
function memo<T>(map: Map<string, T>, key: string, compute: () => T): T {
  const hit = map.get(key)
  if (hit !== undefined) return hit
  const val = compute()
  if (map.size >= CACHE_MAX) map.clear()
  map.set(key, val)
  return val
}

/** 고정 폭(maxWidth, 월드)에서 글자 단위로 줄바꿈한 줄 목록. 명시적 \n도 유지. */
export function wrapLines(n: TextLike, maxWidth: number): string[] {
  const key = `${n.bold ? 1 : 0}|${n.fontSize || 20}|${Math.round(maxWidth)}|${n.body || ''}`
  return memo(wrapCache, key, () => {
    const c = ctxFor(n)
    const out: string[] = []
    for (const para of (n.body || '').split('\n')) {
      if (para === '') {
        out.push('')
        continue
      }
      let line = ''
      for (const ch of Array.from(para)) {
        if (line && c && c.measureText(line + ch).width > maxWidth) {
          out.push(line)
          line = ch
        } else {
          line += ch
        }
      }
      out.push(line)
    }
    return out
  })
}

/** 캔버스에 그릴 줄 목록(wrap이면 줄바꿈, 아니면 \n 분리). */
export function textLines(n: TextLike, boxW: number): string[] {
  if (n.wrap) return wrapLines(n, Math.max(1, boxW - PAD))
  return (n.body || '').split('\n')
}

/** 비-wrap: 내용에 꼭 맞는 최소 박스 크기(월드). */
export function measureTextNode(n: TextLike): { w: number; h: number } {
  const key = `${n.bold ? 1 : 0}|${n.fontSize || 20}|${n.body || ''}`
  return memo(measureCache, key, () => {
    const c = ctxFor(n)
    const lines = (n.body || '').split('\n')
    let maxW = 0
    if (c) for (const l of lines) maxW = Math.max(maxW, c.measureText(l || ' ').width)
    const lineH = (n.fontSize || 20) * 1.25
    return { w: Math.ceil(maxW) + PAD, h: Math.ceil(lines.length * lineH) + PAD }
  })
}

/** wrap: 주어진 박스 폭에서 줄바꿈 후 필요한 높이(월드). */
export function wrappedHeight(n: TextLike, boxW: number): number {
  const lines = wrapLines(n, Math.max(1, boxW - PAD))
  const lineH = (n.fontSize || 20) * 1.25
  return Math.ceil(lines.length * lineH) + PAD
}
