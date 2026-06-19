import { useState } from 'react'
import {
  addNode,
  addPhoto,
  canRedo,
  canUndo,
  exportFolderDoc,
  exportSpaceDoc,
  getCamera,
  getComponentsOpen,
  getCurrentSpace,
  getLibraryOpen,
  getNode,
  getSelectedNode,
  getUniverseName,
  importWorld,
  redo,
  resetToSample,
  selectionCount,
  selectionToDoc,
  toggleComponents,
  toggleLibrary,
  undo,
} from '../store'
import { exportSmk, importSmk, pickSmkFile, saveSmk } from '../smk'
import { fileToImage, pickImageFile } from '../image'
import ConfirmModal from './ConfirmModal'
import * as S from './Toolbar.styles'

export default function Toolbar() {
  const [confirmReset, setConfirmReset] = useState(false)
  // 화면 중앙(월드 좌표)에 새 노드 생성
  function centerWorld() {
    const c = getCamera()
    return { x: c.x, y: c.y }
  }

  // 선택 0개=현재 공간 전체 / 폴더 1개=그 폴더만 / 그 외(다중·메모)=선택된 것만
  async function onExport() {
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
    const where = await saveSmk(filename, () => exportSmk(out))
    if (where) alert('Saved: ' + where)
  }

  // 사진 추가: 기기에서 이미지 선택 → 화면 중앙에 이미지 노드 생성
  async function onPhoto() {
    const file = await pickImageFile()
    if (!file) return
    const img = await fileToImage(file)
    addPhoto(img, centerWorld().x, centerWorld().y)
  }

  // import a .smk folder into My Universe (auto "(1)" on name clash)
  async function onImport() {
    const file = await pickSmkFile()
    if (!file) return
    try {
      importWorld(await importSmk(file))
    } catch (e) {
      alert('Import failed: ' + (e as Error).message)
    }
  }

  return (
    <S.Toolbar>
      <S.UndoGroup>
        <S.Button onClick={undo} disabled={!canUndo()} title="Undo (Ctrl+Z)">↶ Undo</S.Button>
        <S.Button onClick={redo} disabled={!canRedo()} title="Redo (Ctrl+Y / Ctrl+Shift+Z)">
          ↷ Redo
        </S.Button>
        <S.Gap />
      </S.UndoGroup>
      <S.Button onClick={() => addNode('folder', centerWorld().x, centerWorld().y)}>+ Folder</S.Button>
      <S.Button onClick={() => addNode('memo', centerWorld().x, centerWorld().y)}>+ Note</S.Button>
      <S.Button onClick={onPhoto} title="Add a photo from your device">+ Photo</S.Button>
      <S.Button $on={getComponentsOpen()} onClick={toggleComponents} title="Saved components — reusable folders/notes">
        ⬡ Components
      </S.Button>
      <S.Button $on={getLibraryOpen()} onClick={toggleLibrary} title="Library — full folder/note tree (on-canvas + stored)">
        🗂 Library
      </S.Button>
      <S.Gap />
      {(() => {
        const count = selectionCount()
        return (
          <S.Button
            onClick={onExport}
            title={
              count === 0
                ? 'Export everything in the current space'
                : 'Export the selected item(s) as a .spu file'
            }
          >
            {count === 0 ? '⤓ Export all' : count > 1 ? `⤓ Export (${count})` : '⤓ Export'}
          </S.Button>
        )
      })()}
      <S.Button onClick={onImport} title="Import a .spu into My Universe">⤒ Import</S.Button>
      <S.Gap />
      <S.Button
        $danger
        onClick={() => setConfirmReset(true)}
        title="Erase all data and restore the default sample"
      >
        ⟲ Reset
      </S.Button>
      {confirmReset && (
        <ConfirmModal
          message="Erase all data and restore the default sample? This cannot be undone."
          onConfirm={() => {
            resetToSample()
            setConfirmReset(false)
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </S.Toolbar>
  )
}
