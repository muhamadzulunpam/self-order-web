import { api } from '@/lib/api'
import { parseCategory, parseMenu, parsePageInfo, parseTable } from './parsers'
import type {
  AdminCategory,
  AdminMenu,
  AdminTable,
  MenuFilters,
  MenuPage,
} from './types'

const INVALID = 'Data dari server tidak valid.'
const UPLOAD_TIMEOUT_MS = 60_000

type Parser<T> = (value: unknown) => T | null

function parseOne<T>(value: unknown, parse: Parser<T>): T {
  const parsed = parse(value)

  if (parsed === null) throw new Error(INVALID)

  return parsed
}

/** Satu entri yang tidak valid menggagalkan seluruh daftar: lebih baik error daripada data diam-diam hilang. */
function parseList<T>(value: unknown, parse: Parser<T>): T[] {
  if (!Array.isArray(value)) throw new Error(INVALID)

  return value.map((item) => parseOne(item, parse))
}

/* ---------- Kategori ---------- */

export type CategoryInput = { name: string; sortOrder: number }

export async function fetchCategories(): Promise<AdminCategory[]> {
  const { data } = await api.get<{ data?: unknown }>('/admin/categories')

  return parseList(data?.data, parseCategory)
}

export async function createCategory(
  input: CategoryInput,
): Promise<AdminCategory> {
  const { data } = await api.post<{ data?: unknown }>('/admin/categories', {
    name: input.name,
    sort_order: input.sortOrder,
  })

  return parseOne(data?.data, parseCategory)
}

export async function updateCategory(
  id: number,
  input: CategoryInput,
): Promise<AdminCategory> {
  const { data } = await api.put<{ data?: unknown }>(
    `/admin/categories/${id}`,
    { name: input.name, sort_order: input.sortOrder },
  )

  return parseOne(data?.data, parseCategory)
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/admin/categories/${id}`)
}

/* ---------- Menu ---------- */

export type MenuFormValues = {
  categoryId: number
  name: string
  description: string
  price: number
  hasSpiceLevel: boolean
  isAvailable: boolean
  image?: File | null
}

/**
 * Boolean dikirim sebagai '1' atau '0' karena validasi boolean Laravel tidak menerima teks "true" atau "false".
 * `method` diisi 'PUT' untuk update: PHP tidak membaca file pada request PUT, jadi dikirim lewat POST + _method.
 */
export function buildMenuFormData(
  values: MenuFormValues,
  method?: 'PUT',
): FormData {
  const form = new FormData()

  form.append('category_id', String(values.categoryId))
  form.append('name', values.name.trim())
  form.append('description', values.description.trim())
  form.append('price', String(values.price))
  form.append('has_spice_level', values.hasSpiceLevel ? '1' : '0')
  form.append('is_available', values.isAvailable ? '1' : '0')

  if (values.image) form.append('image', values.image)
  if (method) form.append('_method', method)

  return form
}

export function menuValuesFrom(
  menu: AdminMenu,
  overrides: Partial<MenuFormValues> = {},
): MenuFormValues {
  return {
    categoryId: menu.category.id,
    name: menu.name,
    description: menu.description ?? '',
    price: menu.price,
    hasSpiceLevel: menu.has_spice_level,
    isAvailable: menu.is_available,
    ...overrides,
  }
}

export function menuParams(
  filters: MenuFilters,
): Record<string, string | number> {
  const params: Record<string, string | number> = { page: filters.page }
  const search = filters.search.trim()

  if (search) params.search = search
  if (filters.categoryId !== null) params.category_id = filters.categoryId
  if (filters.availability !== 'all') {
    params.is_available = filters.availability === 'available' ? 1 : 0
  }

  return params
}

export async function fetchMenus(filters: MenuFilters): Promise<MenuPage> {
  const { data } = await api.get<{ data?: unknown; meta?: unknown }>(
    '/admin/menus',
    { params: menuParams(filters) },
  )
  const pageInfo = parsePageInfo(data?.meta)

  if (!pageInfo) throw new Error(INVALID)

  return { items: parseList(data?.data, parseMenu), pageInfo }
}

export async function createMenu(values: MenuFormValues): Promise<AdminMenu> {
  const { data } = await api.post<{ data?: unknown }>(
    '/admin/menus',
    buildMenuFormData(values),
    { timeout: UPLOAD_TIMEOUT_MS },
  )

  return parseOne(data?.data, parseMenu)
}

export async function updateMenu(
  id: number,
  values: MenuFormValues,
): Promise<AdminMenu> {
  const { data } = await api.post<{ data?: unknown }>(
    `/admin/menus/${id}`,
    buildMenuFormData(values, 'PUT'),
    { timeout: UPLOAD_TIMEOUT_MS },
  )

  return parseOne(data?.data, parseMenu)
}

export async function deleteMenu(id: number): Promise<void> {
  await api.delete(`/admin/menus/${id}`)
}

/* ---------- Meja ---------- */

export type TableInput = { number: number; isActive: boolean }

export async function fetchTables(): Promise<AdminTable[]> {
  const { data } = await api.get<{ data?: unknown }>('/admin/dining-tables')

  return parseList(data?.data, parseTable)
}

export async function createTable(input: TableInput): Promise<AdminTable> {
  const { data } = await api.post<{ data?: unknown }>('/admin/dining-tables', {
    number: input.number,
    is_active: input.isActive,
  })

  return parseOne(data?.data, parseTable)
}

export async function updateTable(
  id: number,
  input: TableInput,
): Promise<AdminTable> {
  const { data } = await api.put<{ data?: unknown }>(
    `/admin/dining-tables/${id}`,
    { number: input.number, is_active: input.isActive },
  )

  return parseOne(data?.data, parseTable)
}

export async function deleteTable(id: number): Promise<void> {
  await api.delete(`/admin/dining-tables/${id}`)
}

export async function regenerateTableToken(id: number): Promise<AdminTable> {
  const { data } = await api.post<{ data?: unknown }>(
    `/admin/dining-tables/${id}/regenerate-token`,
  )

  return parseOne(data?.data, parseTable)
}

/** Endpoint QR membutuhkan token Bearer, jadi diambil sebagai teks SVG lewat klien API. */
export async function fetchTableQr(id: number): Promise<string> {
  const { data } = await api.get<string>(`/admin/dining-tables/${id}/qr`, {
    responseType: 'text',
  })

  if (typeof data !== 'string' || !data.includes('<svg')) {
    throw new Error('Gambar QR dari server tidak valid.')
  }

  return data
}
