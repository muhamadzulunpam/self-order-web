import type { OrderStatus, StaffOrder, StaffOrderItem } from '@/types/order'

export const ORDER_STATUS_VALUES: readonly OrderStatus[] = [
  'pending_payment',
  'paid',
  'preparing',
  'ready',
  'completed',
  'cancelled',
]

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === 'string' &&
    (ORDER_STATUS_VALUES as readonly string[]).includes(value)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function parseItem(value: unknown): StaffOrderItem | null {
  if (!isRecord(value)) return null

  const { id, menu_name, quantity, spice_level, notes } = value

  if (!isNumber(id) || typeof menu_name !== 'string' || !isNumber(quantity)) {
    return null
  }

  if (spice_level !== null && !isNumber(spice_level)) return null
  if (!isNullableString(notes)) return null

  return { id, menu_name, quantity, spice_level, notes }
}

/** Mengembalikan null jika bentuk data tidak sesuai. Pemanggil yang memutuskan cara menanganinya. */
export function parseStaffOrder(value: unknown): StaffOrder | null {
  if (!isRecord(value)) return null

  const {
    id,
    order_code,
    status,
    status_label,
    next_status,
    table_number,
    customer_name,
    notes,
    total_amount,
    items,
    paid_at,
    created_at,
  } = value

  if (
    !isNumber(id) ||
    typeof order_code !== 'string' ||
    !isOrderStatus(status) ||
    typeof status_label !== 'string' ||
    !isNumber(table_number) ||
    !isNumber(total_amount) ||
    !Array.isArray(items) ||
    typeof created_at !== 'string'
  ) {
    return null
  }

  if (next_status !== null && !isOrderStatus(next_status)) return null
  if (
    !isNullableString(customer_name) ||
    !isNullableString(notes) ||
    !isNullableString(paid_at)
  ) {
    return null
  }

  const parsedItems: StaffOrderItem[] = []

  for (const item of items) {
    const parsed = parseItem(item)

    if (!parsed) return null

    parsedItems.push(parsed)
  }

  return {
    id,
    order_code,
    status,
    status_label,
    next_status,
    table_number,
    customer_name,
    notes,
    total_amount,
    items: parsedItems,
    paid_at,
    created_at,
  }
}
