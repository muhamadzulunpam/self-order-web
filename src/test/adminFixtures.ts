import type {
  AdminCategory,
  AdminMenu,
  AdminTable,
} from '@/features/admin/types'
import type { Reply } from './mockServer'

export function makeAdminCategory(
  overrides: Partial<AdminCategory> = {},
): AdminCategory {
  const id = overrides.id ?? 1

  return {
    id,
    name: `Kategori ${id}`,
    slug: `kategori-${id}`,
    sort_order: id,
    menus_count: 0,
    ...overrides,
  }
}

export function makeAdminMenu(overrides: Partial<AdminMenu> = {}): AdminMenu {
  const id = overrides.id ?? 1

  return {
    id,
    name: `Menu ${id}`,
    description: null,
    price: 12000,
    image_url: null,
    has_spice_level: false,
    is_available: true,
    category: { id: 1, name: 'Mie' },
    ...overrides,
  }
}

export function makeAdminTable(
  overrides: Partial<AdminTable> = {},
): AdminTable {
  const id = overrides.id ?? 1

  return {
    id,
    number: id,
    is_active: true,
    order_url: `http://localhost:5173/order/token-${id}`,
    orders_count: 0,
    ...overrides,
  }
}

export function listReply<T>(items: T[]): Reply {
  return { status: 200, data: { data: items } }
}

export function menuPage(
  items: AdminMenu[],
  meta: Partial<{
    current_page: number
    last_page: number
    total: number
  }> = {},
): Reply {
  return {
    status: 200,
    data: {
      data: items,
      meta: {
        current_page: 1,
        last_page: 1,
        total: items.length,
        ...meta,
      },
    },
  }
}
