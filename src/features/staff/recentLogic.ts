import type { StaffOrder } from '@/types/order'

export type RecentDone = { order: StaffOrder; at: number }

export const RECENT_LIMIT = 10

/** Yang terbaru di depan, tanpa duplikat, dibatasi RECENT_LIMIT. Duplikat mengembalikan daftar yang sama. */
export function addRecent(
  list: RecentDone[],
  order: StaffOrder,
  at: number,
): RecentDone[] {
  if (list.some((item) => item.order.id === order.id)) return list

  return [{ order, at }, ...list].slice(0, RECENT_LIMIT)
}
