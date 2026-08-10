// 파일(이미지·.spu 등) 공유/저장 — 플랫폼별로 갈라 처리.
//  - 네이티브(안드/iOS): WebView는 <a download> blob 저장이 안 됨 → 임시파일로 쓰고
//    시스템 공유 시트(사진/파일에 저장·다른 앱 공유)를 띄운다.
//  - 웹/PC: 이 함수는 false를 반환 → 호출부가 기존 <a download> 폴백을 쓴다.
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Media } from '@capacitor-community/media'

// Blob → data URL("data:...;base64,...")
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}
// Blob → base64(순수, data: 접두어 제거). Filesystem.writeFile는 base64 문자열을 받음.
async function blobToBase64(blob: Blob): Promise<string> {
  const s = await blobToDataUrl(blob)
  return s.slice(s.indexOf(',') + 1)
}

/**
 * 이미지를 공유/저장. 네이티브면 시스템 공유 시트로 처리하고 true, 웹이면 아무것도 안 하고 false.
 * @returns 네이티브에서 처리했으면 true(호출부는 추가 다운로드 불필요), 웹이면 false.
 */
export async function shareFileNative(blob: Blob, filename: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  const safe = filename.replace(/[/\\?%*:|"<>]/g, '_') // 파일경로 안전화
  const base64 = await blobToBase64(blob)
  const written = await Filesystem.writeFile({ path: safe, data: base64, directory: Directory.Cache })
  const uri = written.uri || (await Filesystem.getUri({ path: safe, directory: Directory.Cache })).uri
  try {
    await Share.share({ title: filename, url: uri, files: [uri] })
  } catch (e) {
    // 사용자가 공유 시트를 닫으면(취소) 예외가 나는데 이는 정상 → 그 외만 다시 던짐.
    const msg = (e as { message?: string }).message ?? ''
    if (!/cancel|abort|dismiss/i.test(msg)) throw e
  }
  return true
}

/**
 * 이미지를 기기 갤러리(사진 앱)에 직접 저장. 네이티브(안드/iOS) 전용.
 * 안드로이드는 MediaStore에 넣어 갤러리에 바로 뜨고, 자기 앱이 만든 이미지라 별도 권한 불필요(API 29+).
 */
export async function saveImageToGallery(blob: Blob, filename: string): Promise<void> {
  const dataUrl = await blobToDataUrl(blob) // savePhoto는 base64 data URI도 path로 받음
  await Media.savePhoto({ path: dataUrl, fileName: filename })
}

/**
 * 일반 파일(.spu 등)을 기기 Documents 폴더에 저장 → 파일앱에서 찾고 재-Import 가능.
 * 반환: 사용자에게 보여줄 저장 위치 문자열.
 */
export async function saveFileToDocuments(blob: Blob, filename: string): Promise<string> {
  const safe = filename.replace(/[/\\?%*:|"<>]/g, '_')
  const base64 = await blobToBase64(blob)
  await Filesystem.writeFile({ path: safe, data: base64, directory: Directory.Documents, recursive: true })
  return `Documents/${safe}`
}
