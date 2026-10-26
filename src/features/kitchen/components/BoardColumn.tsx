import type { StaffOrder } from '@/types/order'
import type { ColumnDef, KitchenTarget } from '../boardLogic'
import { OrderCard } from './OrderCard'

type Props = {
  column: ColumnDef
  orders: readonly StaffOrder[]
  newIds: ReadonlySet<number>
  pendingIds: ReadonlySet<number>
  now: number
  onAction: (order: StaffOrder, target: KitchenTarget) => void
}

export function BoardColumn({
  column,
  orders,
  newIds,
  pendingIds,
  now,
  onAction,
}: Props) {
  const titleId = `column-${column.status}`

  return (
    <section aria-labelledby={titleId} className="rounded-3xl bg-stone-100 p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 id={titleId} className="font-bold">
          {column.title}
        </h2>
        <span
          aria-label={`${orders.length} pesanan`}
          className="rounded-full bg-white px-2.5 py-0.5 text-sm font-semibold"
        >
          {orders.length}
        </span>
      </div>

      {orders.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-500">
          {column.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isNew={column.status === 'paid' && newIds.has(order.id)}
              pending={pendingIds.has(order.id)}
              now={now}
              actionLabel={column.action?.label ?? null}
              onAction={() => {
                if (column.action) onAction(order, column.action.target)
              }}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
