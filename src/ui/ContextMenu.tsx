import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  addPhoto,
  closeContextMenu,
  copySelection,
  duplicateSelection,
  duplicateSelectionBound,
  getContextMenu,
  getNode,
  hasClipboard,
  importWorld,
  pasteClipboardAt,
  reorderPlacement,
  selectionCount,
  storePlacement,
  uniqueCopySelection,
} from '../store'
import { exportSelectionOrSpace } from '../currentFile'
import { fileToImage } from '../image'
import { importSmk, pickSmkFile } from '../smk'
import { useIsMobile } from '../useIsMobile'
import * as S from './ContextMenu.styles'

// 캔버스 우클릭 메뉴(피그마식). 항목은 대상 노드/클립보드 유무에 따라 가변.
export default function ContextMenu({
  onRequestDelete,
  onCreateComponent,
}: {
  onRequestDelete: () => void
  onCreateComponent: () => void
}) {
  const cm = getContextMenu()
  const isMobile = useIsMobile()

  // 붙여넣기: 내부 클립보드 우선, 없으면 OS 클립보드의 사진을 커서 위치에
  async function pasteHere(wx: number, wy: number) {
    if (hasClipboard()) {
      pasteClipboardAt(wx, wy)
      return
    }
    try {
      const items = await navigator.clipboard.read()
      for (const it of items) {
        const type = it.types.find((t) => t.startsWith('image/'))
        if (type) {
          const blob = await it.getType(type)
          addPhoto(await fileToImage(blob), wx, wy)
          return
        }
      }
    } catch {
      /* 클립보드 권한 없음/미지원 → 무시 */
    }
  }

  // .smk 가져오기 → 현재 공간의 우클릭 자리에 배치
  async function importHere(wx: number, wy: number) {
    const file = await pickSmkFile()
    if (!file) return
    try {
      importWorld(await importSmk(file), { x: wx, y: wy })
    } catch (e) {
      alert('Import failed: ' + (e as Error).message)
    }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  if (!cm) return null

  const node = cm.nodeId ? getNode(cm.nodeId) : undefined
  const run = (fn: () => void) => () => {
    fn()
    closeContextMenu()
  }

  // 보일 항목 수로 대략적 높이 추정 → 화면 밖으로 안 나가게 클램프 (Paste here는 항상 표시)
  const rows = (node ? 8 : 0) + 2
  const left = Math.min(cm.x, window.innerWidth - 200)
  const top = Math.min(cm.y, window.innerHeight - (rows * 34 + 24))

  return createPortal(
    <S.Overlay onClick={closeContextMenu} onContextMenu={(e) => (e.preventDefault(), closeContextMenu())}>
      <S.Menu style={{ left, top }} onClick={(e) => e.stopPropagation()}>
        {node && (
          <S.Item
            onClick={run(isMobile ? duplicateSelection : copySelection)}
            title={isMobile ? 'Duplicate right here' : 'Copy (paste with Ctrl+V or right-click)'}
          >
            {selectionCount() > 1 ? `Copy (${selectionCount()})` : 'Copy'}
          </S.Item>
        )}
        {node && (
          <S.Item
            onClick={run(isMobile ? duplicateSelectionBound : uniqueCopySelection)}
            title="Bound copy — edits/deletes apply to every placement together"
          >
            Unique copy
          </S.Item>
        )}
        {!isMobile && <S.Item onClick={run(() => pasteHere(cm.wx, cm.wy))}>Paste here</S.Item>}
        <S.Item onClick={run(() => importHere(cm.wx, cm.wy))} title="Import a .smk into this space (here)">
          ⤒ Import
        </S.Item>

        {node && (
          <>
            <S.Sep />
            <S.Item onClick={run(() => cm.pid && reorderPlacement(cm.pid, 'front'))}>
              Bring to front
            </S.Item>
            <S.Item onClick={run(() => cm.pid && reorderPlacement(cm.pid, 'back'))}>
              Send to back
            </S.Item>
            <S.Item
              onClick={run(() => cm.pid && storePlacement(cm.pid))}
              title="Hide from canvas in this universe — keep in library (PC/Mobile independent)"
            >
              {selectionCount() > 1 ? `Store in library (${selectionCount()})` : 'Store in library'}
            </S.Item>
            <S.Item onClick={run(onCreateComponent)}>
              {selectionCount() > 1 ? `Create component (${selectionCount()})` : 'Create component'}
            </S.Item>
            <S.Item
              onClick={run(() => {
                exportSelectionOrSpace()
              })}
              title="Export the selected item(s) as a .spu file"
            >
              {selectionCount() > 1 ? `⤓ Export (${selectionCount()})` : '⤓ Export'}
            </S.Item>
            <S.Item $danger onClick={run(onRequestDelete)}>
              Delete
            </S.Item>
          </>
        )}
      </S.Menu>
    </S.Overlay>,
    document.body,
  )
}
