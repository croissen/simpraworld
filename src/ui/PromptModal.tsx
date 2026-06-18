import { useState } from 'react'
import { createPortal } from 'react-dom'
import * as S from './ConfirmModal.styles'

// 텍스트 입력 모달. Enter=확인, Esc=취소. (컴포넌트 이름 입력 등)
export default function PromptModal({
  title,
  initial,
  okLabel = 'Save',
  onSubmit,
  onCancel,
}: {
  title: string
  initial: string
  okLabel?: string
  onSubmit: (value: string) => void
  onCancel: () => void
}) {
  const [v, setV] = useState(initial)
  return createPortal(
    <S.Overlay onClick={onCancel}>
      <S.Box onClick={(e) => e.stopPropagation()}>
        <S.Msg>{title}</S.Msg>
        <S.Input
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSubmit(v)
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
          }}
        />
        <S.Btns>
          <S.Cancel onClick={onCancel}>Cancel</S.Cancel>
          <S.Ok onClick={() => onSubmit(v)}>{okLabel}</S.Ok>
        </S.Btns>
      </S.Box>
    </S.Overlay>,
    document.body,
  )
}
