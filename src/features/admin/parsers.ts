import type { AdminCategory, AdminMenu, AdminTable, PageInfo } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

/** Menerima bilangan bulat atau string angka (sebagian konfigurasi database mengirim angka sebagai teks). */
export function asInt(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)

  return null
}

export function parseCategory(value: unknown): AdminCategory | null {
  if (!isRecord(value)) return null

  const id = asInt(value.id)
  const sortOrder = asInt(value.sort_order)
  const { name, slug, menus_count } = value

  if (
    id === null ||
    sortOrder === null ||
    typeof name !== 'string' ||
    typeof slug !== 'string'
  ) {
    return null
  }

  if (menus_count === undefined) {
    return { id, name, slug, sort_order: sortOrder }
  }

  const count = asInt(menus_count)

  if (count === null) return null

  return { id, name, slug, sort_order: sortOrder, menus_count: count }
}

export function parseMenu(value: unknown): AdminMenu | null {
  if (!isRecord(value)) return null

  const id = asInt(value.id)
  const price = asInt(value.price)
  const {
    name,
    description,
    image_url,
    has_spice_level,
    is_available,
    category,
  } = value

  if (
    id === null ||
    price === null ||
    typeof name !== 'string' ||
    !isNullableString(description) ||
    !isNullableString(image_url) ||
    typeof has_spice_level !== 'boolean' ||
    typeof is_available !== 'boolean' ||
    !isRecord(category)
  ) {
    return null
  }

  const categoryId = asInt(category.id)

  if (categoryId === null || typeof category.name !== 'string') return null

  return {
    id,
    name,
    description,
    price,
    image_url,
    has_spice_level,
    is_available,
    category: { id: categoryId, name: category.name },
  }
}

export function parseTable(value: unknown): AdminTable | null {
  if (!isRecord(value)) return null

  const id = asInt(value.id)
  const number = asInt(value.number)
  const { is_active, order_url, orders_count } = value

  if (
    id === null ||
    number === null ||
    typeof is_active !== 'boolean' ||
    typeof order_url !== 'string'
  ) {
    return null
  }

  if (orders_count === undefined) return { id, number, is_active, order_url }

  const count = asInt(orders_count)

  if (count === null) return null

  return { id, number, is_active, order_url, orders_count: count }
}

export function parsePageInfo(value: unknown): PageInfo | null {
  if (!isRecord(value)) return null

  const page = asInt(value.current_page)
  const lastPage = asInt(value.last_page)
  const total = asInt(value.total)

  if (page === null || lastPage === null || total === null) return null

  return { page, lastPage, total }
}
