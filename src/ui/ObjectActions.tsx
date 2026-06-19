import { useEffect, useRef } from 'react'
import {
  enterFolder,
  getCamera,
  getNode,
  getPlacement,
  getSelectionSet,
  getSoleSelectedPid,
  openContextMenu,
  openNote,
  selectionCount,
  setCamera,
  setEditOpen,
} from '../store'
import * as S from './ObjectActions.styles'

// 모바일: 선택된 개체 위 중앙에 뜨는 액션 바 [⚙ 메뉴 · ✏️ 편집 · → 열기].
// 카메라/선택을 매 프레임 읽어 위치를 갱신(팬·줌 따라 따라다님).
export default function ObjectActions() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = ref.current
      if (el) {
        const sel = getSelectionSet()
        const c = getCamera()
        const W = window.innerWidth
        const H = window.innerHeight
        let minX = Infinity
        let maxX = -Infinity
        let topY = Infinity
        for (const pid of sel) {
          const pl = getPlacement(pid)
          const n = pl && getNode(pl.nodeId)
          if (!pl || !n) continue
          minX = Math.min(minX, pl.x - n.w / 2)
          maxX = Math.max(maxX, pl.x + n.w / 2)
          topY = Math.min(topY, pl.y - n.h / 2)
        }
        if (isFinite(minX)) {
          const cx = (minX + maxX) / 2
          const sx = (cx - c.x) * c.zoom + W / 2
          const sy = (topY - c.y) * c.zoom + H / 2 - 14
          el.style.transform = `translate(-50%, -100%) translate(${sx}px, ${sy}px)`
          el.style.visibility = 'visible'
        } else {
          el.style.visibility = 'hidden'
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const single = selectionCount() === 1

  // 선택(또는 첫 항목)의 배치 — 메뉴/열기 대상
  const refPid = getSoleSelectedPid() ?? [...getSelectionSet()][0] ?? null

  const openMenu = () => {
    const pl = refPid ? getPlacement(refPid) : null
    if (!pl) return
    const c = getCamera()
    const sx = (pl.x - c.x) * c.zoom + window.innerWidth / 2
    const sy = (pl.y - c.y) * c.zoom + window.innerHeight / 2
    openContextMenu({ x: sx, y: sy, wx: pl.x, wy: pl.y, pid: refPid, nodeId: pl.nodeId })
  }

  const openEdit = () => {
    const pid = getSoleSelectedPid()
    const pl = pid ? getPlacement(pid) : null
    if (pl) {
      // 좌표가 아니라 뷰만 이동: 개체를 화면 위쪽 30%로 → 하단 편집 패널에 안 가리게
      const c = getCamera()
      const H = window.innerHeight
      setCamera({ x: pl.x, y: pl.y - (H * 0.3 - H / 2) / c.zoom, zoom: c.zoom })
    }
    setEditOpen(true)
  }

  const openCurrent = () => {
    const pid = getSoleSelectedPid()
    const pl = pid ? getPlacement(pid) : null
    const n = pl && getNode(pl.nodeId)
    if (!pl || !n) return
    if (n.type === 'folder') enterFolder(n.id)
    else if (n.type === 'memo') openNote(n.id, pl.id)
  }

  return (
    <S.Bar ref={ref} style={{ visibility: 'hidden' }}>
      <S.Btn onClick={openMenu} title="Menu">
        ⚙
      </S.Btn>
      <S.Divider />
      <S.Btn onClick={openEdit} title="Edit">
        ✎
      </S.Btn>
      {single && (
        <>
          <S.Divider />
          <S.Btn onClick={openCurrent} title="Open">
            →
          </S.Btn>
        </>
      )}
      <S.Tail />
    </S.Bar>
  )
}
