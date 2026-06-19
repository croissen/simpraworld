// .smk = SimpraWorld MaKe = ZIP( data.json + images/ )
// 구조(JSON)와 사진을 분리 저장하므로 그대로 ZIP에 담으면 됨.

import JSZip from 'jszip'
import { get, set, del } from 'idb-keyval'
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

/** 현재 문서 → .smk Blob */
export async function exportSmk(doc: SimpraWorldDoc): Promise<Blob> {
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

/** .smk 파일 → 문서 (이미지 다시 dataURL로 복원) */
export async function importSmk(file: File | Blob): Promise<SimpraWorldDoc> {
  const zip = await JSZip.loadAsync(file)
  const jsonFile = zip.file('data.json')
  if (!jsonFile) throw new Error('data.json 없음 — 올바른 .smk 파일이 아닙니다')
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
 * .smk 저장. 지원 브라우저(크롬/엣지 PC)는 "다른 이름으로 저장" 다이얼로그(파일명+위치)를,
 * 미지원(사파리/모바일)은 다운로드로 처리. 반환값 = 저장된 위치 설명('' = 취소).
 * 다이얼로그는 클릭 직후 호출돼야 하므로(브라우저 제약) blob 생성보다 "먼저" 연다.
 * makeBlob: 무거운 zip 생성을 다이얼로그 연 뒤로 미루는 팩토리.
 */
export async function saveSmk(suggestedName: string, makeBlob: () => Promise<Blob>): Promise<string> {
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

export function downloadBlob(blob: Blob, filename: string) {
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

/** 같은 파일 덮어쓰기를 지원하는 환경인지(크롬/엣지 PC). */
export function supportsFileSave(): boolean {
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

/** 같은 파일 열기(쓰기 가능한 핸들)를 지원하는 환경인지. */
export function supportsFileOpen(): boolean {
  return typeof (window as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker === 'function'
}

/** "열기" 다이얼로그로 .spu 파일을 골라 (이후 Save로 덮어쓸 수 있는) 핸들을 받는다. 취소=null. */
export async function pickOpenHandle(): Promise<FileSystemFileHandle | null> {
  const w = window as unknown as {
    showOpenFilePicker: (o: unknown) => Promise<FileSystemFileHandle[]>
  }
  try {
    const [h] = await w.showOpenFilePicker({
      types: [{ description: 'SimpraWorld file', accept: { 'application/octet-stream': ['.spu', '.smk'] } }],
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

export function pickSmkFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.spu,.smk,application/zip' // 기존 .smk 백업도 열 수 있게
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}
