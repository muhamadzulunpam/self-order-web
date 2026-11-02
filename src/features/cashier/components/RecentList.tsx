import { elapsedLabel } from '@/features/kitchen/boardLogic'
import type { RecentDone } from '@/features/staff/recentLogic'
import { itemCount } from '../cashierLogic'

type Props = { items: readonly RecentDone[]; now: number }

export function RecentList({ items, now }: Props) {
  return (
    <ul className="divide-y divide-stone-100 rounded-2xl bg-white shadow-sm">
      {items.map(({ order, at }) => (
        <li
          key={order.id}
          className="flex items-center justify-between gap-3 p-3 text-sm"
        >
          <div className="min-w-0">
            <p className="font-semibold">Meja {order.table_number}</p>
            <p className="truncate text-xs text-stone-500">
              {`${order.order_code} · ${itemCount(order)} item`}
            </p>
          </div>

          <span className="shrink-0 text-xs text-stone-500">
            {`Selesai ${elapsedLabel(new Date(at).toISOString(), now)}`}
          </span>
        </li>
      ))}
    </ul>
  )
}
