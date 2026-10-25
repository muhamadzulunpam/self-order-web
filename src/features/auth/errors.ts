import { ApiError } from '@/lib/api'

export function describeLoginError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Terjadi kesalahan tak terduga. Silakan coba lagi.'
  }

  if (error.status === null) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
  }

  // Backend menjawab 422 untuk email atau kata sandi yang salah.
  if (error.status === 422) return 'Email atau kata sandi salah.'

  if (error.status === 429) {
    return 'Terlalu banyak percobaan masuk. Tunggu sebentar, lalu coba lagi.'
  }

  if (error.status >= 500) {
    return 'Server sedang bermasalah. Silakan coba lagi sebentar lagi.'
  }

  return error.message
}
