import { useState } from 'react'
import { breadcrumb, canRedo, canUndo, getUniverseName, goTo, redo, setUniverseName, undo } from '../store'
import BrandButton from './BrandButton'
import PromptModal from './PromptModal'
import * as S from './MobileHeader.styles'

// 모바일 상단 바: [Simpra 로고] · [중앙 현재 폴더 ▾ 드롭다운] · [Undo/Redo]
export default function MobileHeader() {
  const [open, setOpen] = useState(false)
  const [editName, setEditName] = useState<string | null>(null) // 유니버스명 수정 프롬프트
  const path = breadcrumb()
  const currentName = path.length ? path[path.length - 1].name : getUniverseName()

  // 드롭다운 목록: 🌌 루트 + 경로 폴더들 (순서대로)
  const items = [{ id: null as string | null, name: `🌌 ${getUniverseName()}` }, ...path]
  const currentId = path.length ? path[path.length - 1].id : null
  // 상위 폴더: 경로가 2단계 이상이면 바로 위 폴더, 1단계면 루트(null). 루트에선 버튼 숨김.
  const canUp = path.length > 0
  const parentId = path.length >= 2 ? path[path.length - 2].id : null

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
        {canUp ? (
          <S.UpBtn onClick={() => goTo(parentId)} title="상위 폴더로">
            ↰
          </S.UpBtn>
        ) : (
          <S.UpBtn onClick={() => setEditName(getUniverseName())} title="유니버스 이름 수정">
            ✎
          </S.UpBtn>
        )}
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

      {editName !== null && (
        <PromptModal
          title="Universe name"
          initial={editName}
          okLabel="Save"
          onSubmit={(v) => {
            const name = v.trim()
            if (name) setUniverseName(name)
            setEditName(null)
          }}
          onCancel={() => setEditName(null)}
        />
      )}
    </S.Bar>
  )
}
