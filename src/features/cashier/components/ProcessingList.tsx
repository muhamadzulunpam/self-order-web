import { elapsedLabel } from '@/features/kitchen/boardLogic'
import type { StaffOrder } from '@/types/order'
import { itemCount, processingLabel } from '../cashierLogic'

type Props = { orders: readonly StaffOrder[]; now: number }

export function ProcessingList({ orders, now }: Props) {
  return (
    <ul className="divide-y divide-stone-100 rounded-2xl bg-white shadow-sm">
      {orders.map((order) => {
        const waiting = elapsedLabel(order.paid_at ?? order.created_at, now)

        return (
          <li
            key={order.id}
            className="flex items-center justify-between gap-3 p-3 text-sm"
          >
            <div className="min-w-0">
              <p className="font-semibold">Meja {order.table_number}</p>
              <p className="text-xs text-stone-500">
                {`${itemCount(order)} item${waiting ? ` · dibayar ${waiting}` : ''}`}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                order.status === 'paid'
                  ? 'bg-sky-50 text-sky-800'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              {processingLabel(order.status)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
