// .spu = SimpraWorld Universe = ZIP( data.json + images/ )
// 구조(JSON)와 사진을 분리 저장하므로 그대로 ZIP에 담으면 됨.

import JSZip from 'jszip'
import { get, set, del } from 'idb-keyval'
import { Capacitor } from '@capacitor/core'
import { FilePicker } from '@capawesome/capacitor-file-picker'
import { saveToDownloads, shareFileNative } from './nativeShare'
import { emptyDoc } from './types'
import type { SimpraWorldDoc } from './types'

function dataUrlToParts(dataUrl: string): { mime: string; base64: string } {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl)
  if (!m) return { mime: 'application/octet-stream', base64: '' }
  return { mime: m[1], base64: m[2] }
}

function extFromMime(mime: string): string {
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  return 'jpg'
}

/** 현재 문서 → .spu Blob */
export async function exportSpu(doc: SimpraWorldDoc): Promise<Blob> {
  const zip = new JSZip()
  const imagesDir = zip.folder('images')!

  // JSON에는 파일명만 남기고 실제 이미지는 images/ 로 분리
  const slim: SimpraWorldDoc = {
    ...doc,
    assets: doc.assets.map((a) => {
      const { mime, base64 } = dataUrlToParts(a.thumb)
      const file = `${a.id}.${extFromMime(mime)}`
      if (base64) imagesDir.file(file, base64, { base64: true })
      return { ...a, thumb: `images/${file}`, original: undefined }
    }),
  }
  zip.file('data.json', JSON.stringify(slim, null, 2))
  // MIME을 application/zip(기본)으로 두면 모바일 브라우저가 ".spu" 뒤에 ".zip"을 덧붙임.
  // octet-stream(일반 바이너리)으로 내보내 확장자 보정을 막는다.
  return zip.generateAsync({ type: 'blob', mimeType: 'application/octet-stream' })
}

/** .spu 파일 → 문서 (이미지 다시 dataURL로 복원) */
export async function importSpu(file: File | Blob): Promise<SimpraWorldDoc> {
  const zip = await JSZip.loadAsync(file)
  const jsonFile = zip.file('data.json')
  if (!jsonFile) throw new Error('data.json 없음 — 올바른 .spu 파일이 아닙니다')
  const doc = JSON.parse(await jsonFile.async('string')) as SimpraWorldDoc
  const base = emptyDoc()
  const merged: SimpraWorldDoc = { ...base, ...doc }

  // images/ 안의 파일을 dataURL로 되살림
  for (const a of merged.assets) {
    if (a.thumb && a.thumb.startsWith('images/')) {
      const f = zip.file(a.thumb)
      if (f) {
        const b64 = await f.async('base64')
        a.thumb = `data:${a.mime || 'image/jpeg'};base64,${b64}`
      }
    }
  }
  return merged
}

/**
 * .spu 저장. 지원 브라우저(크롬/엣지 PC)는 "다른 이름으로 저장" 다이얼로그(파일명+위치)를,
 * 미지원(사파리/모바일)은 다운로드로 처리. 반환값 = 저장된 위치 설명('' = 취소).
 * 다이얼로그는 클릭 직후 호출돼야 하므로(브라우저 제약) blob 생성보다 "먼저" 연다.
 * makeBlob: 무거운 zip 생성을 다이얼로그 연 뒤로 미루는 팩토리.
 */
export async function saveSpu(suggestedName: string, makeBlob: () => Promise<Blob>): Promise<string> {
  const w = window as unknown as { showSaveFilePicker?: (o: unknown) => Promise<any> }
  if (w.showSaveFilePicker) {
    let handle: any = null
    try {
      handle = await w.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'SimpraWorld file', accept: { 'application/octet-stream': ['.spu'] } }],
      })
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return '' // 사용자가 취소
      handle = null // 그 외 오류 → 다운로드 폴백
    }
    if (handle) {
      const blob = await makeBlob()
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return handle.name as string
    }
  }
  downloadBlob(await makeBlob(), suggestedName)
  return `${suggestedName} (다운로드 폴더)`
}

export async function downloadBlob(blob: Blob, filename: string) {
  // 네이티브(앱): WebView가 <a download>를 못 함 + .spu는 공유 시트가 불안정 →
  // 기기 Documents 폴더에 직접 저장하고 위치를 알린다(파일앱에서 찾고 재-Import 가능).
  if (Capacitor.isNativePlatform()) {
    // 앱: 다운로드 폴더의 spu 하위폴더(Download/spu/)에 직접 저장.
    try {
      const where = await saveToDownloads(blob, filename)
      alert(`Saved to ${where}`)
    } catch (e) {
      // 안드11+ 스코프드 스토리지 등으로 Download 직접 쓰기가 막히면 → 공유 시트로 저장(Files/드라이브 등)
      try {
        await shareFileNative(blob, filename)
      } catch {
        alert('Save failed: ' + ((e as Error)?.message || 'unknown error'))
      }
    }
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// ── "현재 파일"(Save 대상) 파일 핸들 다루기 ─────────────────────────
// File System Access API(크롬/엣지 PC)에서만 같은 파일 덮어쓰기가 가능. 그 외는 다운로드 폴백.

/** 같은 파일 덮어쓰기를 지원하는 환경인지(크롬/엣지 PC).
 * ⚠️ 앱(네이티브)은 WebView가 showSaveFilePicker를 노출해도 실제론 안 되므로 무조건 false
 *    → 앱은 Download/spu 저장 경로를 타고, Save As 버튼도 숨긴다. */
export function supportsFileSave(): boolean {
  if (Capacitor.isNativePlatform()) return false
  return typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === 'function'
}

/** "다른 이름으로 저장" 다이얼로그를 띄워 파일 핸들을 받는다. 취소=null. (지원 환경에서만 호출) */
export async function pickSaveHandle(suggestedName: string): Promise<FileSystemFileHandle | null> {
  const w = window as unknown as { showSaveFilePicker: (o: unknown) => Promise<FileSystemFileHandle> }
  try {
    return await w.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'SimpraWorld file', accept: { 'application/octet-stream': ['.spu'] } }],
    })
  } catch (e) {
    if ((e as { name?: string }).name === 'AbortError') return null // 사용자가 취소
    throw e
  }
}

/** 핸들에 쓰기 권한이 있는지 확인하고, 없으면 한 번 요청한다. */
export async function ensureWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  const h = handle as unknown as {
    queryPermission?: (o: unknown) => Promise<PermissionState>
    requestPermission?: (o: unknown) => Promise<PermissionState>
  }
  const opts = { mode: 'readwrite' }
  if ((await h.queryPermission?.(opts)) === 'granted') return true
  if ((await h.requestPermission?.(opts)) === 'granted') return true
  return false
}

/** 같은 파일 열기(쓰기 가능한 핸들)를 지원하는 환경인지. 앱(네이티브)은 무조건 false. */
export function supportsFileOpen(): boolean {
  if (Capacitor.isNativePlatform()) return false
  return typeof (window as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker === 'function'
}

/** "열기" 다이얼로그로 .spu 파일을 골라 (이후 Save로 덮어쓸 수 있는) 핸들을 받는다. 취소=null. */
export async function pickOpenHandle(): Promise<FileSystemFileHandle | null> {
  const w = window as unknown as {
    showOpenFilePicker: (o: unknown) => Promise<FileSystemFileHandle[]>
  }
  try {
    const [h] = await w.showOpenFilePicker({
      types: [{ description: 'SimpraWorld file', accept: { 'application/octet-stream': ['.spu'] } }],
      multiple: false,
    })
    return h ?? null
  } catch (e) {
    if ((e as { name?: string }).name === 'AbortError') return null
    throw e
  }
}

/** 핸들이 가리키는 파일에 blob을 덮어쓴다. */
export async function writeHandle(handle: FileSystemFileHandle, blob: Blob): Promise<void> {
  const writable = await (handle as unknown as { createWritable: () => Promise<any> }).createWritable()
  await writable.write(blob)
  await writable.close()
}

const HANDLE_KEY = 'currentFileHandle'
/** 현재 파일 핸들을 IndexedDB에 보관(새로고침 후에도 같은 파일로 Save). PC 전용(모바일은 핸들 없음). */
export const persistHandle = (handle: FileSystemFileHandle) => set(HANDLE_KEY, handle)
export const loadPersistedHandle = () => get<FileSystemFileHandle>(HANDLE_KEY)
export const clearPersistedHandle = () => del(HANDLE_KEY)

const NAME_KEY = 'currentFileName'
/** 현재 파일'명'을 IndexedDB에 보관 — 핸들이 없는 모바일에서도 "현재 파일"을 기억하기 위함. */
export const persistFileName = (name: string) => set(NAME_KEY, name)
export const loadPersistedFileName = () => get<string>(NAME_KEY)
export const clearPersistedFileName = () => del(NAME_KEY)

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const buf = new ArrayBuffer(bin.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i)
  return buf
}

export async function pickSpuFile(): Promise<File | null> {
  // 네이티브 앱(Android/iOS): WebView가 SAF content:// 파일 바이트를 FileReader/arrayBuffer로
  // 못 읽어 NotFoundError가 나던 문제 회피 → 네이티브 파일 피커로 바이트를 직접 받아온다.
  // (웹/PC는 기존 <input type=file> 그대로 — 검증된 경로 유지.) iOS도 같은 코드로 동작.
  if (Capacitor.isNativePlatform()) {
    let picked
    try {
      picked = await FilePicker.pickFiles({ readData: true })
    } catch (e) {
      const msg = (e as { message?: string }).message ?? ''
      if (/cancel/i.test(msg)) return null // 사용자가 취소
      throw e
    }
    const f = picked.files?.[0]
    if (!f) return null
    const name = f.name || 'import.spu'
    const type = f.mimeType || 'application/octet-stream'
    if (f.blob) return new File([f.blob], name, { type }) // 웹 구현 경로(방어)
    if (f.data) return new File([base64ToArrayBuffer(f.data)], name, { type }) // 네이티브: base64 바이트
    return null
  }
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.spu,application/zip'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}
