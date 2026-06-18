import { useState } from 'react'
import { breadcrumb, getUniverseName, goTo, setUniverseName } from '../store'
import CommitInput from './CommitInput'
import * as S from './Breadcrumb.styles'

export default function Breadcrumb() {
  const path = breadcrumb()
  const [editing, setEditing] = useState(false)
  return (
    <S.Crumb>
      {editing ? (
        <CommitInput
          component={S.RootInput}
          autoFocus
          value={getUniverseName()}
          onCommit={(v) => {
            setUniverseName(v)
            setEditing(false)
          }}
        />
      ) : (
        <S.CrumbBtn
          onClick={() => goTo(null)}
          onDoubleClick={() => setEditing(true)}
          title="Double-click to rename"
        >
          🌌 {getUniverseName()}
        </S.CrumbBtn>
      )}
      {path.map((n) => (
        <span key={n.id}>
          <S.Sep>›</S.Sep>
          <S.CrumbBtn onClick={() => goTo(n.id)}>{n.name}</S.CrumbBtn>
        </span>
      ))}
    </S.Crumb>
  )
}
