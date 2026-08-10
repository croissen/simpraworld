import {
  addNode,
  addPhoto,
  addText,
  canRedo,
  canUndo,
  getInkMode,
  setDrawTool,
  getCamera,
  getComponentsOpen,
  getLibraryOpen,
  getUniverseName,
  goTo,
  hasUnsavedWork,
  importWorld,
  leavePenForNav,
  redo,
  resetToSample,
  selectionCount,
  setUniverseName,
  toggleComponents,
  toggleLibrary,
  undo,
} from '../store'
import { importSpu, pickSpuFile, supportsFileSave } from '../spu'
import {
  exportSelectionOrSpace,
  getCurrentFileName,
  getFileSnapshot,
  getJustSaved,
  hasCurrentFile,
  openUniverseFile,
  saveUniverse,
  saveUniverseAs,
  saveUniverseNamed,
  startNewUniverse,
  subscribeFile,
} from '../currentFile'
import { useState, useSyncExternalStore } from 'react'
import { fileToImage, pickImageFile } from '../image'
import ConfirmModal from './ConfirmModal'
import PromptModal from './PromptModal'
import OverflowMenu from './OverflowMenu'
import ShapePicker from './ShapePicker'
import PenPalette from './PenPalette'
import PenStick from './PenStick'
import UndoRedoStick from './UndoRedoStick'
import { useIsMobile } from '../useIsMobile'
import * as S from './Toolbar.styles'

// ✎(펜)처럼 얇은 라인 아이콘. 1em이라 버튼 폰트 크기 따라 스케일(글리프처럼).
const stroke = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}
const IconHome = () => (
  <svg {...stroke}>
    <path d="M3.5 11.5 12 4l8.5 7.5" />
    <path d="M5.5 10v9.5h13V10" />
  </svg>
)
const IconFolder = () => (
  <svg {...stroke}>
    <path d="M3.5 6.5h5l2 2h10v9.5a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z" />
  </svg>
)

export default function Toolbar() {
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmLoad, setConfirmLoad] = useState(false) // Load 전 "현재 작업 저장?" 모달
  const [confirmNew, setConfirmNew] = useState(false) // New 전 "현재 작업 저장?" 모달
  const [promptName, setPromptName] = useState<string | null>(null) // 모바일 Save 시 파일명 입력
  const [pickShape, setPickShape] = useState(false) // + Element → 도형 선택 팝업
  const [renameName, setRenameName] = useState<string | null>(null) // Setting: 유니버스명 수정 프롬프트
  const isMobile = useIsMobile()
  // 현재 파일명/존재 여부 변경 시 버튼 라벨 갱신
  useSyncExternalStore(subscribeFile, getFileSnapshot)

  // PC(크롬/엣지)만 파일 덮어쓰기 지원. 모바일/사파리는 다운로드 방식.
  const canOverwrite = supportsFileSave()

  // New: 미저장 변경이 있을 때만 저장 확인, 없으면 바로 새로 시작
  function onNew() {
    if (hasUnsavedWork()) setConfirmNew(true)
    else startNewUniverse()
  }
  // Load: 미저장 변경이 있을 때만 저장 확인, 없으면 바로 파일 열기
  function onLoad() {
    if (hasUnsavedWork()) setConfirmLoad(true)
    else openUniverseFile()
  }

  // Load: 다른 파일을 열어 현재 유니버스를 교체. saveFirst면 먼저 저장(취소 시 열기 중단).
  async function doLoad(saveFirst: boolean) {
    setConfirmLoad(false)
    if (saveFirst) {
      const where = await saveUniverse()
      if (!where) return // 저장을 취소하면 열기도 중단
    }
    await openUniverseFile()
  }

  // New: 빈 유니버스로 시작. saveFirst면 먼저 저장(취소 시 중단).
  async function doNew(saveFirst: boolean) {
    setConfirmNew(false)
    if (saveFirst) {
      const where = await saveUniverse() // 기존 파일 있으면 덮어쓰기, 없으면 Save As
      if (!where) return // 저장을 취소하면 New도 중단
    }
    await startNewUniverse()
  }

  // Save: PC=현재 파일 덮어쓰기(없으면 Save As). 모바일=현재 파일 있으면 같은 이름 재다운로드, 없으면 파일명 입력.
  async function onSave() {
    if (!canOverwrite && !hasCurrentFile()) {
      setPromptName(getUniverseName().trim() || 'My Universe') // 모바일 첫 저장 → 이름 입력
      return
    }
    await saveUniverse()
  }
  // 모바일 파일명 입력 확정 → 입력한 이름으로 저장
  async function onSaveNameSubmit(name: string) {
    setPromptName(null)
    await saveUniverseNamed(name)
  }
  // Save As(PC 전용): 항상 새 파일로 저장 → 그 파일이 현재 파일이 됨
  async function onSaveAs() {
    await saveUniverseAs()
  }

  // 화면 중앙(월드 좌표)에 새 노드 생성
  function centerWorld() {
    const c = getCamera()
    return { x: c.x, y: c.y }
  }

  // 선택 0개=현재 공간 전체 / 폴더 1개=그 폴더만 / 그 외(다중·메모·사진)=선택된 것만
  async function onExport() {
    await exportSelectionOrSpace()
  }

  // 사진 추가: 기기에서 이미지 선택 → 화면 중앙에 이미지 노드 생성
  async function onPhoto() {
    const file = await pickImageFile()
    if (!file) return
    const img = await fileToImage(file)
    addPhoto(img, centerWorld().x, centerWorld().y)
  }

  // import a .spu folder into the current space (auto "(1)" on name clash)
  async function onImport() {
    const file = await pickSpuFile()
    if (!file) return
    try {
      importWorld(await importSpu(file))
    } catch (e) {
      alert('Import failed: ' + (e as Error).message)
    }
  }

  return (
    <S.Toolbar>
      <S.UndoGroup>
        <S.Button onClick={undo} disabled={!canUndo()} title="Undo (Ctrl+Z)">↶ Undo</S.Button>
        <S.Button onClick={redo} disabled={!canRedo()} title="Redo (Ctrl+Y / Ctrl+Shift+Z)">
          ↷ Redo
        </S.Button>
        <S.Gap />
      </S.UndoGroup>
      {/* 홈: 최상단 유니버스(루트)로 이동 */}
      <S.Button
        $icon
        onClick={() => {
          leavePenForNav() // 핸드모드 아니면 펜 끄기
          goTo(null)
        }}
        title="Home — go to the top universe"
      >
        <IconHome />
      </S.Button>
      {/* ✎ 펜: 탭=켜기/끄기. 펜 켜진 상태에서 좌 슬라이드=형광펜, 우=지우개(조이스틱). */}
      <PenStick />
      {getInkMode() && <PenPalette />}
      {/* + 메뉴: 추가 도구 (기본 열림) */}
      <OverflowMenu
        label="+"
        heading="Add"
        title="Add — Folder, Note, Photo"
        defaultOpen
        align="right"
        items={[
          <S.Button key="folder" onClick={() => addNode('folder', centerWorld().x, centerWorld().y)}>
            + Folder
          </S.Button>,
          <S.Button key="note" onClick={() => addNode('memo', centerWorld().x, centerWorld().y)}>
            + Note
          </S.Button>,
          <S.Button key="photo" onClick={onPhoto} title="Add a photo from your device">
            + Photo
          </S.Button>,
          <S.Button
            key="text"
            onClick={() => addText(centerWorld().x, centerWorld().y)}
            title="Add a text box (or press T)"
          >
            + Text
          </S.Button>,
          <S.Button
            key="element"
            onClick={() => setPickShape(true)}
            title="Draw a shape — pick one, then drag on the canvas"
          >
            + Element
          </S.Button>,
        ]}
      />
      {pickShape && (
        <ShapePicker
          onPick={(s) => {
            setDrawTool(s)
            setPickShape(false)
          }}
          onClose={() => setPickShape(false)}
        />
      )}
      {/* 하단 4번째: undo/redo 조이스틱(모바일). 폴더보다 앞 → 좌우 슬라이드 여유. */}
      {isMobile && <UndoRedoStick />}
      {/* 📄 메뉴: 보기 패널 (기본 닫힘) */}
      <OverflowMenu
        label={<IconFolder />}
        heading="Directory"
        title="Panels — Components, Library"
        align="right"
        items={[
          <S.Button
            key="components"
            $on={getComponentsOpen()}
            onClick={toggleComponents}
            title="Saved components — reusable folders/notes"
          >
            ⬡ Components
          </S.Button>,
          <S.Button
            key="library"
            $on={getLibraryOpen()}
            onClick={toggleLibrary}
            title="Library — full folder/note tree (on-canvas + stored)"
          >
            🗂 Library
          </S.Button>,
        ]}
      />
      {/* ⋯ 메뉴: 파일 (기본 닫힘, 오른쪽 끝 고정, 저장 직후 초록 체크) */}
      <OverflowMenu
        align="right"
        corner
        label={getJustSaved() ? '✓' : '⋯'}
        heading="Setting"
        subheader={
          <S.NameRow>
            <span className="nm">{getUniverseName()}</span>
            <button onClick={() => setRenameName(getUniverseName())} title="Rename universe">
              ✎
            </button>
          </S.NameRow>
        }
        saved={getJustSaved()}
        title={getJustSaved() ? 'Saved' : 'File menu — New, Save, Load, Export, Import, Reset'}
        items={[
          <S.Button
            key="new"
            onClick={onNew}
            title="New — start an empty universe (asks to save unsaved changes first)"
          >
            ✦ New
          </S.Button>,
          <S.Button
            key="save"
            onClick={onSave}
            title={
              hasCurrentFile()
                ? `Save (Ctrl+S) — overwrite ${getCurrentFileName()}`
                : 'Save (Ctrl+S) — save the whole universe to a .spu file'
            }
          >
            💾 Save{hasCurrentFile() ? ` · ${getCurrentFileName()}` : ''}
          </S.Button>,
          ...(canOverwrite
            ? [
                <S.Button
                  key="saveas"
                  onClick={onSaveAs}
                  title="Save As — save the whole universe to a new .spu file"
                >
                  Save As
                </S.Button>,
              ]
            : []),
          <S.Button
            key="load"
            onClick={onLoad}
            title="Open another .spu as your universe — replaces everything (asks to save unsaved changes first)"
          >
            📂 Load
          </S.Button>,
          <S.Button
            key="export"
            onClick={onExport}
            title={
              selectionCount() === 0
                ? 'Export everything in the current space'
                : 'Export the selected item(s) as a .spu file'
            }
          >
            {selectionCount() === 0
              ? '⤓ Export all'
              : selectionCount() > 1
                ? `⤓ Export (${selectionCount()})`
                : '⤓ Export'}
          </S.Button>,
          <S.Button key="import" onClick={onImport} title="Import a .spu into the current space (merge)">
            ⤒ Import
          </S.Button>,
          <S.Button
            key="reset"
            $danger
            onClick={() => setConfirmReset(true)}
            title="Erase all data and restore the default sample"
          >
            ⟲ Reset
          </S.Button>,
        ]}
      />
      {confirmReset && (
        <ConfirmModal
          message="Erase all data and restore the default sample? This cannot be undone."
          onConfirm={() => {
            resetToSample()
            setConfirmReset(false)
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
      {confirmLoad && (
        <ConfirmModal
          message="Open another file as your universe? This replaces everything currently on the canvas."
          confirmLabel="Save & open"
          altLabel="Open without saving"
          cancelLabel="Cancel"
          onConfirm={() => doLoad(true)}
          onAlt={() => doLoad(false)}
          onCancel={() => setConfirmLoad(false)}
        />
      )}
      {confirmNew && (
        <ConfirmModal
          message="Start a new empty universe? Save the current one first?"
          confirmLabel="Save & new"
          altLabel="Don't save"
          cancelLabel="Cancel"
          onConfirm={() => doNew(true)}
          onAlt={() => doNew(false)}
          onCancel={() => setConfirmNew(false)}
        />
      )}
      {promptName !== null && (
        <PromptModal
          title="Save as — enter a file name"
          initial={promptName}
          okLabel="Save"
          onSubmit={onSaveNameSubmit}
          onCancel={() => setPromptName(null)}
        />
      )}
      {renameName !== null && (
        <PromptModal
          title="Universe name"
          initial={renameName}
          okLabel="Save"
          onSubmit={(v) => {
            const name = v.trim()
            if (name) setUniverseName(name)
            setRenameName(null)
          }}
          onCancel={() => setRenameName(null)}
        />
      )}
    </S.Toolbar>
  )
}
