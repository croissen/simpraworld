import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  closeNote,
  getAsset,
  getNode,
  getNoteEditorPid,
  getPlacement,
  searchNotesInCurrentSpace,
  swapInNote,
  updateNode,
} from '../store'
import * as S from './NoteEditor.styles'

// '#생산부 #1년차' 같은 입력 → ['생산부','1년차'] (중복·빈값 제거, '#' 제거)
function parseTags(text: string): string[] {
  const out: string[] = []
  for (const raw of text.split(/[\s,]+/)) {
    const t = raw.replace(/^#+/, '').trim()
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}

// 메모 편집 팝업: 왼쪽=정사각 사진+교체+태그검색, 오른쪽=제목/본문/태그.
export default function NoteEditor({ nodeId }: { nodeId: string }) {
  const slotPid = getNoteEditorPid()
  const [viewedId, setViewedId] = useState(nodeId)
  const [query, setQuery] = useState('')
  const [tagText, setTagText] = useState('')

  // 다른 노트로 새로 열리면 미리보기/검색 초기화
  useEffect(() => {
    setViewedId(nodeId)
    setQuery('')
  }, [nodeId])

  // 보고 있는 노트가 바뀌면 입력 중이던 태그 글자 비움
  useEffect(() => {
    setTagText('')
  }, [viewedId])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNote()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const n = getNode(viewedId)
  if (!n) return null

  const addTags = () => {
    const toks = parseTags(tagText)
    if (!toks.length) return
    const merged = [...(n.tags || [])]
    for (const t of toks) if (!merged.includes(t)) merged.push(t)
    updateNode(n.id, { tags: merged })
    setTagText('')
  }
  const removeTag = (t: string) => updateNode(n.id, { tags: (n.tags || []).filter((x) => x !== t) })

  // 자리에 실제로 꽂힌 노트 (교체 가능 여부 판단용)
  const slotNodeId = slotPid ? getPlacement(slotPid)?.nodeId : nodeId
  const canSwap = !!slotPid && viewedId !== slotNodeId
  const asset = n.assetId ? getAsset(n.assetId) : undefined
  const results = searchNotesInCurrentSpace(query, viewedId)

  return createPortal(
    <S.Overlay>
      <S.Paper>
        <S.Left>
          <S.Thumb>
            {asset ? <img src={asset.thumb} alt={n.name} /> : <span>No image</span>}
          </S.Thumb>
          <S.SwapBtn
            disabled={!canSwap}
            onClick={() => slotPid && swapInNote(slotPid, viewedId)}
            title={canSwap ? 'Bring this note into the slot; the current one goes to the library' : 'Search and pick another note to swap in'}
          >
            ⇄ Swap in
          </S.SwapBtn>
          <S.Search
            value={query}
            placeholder="Search this space by #tag"
            onChange={(e) => setQuery(e.target.value)}
          />
          <S.Results>
            {results.length === 0 ? (
              <S.Empty>{query ? 'No results' : 'No other notes in this space'}</S.Empty>
            ) : (
              results.map((r) => {
                const ra = r.assetId ? getAsset(r.assetId) : undefined
                return (
                  <S.ResultItem key={r.id} $on={r.id === viewedId} onClick={() => setViewedId(r.id)}>
                    {ra ? (
                      <img className="t" src={ra.thumb} alt="" />
                    ) : (
                      <span className="t" />
                    )}
                    <span className="m">
                      <div className="nm">{r.name || 'Untitled'}</div>
                      {r.tags?.length ? <div className="tg">{r.tags.map((t) => '#' + t).join(' ')}</div> : null}
                    </span>
                  </S.ResultItem>
                )
              })
            )}
          </S.Results>
        </S.Left>

        <S.Right>
          <S.Bar>
            <S.Title
              value={n.name}
              placeholder="Untitled"
              onChange={(e) => updateNode(n.id, { name: e.target.value })}
            />
            {canSwap && slotNodeId && (
              <S.Revert
                onClick={() => setViewedId(slotNodeId)}
                title="Back to the original note in this slot"
              >
                ↩
              </S.Revert>
            )}
            <S.Close onClick={closeNote} title="Close (Esc)">✕</S.Close>
          </S.Bar>
          <S.Body
            value={n.body ?? ''}
            placeholder="Write your note…"
            onChange={(e) => updateNode(n.id, { body: e.target.value })}
          />
          <S.TagBar>
            {(n.tags || []).map((t) => (
              <S.Tag key={t}>
                #{t}
                <button onClick={() => removeTag(t)} title="Remove">
                  ×
                </button>
              </S.Tag>
            ))}
            <S.TagInput
              value={tagText}
              placeholder={n.tags?.length ? 'Add tag…' : 'Type #tag then Enter'}
              onChange={(e) => setTagText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  e.stopPropagation()
                  addTags()
                } else if (e.key === 'Backspace' && !tagText && n.tags?.length) {
                  // 빈 입력에서 Backspace → 마지막 태그 삭제
                  e.preventDefault()
                  removeTag(n.tags[n.tags.length - 1])
                }
              }}
            />
          </S.TagBar>
        </S.Right>
      </S.Paper>
    </S.Overlay>,
    document.body,
  )
}
