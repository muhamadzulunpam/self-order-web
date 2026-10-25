import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { configureAuth } from '@/lib/api'
import { fetchMe, loginRequest, logoutRequest } from './api'
import type { User } from './types'

export const AUTH_STORAGE_KEY = 'self-order-auth'

/**
 * idle: ada token, belum diverifikasi. checking: sedang memverifikasi.
 * error: verifikasi gagal karena jaringan atau server (token dipertahankan).
 */
export type SessionStatus =
  'idle' | 'checking' | 'authenticated' | 'anonymous' | 'error'

/** Alasan sesi berakhir, dipakai untuk pemberitahuan dan arah redirect. */
export type EndReason = 'expired' | 'logout' | null

type AuthState = {
  token: string | null
  user: User | null
  status: SessionStatus
  endReason: EndReason
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  restore: () => Promise<void>
  handleUnauthorized: (usedToken: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      status: 'anonymous',
      endReason: null,

      login: async (email, password) => {
        const { user, token } = await loginRequest(email, password)

        set({ token, user, status: 'authenticated', endReason: null })
      },

      logout: () => {
        const { token } = get()

        set({
          token: null,
          user: null,
          status: 'anonymous',
          endReason: 'logout',
        })

        // Sebisanya: kegagalan jaringan tidak boleh menahan pengguna untuk keluar.
        if (token) void logoutRequest(token).catch(() => {})
      },

      restore: async () => {
        const { token, status } = get()

        if (!token) {
          set({ user: null, status: 'anonymous' })
          return
        }

        if (status === 'checking') return

        set({ status: 'checking' })

        try {
          const user = await fetchMe()

          // Abaikan hasil jika sesi sudah berganti selama menunggu.
          if (get().token === token) set({ user, status: 'authenticated' })
        } catch {
          // 401 sudah ditangani interceptor (token dihapus), sisanya dianggap gagal verifikasi.
          if (get().token === token) set({ status: 'error' })
        }
      },

      handleUnauthorized: (usedToken) => {
        if (get().token !== usedToken) return

        set({
          token: null,
          user: null,
          status: 'anonymous',
          endReason: 'expired',
        })
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token }),
      merge: (persisted, current) => {
        const stored = (persisted as { token?: unknown } | null | undefined)
          ?.token
        const token =
          typeof stored === 'string' && stored !== '' ? stored : null

        return { ...current, token, status: token ? 'idle' : 'anonymous' }
      },
    },
  ),
)

configureAuth({
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: (usedToken) =>
    useAuthStore.getState().handleUnauthorized(usedToken),
})
