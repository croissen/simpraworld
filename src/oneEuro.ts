// 손떨림 보정(stabilizer) — One-Euro 필터.
// 원리: 느리게 움직일 땐 강하게 다듬고(손떨림·삐뚤함 제거), 빠르게 그을 땐 지연을 거의 안 줘
//       라인이 펜을 늦게 따라오는 느낌 없이 반응. 손글씨 체감이 가장 좋은 방식.
// 참고: Casiez et al. "1€ Filter". x·y 축을 각각 독립 필터링.

export type Stabilizer = {
  reset: () => void
  /** raw 입력점(월드/콘텐츠 좌표) + 이벤트 시각(ms) → 다듬어진 점 */
  filter: (x: number, y: number, tMs: number) => { x: number; y: number }
}

// cutoff(Hz)와 dt(초)로 저역통과 계수 α 계산.
const alpha = (cutoff: number, dt: number) => {
  const tau = 1 / (2 * Math.PI * cutoff)
  return 1 / (1 + tau / dt)
}

function makeOneEuro(minCutoff: number, beta: number, dCutoff = 1): Stabilizer {
  let xPrev: number | null = null
  let yPrev = 0
  let dxPrev = 0
  let dyPrev = 0
  let tPrev = 0
  return {
    reset() {
      xPrev = null
      dxPrev = 0
      dyPrev = 0
    },
    filter(x, y, t) {
      // 첫 점은 그대로 통과(기준점 시딩).
      if (xPrev === null) {
        xPrev = x
        yPrev = y
        tPrev = t
        return { x, y }
      }
      let dt = (t - tPrev) / 1000
      if (!(dt > 0)) dt = 1 / 120 // 같은 타임스탬프/역행 방어
      tPrev = t
      // 속도(미분) 추정 → 저역통과 → 그 크기로 cutoff를 키움(빠를수록 지연↓).
      const dx = (x - xPrev) / dt
      const dy = (y - yPrev) / dt
      const ad = alpha(dCutoff, dt)
      dxPrev = ad * dx + (1 - ad) * dxPrev
      dyPrev = ad * dy + (1 - ad) * dyPrev
      const speed = Math.hypot(dxPrev, dyPrev)
      const cutoff = minCutoff + beta * speed
      const a = alpha(cutoff, dt)
      xPrev = a * x + (1 - a) * xPrev
      yPrev = a * y + (1 - a) * yPrev
      return { x: xPrev, y: yPrev }
    },
  }
}

// 강도 1~5 → (minCutoff, beta). minCutoff↓ = 더 매끄럽고 지연↑. beta = 속도 적응(빠를 때 반응).
const LEVELS: ReadonlyArray<{ mc: number; b: number }> = [
  { mc: 2.6, b: 0.008 }, // 1: 아주 약하게
  { mc: 1.6, b: 0.007 }, // 2
  { mc: 1.0, b: 0.006 }, // 3
  { mc: 0.6, b: 0.005 }, // 4
  { mc: 0.35, b: 0.004 }, // 5: 강하게
]

const PASSTHROUGH: Stabilizer = { reset() {}, filter: (x, y) => ({ x, y }) }

/** 강도(0~5)에 맞는 스태빌라이저 생성. 0이면 원본 그대로(무보정). 획 시작마다 새로 만든다. */
export function makeStabilizer(level: number): Stabilizer {
  const l = Math.round(level)
  if (l <= 0) return PASSTHROUGH
  const { mc, b } = LEVELS[Math.min(5, l) - 1]
  return makeOneEuro(mc, b)
}
