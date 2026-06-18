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
  getNode,
  getSelectedNode,
  getUniverseName,
  importWorld,
  redo,
  resetToSample,
  selectionCount,
  selectionToDoc,
  toggleComponents,
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
      filename = `${name.trim()}.smk`
    } else if (n && n.type === 'folder') {
      out = exportFolderDoc(n.id)
      filename = `${n.name.trim()}.smk`
    } else {
      out = selectionToDoc()
      filename = n ? `${n.name.trim()}.smk` : `selection-${selectionCount()}.smk`
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
      <S.Button onClick={undo} disabled={!canUndo()} title="실행취소 (Ctrl+Z)">↶ Undo</S.Button>
      <S.Button onClick={redo} disabled={!canRedo()} title="다시실행 (Ctrl+Y / Ctrl+Shift+Z)">
        ↷ Redo
      </S.Button>
      <S.Gap />
      <S.Button onClick={() => addNode('folder', centerWorld().x, centerWorld().y)}>+ Folder</S.Button>
      <S.Button onClick={() => addNode('memo', centerWorld().x, centerWorld().y)}>+ Note</S.Button>
      <S.Button onClick={onPhoto} title="Add a photo from your device">+ Photo</S.Button>
      <S.Button $on={getComponentsOpen()} onClick={toggleComponents} title="Saved components — reusable folders/notes">
        ⬡ Components
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
                : 'Export the selected item(s) as a .smk file'
            }
          >
            {count === 0 ? '⤓ Export all' : count > 1 ? `⤓ Export (${count})` : '⤓ Export'}
          </S.Button>
        )
      })()}
      <S.Button onClick={onImport} title="Import a .smk into My Universe">⤒ Import</S.Button>
      <S.Gap />
      <S.Button
        $danger
        onClick={() => setConfirmReset(true)}
        title="모든 데이터를 지우고 기본 샘플로 되돌리기"
      >
        ⟲ Reset
      </S.Button>
      {confirmReset && (
        <ConfirmModal
          message="모든 데이터를 지우고 기본 샘플로 되돌릴까요? 되돌릴 수 없습니다."
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
