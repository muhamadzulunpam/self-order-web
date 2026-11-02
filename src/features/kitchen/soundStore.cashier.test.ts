import { describe, expect, it, vi } from 'vitest'
import {
  CASHIER_SOUND_STORAGE_KEY,
  SOUND_STORAGE_KEY,
  useCashierSoundStore,
  useKitchenSoundStore,
} from './soundStore'

describe('cashier sound store', () => {
  it('aktif secara bawaan', () => {
    expect(useCashierSoundStore.getState().enabled).toBe(true)
  })

  it('terpisah dari pengaturan suara dapur', () => {
    useCashierSoundStore.getState().setEnabled(false)

    expect(useCashierSoundStore.getState().enabled).toBe(false)
    expect(useKitchenSoundStore.getState().enabled).toBe(true)
    expect(
      JSON.parse(localStorage.getItem(CASHIER_SOUND_STORAGE_KEY) ?? '{}').state,
    ).toEqual({ enabled: false })
    expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBeNull()
  })

  it('memulihkan pilihan setelah reload tanpa memengaruhi dapur', async () => {
    useCashierSoundStore.getState().setEnabled(false)

    vi.resetModules()
    const reloaded = await import('./soundStore')

    expect(reloaded.useCashierSoundStore.getState().enabled).toBe(false)
    expect(reloaded.useKitchenSoundStore.getState().enabled).toBe(true)
  })
})
