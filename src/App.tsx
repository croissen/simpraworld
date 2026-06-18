import { useEffect, useState, useSyncExternalStore } from 'react'
import InfiniteCanvas from './canvas/InfiniteCanvas'
import Inspector from './ui/Inspector'
import Toolbar from './ui/Toolbar'
import Breadcrumb from './ui/Breadcrumb'
import ViewPanel from './ui/ViewPanel'
import ConfirmModal from './ui/ConfirmModal'
import NoteEditor from './ui/NoteEditor'
import ComponentsPanel from './ui/ComponentsPanel'
import ContextMenu from './ui/ContextMenu'
import PromptModal from './ui/PromptModal'
import type { ComponentDef } from './types'
import {
  addPhoto,
  copySelection,
  deleteComponent,
  deleteSelection,
  getCamera,
  getComponents,
  getComponentsOpen,
  getNoteEditorId,
  getPlacement,
  getSelectedComponentId,
  getSelection,
  getSnapshot,
  init,
  pasteClipboard,
  saveSelectionAsComponent,
  selectAll,
  selectionCount,
  setPlacementXY,
  subscribe,
  suggestComponentName,
} from './store'
import { fileToImage } from './image'
import { GlobalStyle } from './global.styles'
import * as S from './App.styles'

export default function App() {
  // 스토어 변경 시 UI 재렌더 (카메라 변경은 제외 → 캔버스만 갱신)
  useSyncExternalStore(subscribe, getSnapshot)
  const [delCount, setDelCount] = useState<number | null>(null) // 노드 삭제 확인(선택 N개)
  const [delComp, setDelComp] = useState<ComponentDef | null>(null)
  const [compName, setCompName] = useState<string | null>(null) // 컴포넌트 이름 입력 프롬프트

  useEffect(() => {
    init()
  }, [])

  // 선택 N개 삭제 요청(1개여도 확인). 컴포넌트 미리보기 선택은 별도.
  const requestDelete = () => {
    if (selectionCount() > 0) setDelCount(selectionCount())
  }
  // 컴포넌트 저장 → 이름 입력 프롬프트부터
  const requestCreateComponent = () => {
    if (selectionCount() > 0) setCompName(suggestComponentName())
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const tag = (el?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || el?.isContentEditable) return
      const ctrl = e.ctrlKey || e.metaKey

      // Ctrl+A 전체선택 / Ctrl+C 복사 / Ctrl+V 붙여넣기
      if (ctrl && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        selectAll()
        return
      }
      if (ctrl && (e.key === 'c' || e.key === 'C')) {
        if (selectionCount() > 0) {
          e.preventDefault()
          copySelection()
        }
        return
      }
      // Ctrl+V는 paste 이벤트에서 처리(OS 사진 vs 내부 클립보드 구분 위해 clipboardData 필요)

      // Delete/Backspace: 선택 항목 → 확인 모달 / 컴포넌트 미리보기 선택 → 컴포넌트 삭제
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectionCount() > 0) {
          e.preventDefault()
          requestDelete()
          return
        }
        const cid = getSelectedComponentId()
        if (cid) {
          e.preventDefault()
          const c = getComponents().find((x) => x.id === cid)
          if (c) setDelComp(c)
        }
        return
      }

      // 방향키 = 선택 항목 일괄 이동 (Shift=크게)
      const pids = getSelection()
      if (!pids.length) return
      const step = e.shiftKey ? 20 : 4
      let dx = 0
      let dy = 0
      if (e.key === 'ArrowLeft') dx = -step
      else if (e.key === 'ArrowRight') dx = step
      else if (e.key === 'ArrowUp') dy = -step
      else if (e.key === 'ArrowDown') dy = step
      else return
      e.preventDefault()
      for (const pid of pids) {
        const p = getPlacement(pid)
        if (p) setPlacementXY(pid, p.x + dx, p.y + dy)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Ctrl+V: OS 클립보드에 사진이 있으면 사진 노드 생성, 아니면 내부 클립보드 붙여넣기
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const tag = (el?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || el?.isContentEditable) return // 입력칸은 기본 붙여넣기
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'))
      if (item) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const img = await fileToImage(file)
          const c = getCamera()
          addPhoto(img, c.x, c.y)
        }
        return
      }
      pasteClipboard() // 사진 없으면 내부 노드 붙여넣기
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  const selCount = selectionCount()
  const noteId = getNoteEditorId()

  return (
    <S.AppRoot>
      <GlobalStyle />
      <S.Top>
        <S.Brand>SimpraWorld</S.Brand>
        <Breadcrumb />
        <Toolbar />
      </S.Top>
      <InfiniteCanvas />
      {getComponentsOpen() && <ComponentsPanel onRequestDelete={setDelComp} />}
      {selCount > 0 ? (
        <Inspector onRequestDelete={requestDelete} onCreateComponent={requestCreateComponent} />
      ) : (
        <ViewPanel />
      )}
      {noteId && <NoteEditor nodeId={noteId} />}
      <ContextMenu onRequestDelete={requestDelete} onCreateComponent={requestCreateComponent} />
      {delCount !== null && (
        <ConfirmModal
          message={delCount > 1 ? `Delete ${delCount} items?` : 'Delete selected item?'}
          onConfirm={() => {
            deleteSelection()
            setDelCount(null)
          }}
          onCancel={() => setDelCount(null)}
        />
      )}
      {delComp && (
        <ConfirmModal
          message={`Delete component "${delComp.name}"?`}
          onConfirm={() => {
            deleteComponent(delComp.id)
            setDelComp(null)
          }}
          onCancel={() => setDelComp(null)}
        />
      )}
      {compName !== null && (
        <PromptModal
          title="Component name"
          initial={compName}
          onSubmit={(name) => {
            saveSelectionAsComponent(name)
            setCompName(null)
          }}
          onCancel={() => setCompName(null)}
        />
      )}
      <S.Hint>
        Drag empty = select box · Space/middle-drag = pan · Wheel = zoom · Shift-click = multi ·
        Ctrl+A/C/V · Double-click folder = open · Drag onto folder = move in · Ctrl+Alt-click/drag =
        connect line
      </S.Hint>
    </S.AppRoot>
  )
}
