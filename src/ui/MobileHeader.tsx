import { useState } from 'react'
import { breadcrumb, canRedo, canUndo, getUniverseName, goTo, redo, undo } from '../store'
import BrandButton from './BrandButton'
import * as S from './MobileHeader.styles'

// 모바일 상단 바: [Simpra 로고] · [중앙 현재 폴더 ▾ 드롭다운] · [Undo/Redo]
export default function MobileHeader() {
  const [open, setOpen] = useState(false)
  const path = breadcrumb()
  const currentName = path.length ? path[path.length - 1].name : getUniverseName()

  // 드롭다운 목록: 🌌 루트 + 경로 폴더들 (순서대로)
  const items = [{ id: null as string | null, name: `🌌 ${getUniverseName()}` }, ...path]
  const currentId = path.length ? path[path.length - 1].id : null

  const select = (id: string | null) => {
    goTo(id)
    setOpen(false)
  }

  return (
    <S.Bar>
      <S.Side>
        <BrandButton label="Simpra" />
      </S.Side>

      <S.Center>
        <S.FolderBtn onClick={() => setOpen((v) => !v)} title="Switch folder">
          <span className="nm">{currentName}</span>
          <span className="car">▾</span>
        </S.FolderBtn>
        {open && (
          <>
            <S.Overlay onClick={() => setOpen(false)} />
            <S.Menu>
              {items.map((it, i) => (
                <S.Item
                  key={it.id ?? 'root'}
                  $on={it.id === currentId}
                  $depth={i}
                  onClick={() => select(it.id)}
                >
                  {it.name}
                </S.Item>
              ))}
            </S.Menu>
          </>
        )}
      </S.Center>

      <S.Side>
        <S.IconBtn onClick={undo} disabled={!canUndo()} title="Undo">
          ↶
        </S.IconBtn>
        <S.IconBtn onClick={redo} disabled={!canRedo()} title="Redo">
          ↷
        </S.IconBtn>
      </S.Side>
    </S.Bar>
  )
}
