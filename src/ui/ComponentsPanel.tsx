import { useState } from 'react'
import {
  addComponentDoc,
  exportAllComponentsDoc,
  getComponents,
  getSelectedComponentId,
  renameComponent,
  selectComponent,
  stampComponent,
} from '../store'
import type { ComponentDef, SimpraWorldDoc } from '../types'
import { exportSmk, importSmk, pickSmkFile, saveSmk } from '../smk'
import CommitInput from './CommitInput'
import * as S from './ComponentsPanel.styles'

// 컴포넌트 미니문서의 루트 노드(공간 null 배치) 찾기
function rootNode(doc: SimpraWorldDoc) {
  const root = doc.placements.find((p) => p.space === null)
  return root ? doc.nodes.find((n) => n.id === root.nodeId) : undefined
}

// 컴포넌트 목록. 클릭=미리보기 / 더블클릭=현재 공간에 생성(stamp).
export default function ComponentsPanel({
  onRequestDelete,
}: {
  onRequestDelete: (c: ComponentDef) => void
}) {
  const comps = getComponents()
  const selId = getSelectedComponentId()
  const sel = comps.find((c) => c.id === selId)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function onImport() {
    const file = await pickSmkFile()
    if (!file) return
    try {
      const cdoc = await importSmk(file)
      if (cdoc.components && cdoc.components.length) {
        // 여러 컴포넌트 번들 → 전부 목록에 추가
        for (const c of cdoc.components) addComponentDoc(c.name, c.doc)
      } else {
        // 단일 _comp.smk (노드 미니문서) → 1개로 추가
        const name = rootNode(cdoc)?.name || file.name.replace(/(_comp)?\.(spu|smk)$/i, '')
        addComponentDoc(name, cdoc)
      }
    } catch (e) {
      alert('Import failed: ' + (e as Error).message)
    }
  }

  async function onExportAll() {
    if (comps.length === 0) return alert('No components to export')
    await saveSmk('components.spu', () => exportSmk(exportAllComponentsDoc()))
  }

  async function onDownload(c: ComponentDef) {
    await saveSmk(`${c.name.trim()}_comp.spu`, () => exportSmk(c.doc))
  }

  function meta(c: ComponentDef) {
    const r = rootNode(c.doc)
    if (r?.type === 'folder') {
      const inside = c.doc.nodes.length - 1 // 루트 폴더 제외
      return `📁 Folder · ${inside} inside`
    }
    return '📝 Note'
  }

  return (
    <>
      <S.Panel>
        <S.Header>
          <span>Components</span>
          <S.HeaderBtns>
            <S.HeaderBtn onClick={onImport} title="Import _comp.spu (single or bundle) into the list">
              ⤒ Import
            </S.HeaderBtn>
            <S.HeaderBtn onClick={onExportAll} title="Export all components as components.spu">
              ⤓ Export all
            </S.HeaderBtn>
          </S.HeaderBtns>
        </S.Header>

        {comps.length === 0 ? (
          <S.Empty>
            No components yet.
            <br />
            Select a node and save it with <b>+ Component</b> in the inspector.
          </S.Empty>
        ) : (
          <S.List>
            {comps.map((c) => (
              <S.Item
                key={c.id}
                $on={c.id === selId}
                onClick={() => selectComponent(c.id)}
                onDoubleClick={() => stampComponent(c.id)}
                title="Click = preview / Double-click = place in this space"
              >
                <S.ItemMain>
                  {editingId === c.id ? (
                    <CommitInput
                      component={S.RenameInput}
                      autoFocus
                      value={c.name}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      onCommit={(v) => {
                        renameComponent(c.id, v)
                        setEditingId(null)
                      }}
                    />
                  ) : (
                    <>
                      <S.ItemName>{c.name}</S.ItemName>
                      <S.ItemMeta>{meta(c)}</S.ItemMeta>
                    </>
                  )}
                </S.ItemMain>
                <S.IconBtn onClick={(e) => (e.stopPropagation(), setEditingId(c.id))} title="Rename">
                  ✎
                </S.IconBtn>
                <S.IconBtn onClick={(e) => (e.stopPropagation(), onDownload(c))} title="Download _comp.spu">
                  ⤓
                </S.IconBtn>
                <S.IconBtn
                  onClick={(e) => (e.stopPropagation(), onRequestDelete(c))}
                  title="Delete component"
                >
                  🗑
                </S.IconBtn>
              </S.Item>
            ))}
          </S.List>
        )}

        <S.Hint>Click = preview · Double-click = place in this space</S.Hint>
      </S.Panel>

      {sel && (
        <S.Preview>
          <S.PreviewName>{sel.name}</S.PreviewName>
          <S.PreviewMeta>{meta(sel)}</S.PreviewMeta>
          {rootNode(sel.doc)?.body && <S.PreviewBody>{rootNode(sel.doc)!.body}</S.PreviewBody>}
          <S.PreviewHint>Double-click to place it in this space.</S.PreviewHint>
        </S.Preview>
      )}
    </>
  )
}
