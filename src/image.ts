// 사진 처리 — 화질은 살리되(512px) 캔버스 렉은 막는다.
// thumb: 캔버스 렌더용(긴 변 512, PNG) — 투명도(배경 제거 PNG) 유지
// original: 선택적 원본 보관 (상세보기/내보내기용)

const THUMB_MAX = 2048 // 사진 화질 유지(긴 변 2048까지). 너무 큰 원본만 캡.

export interface ProcessedImage {
  thumb: string
  original: string
  mime: string
  w: number // 썸네일 가로(px) — 노드 비율 계산용
  h: number // 썸네일 세로(px)
}

export function fileToImage(file: File | Blob): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const original = reader.result as string
      const img = new Image()
      img.onerror = () => reject(new Error('image decode failed'))
      img.onload = () => {
        const scale = Math.min(1, THUMB_MAX / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        const thumb = canvas.toDataURL('image/png') // PNG = 투명도 유지
        resolve({ thumb, original, mime: 'image/png', w, h })
      }
      img.src = original
    }
    reader.readAsDataURL(file)
  })
}

export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}
