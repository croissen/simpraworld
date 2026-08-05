import { useState } from 'react'
import { breadcrumb, getUniverseName, goTo } from '../store'
import BrandButton from './BrandButton'
import * as S from './MobileHeader.styles'

// 모바일 상단 바: [Simpra 로고 + (폴더 안일 때) ↰ 동그라미] · [중앙 폴더명 ▾] · [Undo/Redo]
// 유니버스명 수정은 ⋯ Setting 팝업으로 이동(여기선 이름만 표시).
export default function MobileHeader() {
  const [open, setOpen] = useState(false)
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
      <S.LeftStack>
        {canUp ? (
          // 폴더 안: Simpra 대신 상위 폴더로 나가기 버튼
          <S.UpCircle onClick={() => goTo(parentId)} title="상위 폴더로 나가기">
            ↰
          </S.UpCircle>
        ) : (
          // 최상단: Simpra 로고
          <BrandButton label="Simpra" />
        )}
      </S.LeftStack>

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

      {/* 우측: ⋯ Setting 버튼이 Toolbar에서 corner 고정으로 여기에 뜸(자리만 비워둠) */}
      <S.Side />
    </S.Bar>
  )
}
