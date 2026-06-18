import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as S from './ConfirmModal.styles'

// ←/→ = 버튼 선택 이동, Enter = 선택된 것 실행, Esc = 취소. body로 portal 렌더.
// onAlt를 주면 [Cancel · Alt · Confirm] 3버튼(예: 취소 / 전체삭제 / 여기서만).
export default function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onAlt,
  altLabel = 'Alt',
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  onAlt?: () => void
  altLabel?: string
}) {
  const hasAlt = !!onAlt
  // 버튼: [Cancel, (Alt), Confirm]. 기본 선택 = 맨 오른쪽(Confirm) — 안전한 기본값을 거기 두면 됨.
  const buttons: { label: string; kind: 'cancel' | 'danger' }[] = [
    { label: cancelLabel, kind: 'cancel' },
    ...(hasAlt ? [{ label: altLabel, kind: 'danger' as const }] : []),
    { label: confirmLabel, kind: 'danger' },
  ]
  const last = buttons.length - 1
  const [sel, setSel] = useState(last)
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    refs.current[sel]?.focus()
  }, [sel])

  // index → 액션 (0=Cancel, hasAlt면 1=Alt, 마지막=Confirm)
  const fire = (i: number) => {
    if (i === 0) onCancel()
    else if (hasAlt && i === 1) onAlt!()
    else onConfirm()
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      e.stopImmediatePropagation() // 모달이 키보드 독점 → 뒤 요소 안 움직임(capture에서 먼저)
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSel((s) => Math.max(0, s - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSel((s) => Math.min(last, s + 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        fire(sel)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [sel, last, hasAlt, onConfirm, onCancel, onAlt])

  return createPortal(
    <S.Overlay onClick={onCancel}>
      <S.Box onClick={(e) => e.stopPropagation()}>
        <S.Msg>{message}</S.Msg>
        <S.Btns>
          {buttons.map((b, i) => {
            const El = b.kind === 'cancel' ? S.Cancel : S.Ok
            return (
              <El
                key={i}
                ref={(el: HTMLButtonElement | null) => {
                  refs.current[i] = el
                }}
                $active={sel === i}
                onClick={() => fire(i)}
              >
                {b.label}
              </El>
            )
          })}
        </S.Btns>
      </S.Box>
    </S.Overlay>,
    document.body,
  )
}
