import { useCallback, useEffect, useState } from 'react'
import { playNewOrderChime, unlockSound } from './sound'
import type { SoundStore } from './soundStore'

/** Pengaturan dan pemutaran suara untuk satu layar. Tiap layar punya toko pengaturan sendiri. */
export function useStationSound(useStore: SoundStore) {
  const enabled = useStore((state) => state.enabled)
  const setEnabled = useStore((state) => state.setEnabled)
  const [blocked, setBlocked] = useState(false)

  // Sentuhan atau tekanan tombol pertama membuka kunci suara (aturan autoplay browser).
  useEffect(() => {
    if (!enabled) return

    const unlock = () => {
      void unlockSound().then((ready) => setBlocked(!ready))
    }

    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [enabled])

  const toggle = useCallback(() => {
    const next = !useStore.getState().enabled

    setEnabled(next)

    if (!next) {
      setBlocked(false)
      return
    }

    // Klik ini adalah interaksi pengguna: buka kunci suara dan putar contoh bunyinya.
    void unlockSound().then((ready) => {
      setBlocked(!ready)

      if (ready) playNewOrderChime()
    })
  }, [useStore, setEnabled])

  const notify = useCallback(() => {
    if (!useStore.getState().enabled) return

    if (!playNewOrderChime()) setBlocked(true)
  }, [useStore])

  return { enabled, blocked: enabled && blocked, toggle, notify }
}
