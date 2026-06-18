import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import * as S from './ConfirmModal.styles'

// Enter/OK = 확인, Esc/Cancel = 취소. body로 portal 렌더 → 화면 중앙.
export default function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onConfirm, onCancel])

  return createPortal(
    <S.Overlay onClick={onCancel}>
      <S.Box onClick={(e) => e.stopPropagation()}>
        <S.Msg>{message}</S.Msg>
        <S.Btns>
          <S.Cancel onClick={onCancel}>Cancel</S.Cancel>
          <S.Ok autoFocus onClick={onConfirm}>
            OK
          </S.Ok>
        </S.Btns>
      </S.Box>
    </S.Overlay>,
    document.body,
  )
}
