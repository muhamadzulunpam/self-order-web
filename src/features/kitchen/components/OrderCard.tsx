import { spiceLabel } from '@/features/cart/cartLogic'
import type { StaffOrder } from '@/types/order'
import { elapsedLabel } from '../boardLogic'

type Props = {
  order: StaffOrder
  isNew: boolean
  pending: boolean
  now: number
  /** null jika kolom ini tidak punya aksi untuk dapur. */
  actionLabel: string | null
  onAction: () => void
}

export function OrderCard({
  order,
  isNew,
  pending,
  now,
  actionLabel,
  onAction,
}: Props) {
  const arrival = order.paid_at ?? order.created_at
  const waiting = elapsedLabel(arrival, now)

  return (
    <li
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        isNew
          ? 'border-emerald-400 ring-2 ring-emerald-200'
          : 'border-stone-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl leading-none font-bold">
            Meja {order.table_number}
          </p>
          <p className="mt-1 text-xs text-stone-500">{order.order_code}</p>
        </div>

        <div className="text-right">
          {isNew && (
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
              Baru
            </span>
          )}
          {waiting && (
            <p className="mt-1 text-xs text-stone-500">
              <time dateTime={arrival}>{`Dibayar ${waiting}`}</time>
            </p>
          )}
        </div>
      </div>

      {order.customer_name && (
        <p className="mt-2 text-sm">
          Atas nama <strong>{order.customer_name}</strong>
        </p>
      )}

      <ul className="mt-3 space-y-2 border-t border-stone-100 pt-3">
        {order.items.map((item) => (
          <li key={item.id} className="text-sm">
            <span className="font-semibold">{item.quantity}×</span>{' '}
            {item.menu_name}
            {item.spice_level !== null && (
              <span className="ml-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                {spiceLabel(item.spice_level)}
              </span>
            )}
            {item.notes && (
              <span className="block text-xs text-stone-500">
                Catatan: {item.notes}
              </span>
            )}
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="mt-3 rounded-xl bg-amber-50 p-2 text-sm text-amber-900">
          Catatan pesanan: {order.notes}
        </p>
      )}

      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          disabled={pending}
          aria-label={`${actionLabel} meja ${order.table_number}`}
          className="mt-4 w-full rounded-xl bg-stone-900 py-3 text-sm font-medium text-white active:bg-stone-700 disabled:bg-stone-300"
        >
          {pending ? 'Memproses…' : actionLabel}
        </button>
      ) : (
        <p className="mt-3 text-xs text-stone-500">
          Menunggu diantar atau diserahkan kasir.
        </p>
      )}
    </li>
  )
}
