import { useEffect, useRef } from 'react'
import ColorPicker from './ColorPicker'
import {
  addAsset,
  enterFolder,
  getAspectLocked,
  getCurrentSpace,
  getNode,
  getPlacement,
  placementPos,
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
  setRadiusLive,
  togglePlacementLock,
  updateNode,
} from '../store'
import { uid } from '../types'
import type { Shape } from '../types'
import { ICON_MAX, ICON_Q, fileToImage, pickImageFile } from '../image'
import { textLines } from '../textMeasure'
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

export default function Inspector({
  onRequestDelete,
  onCreateComponent,
}: {
  onRequestDelete: () => void
  onCreateComponent: () => void
}) {
  const lockRatio = getAspectLocked() // 인스펙터·캔버스 공유

  // 라디우스 ▲▼ 꾹누름(연속 변경) — 훅은 early return 전에 선언
  const radHold = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    return () => {
      if (radHold.current) clearInterval(radHold.current)
    }
  }, [])

  // 다중 선택 → Position / Component / Copy / Delete 만
  if (selectionCount() > 1)
    return <MultiInspector onRequestDelete={onRequestDelete} onCreateComponent={onCreateComponent} />

  const n = getSelectedNode()
  if (!n) return null
  const isPhoto = n.type === 'photo' // 사진은 글자색/컬러/Shape가 의미 없음 → 해당 항목 숨김
  const isText = n.type === 'text' // 텍스트 개체: 내용/크기/볼드/글자색/배경색만
  const count = placementCount(n.id)
  const pid = getSoleSelectedPid()
  const pl = getPlacement(pid)
  const pos = pl ? placementPos(pl) : { x: 0, y: 0 } // 현재 기기 기준 좌표(PC=x,y / 모바일=mx,my)

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

  // 라디우스 ▲▼: 누르면 1 변경, 꾹 누르면 연속(현재값 기준), 손 떼면 히스토리 1회 기록
  const stopRad = () => {
    if (radHold.current) {
      clearInterval(radHold.current)
      radHold.current = null
      if (n) updateNode(n.id, {}) // 한 번만 commit(되돌리기 1스텝)
    }
  }
  const startRad = (delta: number) => {
    if (!n) return
    const step = () => setRadiusLive(n.id, (getNode(n.id)?.radius || 0) + delta)
    step()
    radHold.current = setInterval(step, 90)
  }

  async function onPickImage() {
    const file = await pickImageFile()
    if (!file || !n) return
    // 노트/폴더의 이미지는 "아이콘"이라 작은 썸네일로 (용량 절약)
    const { thumb, mime, w, h } = await fileToImage(file, ICON_MAX, ICON_Q)
    const asset = { id: uid('a'), kind: 'image' as const, mime, thumb, name: file.name }
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
        <span>
          {n.type === 'folder'
            ? '📁 Folder'
            : n.type === 'photo'
              ? '🖼 Photo'
              : n.type === 'text'
                ? 'Text'
                : '📝 Note'}
        </span>
        <S.Row>
          {getCurrentSpace() !== null && pid && (
            <S.Mini
              title="Move to parent folder"
              onClick={() => {
                movePlacementToSpace(pid, parentSpace(), pos.x, pos.y)
              }}
            >
              ↑ Out
            </S.Mini>
          )}
          {n.type === 'folder' && <S.Mini onClick={() => enterFolder(n.id)}>Open →</S.Mini>}
        </S.Row>
      </S.Head>

      {count > 1 && <S.RefNote>🔗 In {count} places · edits here apply everywhere</S.RefNote>}

      {/* 텍스트 개체는 캔버스에서 직접 클릭해 내용 수정 → 인스펙터엔 내용 입력칸 없음 */}
      {!isText && (
        <S.Field>
          <S.LabelRow>
            <span>Name</span>
            <S.AddComp onClick={onCreateComponent} title="Save this node as a component (enter a name)">
              + Component
            </S.AddComp>
          </S.LabelRow>
          <S.NameRow>
            <CommitInput value={n.name} onCommit={(v) => updateNode(n.id, { name: v })} />
            <S.Lock
              $on={!!n.emphasize}
              onClick={() => updateNode(n.id, { emphasize: !n.emphasize })}
              title="Emphasize label — soft shadow lift (readable on any background)"
            >
              💡
            </S.Lock>
          </S.NameRow>
        </S.Field>
      )}

      {isText && (
        <S.Field>
          <span>Size & Bold</span>
          <S.NumRow>
            <S.DimBox>
              <span>px</span>
              <CommitInput
                numeric
                type="number"
                value={Math.round(n.fontSize || 20)}
                onCommit={(v) => updateNode(n.id, { fontSize: Math.max(6, Number(v)) })}
              />
            </S.DimBox>
            <S.Lock $on={!!n.bold} onClick={() => updateNode(n.id, { bold: !n.bold })} title="Bold">
              <b>B</b>
            </S.Lock>
          </S.NumRow>
        </S.Field>
      )}

      {!isPhoto && (
        <S.Field>
          <span>{isText ? 'Text color' : 'Text color'}</span>
          <ColorPicker
            value={n.textColor || '#e8ecf3'}
            onChange={(v) => updateNode(n.id, { textColor: v })}
          />
        </S.Field>
      )}

      {isText && (
        <S.Field>
          <span>Align</span>
          <S.Row>
            {(['left', 'center', 'right'] as const).map((a) => (
              <S.Chip
                key={a}
                $on={(n.align || 'left') === a}
                onClick={() => updateNode(n.id, { align: a })}
                title={`Horizontal: ${a}`}
              >
                {a === 'left' ? 'L' : a === 'center' ? 'C' : 'R'}
              </S.Chip>
            ))}
            {(['top', 'middle', 'bottom'] as const).map((v) => (
              <S.Chip
                key={v}
                $on={(n.valign || 'top') === v}
                onClick={() => updateNode(n.id, { valign: v })}
                title={`Vertical: ${v}`}
              >
                {v === 'top' ? '↑' : v === 'middle' ? '↕' : '↓'}
              </S.Chip>
            ))}
          </S.Row>
        </S.Field>
      )}

      {isText && (
        <S.Field>
          <span>Background</span>
          <S.Row>
            <S.Chip
              $on={n.color !== 'none'}
              onClick={() => updateNode(n.id, { color: n.color === 'none' ? '#1b2030' : 'none' })}
            >
              {n.color !== 'none' ? 'On' : 'Off'}
            </S.Chip>
          </S.Row>
          {n.color !== 'none' && (
            <ColorPicker value={n.color} onChange={(v) => updateNode(n.id, { color: v })} />
          )}
        </S.Field>
      )}

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
                value={Math.round(pos.x)}
                onCommit={(v) => pid && setPlacementXY(pid, Number(v), pos.y)}
              />
            </S.DimBox>
            <S.DimBox>
              <span>Y</span>
              <CommitInput
                numeric
                type="number"
                disabled={pl.locked}
                value={Math.round(pos.y)}
                onCommit={(v) => pid && setPlacementXY(pid, pos.x, Number(v))}
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
          {isText ? (
            // 텍스트: 디멘션 락 = 고정 폭 줄바꿈(wrap). 풀면 오른쪽 무한 입력.
            <S.Lock
              $on={!!n.lock}
              onClick={() =>
                updateNode(
                  n.id,
                  n.lock
                    ? { lock: false } // 락 해제 → 자유 크기/줄바꿈
                    : { lock: true, wrap: false, body: textLines(n, n.w).join('\n') }, // 현재 줄바꿈 고정 + 비율락
                )
              }
              title={n.lock ? 'Unlock size' : 'Lock size (keep ratio, no shrink below text)'}
            >
              {n.lock ? '🔒' : '🔓'}
            </S.Lock>
          ) : (
            <S.Lock $on={lockRatio} onClick={() => setAspectLocked(!lockRatio)} title="Lock ratio">
              {lockRatio ? '🔒' : '🔓'}
            </S.Lock>
          )}
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
          <S.Chip
            title="Decrease (hold to repeat)"
            onPointerDown={() => startRad(-1)}
            onPointerUp={stopRad}
            onPointerLeave={stopRad}
            onPointerCancel={stopRad}
          >
            ▼
          </S.Chip>
          <S.Chip
            title="Increase (hold to repeat)"
            onPointerDown={() => startRad(1)}
            onPointerUp={stopRad}
            onPointerLeave={stopRad}
            onPointerCancel={stopRad}
          >
            ▲
          </S.Chip>
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

      {!isPhoto && !isText && (
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
      )}

      {!isPhoto && !isText && (
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
      )}

      {!isText && (
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
      )}

      {count > 1 && pid && <S.Mini onClick={() => removePlacement(pid)}>Remove here</S.Mini>}
      <S.Delete onClick={onRequestDelete}>{count > 1 ? 'Delete everywhere' : 'Delete'}</S.Delete>
    </S.Inspector>
  )
}
