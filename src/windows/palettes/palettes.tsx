import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import Color from 'colorjs.io'
import classNames from 'clsx'

import WindowControls from '@components/windowBar/windowControls'
import Navigation from '@components/palettes/navigation/Navigation'
import NavigationItem from '@components/palettes/navigationItem/NavigationItem'
import NavigationSection from '@components/palettes/navigationSection/NavigationSection'
import ColorItem from '@components/palettes/colorItem/ColorItem'
import ColorSection from '@components/palettes/colorSection/ColorSection'
import PaletteMenu from '@components/palettes/paletteMenu/PaletteMenu'
import ContextMenu, { type ContextMenuItem } from '@components/palettes/contextMenu/ContextMenu'
import InlineNameInput from '@components/palettes/inlineNameInput/InlineNameInput'
import { Heading, Button, Text } from '@components/ui'
import { usePalettesStore } from '@stores/palettesStore'
import { useColorStore } from '@stores/colorStore'
import { showToast } from '@stores/toastStore'
import { colorValueToColor, isValidHex, toHex } from '@common/color'
import { emitPaletteColorApplied, onCurrentColorChanged } from '@common/ipc'
import type { IPalette, IPaletteSection } from '@interfaces/palettes'

import style from './palettes.module.css'

/** What the sidebar is currently editing in place, if anything. */
type Editing =
  | { kind: 'renamePalette'; id: string }
  | { kind: 'renameSection'; id: string }
  | { kind: 'newPalette'; sectionId: string | null }
  | { kind: 'newSection' }
  | null

interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order

const paletteSwatchColor = (palette: IPalette): string => {
  if (palette.color) return palette.color
  const first = palette.colorSections.find((section) => section.colors.length > 0)?.colors[0]
  return first ? toHex(colorValueToColor(first.value)) : 'transparent'
}

/** Accepts "abc", "#abc", "aabbcc" or "#aabbcc" (any case); null if invalid. */
const normalizeHex = (input: string): string | null => {
  const trimmed = input.trim()
  const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  return isValidHex(hex) ? toHex(new Color(hex)) : null
}

const Palettes = () => {
  const { t } = useTranslation('palettes')
  const CommonT = useTranslation('common')

  const paletteSections = usePalettesStore((state) => state.paletteSections)
  const palettes = usePalettesStore((state) => state.palettes)
  const activePaletteId = usePalettesStore((state) => state.activePaletteId)
  const {
    setActivePalette,
    addPalette,
    renamePalette,
    deletePalette,
    addPaletteSection,
    renamePaletteSection,
    deletePaletteSection,
    setPaletteSectionOpen,
    addColor,
    deleteColor,
  } = usePalettesStore.getState()

  const currentColor = useColorStore((state) => state.color)
  const setColor = useColorStore((state) => state.setColor)

  const [editing, setEditing] = useState<Editing>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [hexInput, setHexInput] = useState('')
  const [isHexInvalid, setIsHexInvalid] = useState(false)

  // This window has its own color store; follow the main window's color so
  // "add current color" adds what the user actually sees there.
  useEffect(() => {
    const unlistenPromise = onCurrentColorChanged((hex) => setColor(new Color(hex)))
    return () => {
      unlistenPromise.then((unlisten) => unlisten())
    }
  }, [setColor])

  const activePalette = palettes.find((palette) => palette.id === activePaletteId) ?? null
  const currentHex = toHex(currentColor)

  const rootEntries = useMemo(
    () =>
      [
        ...paletteSections.map((section) => ({
          type: 'section' as const,
          order: section.order,
          section,
        })),
        ...palettes
          .filter((palette) => palette.sectionId === null)
          .map((palette) => ({ type: 'palette' as const, order: palette.order, palette })),
      ].sort(byOrder),
    [paletteSections, palettes],
  )

  const palettesInSection = (sectionId: string) =>
    palettes.filter((palette) => palette.sectionId === sectionId).sort(byOrder)

  const report = (action: string) => (err: unknown) => console.error(`Failed to ${action}:`, err)

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  const openContextMenu = (event: React.MouseEvent, items: ContextMenuItem[]) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({ x: event.clientX, y: event.clientY, items })
  }

  const startNewPalette = (sectionId: string | null) => {
    if (sectionId) {
      setPaletteSectionOpen(sectionId, true).catch(report('open section'))
    }
    setEditing({ kind: 'newPalette', sectionId })
  }

  const createPalette = async (name: string, sectionId: string | null) => {
    setEditing(null)
    try {
      const id = await addPalette(name, sectionId)
      await setActivePalette(id)
    } catch (err) {
      report('create palette')(err)
    }
  }

  const paletteActions = (palette: IPalette): ContextMenuItem[] => [
    {
      label: t('action.rename'),
      onSelect: () => setEditing({ kind: 'renamePalette', id: palette.id }),
    },
    {
      label: t('action.delete'),
      danger: true,
      onSelect: () => deletePalette(palette.id).catch(report('delete palette')),
    },
  ]

  const sectionActions = (section: IPaletteSection): ContextMenuItem[] => [
    { label: t('palette.add'), onSelect: () => startNewPalette(section.id) },
    {
      label: t('action.rename'),
      onSelect: () => setEditing({ kind: 'renameSection', id: section.id }),
    },
    {
      label: t('action.delete'),
      danger: true,
      onSelect: () => deletePaletteSection(section.id).catch(report('delete section')),
    },
  ]

  const applyColor = (hex: string) => {
    emitPaletteColorApplied(hex).catch(report('apply color'))
  }

  const copyColor = async (hex: string) => {
    try {
      await writeText(hex)
      showToast(CommonT.t('action.colorCopiedToast'))
    } catch (err) {
      report('copy color')(err)
    }
  }

  const addColorToActive = (hex: string) => {
    const colorSectionId = activePalette?.colorSections[0]?.id
    if (!activePalette || !colorSectionId) return
    addColor(activePalette.id, colorSectionId, hex).catch(report('add color'))
  }

  const submitHex = () => {
    const hex = normalizeHex(hexInput)
    if (!hex) {
      setIsHexInvalid(true)
      return
    }
    addColorToActive(hex)
    setHexInput('')
    setIsHexInvalid(false)
  }

  const renderPaletteItem = (palette: IPalette) => (
    <NavigationItem
      key={palette.id}
      label={palette.name}
      color={paletteSwatchColor(palette)}
      isActive={palette.id === activePaletteId}
      onClick={() => setActivePalette(palette.id).catch(report('select palette'))}
      onContextMenu={(event) => openContextMenu(event, paletteActions(palette))}
      isEditing={editing?.kind === 'renamePalette' && editing.id === palette.id}
      placeholder={t('palette.namePlaceholder')}
      onRename={(name) => {
        setEditing(null)
        renamePalette(palette.id, name).catch(report('rename palette'))
      }}
      onCancelEdit={() => setEditing(null)}
    />
  )

  const renderNewPaletteInput = (sectionId: string | null) =>
    editing?.kind === 'newPalette' && editing.sectionId === sectionId ? (
      <NavigationItem
        label=""
        color="transparent"
        isEditing
        placeholder={t('palette.namePlaceholder')}
        onRename={(name) => createPalette(name, sectionId)}
        onCancelEdit={() => setEditing(null)}
      />
    ) : null

  const hasColors = activePalette?.colorSections.some((section) => section.colors.length > 0)

  return (
    <section className={style.palettesWindow}>
      <header className={style.topBar} data-tauri-drag-region>
        <div className={style.title} data-tauri-drag-region>
          <Heading level={1} color="primary" weight="bold" size="small">
            {t('title')}
          </Heading>
          <div className={style.iconGradient} data-tauri-drag-region></div>
        </div>
        <WindowControls />
      </header>
      <section className={style.content}>
        <aside className={style.sidebar}>
          <Navigation>
            {rootEntries.map((entry) =>
              entry.type === 'palette' ? (
                renderPaletteItem(entry.palette)
              ) : (
                <NavigationSection
                  key={entry.section.id}
                  label={entry.section.name}
                  isOpen={entry.section.isOpen}
                  onToggle={(isOpen) =>
                    setPaletteSectionOpen(entry.section.id, isOpen).catch(report('toggle section'))
                  }
                  actions={sectionActions(entry.section)}
                  onContextMenu={(event) => openContextMenu(event, sectionActions(entry.section))}
                  isEditing={editing?.kind === 'renameSection' && editing.id === entry.section.id}
                  placeholder={t('section.namePlaceholder')}
                  onRename={(name) => {
                    setEditing(null)
                    renamePaletteSection(entry.section.id, name).catch(report('rename section'))
                  }}
                  onCancelEdit={() => setEditing(null)}
                >
                  {palettesInSection(entry.section.id).map(renderPaletteItem)}
                  {renderNewPaletteInput(entry.section.id)}
                </NavigationSection>
              ),
            )}
            {renderNewPaletteInput(null)}
            {editing?.kind === 'newSection' && (
              <div className={style.newSectionInput}>
                <InlineNameInput
                  placeholder={t('section.namePlaceholder')}
                  onSubmit={(name) => {
                    setEditing(null)
                    addPaletteSection(name).catch(report('create section'))
                  }}
                  onCancel={() => setEditing(null)}
                />
              </div>
            )}
          </Navigation>
          <div className={style.sidebarActions}>
            <Button
              variant="transparent"
              className={style.sidebarAction}
              onClick={() => startNewPalette(null)}
            >
              + {t('palette.add')}
            </Button>
            <Button
              variant="transparent"
              className={style.sidebarAction}
              onClick={() => setEditing({ kind: 'newSection' })}
            >
              + {t('section.add')}
            </Button>
          </div>
        </aside>

        <section className={style.paletteContent}>
          {activePalette ? (
            <>
              <PaletteMenu>
                <Button
                  className={classNames(style.toolbarButton, style.addCurrentButton)}
                  onClick={() => addColorToActive(currentHex)}
                  title={currentHex}
                >
                  <span className={style.currentSwatch} style={{ backgroundColor: currentHex }} />
                  {t('color.addCurrent')}
                </Button>
                <form
                  className={style.hexForm}
                  onSubmit={(event) => {
                    event.preventDefault()
                    submitHex()
                  }}
                >
                  <input
                    type="text"
                    className={classNames(style.hexInput, isHexInvalid && style.hexInputInvalid)}
                    value={hexInput}
                    placeholder={t('color.hexPlaceholder')}
                    aria-invalid={isHexInvalid}
                    spellCheck={false}
                    maxLength={9}
                    onChange={(event) => {
                      setHexInput(event.target.value)
                      setIsHexInvalid(false)
                    }}
                  />
                  <Button type="submit" className={style.toolbarButton} disabled={!hexInput.trim()}>
                    {t('color.addHex')}
                  </Button>
                </form>
              </PaletteMenu>
              <section className={style.paletteColors}>
                {hasColors ? (
                  activePalette.colorSections.map((colorSection) => (
                    <ColorSection
                      key={colorSection.id}
                      label={colorSection.label}
                      variant={activePalette.display.variant}
                      size={activePalette.display.size}
                      showNames={activePalette.display.showNames}
                      fullNames={activePalette.display.fullNames}
                    >
                      {colorSection.colors.map((color) => {
                        const hex = toHex(colorValueToColor(color.value))
                        return (
                          <ColorItem
                            key={color.id}
                            color={hex}
                            name={color.name ?? hex}
                            onClick={() => applyColor(hex)}
                            onContextMenu={(event) =>
                              openContextMenu(event, [
                                { label: t('action.apply'), onSelect: () => applyColor(hex) },
                                { label: t('action.copy'), onSelect: () => copyColor(hex) },
                                {
                                  label: t('action.delete'),
                                  danger: true,
                                  onSelect: () =>
                                    deleteColor(activePalette.id, colorSection.id, color.id).catch(
                                      report('delete color'),
                                    ),
                                },
                              ])
                            }
                          />
                        )
                      })}
                    </ColorSection>
                  ))
                ) : (
                  <Text color="secondary" className={style.emptyState}>
                    {t('color.empty')}
                  </Text>
                )}
              </section>
            </>
          ) : (
            <Text color="secondary" className={style.emptyState}>
              {t('palette.empty')}
            </Text>
          )}
        </section>
      </section>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={closeContextMenu}
        />
      )}
    </section>
  )
}

export default Palettes
