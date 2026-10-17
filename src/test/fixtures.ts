import type { TableMenu } from '@/types/menu'
import { makeLineKey } from '@/features/cart/cartLogic'
import type { CartLine } from '@/features/cart/cartLogic'
import type { PublicOrder } from '@/types/order'

export const sampleMenu: TableMenu = {
  table: { number: 5 },
  categories: [
    {
      id: 1,
      name: 'Mie',
      slug: 'mie',
      menus: [
        {
          id: 10,
          name: 'Mie Pedas Original',
          description: 'Mie dengan bumbu pedas khas.',
          price: 12000,
          image_url: 'http://localhost:8000/storage/menus/mie.jpg',
          has_spice_level: true,
        },
        {
          id: 11,
          name: 'Mie Goreng Spesial',
          description: null,
          price: 15000,
          image_url: null,
          has_spice_level: false,
        },
      ],
    },
    {
      id: 2,
      name: 'Minuman',
      slug: 'minuman',
      menus: [
        {
          id: 20,
          name: 'Es Teh Manis',
          description: 'Teh manis dingin.',
          price: 5000,
          image_url: null,
          has_spice_level: false,
        },
      ],
    },
  ],
}

export function makeLine(
  overrides: Partial<Omit<CartLine, 'key'>> = {},
): CartLine {
  const line: Omit<CartLine, 'key'> = {
    menuId: 1,
    name: 'Mie Pedas Original',
    price: 12000,
    quantity: 1,
    spiceLevel: 3,
    notes: '',
    ...overrides,
  }

  return { ...line, key: makeLineKey(line) }
}

export const sampleOrder: PublicOrder = {
  order_code: 'ORD-261017-ABCD1234',
  status: 'pending_payment',
  status_label: 'Menunggu pembayaran',
  payment_status: null,
  table_number: 5,
  customer_name: 'Budi',
  notes: 'Meja dekat jendela',
  total_amount: 29000,
  items: [
    {
      menu_name: 'Mie Pedas Original',
      price: 12000,
      quantity: 2,
      spice_level: 3,
      notes: 'tanpa bawang',
      subtotal: 24000,
    },
    {
      menu_name: 'Es Teh Manis',
      price: 5000,
      quantity: 1,
      spice_level: null,
      notes: null,
      subtotal: 5000,
    },
  ],
  created_at: '2026-10-17T10:00:00+07:00',
}
