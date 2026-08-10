import { Fragment, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  breadcrumb,
  copySelection,
  deleteNode,
  getCamera,
  getCurrentSpace,
  getGroupName,
  getNode,
  isStored,
  openNote,
  pasteClipboardAt,
  placementsInSpaceAll,
  renameGroupUnit,
  searchLibrary,
  spineDescendants,
  spineRoot,
  select,
  storePlacement,
  toggleLibrary,
  useFromLibrary,
} from '../store'
import type { Placement } from '../types'
import { useIsTouch } from '../useIsMobile'
import { useOverlay } from '../overlays'
import ConfirmModal from './ConfirmModal'
import PromptModal from './PromptModal'
import * as S from './LibraryPanel.styles'
import * as CM from './ContextMenu.styles'

// Library: whole-universe folder/note tree (exposed + stored). Opens with current space expanded. Search + "Use".
export default function LibraryPanel() {
  useOverlay(true, toggleLibrary) // 뒤로가기로 패널 닫기
  // 터치기기(PC 외 모든 기기)는 한 번 탭으로 폴더 열기/노트 열기. PC(마우스)는 더블클릭 유지.
  const touch = useIsTouch()
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

  // 우클릭(PC)·롱프레스(터치) → Copy/Delete 메뉴
  const [menu, setMenu] = useState<{ pid: string; nodeId: string; x: number; y: number } | null>(null)
  const [confirmDel, setConfirmDel] = useState<{ nodeId: string; name: string } | null>(null) // 삭제 확인
  const [renameGid, setRenameGid] = useState<string | null>(null) // 유니크 그룹 이름 변경
  // 롱프레스로 열린 직후엔 오버레이를 '클릭 통과'로 둬(손 떼는 고스트 클릭이 바로 닫지 못하게), 잠시 뒤 활성.
  const [armed, setArmed] = useState(true)
  const lp = useRef({ t: null as ReturnType<typeof setTimeout> | null, fired: false, x: 0, y: 0 })
  const openMenu = (pid: string, nodeId: string, x: number, y: number, fromTouch: boolean) => {
    setMenu({ pid, nodeId, x, y })
    if (!fromTouch) {
      setArmed(true) // 마우스 우클릭은 고스트 없음 → 바로 활성
      return
    }
    // 터치: 손을 아직 떼지 않았을 수 있음 → '손 떼는 순간(pointerup)' 기준으로 350ms 뒤 활성.
    // 그 사이 뒤따라오는 고스트 클릭은 오버레이가 클릭통과(pointer-events:none) 상태라 안 닫음.
    setArmed(false)
    const onUp = () => {
      window.removeEventListener('pointerup', onUp)
      setTimeout(() => setArmed(true), 350)
    }
    window.addEventListener('pointerup', onUp)
  }
  const startLongPress = (e: React.PointerEvent, pid: string, nodeId: string) => {
    lp.current.fired = false
    lp.current.x = e.clientX
    lp.current.y = e.clientY
    lp.current.t = setTimeout(() => {
      lp.current.fired = true
      openMenu(pid, nodeId, lp.current.x, lp.current.y, true)
    }, 500)
  }
  const cancelLongPress = () => {
    if (lp.current.t) clearTimeout(lp.current.t)
    lp.current.t = null
  }
  // Copy: 노드를 독립 복제. 터치=즉시 화면 중앙에 생성, PC=클립보드(Ctrl+V로 붙임).
  const copyLib = (pid: string) => {
    select(pid)
    copySelection()
    if (touch) {
      const c = getCamera()
      pasteClipboardAt(c.x, c.y)
    }
    setMenu(null)
  }

  // 개별 배치 한 줄(폴더 펼침·컨텍스트메뉴·Use/Hide 포함). 기존 동작.
  function renderPlacementRow(p: Placement, depth: number): React.ReactNode {
    const node = getNode(p.nodeId)
    if (!node) return null
    const isFolder = node.type === 'folder'
    const open = expanded.has(p.nodeId)
    const stored = isStored(p)
    return (
      <Fragment key={p.id}>
        <S.Row
          $depth={depth}
          $stored={stored}
          $current={isFolder && p.nodeId === currentSpace}
          onClick={() => {
            if (lp.current.fired) return (lp.current.fired = false)
            touch && (isFolder ? toggle(p.nodeId) : openNote(node.id))
          }}
          onDoubleClick={() => (isFolder ? toggle(p.nodeId) : openNote(node.id))}
          onContextMenu={(e) => {
            e.preventDefault()
            openMenu(p.id, node.id, e.clientX, e.clientY, false)
          }}
          onPointerDown={(e) => e.pointerType !== 'mouse' && startLongPress(e, p.id, node.id)}
          onPointerUp={cancelLongPress}
          onPointerCancel={cancelLongPress}
          onPointerMove={(e) => {
            if (lp.current.t && (Math.abs(e.clientX - lp.current.x) > 8 || Math.abs(e.clientY - lp.current.y) > 8))
              cancelLongPress()
          }}
          title={isFolder ? 'Tap to expand/collapse' : 'Double-click to open'}
        >
          {isFolder ? (
            <S.Caret onClick={(e) => (e.stopPropagation(), toggle(p.nodeId))}>{open ? '▾' : '▸'}</S.Caret>
          ) : (
            <S.Caret as="span" />
          )}
          <S.Icon>{isFolder ? '📁' : node.type === 'photo' ? '🖼' : node.type === 'text' ? 'T' : node.type === 'shape' ? '◆' : '📝'}</S.Icon>
          <S.Name title={node.name}>{node.name || 'Untitled'}</S.Name>
          <S.Badge $exposed={!stored} title={stored ? 'Hidden — not on canvas' : 'On canvas'}>●</S.Badge>
          <S.UseBtn
            $hide={!stored}
            onClick={(e) => {
              e.stopPropagation()
              stored ? useFromLibrary(node.id) : storePlacement(p.id)
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            title={stored ? 'Use — bring onto the canvas' : 'Hide — remove from canvas (keep in library)'}
          >
            {stored ? 'Use' : 'Hide'}
          </S.UseBtn>
        </S.Row>
        {isFolder && open && renderSpace(node.id, depth + 1)}
      </Fragment>
    )
  }

  // 단위 한 줄. regular=펼침 컨테이너(이름변경), unique=1객체(이름변경), spline=1단위(루트 이름, 폴더/노트처럼).
  function renderUnitRow(
    key: string,
    members: Placement[],
    depth: number,
    kind: 'regular' | 'unique' | 'spline',
  ): React.ReactNode {
    const expandable = kind === 'regular'
    const renamable = true // regular·unique·spline 모두 이름 변경 가능
    const open = expanded.has(key)
    const rootM = kind === 'spline' ? members.find((m) => spineRoot(m.id) === m.id) ?? members[0] : members[0]
    const stored = isStored(rootM)
    const children = expandable && open ? renderUnits(members, depth + 1, true) : null
    const icon = kind === 'unique' ? '📝' : kind === 'spline' ? '🔗' : '▦'
    const label =
      kind === 'spline'
        ? getGroupName(key) || getNode(rootM.nodeId)?.name || `Spline (${members.length})`
        : getGroupName(key) || (kind === 'unique' ? 'Unique group' : `Group (${units(members, true).length})`)
    return (
      <Fragment key={key}>
        <S.Row
          $depth={depth}
          $stored={stored}
          $current={false}
          onClick={() => (expandable ? toggle(key) : renamable && touch ? setRenameGid(key) : undefined)}
          onDoubleClick={() => renamable && setRenameGid(key)}
          onContextMenu={(e) => {
            e.preventDefault()
            openMenu(rootM.id, rootM.nodeId, e.clientX, e.clientY, false)
          }}
          onPointerDown={(e) => e.pointerType !== 'mouse' && startLongPress(e, rootM.id, rootM.nodeId)}
          onPointerUp={cancelLongPress}
          onPointerCancel={cancelLongPress}
          title={
            kind === 'spline'
              ? 'Spline — one linked unit'
              : renamable
                ? 'Tap to rename'
                : 'Group — tap to expand'
          }
        >
          {expandable ? (
            <S.Caret onClick={(e) => (e.stopPropagation(), toggle(key))}>{open ? '▾' : '▸'}</S.Caret>
          ) : (
            <S.Caret as="span" />
          )}
          <S.Icon>{icon}</S.Icon>
          <S.Name>{label}</S.Name>
          <S.Badge $exposed={!stored}>●</S.Badge>
          <S.UseBtn
            $hide={!stored}
            onClick={(e) => {
              e.stopPropagation()
              stored ? useFromLibrary(rootM.nodeId) : storePlacement(rootM.id)
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            title={stored ? 'Use — bring the whole unit onto the canvas' : 'Hide — store the whole unit'}
          >
            {stored ? 'Use' : 'Hide'}
          </S.UseBtn>
        </S.Row>
        {children}
      </Fragment>
    )
  }

  // placement 목록 → 단위(일반그룹/유니크그룹/스플라인/단독)로 분해. innerOfRegular=true면 일반 그룹 내부.
  type Unit = { kind: 'regular' | 'unique' | 'spline' | 'single'; key: string; members: Placement[] }
  function units(list: Placement[], innerOfRegular: boolean): Unit[] {
    const seen = new Set<string>()
    const out: Unit[] = []
    for (const p of list) {
      if (seen.has(p.id)) continue
      if (!innerOfRegular && p.groupId) {
        const m = list.filter((q) => q.groupId === p.groupId)
        m.forEach((q) => seen.add(q.id))
        out.push({ kind: 'regular', key: p.groupId, members: m })
      } else if (p.uniqueGroupId) {
        const m = list.filter((q) => q.uniqueGroupId === p.uniqueGroupId)
        m.forEach((q) => seen.add(q.id))
        out.push({ kind: 'unique', key: p.uniqueGroupId, members: m })
      } else if (spineRoot(p.id) !== p.id || spineDescendants(p.id).length > 0) {
        // 스플라인 트리(2개 이상 연결) → 루트 기준으로 하나의 단위(폴더/노트 같은 개념)
        const root = spineRoot(p.id)
        const m = list.filter((q) => spineRoot(q.id) === root)
        m.forEach((q) => seen.add(q.id))
        out.push({ kind: 'spline', key: root, members: m })
      } else {
        seen.add(p.id)
        out.push({ kind: 'single', key: p.id, members: [p] })
      }
    }
    return out
  }
  function renderUnits(list: Placement[], depth: number, innerOfRegular: boolean): React.ReactNode {
    return units(list, innerOfRegular).map((u) =>
      u.kind === 'single' ? renderPlacementRow(u.members[0], depth) : renderUnitRow(u.key, u.members, depth, u.kind),
    )
  }

  function renderSpace(space: string | null, depth: number): React.ReactNode {
    return renderUnits(placementsInSpaceAll(space), depth, false)
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
                onClick={() => touch && r.node.type !== 'folder' && openNote(r.node.id)} // 터치: 한 번 탭으로 열기
                onDoubleClick={() => r.node.type !== 'folder' && openNote(r.node.id)}
                title={r.node.type === 'folder' ? '' : 'Double-click to open'}
              >
                <S.Icon>{r.node.type === 'folder' ? '📁' : r.node.type === 'photo' ? '🖼' : r.node.type === 'text' ? 'T' : '📝'}</S.Icon>
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
      {menu &&
        createPortal(
          <CM.Overlay
            style={{ pointerEvents: armed ? 'auto' : 'none' }}
            onClick={() => setMenu(null)}
            onContextMenu={(e) => (e.preventDefault(), setMenu(null))}
          >
            <CM.Menu
              style={{
                left: Math.min(menu.x, window.innerWidth - 170),
                top: Math.min(menu.y, window.innerHeight - 90),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <CM.Item
                onClick={() => copyLib(menu.pid)}
                title={touch ? 'Copy — placed at the center of the screen' : 'Copy (paste with Ctrl+V)'}
              >
                Copy
              </CM.Item>
              <CM.Item
                $danger
                onClick={() => {
                  setConfirmDel({ nodeId: menu.nodeId, name: getNode(menu.nodeId)?.name || 'this item' })
                  setMenu(null)
                }}
                title="Delete from the universe"
              >
                Delete
              </CM.Item>
            </CM.Menu>
          </CM.Overlay>,
          document.body,
        )}
      {confirmDel && (
        <ConfirmModal
          message={`Delete "${confirmDel.name}" from the universe? This cannot be undone easily.`}
          confirmLabel="Delete"
          onConfirm={() => {
            deleteNode(confirmDel.nodeId)
            setConfirmDel(null)
          }}
          onCancel={() => setConfirmDel(null)}
        />
      )}
      {renameGid && (
        <PromptModal
          title="Group name"
          initial={getGroupName(renameGid)}
          onSubmit={(name) => {
            renameGroupUnit(renameGid, name)
            setRenameGid(null)
          }}
          onCancel={() => setRenameGid(null)}
        />
      )}
    </S.Panel>
  )
}
