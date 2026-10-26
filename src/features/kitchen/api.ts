import { api } from '@/lib/api'
import { parseStaffOrder } from '@/lib/staffOrderParser'
import type { StaffOrder } from '@/types/order'
import type { KitchenTarget } from './boardLogic'

const INVALID = 'Data pesanan dari server tidak valid.'

/** Satu pesanan yang tidak valid menggagalkan seluruh daftar: lebih baik error daripada pesanan diam-diam hilang dari dapur. */
export async function fetchStaffOrders(): Promise<StaffOrder[]> {
  const { data } = await api.get<{ data?: unknown }>('/staff/orders')
  const list = data?.data

  if (!Array.isArray(list)) throw new Error(INVALID)

  return list.map((item) => {
    const order = parseStaffOrder(item)

    if (!order) throw new Error(INVALID)

    return order
  })
}

export async function updateOrderStatus(
  orderId: number,
  status: KitchenTarget,
): Promise<StaffOrder> {
  const { data } = await api.patch<{ data?: unknown }>(
    `/staff/orders/${orderId}/status`,
    { status },
  )
  const order = parseStaffOrder(data?.data)

  if (!order) throw new Error(INVALID)

  return order
}
