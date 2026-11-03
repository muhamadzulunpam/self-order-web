export type FieldErrors = Record<string, string>

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const IMAGE_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
]
export const MAX_SORT_ORDER = 9999
export const MAX_PRICE = 99_999_999
export const MAX_TABLE_NUMBER = 999

export function parseWholeNumber(text: string): number | null {
  const trimmed = text.trim()

  return /^\d+$/.test(trimmed) ? Number(trimmed) : null
}

/** Kunci error mengikuti nama field backend (name, sort_order, ...), sama dengan error 422 dari server. */
export function validateCategory(draft: {
  name: string
  sortOrder: string
}): FieldErrors {
  const errors: FieldErrors = {}
  const name = draft.name.trim()

  if (!name) errors.name = 'Nama kategori wajib diisi.'
  else if (name.length > 100)
    errors.name = 'Nama kategori maksimal 100 karakter.'

  const order = parseWholeNumber(draft.sortOrder)

  if (order === null || order > MAX_SORT_ORDER) {
    errors.sort_order = `Urutan harus bilangan bulat 0 sampai ${MAX_SORT_ORDER}.`
  }

  return errors
}

export function validateMenu(draft: {
  name: string
  categoryId: string
  price: string
  description: string
  image: File | null
}): FieldErrors {
  const errors: FieldErrors = {}
  const name = draft.name.trim()

  if (!name) errors.name = 'Nama menu wajib diisi.'
  else if (name.length > 255) errors.name = 'Nama menu maksimal 255 karakter.'

  const categoryId = parseWholeNumber(draft.categoryId)

  if (categoryId === null || categoryId === 0) {
    errors.category_id = 'Pilih kategori.'
  }

  const price = parseWholeNumber(draft.price)

  if (price === null) errors.price = 'Harga harus berupa angka bulat.'
  else if (price > MAX_PRICE) errors.price = 'Harga terlalu besar.'

  if (draft.description.trim().length > 1000) {
    errors.description = 'Deskripsi maksimal 1000 karakter.'
  }

  if (draft.image) {
    if (!IMAGE_TYPES.includes(draft.image.type)) {
      errors.image = 'Gambar harus berformat JPG, PNG, atau WebP.'
    } else if (draft.image.size > MAX_IMAGE_BYTES) {
      errors.image = 'Ukuran gambar maksimal 2 MB.'
    }
  }

  return errors
}

export function validateTable(draft: { number: string }): FieldErrors {
  const errors: FieldErrors = {}
  const number = parseWholeNumber(draft.number)

  if (number === null || number < 1 || number > MAX_TABLE_NUMBER) {
    errors.number = `Nomor meja harus bilangan bulat 1 sampai ${MAX_TABLE_NUMBER}.`
  }

  return errors
}
