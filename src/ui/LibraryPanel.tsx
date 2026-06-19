import { Fragment, useState } from 'react'
import {
  breadcrumb,
  getCurrentSpace,
  getNode,
  openNote,
  placementsInSpaceAll,
  searchLibrary,
  toggleLibrary,
  useFromLibrary,
} from '../store'
import * as S from './LibraryPanel.styles'

// Library: whole-universe folder/note tree (exposed + stored). Opens with current space expanded. Search + "Use".
export default function LibraryPanel() {
  const [query, setQuery] = useState('')
  // expand the folders along the current space path by default
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(breadcrumb().map((n) => n.id)))
  const currentSpace = getCurrentSpace()

  const toggle = (folderId: string) =>
    setExpanded((prev) => {
      const s = new Set(prev)
      s.has(folderId) ? s.delete(folderId) : s.add(folderId)
      return s
    })

  function renderSpace(space: string | null, depth: number): React.ReactNode {
    return placementsInSpaceAll(space).map((p) => {
      const node = getNode(p.nodeId)
      if (!node) return null
      const isFolder = node.type === 'folder'
      const open = expanded.has(p.nodeId)
      return (
        <Fragment key={p.id}>
          <S.Row
            $depth={depth}
            $stored={!!p.stored}
            $current={isFolder && p.nodeId === currentSpace}
            onDoubleClick={() => (isFolder ? toggle(p.nodeId) : openNote(node.id))}
            title={isFolder ? 'Double-click to expand/collapse' : 'Double-click to open'}
          >
            {isFolder ? (
              <S.Caret onClick={(e) => (e.stopPropagation(), toggle(p.nodeId))}>
                {open ? '▾' : '▸'}
              </S.Caret>
            ) : (
              <S.Caret as="span" />
            )}
            <S.Icon>{isFolder ? '📁' : node.type === 'photo' ? '🖼' : '📝'}</S.Icon>
            <S.Name title={node.name}>{node.name || 'Untitled'}</S.Name>
            {p.stored ? (
              <S.Badge title="Stored only (not on canvas)">📦</S.Badge>
            ) : (
              <S.Badge $exposed title="On canvas">
                ●
              </S.Badge>
            )}
            <S.UseBtn
              onClick={(e) => (e.stopPropagation(), useFromLibrary(node.id))}
              onDoubleClick={(e) => e.stopPropagation()}
              title="Bring into current space"
            >
              Use
            </S.UseBtn>
          </S.Row>
          {isFolder && open && renderSpace(node.id, depth + 1)}
        </Fragment>
      )
    })
  }

  const results = query.trim() ? searchLibrary(query) : null

  return (
    <S.Panel>
      <S.CloseX onClick={toggleLibrary} title="Close">✕</S.CloseX>
      <S.Header>Library</S.Header>
      <S.Search
        value={query}
        placeholder="Search name / #tag (all)"
        onChange={(e) => setQuery(e.target.value)}
      />
      <S.Tree>
        {results ? (
          results.length === 0 ? (
            <S.Empty>No results</S.Empty>
          ) : (
            results.map((r) => (
              <S.Row
                key={r.node.id}
                onDoubleClick={() => r.node.type !== 'folder' && openNote(r.node.id)}
                title={r.node.type === 'folder' ? '' : 'Double-click to open'}
              >
                <S.Icon>{r.node.type === 'folder' ? '📁' : r.node.type === 'photo' ? '🖼' : '📝'}</S.Icon>
                <S.Name title={r.node.name}>{r.node.name || 'Untitled'}</S.Name>
                <S.PathLabel title={r.path}>{r.path}</S.PathLabel>
                <S.UseBtn
                  onClick={(e) => (e.stopPropagation(), useFromLibrary(r.node.id))}
                  title="Bring into current space"
                >
                  Use
                </S.UseBtn>
              </S.Row>
            ))
          )
        ) : (
          renderSpace(null, 0)
        )}
      </S.Tree>
      <S.Hint>● on canvas · 📦 stored · Use = bring into current space</S.Hint>
    </S.Panel>
  )
}
