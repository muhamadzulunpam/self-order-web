import { ApiError } from '@/lib/api'

export type StatusFailure = {
  message: string
  /** True jika daftar pesanan perlu disegarkan agar sesuai keadaan server. */
  refresh: boolean
}

export function describeStatusError(error: unknown): StatusFailure {
  if (!(error instanceof ApiError)) {
    return {
      message: 'Terjadi kesalahan tak terduga. Silakan coba lagi.',
      refresh: false,
    }
  }

  switch (error.status) {
    case null:
      return {
        message:
          'Perubahan belum terkirim. Periksa koneksi internet Anda, lalu coba lagi.',
        refresh: false,
      }
    case 401:
      return {
        message: 'Sesi Anda telah berakhir. Silakan masuk lagi.',
        refresh: false,
      }
    case 403:
      return {
        message: 'Akun Anda tidak berhak melakukan perubahan ini.',
        refresh: false,
      }
    case 404:
      return {
        message: 'Pesanan tidak ditemukan. Daftar disegarkan.',
        refresh: true,
      }
    case 409:
      return {
        message: 'Pesanan ini sudah diubah oleh staf lain. Daftar disegarkan.',
        refresh: true,
      }
    case 422:
      return {
        message: 'Perubahan status tidak valid. Daftar disegarkan.',
        refresh: true,
      }
    case 429:
      return {
        message: 'Terlalu banyak permintaan. Tunggu sebentar, lalu coba lagi.',
        refresh: false,
      }
  }

  if (error.status >= 500) {
    return {
      message: 'Server sedang bermasalah. Silakan coba lagi sebentar lagi.',
      refresh: false,
    }
  }

  return { message: error.message, refresh: false }
}
