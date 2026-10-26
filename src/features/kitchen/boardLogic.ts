import type { OrderStatus, StaffOrder } from '@/types/order'

export const BOARD_STATUSES = ['paid', 'preparing', 'ready'] as const
export type BoardStatus = (typeof BOARD_STATUSES)[number]
export type KitchenTarget = 'preparing' | 'ready'

export type ColumnDef = {
  status: BoardStatus
  title: string
  empty: string
  action: { label: string; target: KitchenTarget } | null
}

export const COLUMNS: readonly ColumnDef[] = [
  {
    status: 'paid',
    title: 'Diterima',
    empty: 'Belum ada pesanan masuk.',
    action: { label: 'Mulai masak', target: 'preparing' },
  },
  {
    status: 'preparing',
    title: 'Dimasak',
    empty: 'Tidak ada yang sedang dimasak.',
    action: { label: 'Tandai siap', target: 'ready' },
  },
  {
    status: 'ready',
    title: 'Siap diantar',
    empty: 'Belum ada yang siap.',
    action: null,
  },
]

/** Status hanya boleh maju. Dipakai untuk mengenali kabar yang sudah usang. */
const RANK: Record<OrderStatus, number> = {
  pending_payment: 0,
  paid: 1,
  preparing: 2,
  ready: 3,
  completed: 4,
  cancelled: 4,
}

export function isOnBoard(status: OrderStatus): status is BoardStatus {
  return (BOARD_STATUSES as readonly OrderStatus[]).includes(status)
}

/** True jika `incoming` lebih usang daripada `existing`. */
export function isStale(existing: StaffOrder, incoming: StaffOrder): boolean {
  return RANK[incoming.status] < RANK[existing.status]
}

export function upsertOrder(
  orders: readonly StaffOrder[],
  incoming: StaffOrder,
): StaffOrder[] {
  const index = orders.findIndex((order) => order.id === incoming.id)

  if (index === -1) {
    return isOnBoard(incoming.status) ? [...orders, incoming] : [...orders]
  }

  if (isStale(orders[index], incoming)) return [...orders]

  if (!isOnBoard(incoming.status)) {
    return orders.filter((order) => order.id !== incoming.id)
  }

  const next = [...orders]

  next[index] = incoming

  return next
}

/**
 * Hasil fetch adalah potret dari saat permintaan dikirim. Kabar yang masuk selama fetch berjalan
 * diterapkan di atasnya supaya tidak hilang atau mundur.
 */
export function applyTouched(
  fetched: readonly StaffOrder[],
  touched: readonly StaffOrder[],
): StaffOrder[] {
  const base = fetched.filter((order) => isOnBoard(order.status))

  return touched.reduce(upsertOrder, base)
}

function arrivalTime(order: StaffOrder): number {
  const time = Date.parse(order.paid_at ?? order.created_at)

  return Number.isNaN(time) ? 0 : time
}

/** Yang lebih dulu dibayar berada paling atas. */
export function groupByColumn(
  orders: readonly StaffOrder[],
): Record<BoardStatus, StaffOrder[]> {
  const groups: Record<BoardStatus, StaffOrder[]> = {
    paid: [],
    preparing: [],
    ready: [],
  }

  for (const order of orders) {
    if (isOnBoard(order.status)) groups[order.status].push(order)
  }

  for (const status of BOARD_STATUSES) {
    groups[status].sort(
      (a, b) => arrivalTime(a) - arrivalTime(b) || a.id - b.id,
    )
  }

  return groups
}

export function elapsedLabel(iso: string | null, now: number): string {
  if (!iso) return ''

  const time = Date.parse(iso)

  if (Number.isNaN(time)) return ''

  const minutes = Math.floor(Math.max(0, now - time) / 60_000)

  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return rest === 0 ? `${hours} jam lalu` : `${hours} jam ${rest} menit lalu`
}
