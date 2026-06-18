import { useEffect, useState } from 'react'
import {
  addAsset,
  enterFolder,
  getAspectLocked,
  getCurrentSpace,
  getPlacement,
  getSelectedNode,
  getSoleSelectedPid,
  movePlacementToSpace,
  parentSpace,
  placementCount,
  removePlacement,
  reorderPlacement,
  selectionCount,
  setAspectLocked,
  setPlacementXY,
  togglePlacementLock,
  updateNode,
} from '../store'
import { uid } from '../types'
import type { Shape } from '../types'
import { fileToImage, pickImageFile } from '../image'
import CommitInput from './CommitInput'
import MultiInspector from './MultiInspector'
import * as S from './Inspector.styles'

const SHAPES: { v: Shape; label: string }[] = [
  { v: 'rect', label: '■' },
  { v: 'circle', label: '●' },
  { v: 'triangle', label: '▲' },
  { v: 'hexagon', label: '⬡' },
  { v: 'image', label: '🖼' },
]
// 7색 프리셋(마지막=흰색). 그 아래 직접 고르는 팔레트(ColorPicker) 제공.
const COLORS = ['#5b8cff', '#34c98a', '#ff8c5b', '#a78bfa', '#f472b6', '#e3b341', '#e5e7eb']

// '#RGB'/'#RRGGBB'(# 생략 허용) → '#RRGGBB' 대문자. 잘못된 값이면 null.
function normalizeHex(s: string): string | null {
  let v = s.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(v)) v = v.split('').map((c) => c + c).join('')
  return /^[0-9a-fA-F]{6}$/.test(v) ? '#' + v.toUpperCase() : null
}

// 직접 색 고르기: 스와치(네이티브 OS 팔레트) + HEX 입력. HEX 고치고 Enter/포커스아웃 → 그 색으로.
function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hex, setHex] = useState(value.toUpperCase())
  useEffect(() => setHex(value.toUpperCase()), [value])
  const commit = () => {
    const v = normalizeHex(hex)
    if (v) onChange(v)
    else setHex(value.toUpperCase()) // 잘못된 값 → 원복
  }
  return (
    <S.ColorRow>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <input
        type="text"
        value={hex}
        spellCheck={false}
        onChange={(e) => setHex(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur() // Enter → blur → commit
          }
        }}
        onBlur={commit}
      />
    </S.ColorRow>
  )
}

export default function Inspector({
  onRequestDelete,
  onCreateComponent,
}: {
  onRequestDelete: () => void
  onCreateComponent: () => void
}) {
  const lockRatio = getAspectLocked() // 인스펙터·캔버스 공유

  // 다중 선택 → Position / Component / Copy / Delete 만
  if (selectionCount() > 1)
    return <MultiInspector onRequestDelete={onRequestDelete} onCreateComponent={onCreateComponent} />

  const n = getSelectedNode()
  if (!n) return null
  const count = placementCount(n.id)
  const pid = getSoleSelectedPid()
  const pl = getPlacement(pid)

  // resize (keep ratio when locked)
  function setW(v: number) {
    if (!n) return
    v = Math.max(8, v)
    if (lockRatio && n.w) updateNode(n.id, { w: v, h: Math.max(8, Math.round(n.h * (v / n.w))) })
    else updateNode(n.id, { w: v })
  }
  function setH(v: number) {
    if (!n) return
    v = Math.max(8, v)
    if (lockRatio && n.h) updateNode(n.id, { h: v, w: Math.max(8, Math.round(n.w * (v / n.h))) })
    else updateNode(n.id, { h: v })
  }

  async function onPickImage() {
    const file = await pickImageFile()
    if (!file || !n) return
    const { thumb, original, mime, w, h } = await fileToImage(file)
    const asset = { id: uid('a'), kind: 'image' as const, mime, thumb, original, name: file.name }
    addAsset(asset)
    // 기존 노드 크기(긴 변)는 유지하되 사진 비율에 맞춰 다른 변 조정 → 안 찌부됨
    const long = Math.max(n.w, n.h)
    const r = w / Math.max(1, h)
    const nw = r >= 1 ? long : Math.round(long * r)
    const nh = r >= 1 ? Math.round(long / r) : long
    updateNode(n.id, { assetId: asset.id, shape: 'image', w: nw, h: nh })
  }

  return (
    <S.Inspector>
      <S.Head>
        <span>{n.type === 'folder' ? '📁 Folder' : '📝 Note'}</span>
        <S.Row>
          {getCurrentSpace() !== null && pid && (
            <S.Mini
              title="Move to parent folder"
              onClick={() => {
                movePlacementToSpace(pid, parentSpace(), pl ? pl.x : 0, pl ? pl.y : 0)
              }}
            >
              ↑ Out
            </S.Mini>
          )}
          {n.type === 'folder' && <S.Mini onClick={() => enterFolder(n.id)}>Open →</S.Mini>}
        </S.Row>
      </S.Head>

      {count > 1 && <S.RefNote>🔗 In {count} places · edits here apply everywhere</S.RefNote>}

      <S.Field>
        <S.LabelRow>
          <span>Name</span>
          <S.AddComp onClick={onCreateComponent} title="Save this node as a component (enter a name)">
            + Component
          </S.AddComp>
        </S.LabelRow>
        <CommitInput value={n.name} onCommit={(v) => updateNode(n.id, { name: v })} />
      </S.Field>

      <S.Field>
        <span>Text color</span>
        <ColorPicker
          value={n.textColor || '#e8ecf3'}
          onChange={(v) => updateNode(n.id, { textColor: v })}
        />
      </S.Field>

      {pl && (
        <S.Field>
          <span>Position</span>
          <S.NumRow>
            <S.DimBox>
              <span>X</span>
              <CommitInput
                numeric
                type="number"
                disabled={pl.locked}
                value={Math.round(pl.x)}
                onCommit={(v) => pid && setPlacementXY(pid, Number(v), pl.y)}
              />
            </S.DimBox>
            <S.DimBox>
              <span>Y</span>
              <CommitInput
                numeric
                type="number"
                disabled={pl.locked}
                value={Math.round(pl.y)}
                onCommit={(v) => pid && setPlacementXY(pid, pl.x, Number(v))}
              />
            </S.DimBox>
            <S.Lock
              $on={!!pl.locked}
              onClick={() => pid && togglePlacementLock(pid)}
              title={pl.locked ? 'Unlock position' : 'Lock position (no moving)'}
            >
              {pl.locked ? '🔒' : '🔓'}
            </S.Lock>
          </S.NumRow>
        </S.Field>
      )}

      <S.Field>
        <span>Dimensions</span>
        <S.NumRow>
          <S.DimBox>
            <span>W</span>
            <CommitInput numeric type="number" value={Math.round(n.w)} onCommit={(v) => setW(Number(v))} />
          </S.DimBox>
          <S.DimBox>
            <span>H</span>
            <CommitInput numeric type="number" value={Math.round(n.h)} onCommit={(v) => setH(Number(v))} />
          </S.DimBox>
          <S.Lock $on={lockRatio} onClick={() => setAspectLocked(!lockRatio)} title="Lock ratio">
            {lockRatio ? '🔒' : '🔓'}
          </S.Lock>
        </S.NumRow>
      </S.Field>

      <S.Field>
        <span>Radius</span>
        <S.NumRow>
          <S.DimBox>
            <span>R</span>
            <CommitInput
              numeric
              type="number"
              value={Math.round(n.radius || 0)}
              onCommit={(v) => updateNode(n.id, { radius: Math.max(0, Number(v)) })}
            />
          </S.DimBox>
        </S.NumRow>
      </S.Field>

      <S.Field>
        <span>Arrange</span>
        <S.Row>
          <S.Chip onClick={() => pid && reorderPlacement(pid, 'front')} title="Bring to front">
            ⤒
          </S.Chip>
          <S.Chip onClick={() => pid && reorderPlacement(pid, 'forward')} title="Forward">
            ↑
          </S.Chip>
          <S.Chip onClick={() => pid && reorderPlacement(pid, 'backward')} title="Backward">
            ↓
          </S.Chip>
          <S.Chip onClick={() => pid && reorderPlacement(pid, 'back')} title="Send to back">
            ⤓
          </S.Chip>
        </S.Row>
      </S.Field>

      <S.Field>
        <span>Shape</span>
        <S.Row>
          {SHAPES.map((s) => (
            <S.Chip key={s.v} $on={n.shape === s.v} onClick={() => updateNode(n.id, { shape: s.v })}>
              {s.label}
            </S.Chip>
          ))}
        </S.Row>
      </S.Field>

      <S.Field>
        <span>Color</span>
        <S.Row>
          {COLORS.map((c) => (
            <S.Swatch
              key={c}
              $on={n.color === c}
              $color={c}
              onClick={() => updateNode(n.id, { color: c })}
            />
          ))}
        </S.Row>
        <ColorPicker value={n.color} onChange={(v) => updateNode(n.id, { color: v })} />
      </S.Field>

      <S.Field>
        <span>Image</span>
        <S.Row>
          <S.Mini onClick={onPickImage}>{n.assetId ? 'Change image' : 'Add image'}</S.Mini>
          {n.assetId && (
            <S.Mini onClick={() => updateNode(n.id, { assetId: undefined, shape: 'rect' })}>
              Remove image
            </S.Mini>
          )}
        </S.Row>
      </S.Field>

      {count > 1 && pid && <S.Mini onClick={() => removePlacement(pid)}>Remove here</S.Mini>}
      <S.Delete onClick={onRequestDelete}>{count > 1 ? 'Delete everywhere' : 'Delete'}</S.Delete>
    </S.Inspector>
  )
}
