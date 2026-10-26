import type { QueryClient } from '@tanstack/react-query'
import { staffKeys } from '@/lib/queryKeys'
import { useAuthStore } from './store'

/**
 * Hapus semua data staf dari cache setiap token hilang atau berganti:
 * logout, sesi habis (401), atau pindah akun. Akun berikutnya tidak boleh melihat data akun sebelumnya.
 */
export function registerSessionCleanup(client: QueryClient): () => void {
  return useAuthStore.subscribe((state, previous) => {
    if (previous.token !== null && previous.token !== state.token) {
      void client.cancelQueries({ queryKey: staffKeys.all })
      client.removeQueries({ queryKey: staffKeys.all })
    }
  })
}
