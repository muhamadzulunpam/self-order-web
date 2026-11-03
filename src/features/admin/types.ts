export type AdminCategory = {
  id: number
  name: string
  slug: string
  sort_order: number
  /** Hanya ada pada daftar kategori. */
  menus_count?: number
}

export type AdminMenu = {
  id: number
  name: string
  description: string | null
  price: number
  image_url: string | null
  has_spice_level: boolean
  is_available: boolean
  category: { id: number; name: string }
}

export type AdminTable = {
  id: number
  number: number
  is_active: boolean
  order_url: string
  /** Hanya ada pada daftar meja. */
  orders_count?: number
}

export type PageInfo = { page: number; lastPage: number; total: number }
export type MenuPage = { items: AdminMenu[]; pageInfo: PageInfo }

export type AvailabilityFilter = 'all' | 'available' | 'unavailable'

export type MenuFilters = {
  search: string
  categoryId: number | null
  availability: AvailabilityFilter
  page: number
}

export const DEFAULT_MENU_FILTERS: MenuFilters = {
  search: '',
  categoryId: null,
  availability: 'all',
  page: 1,
}
