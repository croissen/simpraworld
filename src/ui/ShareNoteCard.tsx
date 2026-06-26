import { forwardRef } from 'react'
import type { Asset, SNode } from '../types'

// 공유 캡처용 깔끔한 노트 카드(버튼 없이 사진·제목·내용·해시태그만).
// PC: [사진+해시태그(이미지 밑) | 제목+내용] 2단. 모바일: 사진 → 제목 → 해시태그 → 내용 세로.
const CREAM = '#f3f1ea'
const INK = '#2b2a26'

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: INK,
  lineHeight: 1.3,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}
const bodyStyle: React.CSSProperties = {
  fontSize: 15,
  color: INK,
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  tabSize: 8, // 메모 Tab 정렬을 공유 카드에서도 동일하게
  fontVariantNumeric: 'tabular-nums', // 숫자 폭 고정(figure space 정렬과 일치)
}
const chipsStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
const chipStyle: React.CSSProperties = {
  background: '#e7e2d4',
  color: '#6b6453',
  border: '1px solid #d4cdb9',
  borderRadius: 999,
  padding: '3px 10px',
  fontSize: 13,
}
const imgStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 12,
  display: 'block',
  objectFit: 'cover',
}

const ShareNoteCard = forwardRef<HTMLDivElement, { node: SNode; asset?: Asset; mobile: boolean }>(
  ({ node, asset, mobile }, ref) => {
    const tags = (node.tags || []).map((t) => '#' + t)
    const Chips =
      tags.length > 0 ? (
        <div style={chipsStyle}>
          {tags.map((t) => (
            <span key={t} style={chipStyle}>
              {t}
            </span>
          ))}
        </div>
      ) : null
    const Img = asset ? <img src={asset.thumb} alt="" style={imgStyle} /> : null
    const Title = <div style={titleStyle}>{node.name || 'Untitled'}</div>
    const Body = node.body ? <div style={bodyStyle}>{node.body}</div> : null

    if (mobile) {
      return (
        <div
          ref={ref}
          style={{
            width: 480,
            background: CREAM,
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {Img}
          {Title}
          {Chips}
          {Body}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        style={{
          width: 720,
          background: CREAM,
          borderRadius: 16,
          padding: 22,
          display: 'flex',
          gap: 22,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ width: 280, flex: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Img}
          {Chips}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Title}
          {Body}
        </div>
      </div>
    )
  },
)
ShareNoteCard.displayName = 'ShareNoteCard'
export default ShareNoteCard
