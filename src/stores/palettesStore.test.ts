import { describe, it, expect, vi, beforeEach } from 'vitest'

const { load, migratePalettes } = vi.hoisted(() => ({
  load: vi.fn(),
  migratePalettes: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-store', () => ({ load }))
vi.mock('@common/migratePalettes', () => ({ migratePalettes }))
vi.mock('@common/portableStore', () => ({ resolveStoreFile: (filename: string) => filename }))

import { usePalettesStore } from './palettesStore'
import { DEFAULT_PALETTE_DISPLAY } from '@common/upgradePalettesSchema'

const makeFakeStore = (initial: unknown = undefined) => {
  const data = new Map<string, unknown>([['schema', initial]])
  return {
    get: vi.fn(async (key: string) => data.get(key)),
    set: vi.fn(async (key: string, value: unknown) => {
      data.set(key, value)
    }),
    save: vi.fn(async () => {}),
    _data: data,
  }
}

const resetState = () =>
  usePalettesStore.setState({
    paletteSections: [],
    palettes: [],
    defaultPaletteDisplay: DEFAULT_PALETTE_DISPLAY,
    activePaletteId: null,
    isLoading: false,
    isInitialized: false,
    error: null,
  })

beforeEach(() => {
  vi.clearAllMocks()
  resetState()
})

describe('palettesStore', () => {
  it('runs legacy migration and upgrades to v3 when no schema is on disk yet', async () => {
    const fakeStore = makeFakeStore(undefined)
    load.mockResolvedValue(fakeStore)
    migratePalettes.mockResolvedValue({
      version: 1,
      categories: [{ id: 'cat-1', name: 'flat', colors: [{ id: 'col-1', value: '#2196F3' }] }],
    })

    await usePalettesStore.getState().initialize()

    expect(migratePalettes).toHaveBeenCalledTimes(1)
    const { palettes } = usePalettesStore.getState()
    expect(palettes).toHaveLength(1)
    expect(palettes[0].name).toBe('flat')
    expect(palettes[0].colorSections[0].colors).toHaveLength(1)
    expect(palettes[0].colorSections[0].colors[0].value).toEqual({
      space: 'srgb',
      coords: [0x21 / 255, 0x96 / 255, 0xf3 / 255],
      alpha: 1,
    })
    expect(usePalettesStore.getState().activePaletteId).toBe('cat-1')
    expect(fakeStore.save).toHaveBeenCalled()
  })

  it('upgrades a stored v1 schema to v3 and persists the upgrade', async () => {
    const fakeStore = makeFakeStore({
      version: 1,
      categories: [{ id: 'cat-1', name: 'existing', colors: [] }],
    })
    load.mockResolvedValue(fakeStore)

    await usePalettesStore.getState().initialize()

    expect(migratePalettes).not.toHaveBeenCalled()
    const { palettes } = usePalettesStore.getState()
    expect(palettes).toEqual([
      expect.objectContaining({ id: 'cat-1', name: 'existing', sectionId: null }),
    ])
    const persisted = fakeStore._data.get('schema') as { version: number }
    expect(persisted.version).toBe(3)
  })

  it('loads an existing v3 schema as-is without re-running any migration', async () => {
    const fakeStore = makeFakeStore({
      version: 3,
      paletteSections: [],
      palettes: [
        {
          id: 'pal-1',
          name: 'existing',
          sectionId: null,
          order: 1000,
          display: DEFAULT_PALETTE_DISPLAY,
          colorSections: [{ id: 'sec-1', colors: [] }],
        },
      ],
      defaultPaletteDisplay: DEFAULT_PALETTE_DISPLAY,
    })
    fakeStore._data.set('activePaletteId', 'pal-1')
    load.mockResolvedValue(fakeStore)

    await usePalettesStore.getState().initialize()

    expect(migratePalettes).not.toHaveBeenCalled()
    expect(fakeStore.save).not.toHaveBeenCalled()
    expect(usePalettesStore.getState().palettes.map((p) => p.id)).toEqual(['pal-1'])
  })

  it('deletePalette removes the palette from state and persists the removal (G12)', async () => {
    const fakeStore = makeFakeStore({
      version: 1,
      categories: [
        { id: 'cat-1', name: 'flat', colors: [] },
        { id: 'cat-2', name: 'pastel', colors: [] },
      ],
    })
    load.mockResolvedValue(fakeStore)

    await usePalettesStore.getState().initialize()
    await usePalettesStore.getState().deletePalette('cat-1')

    expect(usePalettesStore.getState().palettes.map((p) => p.id)).toEqual(['cat-2'])
    expect(fakeStore.save).toHaveBeenCalled()

    const persisted = fakeStore._data.get('schema') as { palettes: { id: string }[] }
    expect(persisted.palettes.map((p) => p.id)).toEqual(['cat-2'])
  })

  it('addColor then deleteColor round-trips through persisted state', async () => {
    const fakeStore = makeFakeStore({
      version: 1,
      categories: [{ id: 'cat-1', name: 'flat', colors: [] }],
    })
    load.mockResolvedValue(fakeStore)

    await usePalettesStore.getState().initialize()
    const colorSectionId = usePalettesStore.getState().palettes[0].colorSections[0].id
    await usePalettesStore.getState().addColor('cat-1', colorSectionId, '#ABCDEF')

    const afterAdd = usePalettesStore.getState().palettes[0].colorSections[0].colors
    expect(afterAdd).toHaveLength(1)

    await usePalettesStore.getState().deleteColor('cat-1', colorSectionId, afterAdd[0].id)

    expect(usePalettesStore.getState().palettes[0].colorSections[0].colors).toHaveLength(0)
    const persisted = fakeStore._data.get('schema') as {
      palettes: { colorSections: { colors: unknown[] }[] }[]
    }
    expect(persisted.palettes[0].colorSections[0].colors).toHaveLength(0)
  })

  it('#176 script: create palette, add colors, delete it, "restart" — still deleted (G12)', async () => {
    const fakeStore = makeFakeStore({
      version: 1,
      categories: [{ id: 'cat-1', name: 'flat', colors: [] }],
    })
    load.mockResolvedValue(fakeStore)

    await usePalettesStore.getState().initialize()
    await usePalettesStore.getState().addPalette('my palette')
    const created = usePalettesStore.getState().palettes.find((p) => p.name === 'my palette')!
    await usePalettesStore.getState().addColor(created.id, created.colorSections[0].id, '#123456')
    await usePalettesStore.getState().deletePalette(created.id)

    // Simulate an app restart: reset in-memory state, re-`initialize()`
    // against the same persisted backing store.
    resetState()
    await usePalettesStore.getState().initialize()

    expect(usePalettesStore.getState().palettes.some((p) => p.name === 'my palette')).toBe(false)
  })

  it('addColorToActivePalette saves into the active palette (Ctrl/Cmd+S, G13)', async () => {
    const fakeStore = makeFakeStore({
      version: 1,
      categories: [
        { id: 'cat-1', name: 'flat', colors: [] },
        { id: 'cat-2', name: 'pastel', colors: [] },
      ],
    })
    load.mockResolvedValue(fakeStore)

    await usePalettesStore.getState().initialize()
    await usePalettesStore.getState().setActivePalette('cat-2')
    await usePalettesStore.getState().addColorToActivePalette('#654321')

    const pastel = usePalettesStore.getState().palettes.find((p) => p.id === 'cat-2')!
    expect(pastel.colorSections[0].colors).toHaveLength(1)
    const flat = usePalettesStore.getState().palettes.find((p) => p.id === 'cat-1')!
    expect(flat.colorSections[0].colors).toHaveLength(0)
  })

  const initEmpty = async () => {
    const fakeStore = makeFakeStore({
      version: 3,
      paletteSections: [],
      palettes: [],
      defaultPaletteDisplay: DEFAULT_PALETTE_DISPLAY,
    })
    load.mockResolvedValue(fakeStore)
    await usePalettesStore.getState().initialize()
    return fakeStore
  }

  const persistedSchema = (fakeStore: ReturnType<typeof makeFakeStore>) =>
    fakeStore._data.get('schema') as {
      paletteSections: { id: string; name: string; isOpen: boolean }[]
      palettes: { id: string; name: string; sectionId: string | null; order: number }[]
    }

  it('addPalette inside a section places it there and resolves to its id', async () => {
    const fakeStore = await initEmpty()
    await usePalettesStore.getState().addPaletteSection('Work')
    const sectionId = usePalettesStore.getState().paletteSections[0].id

    const id = await usePalettesStore.getState().addPalette('Brand', sectionId)

    const palette = usePalettesStore.getState().palettes.find((p) => p.id === id)!
    expect(palette.sectionId).toBe(sectionId)
    expect(persistedSchema(fakeStore).palettes[0]).toMatchObject({ id, sectionId })
  })

  it('renamePalette and renamePaletteSection persist the new names', async () => {
    const fakeStore = await initEmpty()
    await usePalettesStore.getState().addPaletteSection('Old section')
    const id = await usePalettesStore.getState().addPalette('Old palette')
    const sectionId = usePalettesStore.getState().paletteSections[0].id

    await usePalettesStore.getState().renamePalette(id, 'New palette')
    await usePalettesStore.getState().renamePaletteSection(sectionId, 'New section')

    expect(persistedSchema(fakeStore).palettes[0].name).toBe('New palette')
    expect(persistedSchema(fakeStore).paletteSections[0].name).toBe('New section')
  })

  it('deletePaletteSection keeps its palettes, moving them to the end of the root list', async () => {
    const fakeStore = await initEmpty()
    const rootId = await usePalettesStore.getState().addPalette('Root')
    await usePalettesStore.getState().addPaletteSection('Work')
    const sectionId = usePalettesStore.getState().paletteSections[0].id
    const firstId = await usePalettesStore.getState().addPalette('First', sectionId)
    const secondId = await usePalettesStore.getState().addPalette('Second', sectionId)

    await usePalettesStore.getState().deletePaletteSection(sectionId)

    const { palettes, paletteSections } = usePalettesStore.getState()
    expect(paletteSections).toHaveLength(0)
    const byId = (id: string) => palettes.find((p) => p.id === id)!
    expect(palettes.every((p) => p.sectionId === null)).toBe(true)
    expect(byId(rootId).order).toBeLessThan(byId(firstId).order)
    expect(byId(firstId).order).toBeLessThan(byId(secondId).order)
    expect(persistedSchema(fakeStore).paletteSections).toHaveLength(0)
  })

  it('setPaletteSectionOpen persists the collapsed state', async () => {
    const fakeStore = await initEmpty()
    await usePalettesStore.getState().addPaletteSection('Work')
    const sectionId = usePalettesStore.getState().paletteSections[0].id

    await usePalettesStore.getState().setPaletteSectionOpen(sectionId, false)

    expect(persistedSchema(fakeStore).paletteSections[0].isOpen).toBe(false)
  })
})
