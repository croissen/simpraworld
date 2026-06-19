// "현재 작업 중인 .spu 파일" 상태 — Save(덮어쓰기)/Save As(새 파일) 처리.
// 유니버스 전체(유니버스명·공간구조·요소·컴포넌트)를 통째로 저장한다.
// PC(크롬/엣지): 파일 핸들로 같은 파일에 덮어쓰기.
// 모바일/사파리: 파일 핸들(File System Access API) 미지원 → 파일 덮어쓰기가 불가능하므로
//   "현재 파일명"만 기억해 같은 이름으로 다시 다운로드한다(브라우저가 내려받기 폴더에 새로 저장).
//   ※ 유니버스 자체는 항상 IndexedDB에 자동 저장되므로 새로고침해도 작업은 보존됨.

import {
  exportFolderDoc,
  exportSpaceDoc,
  exportUniverseDoc,
  getCurrentSpace,
  getNode,
  getSelectedNode,
  getUniverseName,
  markSaved,
  newWorld,
  replaceWorld,
  selectionCount,
  selectionToDoc,
} from './store'
import {
  exportSmk,
  saveSmk,
  importSmk,
  downloadBlob,
  supportsFileSave,
  supportsFileOpen,
  pickSaveHandle,
  pickOpenHandle,
  pickSmkFile,
  ensureWritePermission,
  writeHandle,
  persistHandle,
  loadPersistedHandle,
  clearPersistedHandle,
  persistFileName,
  loadPersistedFileName,
  clearPersistedFileName,
} from './smk'

let handle: FileSystemFileHandle | null = null // PC 전용(모바일은 항상 null)
let fileName = '' // 현재 파일명('' = 아직 저장된 파일 없음) — PC/모바일 공통

// UI 구독(버튼 라벨/현재 파일명 표시용)
const listeners = new Set<() => void>()
let version = 0
export function subscribeFile(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}
export function getFileSnapshot() {
  return version
}
function notify() {
  version += 1
  listeners.forEach((l) => l())
}

export const getCurrentFileName = () => fileName
// PC는 핸들, 모바일은 기억된 파일명만으로도 "현재 파일"로 간주(라벨 표시).
export const hasCurrentFile = () => !!fileName

/** 현재 파일명 지정 + IndexedDB에 보관(모바일 새로고침 후에도 유지). */
function setFileName(name: string) {
  fileName = name
  notify()
  persistFileName(name).catch(() => {})
}

// 저장 직후 잠깐 true → "..." 버튼이 초록 체크로 바뀌는 신호(Ctrl+S/버튼 공통)
let justSaved = false
let savedTimer: ReturnType<typeof setTimeout> | null = null
export const getJustSaved = () => justSaved
function flashSaved() {
  markSaved() // 저장 성공 → "변경 없음" 상태로
  justSaved = true
  notify()
  if (savedTimer) clearTimeout(savedTimer)
  savedTimer = setTimeout(() => {
    justSaved = false
    notify()
  }, 1300)
}

function suggestedName() {
  return `${getUniverseName().trim() || 'My Universe'}.spu`
}

function makeBlob() {
  return exportSmk(exportUniverseDoc())
}

/** 앱 시작 시: 이전 세션의 파일 핸들(PC)·파일명(공통) 복원. */
export async function initCurrentFile() {
  try {
    const storedHandle = await loadPersistedHandle()
    if (storedHandle) {
      handle = storedHandle
      fileName = storedHandle.name
      notify()
      return
    }
    // 핸들이 없으면(모바일 등) 기억해 둔 파일명만 복원
    const storedName = await loadPersistedFileName()
    if (storedName) {
      fileName = storedName
      notify()
    }
  } catch {
    /* 무시 — 복원 실패 */
  }
}

/**
 * Save: 현재 파일이 있으면 그 파일에 덮어쓰기, 없으면 Save As로.
 * 반환: 저장 위치 설명('' = 취소).
 */
export async function saveUniverse(): Promise<string> {
  // PC: 핸들이 있으면 그 파일에 덮어쓰기
  if (handle) {
    const ok = await ensureWritePermission(handle)
    if (ok) {
      await writeHandle(handle, await makeBlob())
      flashSaved()
      return fileName
    }
    // 권한이 사라졌으면(다른 세션 등) Save As로 폴백
  }
  // 모바일: 덮어쓰기 불가 → 기억된 파일명이 있으면 같은 이름으로 다시 다운로드
  if (!supportsFileSave() && fileName) {
    downloadBlob(await makeBlob(), fileName)
    flashSaved()
    return `${fileName} (다운로드 폴더)`
  }
  return saveUniverseAs()
}

/**
 * Save As: 새 파일로 저장하고 그 파일을 "현재 파일"로 기억.
 * PC는 다이얼로그로 위치/이름 선택, 모바일은 유니버스명으로 다운로드.
 * 반환: 저장 위치 설명('' = 취소).
 */
export async function saveUniverseAs(): Promise<string> {
  const name = suggestedName()
  // 모바일/사파리: 다운로드 + 파일명 기억(다음 Save가 같은 이름으로)
  if (!supportsFileSave()) {
    downloadBlob(await makeBlob(), name)
    setFileName(name)
    flashSaved()
    return `${name} (다운로드 폴더)`
  }
  // PC: 다른 이름으로 저장 다이얼로그
  const h = await pickSaveHandle(name)
  if (!h) return '' // 취소
  await writeHandle(h, await makeBlob())
  handle = h
  setFileName(h.name)
  persistHandle(h).catch(() => {})
  flashSaved()
  return fileName
}

/**
 * Export: 선택 0개=현재 공간 전체 / 폴더 1개=그 폴더만 / 그 외(다중·메모·사진)=선택된 것만.
 * 유니버스 전체 저장(Save)과 달리 부분을 .spu로 내보낸다. 반환: 저장 위치('' = 취소).
 */
export async function exportSelectionOrSpace(): Promise<string> {
  const n = getSelectedNode()
  let out
  let filename
  if (selectionCount() === 0) {
    const space = getCurrentSpace()
    const name = space ? getNode(space)?.name ?? 'Space' : getUniverseName()
    out = exportSpaceDoc(space)
    filename = `${name.trim()}.spu`
  } else if (n && n.type === 'folder') {
    out = exportFolderDoc(n.id)
    filename = `${n.name.trim()}.spu`
  } else {
    out = selectionToDoc()
    filename = n ? `${n.name.trim()}.spu` : `selection-${selectionCount()}.spu`
  }
  return saveSmk(filename, () => exportSmk(out))
}

/**
 * 모바일 전용 저장: 입력한 이름으로 .spu 다운로드 + 그 이름을 "현재 파일"로 기억.
 * (모바일은 파일 덮어쓰기가 불가 → 이후 Save는 같은 이름으로 다시 다운로드)
 */
export async function saveUniverseNamed(rawName: string): Promise<string> {
  let name = rawName.trim() || getUniverseName().trim() || 'My Universe'
  if (!/\.spu$/i.test(name)) name += '.spu'
  downloadBlob(await makeBlob(), name)
  setFileName(name)
  flashSaved()
  return name
}

/**
 * Load: 다른 .spu 파일을 열어 현재 유니버스를 통째로 교체(병합 아님).
 * 지원 환경은 열린 파일을 "현재 파일"로 잡아 이후 Save가 그 파일에 덮어쓴다.
 * 미지원(사파리/모바일)은 읽기만 가능 → 현재 파일 연결은 해제(다음 Save는 Save As).
 * 반환: 열었으면 true, 취소/실패면 false.
 */
export async function openUniverseFile(): Promise<boolean> {
  try {
    if (supportsFileOpen()) {
      const h = await pickOpenHandle()
      if (!h) return false // 취소
      const file = await (h as unknown as { getFile: () => Promise<File> }).getFile()
      replaceWorld(await importSmk(file))
      handle = h
      setFileName(h.name)
      persistHandle(h).catch(() => {})
      return true
    }
    // 모바일: 파일 핸들은 못 잡지만 연 파일'명'은 기억 → 이후 Save가 같은 이름으로 다운로드
    const file = await pickSmkFile()
    if (!file) return false
    replaceWorld(await importSmk(file))
    handle = null
    setFileName(file.name)
    return true
  } catch (e) {
    alert('Open failed: ' + (e as Error).message)
    return false
  }
}

/** New: 빈 유니버스로 시작하고 현재 파일 연결도 해제(다음 Save는 Save As). */
export async function startNewUniverse() {
  newWorld()
  await forgetCurrentFile()
}

/** 현재 파일 연결 해제(필요 시). */
export async function forgetCurrentFile() {
  handle = null
  fileName = ''
  notify()
  await clearPersistedHandle().catch(() => {})
  await clearPersistedFileName().catch(() => {})
}
