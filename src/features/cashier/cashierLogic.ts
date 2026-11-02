import { arrivalTime, groupByColumn } from '@/features/kitchen/boardLogic'
import type { OrderStatus, StaffOrder } from '@/types/order'

/** Waktu konfirmasi "sudah diserahkan" sebelum kembali ke tombol Selesaikan. */
export const CONFIRM_WINDOW_MS = 5000

/** Siap diserahkan: yang paling dulu dibayar di atas. Diproses: yang diterima dan dimasak, digabung dan diurutkan menurut waktu bayar. */
export function groupForCashier(orders: readonly StaffOrder[]): {
  ready: StaffOrder[]
  processing: StaffOrder[]
} {
  const groups = groupByColumn(orders)
  const processing = [...groups.paid, ...groups.preparing].sort(
    (a, b) => arrivalTime(a) - arrivalTime(b) || a.id - b.id,
  )

  return { ready: groups.ready, processing }
}

export function itemCount(order: StaffOrder): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

export function processingLabel(status: OrderStatus): string {
  return status === 'paid' ? 'Diterima' : 'Dimasak'
}
