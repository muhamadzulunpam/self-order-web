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

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { Accept: 'application/json' },
  timeout: 15000,
})

type ErrorBody = { message?: string; errors?: Record<string, string[]> }

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

    return Promise.reject(
      new ApiError(status, data?.message ?? 'Terjadi kesalahan.', data?.errors),
    )
  },
)
