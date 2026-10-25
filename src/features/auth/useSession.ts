import { useEffect } from 'react'
import { useAuthStore } from './store'

/** Memicu verifikasi sesi (sekali) jika ada token yang belum diperiksa. */
export function useSession() {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const restore = useAuthStore((state) => state.restore)

  useEffect(() => {
    if (status === 'idle') void restore()
  }, [status, restore])

  return { status, user, retry: restore }
}
