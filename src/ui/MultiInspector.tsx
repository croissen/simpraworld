import {
  copySelection,
  getPlacement,
  getSelection,
  placementPos,
  removeEdgesAmongSelection,
  reorderPlacement,
  selectionCount,
  selectionHasInternalEdges,
  selectionInternalEdges,
  setEdgeColorAmongSelection,
  setPlacementXY,
  togglePlacementLock,
  toggleEdgeBoldAmongSelection,
} from '../store'
import CommitInput from './CommitInput'
import ColorPicker from './ColorPicker'
import * as S from './Inspector.styles'

// 다중 선택 시 우측 패널: Position(그룹 일괄 이동) / Component / Copy / Delete.
export default function MultiInspector({
  onRequestDelete,
  onCreateComponent,
}: {
  onRequestDelete: () => void
  onCreateComponent: () => void
}) {
  const pids = getSelection()
  const pls = pids.map((pid) => getPlacement(pid)).filter((p): p is NonNullable<typeof p> => !!p)
  if (!pls.length) return null

  const hasInternalEdges = selectionHasInternalEdges() // 선택끼리 연결된 참조선이 있을 때만 섹션 노출
  const internalEdges = hasInternalEdges ? selectionInternalEdges() : []
  const edgesBold = internalEdges.length > 0 && internalEdges.every((e) => e.bold)
  const edgeColor = internalEdges.find((e) => e.color)?.color || '#96aad2'

  // 그룹 기준점 = 좌상단(min x, min y). 편집하면 전체를 델타만큼 이동. (현재 기기 좌표 기준)
  const minX = Math.round(Math.min(...pls.map((p) => placementPos(p).x)))
  const minY = Math.round(Math.min(...pls.map((p) => placementPos(p).y)))

  const moveBy = (dx: number, dy: number) => {
    for (const p of pls) {
      const pos = placementPos(p)
      setPlacementXY(p.id, pos.x + dx, pos.y + dy)
    }
  }

  const lockedAll = pls.every((p) => p.locked)
  const anyLocked = pls.some((p) => p.locked)
  // 하나라도 잠겨있으면 클릭 시 전부 잠금 → 다시 누르면 전부 해제
  const toggleLockAll = () => {
    const target = !lockedAll
    for (const p of pls) if (!!p.locked !== target) togglePlacementLock(p.id)
  }
  const arrangeAll = (dir: 'front' | 'back' | 'forward' | 'backward') => {
    // back/backward는 역순으로 처리해야 선택 내부의 상대 순서가 유지됨
    const order = dir === 'back' || dir === 'backward' ? [...pids].reverse() : pids
    for (const pid of order) reorderPlacement(pid, dir)
  }

  return (
    <S.Inspector>
      <S.Head>
        <span>◳ {selectionCount()} selected</span>
      </S.Head>

      <S.Field>
        <span>Position (group)</span>
        <S.NumRow>
          <S.DimBox>
            <span>X</span>
            <CommitInput
              numeric
              type="number"
              disabled={anyLocked}
              value={minX}
              onCommit={(v) => moveBy(Number(v) - minX, 0)}
            />
          </S.DimBox>
          <S.DimBox>
            <span>Y</span>
            <CommitInput
              numeric
              type="number"
              disabled={anyLocked}
              value={minY}
              onCommit={(v) => moveBy(0, Number(v) - minY)}
            />
          </S.DimBox>
          <S.Lock
            $on={lockedAll}
            onClick={toggleLockAll}
            title={lockedAll ? 'Unlock all positions' : 'Lock all positions (no moving)'}
          >
            {lockedAll ? '🔒' : '🔓'}
          </S.Lock>
        </S.NumRow>
      </S.Field>

      <S.Field>
        <span>Arrange (all)</span>
        <S.Row>
          <S.Chip onClick={() => arrangeAll('front')} title="Bring to front">
            ⤒
          </S.Chip>
          <S.Chip onClick={() => arrangeAll('forward')} title="Forward">
            ↑
          </S.Chip>
          <S.Chip onClick={() => arrangeAll('backward')} title="Backward">
            ↓
          </S.Chip>
          <S.Chip onClick={() => arrangeAll('back')} title="Send to back">
            ⤓
          </S.Chip>
        </S.Row>
      </S.Field>

      <S.Field>
        <S.LabelRow>
          <span>Component</span>
          <S.AddComp onClick={onCreateComponent} title="Save the selection as one component (enter a name)">
            + Component
          </S.AddComp>
        </S.LabelRow>
      </S.Field>

      {hasInternalEdges && (
        <S.Field>
          <span>References</span>
          <S.Row>
            <S.Chip onClick={removeEdgesAmongSelection} title="Remove reference lines between the selected items">
              Unlink
            </S.Chip>
            <S.Chip
              $on={edgesBold}
              onClick={toggleEdgeBoldAmongSelection}
              title="Emphasize lines (thicker)"
            >
              Bold
            </S.Chip>
          </S.Row>
          <ColorPicker value={edgeColor} onChange={setEdgeColorAmongSelection} />
        </S.Field>
      )}

      <S.Mini onClick={copySelection}>Copy</S.Mini>
      <S.Delete onClick={onRequestDelete}>Delete {selectionCount()} items</S.Delete>
    </S.Inspector>
  )
}
