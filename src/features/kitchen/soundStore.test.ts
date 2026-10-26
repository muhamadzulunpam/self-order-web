import { describe, expect, it, vi } from 'vitest'
import { SOUND_STORAGE_KEY, useKitchenSoundStore } from './soundStore'

describe('kitchen sound store', () => {
  it('aktif secara bawaan', () => {
    expect(useKitchenSoundStore.getState().enabled).toBe(true)
  })

  it('menyimpan pilihan dan memulihkannya setelah reload', async () => {
    useKitchenSoundStore.getState().setEnabled(false)

    expect(
      JSON.parse(localStorage.getItem(SOUND_STORAGE_KEY) ?? '{}').state,
    ).toEqual({
      enabled: false,
    })

    vi.resetModules()
    const { useKitchenSoundStore: reloaded } = await import('./soundStore')

    expect(reloaded.getState().enabled).toBe(false)
  })

  it('mengabaikan nilai tersimpan yang bukan boolean', async () => {
    localStorage.setItem(
      SOUND_STORAGE_KEY,
      JSON.stringify({ version: 1, state: { enabled: 'ya' } }),
    )

    vi.resetModules()
    const { useKitchenSoundStore: reloaded } = await import('./soundStore')

    expect(reloaded.getState().enabled).toBe(true)
  })

  it('tidak error jika isi localStorage bukan JSON yang valid', async () => {
    localStorage.setItem(SOUND_STORAGE_KEY, '{bukan json')

    vi.resetModules()
    const { useKitchenSoundStore: reloaded } = await import('./soundStore')

    expect(reloaded.getState().enabled).toBe(true)
  })
})
