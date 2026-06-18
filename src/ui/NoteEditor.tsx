import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { closeNote, getNode, updateNode } from '../store'
import * as S from './NoteEditor.styles'

// 메모(노트) 더블클릭 시 뜨는 편집 팝업. 제목 + 본문(body) 입력/조회.
export default function NoteEditor({ nodeId }: { nodeId: string }) {
  const n = getNode(nodeId)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNote()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  if (!n) return null

  return createPortal(
    <S.Overlay>
      <S.Paper>
        <S.Bar>
          <S.Title
            value={n.name}
            placeholder="Untitled"
            onChange={(e) => updateNode(n.id, { name: e.target.value })}
          />
          <S.Close onClick={closeNote} title="Close (Esc)">✕</S.Close>
        </S.Bar>
        <S.Body
          autoFocus
          value={n.body ?? ''}
          placeholder="Write your note…"
          onChange={(e) => updateNode(n.id, { body: e.target.value })}
        />
      </S.Paper>
    </S.Overlay>,
    document.body,
  )
}
