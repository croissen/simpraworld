import { useEffect, useRef } from 'react'

// 전역 오버레이(팝업/모달/시트/패널) 스택.
// 뒤로가기(안드 하드웨어 백)가 최상단 팝업부터 닫게 하기 위한 것.
// 각 팝업이 열릴 때 자기 close 함수를 등록하고, 닫힐 때 제거한다.
let stack: { id: number; close: () => void }[] = []
let nextId = 1

export function pushOverlay(close: () => void): number {
  const id = nextId++
  stack.push({ id, close })
  return id
}
export function removeOverlay(id: number) {
  stack = stack.filter((o) => o.id !== id)
}
/** 최상단 팝업을 닫는다. 닫을 게 있었으면 true(→ 뒤로가기가 여기서 멈춤). */
export function closeTopOverlay(): boolean {
  const top = stack[stack.length - 1]
  if (!top) return false
  removeOverlay(top.id)
  top.close()
  return true
}
export const hasOverlay = () => stack.length > 0

/** 팝업 컴포넌트에서: open인 동안 close를 오버레이 스택에 등록(뒤로가기로 닫히게). */
export function useOverlay(open: boolean, close: () => void) {
  const ref = useRef(close)
  ref.current = close
  useEffect(() => {
    if (!open) return
    const id = pushOverlay(() => ref.current())
    return () => removeOverlay(id)
  }, [open])
}
