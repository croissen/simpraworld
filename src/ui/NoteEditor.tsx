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
import TagRow from './TagRow'
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

// 네이티브 입력과 달리 execCommand로 넣은 줄은 textarea가 커서로 스크롤을 안 해준다.
// → 커서까지의 텍스트를 동일한 글꼴/폭/줄바꿈 설정의 "미러 div"로 그려 커서의 실제 픽셀 Y를
//   측정(래핑 포함)하고, 그 줄이 보이도록 scrollTop을 맞춘다.
function scrollCaretIntoView(ta: HTMLTextAreaElement) {
  const cs = getComputedStyle(ta)
  const mirror = document.createElement('div')
  const s = mirror.style
  s.position = 'absolute'
  s.left = '-9999px'
  s.top = '0'
  s.visibility = 'hidden'
  s.whiteSpace = 'pre-wrap'
  s.overflowWrap = 'break-word'
  s.wordBreak = cs.wordBreak
  s.boxSizing = 'border-box'
  s.width = ta.clientWidth + 'px'
  s.font = cs.font
  s.lineHeight = cs.lineHeight
  s.letterSpacing = cs.letterSpacing
  s.padding = cs.padding
  s.tabSize = (cs as unknown as { tabSize: string }).tabSize
  mirror.textContent = ta.value.slice(0, ta.selectionEnd)
  const marker = document.createElement('span')
  marker.textContent = '​' // 커서 위치
  mirror.appendChild(marker)
  document.body.appendChild(mirror)
  const caretTop = marker.offsetTop // 커서 줄의 픽셀 Y(미러 패딩 포함)
  document.body.removeChild(mirror)
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4
  if (caretTop + lh > ta.scrollTop + ta.clientHeight) {
    ta.scrollTop = caretTop + lh - ta.clientHeight // 아래로 벗어남 → 커서 줄을 바닥에 맞춤
  } else if (caretTop < ta.scrollTop) {
    ta.scrollTop = caretTop // 위로 벗어남
  }
}

const MAX_TAGS = 10 // 해시태그 최대 개수

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
  const [shareMode, setShareMode] = useState<null | 'gallery' | 'clipboard'>(null)
  // 모바일 포커스 모드: 'content'=내용만, 'tags'=해시태그만, 'none'=전체(제목/검색/보기)
  const [focusMode, setFocusMode] = useState<'none' | 'content' | 'tags'>('none')
  const thumbRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null) // 실제 메모창(캡처 대상)
  const overlayRef = useRef<HTMLDivElement>(null) // 모바일: 키보드 위 보이는 영역에 편집기 맞추기

  // 모바일 키보드 대응:
  //  - 내용/태그 편집(focusMode≠none) + 키보드 열림 → 보이는 영역(visualViewport)에 맞춰 편집기를 키보드 위로.
  //  - 제목/검색(none) → 화면 안 줄임(전체 유지, 키보드가 아래를 가려도 OK).
  //  - 키보드 닫히면 → 즉시 원래 화면 복귀(스타일 리셋 + 포커스 모드 해제).
  useEffect(() => {
    const vv = window.visualViewport
    const el = overlayRef.current
    if (!vv || !el) return
    const reset = () => {
      el.style.height = ''
      el.style.top = ''
      el.style.bottom = ''
    }
    const sync = () => {
      const kbOpen = window.innerHeight - vv.height > 120
      if (!kbOpen) {
        reset()
        if (focusMode !== 'none') setFocusMode('none') // 키보드 닫힘 → 원래 화면
      } else if (focusMode !== 'none') {
        el.style.height = vv.height + 'px'
        el.style.top = vv.offsetTop + 'px'
        el.style.bottom = 'auto'
      } else {
        reset() // 제목/검색 편집 중엔 안 줄임
      }
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [focusMode])

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
    for (const t of toks) if (!merged.includes(t) && merged.length < MAX_TAGS) merged.push(t) // 최대 10개
    updateNode(n.id, { tags: merged })
    setTagText('')
  }
  const tagsFull = (n.tags?.length ?? 0) >= MAX_TAGS // 10개 다 참 → 입력 막고 'Max' 표시
  // 태그 입력칸 안내문(영어): 가득 차면 한도 안내, 아니면 최대 개수 표기
  const tagPlaceholder = tagsFull
    ? `Max ${MAX_TAGS} tags`
    : n.tags?.length
      ? `Add tag… (max ${MAX_TAGS})`
      : `Type #tag then Enter (max ${MAX_TAGS})`
  const removeTag = (t: string) => updateNode(n.id, { tags: (n.tags || []).filter((x) => x !== t) })

  // 태그 입력 키 처리: Enter/콤마=추가(한글 조합 중 제외), 빈 칸에서 Backspace=마지막 태그 삭제
  const onTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && !e.nativeEvent.isComposing) {
      e.preventDefault()
      e.stopPropagation()
      addTags()
    } else if (e.key === 'Backspace' && tagText === '' && (n.tags?.length ?? 0) > 0) {
      e.preventDefault()
      updateNode(n.id, { tags: (n.tags || []).slice(0, -1) }) // 마지막 태그부터 하나씩
    }
  }

  // 해시태그 칩(드래그 정렬은 TagRow가 처리)
  const renderTags = () => (
    <TagRow
      tags={n.tags || []}
      onReorder={(tags) => updateNode(n.id, { tags })}
      onRemove={removeTag}
    />
  )
  // 교체 실행 + 검색란 비우기(스와이프로 교체했으면 검색어 초기화)
  const doSwap = () => {
    if (!slotPid) return
    swapInNote(slotPid, viewedId)
    setQuery('')
  }
  // 노트 공유 팝업 열기
  const doShare = () => setShareOpen(true)

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

  // 갤러리/클립보드: capturing(버튼 숨김+해시태그 위로) 모드를 켜고, 그 렌더가 "커밋된 뒤"에 캡처
  const shareGallery = () => {
    setShareOpen(false)
    setShareMode('gallery')
    setCapturing(true)
  }
  const shareClipboard = () => {
    setShareOpen(false)
    setShareMode('clipboard')
    setCapturing(true)
  }

  // capturing 모드 렌더가 적용된 뒤(effect = 커밋 이후) 캡처 → 버튼 숨김/해시태그 이동이 항상 반영됨
  useEffect(() => {
    if (!capturing || !shareMode) return
    let cancelled = false
    ;(async () => {
      // 커밋 이후(effect) + 약간의 지연으로 레이아웃 확정 후 캡처(rAF 비의존)
      await new Promise((r) => setTimeout(r, 60))
      try {
        await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready
      } catch {
        /* 무시 */
      }
      let blob: Blob | null = null
      try {
        if (paperRef.current)
          blob = await toBlob(paperRef.current, { pixelRatio: 2, backgroundColor: '#f3f1ea' })
      } catch (e) {
        console.warn('capture failed', e)
      }
      if (cancelled) return
      const mode = shareMode
      setCapturing(false)
      setShareMode(null)
      if (!blob) return
      if (mode === 'gallery') {
        downloadImage(blob)
      } else {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          alert('Image copied to clipboard')
        } catch {
          alert('Could not copy image — clipboard image copy needs HTTPS')
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturing, shareMode])

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

  // 본문 키 처리. execCommand('insertText')는 네이티브 실행취소를 유지하고 onChange도 발생시킨다.
  // 리스트 칸 정렬은 일반 스페이스 대신 "폭이 정해진 특수 공백"으로 채운다(비례폰트에서도 정확히 맞음):
  //   FIG(U+2007 figure space) = 숫자 한 글자 폭, PUN(U+2008 punctuation space) = 마침표 폭.
  // 숫자를 "100." 기준(3자리)으로 보고, 점 뒤를 FIG로 채워 내용 시작 칸을 통일. 연속줄(Shift+Enter)은
  // FIG×자리수 + PUN(점) + 공백 으로 내용 위치를 그대로 재현 → 칸이 폰트와 무관하게 딱 맞는다.
  const FIG = ' ' // 숫자 폭 공백
  const PUN = ' ' // 마침표 폭 공백
  const NUM_FIELD = 3 // "100." 기준 자리수
  // 숫자 마커: "1." + (3자리 채우는 FIG) + 공백 → "1.[FIG][FIG] ", "100." → "100. "
  const numMarker = (n: number, dot: string) => {
    const d = String(n)
    return d + dot + FIG.repeat(Math.max(0, NUM_FIELD - d.length)) + ' '
  }
  // 숫자 줄의 연속줄 들여쓰기: 내용 시작 칸과 같은 폭(FIG×자리수 + 점폭 + 공백)
  const numIndent = (digits: number) => FIG.repeat(Math.max(NUM_FIELD, digits)) + PUN + ' '

  const onBodyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab = 탭 문자 삽입(표 칸 맞춤용). textarea 기본(포커스 이동) 막음.
    if (e.key === 'Tab') {
      e.preventDefault()
      document.execCommand('insertText', false, '\t')
      return
    }

    const ta = e.currentTarget
    const { selectionStart: s, selectionEnd: en, value } = ta

    // (숫자 마커 뒤 공백 → 칸 정렬 변환은 onBodyChange에서 처리: 모바일 키보드는 keydown으로
    //  스페이스를 제대로 안 알려줘서 입력 이벤트 기반이어야 동작함)

    // Enter 처리(한글 조합 중은 글자 확정용이라 건드리지 않음)
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      if (s !== en) return // 선택영역 있으면 기본
      const lineStart = value.lastIndexOf('\n', s - 1) + 1
      const line = value.slice(lineStart, s)
      const num = line.match(/^(\s*)(\d+)([.)])(\s+)(.*)$/) // "1.   " / "2)  " (FIG 포함)
      const bullet = line.match(/^(\s*)([●•\-*])(\s+)(.*)$/) // "● " / "- "
      const m = num || bullet
      const content = m ? (m[5] ?? m[4]) : null // 마커 뒤 내용

      // Shift+Enter = 같은 항목 안에서 줄바꿈 → 내용 시작 칸과 같은 폭으로 들여써서 아래 정렬
      if (e.shiftKey) {
        const indent = num
          ? num[1] + numIndent(num[2].length) // 숫자줄: FIG×자리수 + 점폭 + 공백
          : bullet
            ? bullet[1] + FIG + ' ' // 불릿줄: ● 근사(숫자폭+공백)
            : line.match(/^\s*/)![0] // 이미 들여쓴 줄: 같은 들여쓰기 유지
        if (!indent) return // 들여쓸 게 없으면 기본 줄바꿈
        e.preventDefault()
        document.execCommand('insertText', false, '\n' + indent)
        requestAnimationFrame(() => scrollCaretIntoView(ta))
        return
      }

      // 일반 Enter = 리스트(넘버링/불릿) 자동 이어가기
      if (!m) return // 마커 없으면 기본 줄바꿈
      if (content!.trim() === '') {
        // 빈 항목에서 Enter → 마커 지우고 리스트 종료
        e.preventDefault()
        ta.setSelectionRange(lineStart, s)
        document.execCommand('insertText', false, '')
        return
      }
      e.preventDefault()
      const next = num
        ? num[1] + numMarker(parseInt(num[2], 10) + 1, num[3]) // 숫자 +1, 칸 정렬 채움
        : `${bullet![1]}${bullet![2]} ` // "● "
      document.execCommand('insertText', false, '\n' + next)
      requestAnimationFrame(() => scrollCaretIntoView(ta))
    }
  }

  // 본문 입력. 줄 맨 앞 "숫자." 뒤에 일반 공백 1칸을 막 쳤으면 → 칸 정렬 채움(FIG)으로 교체.
  // (keydown이 아닌 입력 이벤트라 PC·모바일 모두에서 동작) 그 외에는 그대로 저장.
  const onBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const ta = e.target
    const caret = ta.selectionStart
    const v = ta.value
    const before = v.slice(v.lastIndexOf('\n', caret - 1) + 1, caret)
    const mm = before.match(/^\s*(\d+)[.)] $/) // "1. " (마커 + 일반공백, 커서 바로 뒤)
    if (mm && ta.selectionEnd === caret) {
      ta.setSelectionRange(caret - 1, caret) // 방금 친 공백 1칸 선택
      document.execCommand('insertText', false, FIG.repeat(Math.max(0, NUM_FIELD - mm[1].length)) + ' ')
      return // execCommand가 onChange를 다시 트리거 → 거기서 updateNode 반영
    }
    updateNode(n.id, { body: v })
  }

  // 모바일용 Tab 버튼: 소프트 키보드엔 Tab 키가 없어서 직접 삽입한다.
  // pointerdown에서 preventDefault → 본문 textarea 포커스(=키보드) 유지한 채 커서 위치에 탭 삽입.
  const insertTabFromButton = (e: React.PointerEvent) => {
    e.preventDefault()
    const el = document.activeElement
    if (el && el.tagName === 'TEXTAREA') document.execCommand('insertText', false, '\t')
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
            {/* 모바일은 이미지 클립보드 복사가 안 돼서 제외 */}
            {!isMobile && <S.ShareItem onClick={shareClipboard}>📋 Copy image</S.ShareItem>}
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
      {(n.tags?.length ?? 0) > 0 && <S.TagChips>{renderTags()}</S.TagChips>}
      <S.TagInput
        value={tagText}
        readOnly={locked || tagsFull} // 잠금 또는 10개 다 차면 입력 막음
        enterKeyHint="done"
        onDoubleClick={enterEdit}
        placeholder={tagPlaceholder}
        onChange={(e) => setTagText(e.target.value)}
        onKeyDown={onTagKeyDown}
        onFocus={() => isMobile && setFocusMode('tags')} // 해시태그 편집 → 태그만(모바일)
        // 모바일은 키보드 Enter("이동")가 keydown으로 안 잡혀도, 포커스 벗어날 때 확정 추가
        onBlur={() => {
          addTags()
          if (isMobile) setFocusMode('none')
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
      <S.Overlay ref={overlayRef}>
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

          <S.BodyWrap>
            <S.Body
              value={n.body ?? ''}
              placeholder={locked ? 'Double-tap to edit' : 'Write your note…'}
              readOnly={locked}
              onDoubleClick={enterEdit} // 더블탭 → 바로 수정+키패드
              onKeyDown={onBodyKeyDown}
              onChange={onBodyChange}
              onFocus={() => setFocusMode('content')} // 키보드 리사이즈 판단용(섹션 숨김은 안 함)
              onBlur={() => setFocusMode('none')}
            />
            {!locked && !capturing && (
              <S.TabKey onPointerDown={insertTabFromButton} title="Insert tab (align columns)">
                ⇥ Tab
              </S.TabKey>
            )}
          </S.BodyWrap>
          {capBody}
          {tagBar}
        </S.MPaper>
        {extras}
      </S.Overlay>,
      document.body,
    )
  }

  return createPortal(
    <S.Overlay ref={overlayRef}>
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
            onKeyDown={onBodyKeyDown}
            onChange={onBodyChange}
          />
          {capBody}
          <S.TagBar>
            {(n.tags?.length ?? 0) > 0 && <S.TagChips>{renderTags()}</S.TagChips>}
            <S.TagInput
              value={tagText}
              readOnly={tagsFull} // 10개 다 차면 입력 막음
              enterKeyHint="done"
              placeholder={tagPlaceholder}
              onChange={(e) => setTagText(e.target.value)}
              onKeyDown={onTagKeyDown}
              onBlur={addTags}
            />
          </S.TagBar>
        </S.Right>
      </S.Paper>
      {extras}
    </S.Overlay>,
    document.body,
  )
}
