import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { breadcrumb, getUniverseName, goTo, setUniverseName } from '../store'
import CommitInput from './CommitInput'
import * as S from './Breadcrumb.styles'

export default function Breadcrumb() {
  const path = breadcrumb()
  const [editing, setEditing] = useState(false)
  // 남는 폭에 맞춰 끝에서부터 보일 폴더 개수(visible). 넘치면 줄여서 가운데를 …로 접음.
  const [visible, setVisible] = useState(path.length)
  const navRef = useRef<HTMLElement>(null)

  // 경로가 바뀌면 일단 전부 펼쳐 다시 계산
  useLayoutEffect(() => {
    setVisible(path.length)
  }, [path.length])

  // 넘치면 한 개씩 접기 — 안 넘칠 때까지 매 커밋마다 줄임(수렴)
  useLayoutEffect(() => {
    const el = navRef.current
    if (el && el.scrollWidth > el.clientWidth + 1 && visible > 1) setVisible((v) => v - 1)
  })

  // 창 크기 바뀌면 다시 펼쳐 재계산
  useEffect(() => {
    const onResize = () => setVisible(path.length)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [path.length])

  const hidden = path.slice(0, Math.max(0, path.length - visible))
  const tail = path.slice(path.length - visible)

  return (
    <S.Crumb ref={navRef}>
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
      {hidden.length > 0 && (
        <span>
          <S.Sep>›</S.Sep>
          <S.CrumbBtn
            onClick={() => goTo(hidden[hidden.length - 1].id)}
            title="Go to parent folders"
          >
            …
          </S.CrumbBtn>
        </span>
      )}
      {tail.map((n) => (
        <span key={n.id}>
          <S.Sep>›</S.Sep>
          <S.CrumbBtn onClick={() => goTo(n.id)}>{n.name}</S.CrumbBtn>
        </span>
      ))}
    </S.Crumb>
  )
}
