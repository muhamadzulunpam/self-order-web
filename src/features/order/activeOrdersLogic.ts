export type ActiveOrderRef = { orderCode: string; createdAt: number }
export type ActiveOrders = Record<string, ActiveOrderRef[]>

export const ACTIVE_ORDERS_STORAGE_KEY = 'self-order-active-orders'
export const ACTIVE_ORDER_TTL_MS = 12 * 60 * 60 * 1000
export const MAX_ACTIVE_ORDERS = 5

/** Pesanan terbaru di depan, tanpa duplikat, dibatasi MAX_ACTIVE_ORDERS. */
export function addRef(
  refs: ActiveOrderRef[],
  ref: ActiveOrderRef,
): ActiveOrderRef[] {
  const rest = refs.filter((item) => item.orderCode !== ref.orderCode)

  return [ref, ...rest].slice(0, MAX_ACTIVE_ORDERS)
}

export function removeRef(
  refs: ActiveOrderRef[],
  orderCode: string,
): ActiveOrderRef[] {
  return refs.filter((item) => item.orderCode !== orderCode)
}

function isRef(value: unknown): value is ActiveOrderRef {
  if (typeof value !== 'object' || value === null) return false

  const ref = value as Record<string, unknown>

  return (
    typeof ref.orderCode === 'string' &&
    ref.orderCode !== '' &&
    typeof ref.createdAt === 'number' &&
    Number.isFinite(ref.createdAt)
  )
}

/** Bersihkan data dari localStorage: buang yang kedaluwarsa atau rusak. */
export function sanitizeActiveOrders(raw: unknown, now: number): ActiveOrders {
  if (typeof raw !== 'object' || raw === null) return {}

  const result: ActiveOrders = {}

  for (const [token, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) continue

    const valid = value
      .filter(isRef)
      .filter((ref) => now - ref.createdAt <= ACTIVE_ORDER_TTL_MS)
      .slice(0, MAX_ACTIVE_ORDERS)

    if (valid.length > 0) result[token] = valid
  }

  return result
}
