import { useState } from 'react'
import {
  copySelection,
  getPlacement,
  getSelection,
  removeEdgesAmongSelection,
  reorderPlacement,
  selectionCount,
  selectionHasInternalEdges,
  setPlacementXY,
  togglePlacementLock,
} from '../store'
import CommitInput from './CommitInput'
import ConfirmModal from './ConfirmModal'
import * as S from './Inspector.styles'

// 다중 선택 시 우측 패널: Position(그룹 일괄 이동) / Component / Copy / Delete.
export default function MultiInspector({
  onRequestDelete,
  onCreateComponent,
}: {
  onRequestDelete: () => void
  onCreateComponent: () => void
}) {
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  const pids = getSelection()
  const pls = pids.map((pid) => getPlacement(pid)).filter((p): p is NonNullable<typeof p> => !!p)
  if (!pls.length) return null

  const hasInternalEdges = selectionHasInternalEdges() // 선택끼리 연결된 참조선이 있을 때만 버튼 노출

  // 그룹 기준점 = 좌상단(min x, min y). 편집하면 전체를 델타만큼 이동.
  const minX = Math.round(Math.min(...pls.map((p) => p.x)))
  const minY = Math.round(Math.min(...pls.map((p) => p.y)))

  const moveBy = (dx: number, dy: number) => {
    for (const p of pls) setPlacementXY(p.id, p.x + dx, p.y + dy)
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
            title={lockedAll ? '전체 위치 잠금 해제' : '전체 위치 잠금(움직이지 않음)'}
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
          <S.AddComp onClick={onCreateComponent} title="선택한 것들을 하나의 컴포넌트로 저장(이름 입력)">
            + Component
          </S.AddComp>
        </S.LabelRow>
      </S.Field>

      <S.Mini onClick={copySelection}>Copy</S.Mini>
      {hasInternalEdges && (
        <S.Mini onClick={() => setConfirmUnlink(true)} title="선택한 항목들끼리의 참조선만 끊기">
          참조 해제
        </S.Mini>
      )}
      <S.Delete onClick={onRequestDelete}>Delete {selectionCount()} items</S.Delete>

      {confirmUnlink && (
        <ConfirmModal
          message="선택한 항목들끼리의 참조선을 지울까요? (다른 항목과의 참조는 유지됩니다)"
          confirmLabel="참조 해제"
          onConfirm={() => {
            removeEdgesAmongSelection()
            setConfirmUnlink(false)
          }}
          onCancel={() => setConfirmUnlink(false)}
        />
      )}
    </S.Inspector>
  )
}
