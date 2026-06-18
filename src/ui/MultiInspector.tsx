import { copySelection, getPlacement, getSelection, selectionCount, setPlacementXY } from '../store'
import CommitInput from './CommitInput'
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

  // 그룹 기준점 = 좌상단(min x, min y). 편집하면 전체를 델타만큼 이동.
  const minX = Math.round(Math.min(...pls.map((p) => p.x)))
  const minY = Math.round(Math.min(...pls.map((p) => p.y)))

  const moveBy = (dx: number, dy: number) => {
    for (const p of pls) setPlacementXY(p.id, p.x + dx, p.y + dy)
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
            <CommitInput numeric type="number" value={minX} onCommit={(v) => moveBy(Number(v) - minX, 0)} />
          </S.DimBox>
          <S.DimBox>
            <span>Y</span>
            <CommitInput numeric type="number" value={minY} onCommit={(v) => moveBy(0, Number(v) - minY)} />
          </S.DimBox>
        </S.NumRow>
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
      <S.Delete onClick={onRequestDelete}>Delete {selectionCount()} items</S.Delete>
    </S.Inspector>
  )
}
