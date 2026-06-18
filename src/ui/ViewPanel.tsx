import { bumpUI, getCamera, setCamera } from '../store'
import CommitInput from './CommitInput'
import * as S from './ViewPanel.styles'

// 아무것도 선택 안 됐을 때: 현재 보고 있는 좌표(카메라 중심) 표시 + 입력으로 이동.
export default function ViewPanel() {
  const c = getCamera()
  const go = (x: number, y: number) => {
    setCamera({ x, y, zoom: c.zoom })
    bumpUI() // 표시값 갱신
  }

  return (
    <S.Panel>
      <S.Title>View · center</S.Title>
      <S.Row>
        <S.Box>
          <span>X</span>
          <CommitInput
            numeric
            type="number"
            value={Math.round(c.x)}
            onCommit={(v) => go(Number(v), c.y)}
          />
        </S.Box>
        <S.Box>
          <span>Y</span>
          <CommitInput
            numeric
            type="number"
            value={Math.round(c.y)}
            onCommit={(v) => go(c.x, Number(v))}
          />
        </S.Box>
        <S.Refresh
          title="Reset to 0, 0"
          onClick={() => {
            setCamera({ x: 0, y: 0, zoom: 1 })
            bumpUI()
          }}
        >
          ⟳
        </S.Refresh>
      </S.Row>
    </S.Panel>
  )
}
