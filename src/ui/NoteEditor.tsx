import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DEFAULT_BADGE_SIZE,
  addAsset,
  closeNote,
  getAsset,
  getNode,
  getNoteEditorPid,
  getPlacement,
  searchNotesInCurrentSpace,
  swapInNote,
  updateNode,
} from '../store'
import { uid } from '../types'
import type { SNode } from '../types'
import { toBlob } from 'html-to-image'
import { fileToImage, pickImageFile } from '../image'
import { useIsMobile } from '../useIsMobile'
import ConfirmModal from './ConfirmModal'
import * as S from './NoteEditor.styles'

// 배지 편집 팝업: 내용(줄바꿈) / 폰트크기(직접 입력) / 글자색 / 배경색(+배경 없음).
// 편집 중엔 로컬 초안만 → Done 눌러야 저장(그래서 사이즈도 자유롭게 지우고 다시 입력 가능).
function BadgeEditor({ node, onClose }: { node: SNode; onClose: () => void }) {
  const [text, setText] = useState(node.badge ?? '')
  const [sizeText, setSizeText] = useState(String(node.badgeSize || DEFAULT_BADGE_SIZE))
  const [color, setColor] = useState(node.badgeColor || '#1a1300')
  const [noBg, setNoBg] = useState(node.badgeBg === 'none')
  const [bg, setBg] = useState(node.badgeBg && node.badgeBg !== 'none' ? node.badgeBg : '#e3b341')
  const areaRef = useRef<HTMLTextAreaElement>(null)

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }
  useEffect(() => {
    if (areaRef.current) grow(areaRef.current)
  }, [])

  const save = () => {
    if (!text.trim()) {
      updateNode(node.id, { badge: undefined }) // 빈 배지는 제거
    } else {
      const s = parseInt(sizeText, 10)
      updateNode(node.id, {
        badge: text,
        badgeSize: isNaN(s) ? DEFAULT_BADGE_SIZE : Math.max(4, Math.min(400, s)),
        badgeColor: color,
        badgeBg: noBg ? 'none' : bg,
      })
    }
    onClose()
  }

  return (
    <S.BadgePop onClick={(e) => e.stopPropagation()}>
      <S.PopRow>
        <S.PopArea
          ref={areaRef}
          rows={1}
          autoFocus
          value={text}
          placeholder="badge text"
          onChange={(e) => {
            setText(e.target.value)
            grow(e.target)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              onClose() // 취소(저장 안 함)
            }
          }}
        />
        <S.PopX onClick={onClose} title="Close">
          ✕
        </S.PopX>
      </S.PopRow>
      <S.PopRow>
        <S.PopLabel>Size</S.PopLabel>
        <S.PopInput
          inputMode="numeric"
          value={sizeText}
          placeholder="14"
          onChange={(e) => setSizeText(e.target.value.replace(/[^0-9]/g, ''))}
        />
      </S.PopRow>
      <S.PopRow>
        <S.PopLabel>Text</S.PopLabel>
        <S.PopColor type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <S.PopLabel style={{ width: 'auto' }}>Bg</S.PopLabel>
        <S.PopColor
          type="color"
          value={bg}
          onChange={(e) => {
            setBg(e.target.value)
            setNoBg(false)
          }}
        />
        <S.PopBtn $on={noBg} onClick={() => setNoBg((v) => !v)}>
          No bg
        </S.PopBtn>
      </S.PopRow>
      <S.PopRow>
        <S.PopBtn style={{ flex: 1, textAlign: 'center' }} onClick={save}>
          Done
        </S.PopBtn>
      </S.PopRow>
    </S.BadgePop>
  )
}

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
  const isMobile = useIsMobile()
  const slotPid = getNoteEditorPid()
  const [viewedId, setViewedId] = useState(nodeId)
  const [query, setQuery] = useState('')
  const [tagText, setTagText] = useState('')
  const [editingBadge, setEditingBadge] = useState(false)
  const [editLocked, setEditLocked] = useState(true) // 모바일: 기본 읽기전용(키패드 안 뜸)
  const [photoMenu, setPhotoMenu] = useState(false) // PC 사진 클릭 메뉴
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 }) // 메뉴를 띄울 위치(사진박스 중앙)
  const [confirmDel, setConfirmDel] = useState(false)
  const [viewPhoto, setViewPhoto] = useState(false) // 모바일 사진 크게보기
  const [shareOpen, setShareOpen] = useState(false) // 공유 팝업
  const [capturing, setCapturing] = useState(false) // 캡처 중(버튼 숨김)
  const thumbRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null) // 실제 메모창(캡처 대상)
  const shareBlobRef = useRef<Blob | null>(null) // 팝업 열릴 때 미리 캡처한 이미지

  // 다른 노트로 새로 열리면 미리보기/검색 초기화
  useEffect(() => {
    setViewedId(nodeId)
    setQuery('')
  }, [nodeId])

  // 보고 있는 노트가 바뀌면 입력 중이던 태그·배지 편집 상태 초기화 + 다시 읽기전용
  useEffect(() => {
    setTagText('')
    setEditingBadge(false)
    setEditLocked(true)
    setPhotoMenu(false)
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
  // 교체 실행 + 검색란 비우기(스와이프로 교체했으면 검색어 초기화)
  const doSwap = () => {
    if (!slotPid) return
    swapInNote(slotPid, viewedId)
    setQuery('')
  }
  // 노트 공유 팝업 열기
  const doShare = () => setShareOpen(true)

  // 실제 메모창을 버튼만 숨겨(capturing) 그대로 PNG로 캡처
  const captureBlob = async () => {
    setCapturing(true)
    // 두 프레임 대기 → 버튼 숨김 반영 후 캡처
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    try {
      await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready
    } catch {
      /* 폰트 대기 실패 무시 */
    }
    let blob: Blob | null = null
    try {
      // cacheBust 금지: 사진 dataURL에 ?가 붙어 깨짐
      if (paperRef.current)
        blob = await toBlob(paperRef.current, { pixelRatio: 2, backgroundColor: '#f3f1ea' })
    } catch (e) {
      console.warn('capture failed', e)
    } finally {
      setCapturing(false)
    }
    return blob
  }

  // 이미지 다운로드(폴백 공통)
  const downloadImage = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(n.name || 'note').trim()}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  // 텍스트 복사(HTTPS=Clipboard API, HTTP=레거시 execCommand 폴백)
  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      /* fall through */
    }
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }

  // 팝업 열릴 때 미리 캡처(공유 시트는 사용자 제스처 내 호출 필요 → 미리 준비)
  useEffect(() => {
    if (!shareOpen) return
    shareBlobRef.current = null
    captureBlob().then((b) => (shareBlobRef.current = b))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareOpen])

  // 갤러리: 메모 화면을 이미지로 저장(다운로드)
  const shareGallery = async () => {
    setShareOpen(false)
    const blob = shareBlobRef.current ?? (await captureBlob())
    if (!blob) return
    downloadImage(blob)
  }

  // 이미지를 클립보드에 복사(붙여넣기용). 공유 시트 안 띄움.
  const shareClipboard = async () => {
    const blob = shareBlobRef.current // 제스처 보존 위해 미리 캡처해둔 것 사용
    setShareOpen(false)
    if (!blob) return
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      alert('Image copied to clipboard')
    } catch {
      alert('Could not copy image — clipboard image copy needs HTTPS')
    }
  }

  // 텍스트: 제목 / 내용 / 해시태그 형식으로 복사
  const shareText = async () => {
    setShareOpen(false)
    const tagLine = (n.tags || []).map((t) => '#' + t).join(' ')
    const text = [n.name?.trim(), n.body?.trim(), tagLine].filter(Boolean).join('\n\n')
    alert((await copyText(text)) ? 'Text copied' : 'Copy failed')
  }

  // 모바일 읽기전용 영역 더블탭 → 그 자리에서 바로 수정+키패드(제스처 안에서 readOnly 해제+focus)
  const enterEdit = (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!isMobile || !editLocked) return
    const el = e.currentTarget
    el.readOnly = false
    el.blur() // 이미 포커스된 상태(특히 textarea)면 focus가 무시되므로 강제 재포커스 → 키패드 즉시
    el.focus()
    setEditLocked(false)
  }

  // 자리에 실제로 꽂힌 노트 (교체 가능 여부 판단용)
  const slotNodeId = slotPid ? getPlacement(slotPid)?.nodeId : nodeId
  const canSwap = !!slotPid && viewedId !== slotNodeId
  const asset = n.assetId ? getAsset(n.assetId) : undefined
  const results = searchNotesInCurrentSpace(query, viewedId)
  const searching = !!query.trim()
  // 검색 중이면(수정 안 하는 상태) 편집 잠금. 제목/본문/태그 입력 잠금(검색·배지는 항상 가능)
  const locked = isMobile && (editLocked || searching)
  const backToNote = () => {
    setQuery('')
    setViewedId(slotNodeId || nodeId) // 원래 노트로 돌아오기
  }

  // 검색 입력 + 오른쪽 초기화(✕) 버튼
  const searchRow = (
    <S.SearchRow>
      <S.Search
        value={query}
        placeholder="Search this space by #tag"
        onChange={(e) => setQuery(e.target.value)}
      />
      {searching && (
        <S.ClearBtn onClick={() => setQuery('')} title="Clear search">
          🗑
        </S.ClearBtn>
      )}
    </S.SearchRow>
  )

  // 사진 교체: 이미지 골라 새 에셋으로 교체
  const replacePhoto = async () => {
    setPhotoMenu(false)
    const file = await pickImageFile()
    if (!file) return
    const img = await fileToImage(file)
    const a = { id: uid('a'), kind: 'image' as const, mime: img.mime, thumb: img.thumb }
    addAsset(a)
    updateNode(n.id, { assetId: a.id, shape: 'image' })
  }
  const deletePhoto = () => {
    updateNode(n.id, { assetId: undefined })
    setConfirmDel(false)
  }

  // 사진 클릭 메뉴 / 삭제 확인 / 크게보기 (PC·모바일 공통 오버레이)
  const extras = (
    <>
      {photoMenu && isMobile && <S.PhotoMask onClick={() => setPhotoMenu(false)} />}
      {photoMenu && !isMobile && (
        <>
          <S.PhotoMask onClick={() => setPhotoMenu(false)} />
          <S.PhotoMenu style={{ left: menuPos.x, top: menuPos.y }}>
            <S.PhotoMenuItem onClick={replacePhoto}>{asset ? 'Replace image' : 'Add image'}</S.PhotoMenuItem>
            {asset && (
              <S.PhotoMenuItem
                $danger
                onClick={() => {
                  setPhotoMenu(false)
                  setConfirmDel(true)
                }}
              >
                Delete image
              </S.PhotoMenuItem>
            )}
          </S.PhotoMenu>
        </>
      )}
      {confirmDel && (
        <ConfirmModal
          message="Delete this image?"
          confirmLabel="Delete"
          onConfirm={deletePhoto}
          onCancel={() => setConfirmDel(false)}
        />
      )}
      {viewPhoto && asset && (
        <S.FullView onClick={() => setViewPhoto(false)}>
          <img src={asset.thumb} alt={n.name} />
        </S.FullView>
      )}
      {shareOpen && (
        <S.SharePop onClick={() => setShareOpen(false)}>
          <S.ShareSheet onClick={(e) => e.stopPropagation()}>
            <S.ShareItem onClick={shareGallery}>🖼 Save image</S.ShareItem>
            <S.ShareItem onClick={shareClipboard}>📋 Copy image</S.ShareItem>
            <S.ShareItem onClick={shareText}>📝 Copy text</S.ShareItem>
          </S.ShareSheet>
        </S.SharePop>
      )}
    </>
  )

  // 배지 미리보기(편집 아닐 때): 있으면 칩, 없으면 흰 점. (사진 메뉴와 안 겹치게 stopPropagation)
  const badgeChip = editingBadge ? null : n.badge?.trim() ? (
    <S.Badge
      onClick={(e) => {
        e.stopPropagation()
        setEditingBadge(true)
      }}
      title="Edit badge"
      style={{
        background: n.badgeBg === 'none' ? 'transparent' : n.badgeBg || '#e3b341',
        color: n.badgeColor || (n.badgeBg === 'none' ? '#fff' : '#1a1300'),
        textShadow: n.badgeBg === 'none' ? '0 1px 3px #000' : 'none',
      }}
    >
      {n.badge}
    </S.Badge>
  ) : (
    <S.BadgeDot
      onClick={(e) => {
        e.stopPropagation()
        setEditingBadge(true)
      }}
      title="Add a badge"
    />
  )

  const tagBar = (
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
        readOnly={locked}
        onDoubleClick={enterEdit}
        placeholder={n.tags?.length ? 'Add tag…' : 'Type #tag then Enter'}
        onChange={(e) => setTagText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            e.stopPropagation()
            addTags()
          }
        }}
      />
    </S.TagBar>
  )

  // 캡처용: 해시태그 칩(위치 이동) / 본문 전체(div, 안 잘림)
  const capTags =
    capturing && n.tags?.length ? (
      <S.CapTags>
        {n.tags.map((t) => (
          <S.CapTag key={t}>#{t}</S.CapTag>
        ))}
      </S.CapTags>
    ) : null
  const capBody = capturing ? <S.CapBody>{n.body || ''}</S.CapBody> : null

  // ── 모바일 레이아웃: [작은 사진 | 제목/검색 + X] → 본문이 나머지 채움 ──
  if (isMobile) {
    return createPortal(
      <S.Overlay>
        <S.MPaper ref={paperRef} $cap={capturing}>
          {editingBadge && (
            <S.MBadgeWrap>
              <BadgeEditor node={n} onClose={() => setEditingBadge(false)} />
            </S.MBadgeWrap>
          )}
          <S.MHead>
            <S.MThumb onClick={() => setPhotoMenu(true)} title="Photo">
              {asset ? <img src={asset.thumb} alt={n.name} /> : <span className="ph">No image</span>}
              {badgeChip}
              {photoMenu && (
                <S.MThumbMenu
                  onClick={(e) => {
                    e.stopPropagation()
                    setPhotoMenu(false)
                  }}
                >
                  {asset && (
                    <S.PBtn
                      $c="del"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPhotoMenu(false)
                        setConfirmDel(true)
                      }}
                      title="Delete"
                    >
                      🗑
                    </S.PBtn>
                  )}
                  <S.PBtn $c="rep" onClick={(e) => (e.stopPropagation(), replacePhoto())} title="Replace">
                    🔄
                  </S.PBtn>
                  {asset && (
                    <S.PBtn
                      $c="view"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPhotoMenu(false)
                        setViewPhoto(true)
                      }}
                      title="View"
                    >
                      👁
                    </S.PBtn>
                  )}
                </S.MThumbMenu>
              )}
            </S.MThumb>
            <S.MMeta>
              <S.MTitleRow>
                <S.Title
                  value={n.name}
                  placeholder="Untitled"
                  readOnly={locked}
                  onDoubleClick={enterEdit}
                  onChange={(e) => updateNode(n.id, { name: e.target.value })}
                />
                {searching ? (
                  // 검색 중 = 수정 안 함 → 연필/눈 대신 "노트로 되돌아오기"
                  <S.Revert onClick={backToNote} title="Back to note">
                    ↩
                  </S.Revert>
                ) : (
                  <>
                    {canSwap && slotNodeId && (
                      <S.Revert onClick={() => setViewedId(slotNodeId)} title="Back to original">
                        ↩
                      </S.Revert>
                    )}
                    <S.Revert
                      onClick={() => setEditLocked((v) => !v)}
                      title={editLocked ? 'Edit' : 'View (lock editing)'}
                    >
                      {editLocked ? '✎' : '👁'}
                    </S.Revert>
                  </>
                )}
                <S.Close onClick={closeNote} title="Close">
                  ✕
                </S.Close>
              </S.MTitleRow>
              {capTags}
              {searchRow}
              {canSwap ? (
                <S.ActionRow>
                  <S.SwapBtn style={{ flex: 8 }} onClick={doSwap}>
                    ⇄ Swap in
                  </S.SwapBtn>
                  <S.ShareBtn style={{ flex: 2 }} onClick={doShare} title="Share this note">
                    📤
                  </S.ShareBtn>
                </S.ActionRow>
              ) : (
                <S.ShareBtn style={{ width: '100%' }} onClick={doShare} title="Share this note">
                  📤 Share
                </S.ShareBtn>
              )}
            </S.MMeta>
          </S.MHead>

          {query.trim() && (
            <S.MResults>
              {results.length === 0 ? (
                <S.Empty>No results</S.Empty>
              ) : (
                results.map((r) => {
                  const ra = r.assetId ? getAsset(r.assetId) : undefined
                  return (
                    <S.ResultItem key={r.id} $on={r.id === viewedId} onClick={() => setViewedId(r.id)}>
                      {ra ? <img className="t" src={ra.thumb} alt="" /> : <span className="t" />}
                      <span className="m">
                        <div className="nm">{r.name || 'Untitled'}</div>
                        {r.tags?.length ? (
                          <div className="tg">{r.tags.map((t) => '#' + t).join(' ')}</div>
                        ) : null}
                      </span>
                    </S.ResultItem>
                  )
                })
              )}
            </S.MResults>
          )}

          <S.Body
            value={n.body ?? ''}
            placeholder={locked ? 'Double-tap to edit' : 'Write your note…'}
            readOnly={locked}
            onDoubleClick={enterEdit} // 더블탭 → 바로 수정+키패드
            onChange={(e) => updateNode(n.id, { body: e.target.value })}
          />
          {capBody}
          {tagBar}
        </S.MPaper>
        {extras}
      </S.Overlay>,
      document.body,
    )
  }

  return createPortal(
    <S.Overlay>
      <S.Paper ref={paperRef} $cap={capturing}>
        <S.Left>
          <S.Thumb
            ref={thumbRef}
            onClick={() => {
              const r = thumbRef.current?.getBoundingClientRect()
              if (r) setMenuPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
              setPhotoMenu(true)
            }}
            title="Photo: replace / delete"
          >
            {asset ? <img src={asset.thumb} alt={n.name} /> : <span className="ph">No image</span>}
            {badgeChip}
            {editingBadge && <BadgeEditor node={n} onClose={() => setEditingBadge(false)} />}
          </S.Thumb>
          {capTags}
          {canSwap ? (
            <S.ActionRow>
              <S.SwapBtn
                style={{ flex: 8 }}
                onClick={doSwap}
                title="Bring this note into the slot; the current one goes to the library"
              >
                ⇄ Swap in
              </S.SwapBtn>
              <S.ShareBtn style={{ flex: 2 }} onClick={doShare} title="Share this note">
                📤
              </S.ShareBtn>
            </S.ActionRow>
          ) : (
            <S.ShareBtn style={{ width: '100%' }} onClick={doShare} title="Share this note">
              📤 Share
            </S.ShareBtn>
          )}
          {searchRow}
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
          {capBody}
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
                }
              }}
            />
          </S.TagBar>
        </S.Right>
      </S.Paper>
      {extras}
    </S.Overlay>,
    document.body,
  )
}
