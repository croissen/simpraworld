import { Capacitor } from '@capacitor/core'
import { FilePicker } from '@capawesome/capacitor-file-picker'

// 이미지 처리 — 용량을 잡으려고 WebP로 다운스케일(투명도 유지). 원본(풀해상도)은 저장하지 않음.
//  - 사진 개체: 긴 변 PHOTO_MAX
//  - 노트/폴더 아이콘: 긴 변 ICON_MAX (작게 = 가벼움)

// 사진: 원본 해상도 유지(아주 큰 것만 안전상 캡) + 고품질. 노트/폴더 아이콘: 작게.
export const PHOTO_MAX = 2400 // 사진 안전 상한(대부분 원본 그대로)
export const ICON_MAX = 256 // 노트/폴더 아이콘용
export const PHOTO_Q = 0.92 // 사진 품질(거의 무손실)
export const ICON_Q = 0.82 // 아이콘 품질

export interface ProcessedImage {
  thumb: string // dataURL (WebP, 미지원 시 PNG 폴백)
  mime: string
  w: number // 썸네일 가로(px) — 노드 비율 계산용
  h: number // 썸네일 세로(px)
}

// 캔버스를 WebP(투명도 지원·고압축)로, 미지원 브라우저는 PNG로 인코딩
function encode(canvas: HTMLCanvasElement, quality: number): { url: string; mime: string } {
  const webp = canvas.toDataURL('image/webp', quality)
  if (webp.startsWith('data:image/webp')) return { url: webp, mime: 'image/webp' }
  return { url: canvas.toDataURL('image/png'), mime: 'image/png' } // 폴백(투명도 유지)
}

export function fileToImage(
  file: File | Blob,
  maxPx: number = PHOTO_MAX,
  quality: number = PHOTO_Q,
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('image decode failed'))
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height, 1))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        const { url, mime } = encode(canvas, quality)
        resolve({ thumb: url, mime, w, h })
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const buf = new ArrayBuffer(bin.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i)
  return buf
}

export async function pickImageFile(): Promise<File | null> {
  // 네이티브 앱(Android/iOS): WebView가 고른 파일 바이트를 FileReader로 못 읽는 문제 회피 →
  // 네이티브 이미지 피커로 바이트를 직접 받아 인메모리 File로 만든다. (웹/PC는 기존 <input>)
  if (Capacitor.isNativePlatform()) {
    let picked
    try {
      picked = await FilePicker.pickImages({ readData: true })
    } catch (e) {
      const msg = (e as { message?: string }).message ?? ''
      if (/cancel/i.test(msg)) return null // 사용자 취소
      throw e
    }
    const f = picked.files?.[0]
    if (!f) return null
    const name = f.name || 'photo.jpg'
    const type = f.mimeType || 'image/jpeg'
    if (f.blob) return new File([f.blob], name, { type })
    if (f.data) return new File([base64ToArrayBuffer(f.data)], name, { type })
    return null
  }
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}
