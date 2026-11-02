import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const SOUND_STORAGE_KEY = 'self-order-kitchen-sound'
export const CASHIER_SOUND_STORAGE_KEY = 'self-order-cashier-sound'

export type SoundState = {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export function createSoundStore(storageKey: string) {
  return create<SoundState>()(
    persist(
      (set) => ({
        enabled: true,
        setEnabled: (enabled) => set({ enabled }),
      }),
      {
        name: storageKey,
        version: 1,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ enabled: state.enabled }),
        merge: (persisted, current) => {
          const stored = (persisted as { enabled?: unknown } | null | undefined)
            ?.enabled

          return {
            ...current,
            enabled: typeof stored === 'boolean' ? stored : current.enabled,
          }
        },
      },
    ),
  )
}

export type SoundStore = ReturnType<typeof createSoundStore>

export const useKitchenSoundStore = createSoundStore(SOUND_STORAGE_KEY)
export const useCashierSoundStore = createSoundStore(CASHIER_SOUND_STORAGE_KEY)
