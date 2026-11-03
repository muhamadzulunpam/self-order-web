import { ApiError } from '@/lib/api'

export type Entity = 'category' | 'menu' | 'table'

export type AdminFailure = {
  message: string
  /** Error per field (kunci mengikuti nama field backend). */
  fieldErrors: Record<string, string>
  /** True jika daftar perlu disegarkan agar sesuai keadaan server. */
  refresh: boolean
}

const CONFLICT: Record<Entity, string> = {
  category:
    'Kategori ini masih memiliki menu. Pindahkan atau hapus menunya terlebih dahulu.',
  menu: 'Menu ini sudah pernah dipesan sehingga tidak bisa dihapus. Nonaktifkan saja agar tidak tampil di menu pembeli.',
  table:
    'Meja ini sudah memiliki riwayat pesanan sehingga tidak bisa dihapus. Nonaktifkan saja.',
}

const NOT_FOUND: Record<Entity, string> = {
  category: 'Kategori tidak ditemukan. Daftar disegarkan.',
  menu: 'Menu tidak ditemukan. Daftar disegarkan.',
  table: 'Meja tidak ditemukan. Daftar disegarkan.',
}

function plain(message: string): AdminFailure {
  return { message, fieldErrors: {}, refresh: false }
}

function fieldMessage(field: string, messages: string[]): string | null {
  const taken = messages.some((message) => /taken|already|sudah/i.test(message))

  switch (field) {
    case 'name':
      return taken ? 'Nama sudah dipakai.' : 'Nama tidak valid.'
    case 'number':
      return taken ? 'Nomor meja sudah dipakai.' : 'Nomor meja tidak valid.'
    case 'sort_order':
      return 'Urutan tidak valid.'
    case 'category_id':
      return 'Kategori tidak valid.'
    case 'price':
      return 'Harga tidak valid.'
    case 'description':
      return 'Deskripsi tidak valid.'
    case 'image':
      return 'Gambar tidak valid. Gunakan JPG, PNG, atau WebP maksimal 2 MB.'
    default:
      return null
  }
}

function describeValidation(errors: Record<string, string[]>): AdminFailure {
  const fieldErrors: Record<string, string> = {}

  for (const [field, messages] of Object.entries(errors)) {
    const text = fieldMessage(field, messages)

    if (text) fieldErrors[field] = text
  }

  const hasFields = Object.keys(fieldErrors).length > 0

  return {
    message: hasFields
      ? 'Periksa kembali isian Anda.'
      : 'Data tidak valid. Periksa kembali isian Anda.',
    fieldErrors,
    refresh: false,
  }
}

export function describeAdminError(
  error: unknown,
  entity: Entity,
): AdminFailure {
  if (!(error instanceof ApiError)) {
    return plain('Terjadi kesalahan tak terduga. Silakan coba lagi.')
  }

  switch (error.status) {
    case null:
      return plain(
        'Perubahan belum terkirim. Periksa koneksi internet Anda, lalu coba lagi.',
      )
    case 401:
      return plain('Sesi Anda telah berakhir. Silakan masuk lagi.')
    case 403:
      return plain('Akun Anda tidak berhak melakukan perubahan ini.')
    case 404:
      return { ...plain(NOT_FOUND[entity]), refresh: true }
    case 409:
      return plain(CONFLICT[entity])
    case 413:
      return plain('Ukuran file terlalu besar untuk diunggah.')
    case 422:
      return describeValidation(error.errors)
    case 429:
      return plain(
        'Terlalu banyak permintaan. Tunggu sebentar, lalu coba lagi.',
      )
  }

  if (error.status >= 500) {
    return plain('Server sedang bermasalah. Silakan coba lagi sebentar lagi.')
  }

  return plain(error.message)
}
