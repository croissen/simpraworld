import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  addPhoto,
  beginSpineFor,
  closeContextMenu,
  copySelection,
  duplicateSelection,
  duplicateSelectionBound,
  flipSelection,
  getContextMenu,
  getNode,
  groupSelection,
  hasClipboard,
  importWorld,
  isSpined,
  pasteClipboardAt,
  reorderPlacement,
  selectionCount,
  selectionGrouped,
  storePlacement,
  ungroupSelection,
  unspine,
  uniqueCopySelection,
} from '../store'
import { exportSelectionOrSpace } from '../currentFile'
import { fileToImage } from '../image'
import { importSpu, pickSpuFile } from '../spu'
import { useIsTouch } from '../useIsMobile'
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
  const isMobile = useIsTouch() // 앱(네이티브)·터치 = 모바일 동작(Copy=즉시 복제, Paste 숨김). BlueStacks도 앱이면 여기.

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

  // .spu 가져오기 → 현재 공간의 우클릭 자리에 배치
  async function importHere(wx: number, wy: number) {
    const file = await pickSpuFile()
    if (!file) return
    try {
      importWorld(await importSpu(file), { x: wx, y: wy })
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

  // 보일 항목 수로 대략적 높이 추정 → 화면 안에 안정적으로 (짧은 가로화면에선 최대높이로 캡되고 스크롤).
  const rows = (node ? 8 : 0) + 2
  const vw = window.innerWidth
  const vh = window.innerHeight
  const menuH = Math.min(rows * 34 + 24, vh - 16)
  const left = Math.max(8, Math.min(cm.x, vw - 200))
  const top = Math.max(8, Math.min(cm.y, vh - menuH - 8))

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
        <S.Item onClick={run(() => importHere(cm.wx, cm.wy))} title="Import a .spu into this space (here)">
          ⤒ Import
        </S.Item>

        {selectionCount() > 1 && (
          <>
            <S.Sep />
            {selectionGrouped() ? (
              <S.Item onClick={run(ungroupSelection)} title="Ungroup — move independently again">
                ⧉ Ungroup
              </S.Item>
            ) : (
              <S.Item
                onClick={run(groupSelection)}
                title="Group — selecting one selects all; they move together (Ctrl+G)"
              >
                ⧉ Group
              </S.Item>
            )}
          </>
        )}

        {node && (node.type === 'photo' || node.type === 'shape') && (selectionCount() <= 1 || selectionGrouped()) && cm.pid && (
          <>
            <S.Sep />
            {isSpined(cm.pid) ? (
              <S.Item
                onClick={run(() => cm.pid && unspine(cm.pid))}
                title="Detach this shape from its parent joint"
              >
                ⋔ Unspine
              </S.Item>
            ) : (
              <S.Item
                onClick={run(() => cm.pid && beginSpineFor(cm.pid))}
                title="Spine (joint) — click a point on THIS shape, then a point on another shape to sew them"
              >
                ⋔ Spine (connect joint)
              </S.Item>
            )}
          </>
        )}

        {node && (node.type === 'shape' || node.type === 'photo') && (
          <>
            <S.Sep />
            <S.Item onClick={run(() => flipSelection('x'))} title="Mirror left–right">
              ↔ Flip horizontal
            </S.Item>
            <S.Item onClick={run(() => flipSelection('y'))} title="Mirror up–down">
              ↕ Flip vertical
            </S.Item>
          </>
        )}

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
