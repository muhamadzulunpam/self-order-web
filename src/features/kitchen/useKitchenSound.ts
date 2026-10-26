import { useCallback, useEffect, useState } from 'react'
import { playNewOrderChime, unlockSound } from './sound'
import { useKitchenSoundStore } from './soundStore'

export function useKitchenSound() {
  const enabled = useKitchenSoundStore((state) => state.enabled)
  const setEnabled = useKitchenSoundStore((state) => state.setEnabled)
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
    const next = !useKitchenSoundStore.getState().enabled

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
  }, [setEnabled])

  const notify = useCallback(() => {
    if (!useKitchenSoundStore.getState().enabled) return

    if (!playNewOrderChime()) setBlocked(true)
  }, [])

  return { enabled, blocked: enabled && blocked, toggle, notify }
}
