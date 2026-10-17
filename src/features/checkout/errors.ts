import { ApiError } from '@/lib/api'

export type CheckoutFailure = {
  message: string
  /** Indeks baris keranjang yang ditolak server (urutan sama dengan item yang dikirim). */
  lineIndexes: number[]
  fieldErrors: { customer_name?: string; notes?: string }
  /** True jika menu perlu dimuat ulang agar keranjang disesuaikan. */
  refreshMenu: boolean
}

const LINE_ERROR = /^items\.(\d+)\./

function failure(message: string): CheckoutFailure {
  return { message, lineIndexes: [], fieldErrors: {}, refreshMenu: false }
}

function describeValidation(errors: Record<string, string[]>): CheckoutFailure {
  const indexes = new Set<number>()
  const fieldErrors: CheckoutFailure['fieldErrors'] = {}

  for (const key of Object.keys(errors)) {
    const match = LINE_ERROR.exec(key)

    if (match) indexes.add(Number(match[1]))
    else if (key === 'customer_name') {
      fieldErrors.customer_name =
        'Nama terlalu panjang (maksimal 100 karakter).'
    } else if (key === 'notes') {
      fieldErrors.notes = 'Catatan terlalu panjang (maksimal 500 karakter).'
    }
  }

  const lineIndexes = [...indexes].sort((a, b) => a - b)

  if (lineIndexes.length > 0) {
    return {
      message:
        'Sebagian menu tidak bisa dipesan lagi. Silakan periksa kembali keranjang Anda.',
      lineIndexes,
      fieldErrors,
      refreshMenu: true,
    }
  }

  return {
    message:
      Object.keys(fieldErrors).length > 0
        ? 'Periksa kembali isian Anda.'
        : 'Data pesanan tidak valid. Silakan periksa kembali pesanan Anda.',
    lineIndexes,
    fieldErrors,
    refreshMenu: false,
  }
}

export function describeCheckoutError(error: unknown): CheckoutFailure {
  if (!(error instanceof ApiError)) {
    return failure('Terjadi kesalahan tak terduga. Silakan coba lagi.')
  }

  if (error.status === null) {
    return failure(
      'Pesanan belum terkirim. Periksa koneksi internet Anda, lalu coba lagi.',
    )
  }

  if (error.status === 404) {
    return failure(
      'Meja tidak ditemukan atau tidak aktif. Pindai ulang QR code di meja Anda, atau minta bantuan staf.',
    )
  }

  if (error.status === 429) {
    return failure('Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.')
  }

  if (error.status >= 500) {
    return failure(
      'Server sedang bermasalah. Pesanan belum dibuat, silakan coba lagi sebentar lagi.',
    )
  }

  if (error.status === 422) return describeValidation(error.errors)

  return failure(error.message)
}
