// src/lib/api.ts
import axios, { AxiosError } from 'axios'

export class ApiError extends Error {
  status: number | null
  errors: Record<string, string[]>

  constructor(
    status: number | null,
    message: string,
    errors: Record<string, string[]> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

type AuthHooks = {
  getToken: () => string | null
  onUnauthorized: (usedToken: string) => void
}

let authHooks: AuthHooks | null = null

/** Dipanggil oleh store autentikasi, supaya api.ts tidak perlu mengimpor store (menghindari impor melingkar). */
export function configureAuth(hooks: AuthHooks | null): void {
  authHooks = hooks
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { Accept: 'application/json' },
  timeout: 15000,
})

type ErrorBody = { message?: string; errors?: Record<string, string[]> }

/** Endpoint pembeli dan login tidak pernah membawa token staf. */
function isTokenFree(url: string): boolean {
  return url.startsWith('/public/') || url === '/auth/login'
}

function usedToken(config: AxiosError['config']): string | null {
  const header = config?.headers?.get('Authorization')

  return typeof header === 'string' && header.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : null
}

api.interceptors.request.use((config) => {
  const token = authHooks?.getToken() ?? null

  if (
    token &&
    !isTokenFree(config.url ?? '') &&
    !config.headers.has('Authorization')
  ) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorBody>) => {
    if (!error.response) {
      return Promise.reject(
        new ApiError(
          null,
          'Tidak dapat terhubung ke server. Periksa koneksi Anda.',
        ),
      )
    }

    const { status, data } = error.response

    if (status === 401) {
      const token = usedToken(error.config)

      if (token) authHooks?.onUnauthorized(token)
    }

    return Promise.reject(
      new ApiError(status, data?.message ?? 'Terjadi kesalahan.', data?.errors),
    )
  },
)
