import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const SOUND_STORAGE_KEY = 'self-order-kitchen-sound'

type SoundState = {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useKitchenSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: SOUND_STORAGE_KEY,
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
