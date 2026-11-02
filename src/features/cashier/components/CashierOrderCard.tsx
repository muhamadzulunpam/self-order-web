import { useEffect, useState } from 'react'
import { spiceLabel } from '@/features/cart/cartLogic'
import { elapsedLabel } from '@/features/kitchen/boardLogic'
import { formatRupiah } from '@/lib/format'
import type { StaffOrder } from '@/types/order'
import { CONFIRM_WINDOW_MS } from '../cashierLogic'

type Props = {
  order: StaffOrder
  isNew: boolean
  pending: boolean
  now: number
  onComplete: () => void
}

export function CashierOrderCard({
  order,
  isNew,
  pending,
  now,
  onComplete,
}: Props) {
  const [confirming, setConfirming] = useState(false)

  // Konfirmasi tidak dibiarkan menggantung: kembali ke tombol semula jika tidak dilanjutkan.
  useEffect(() => {
    if (!confirming) return

    const timer = setTimeout(() => setConfirming(false), CONFIRM_WINDOW_MS)

    return () => clearTimeout(timer)
  }, [confirming])

  const arrival = order.paid_at ?? order.created_at
  const waiting = elapsedLabel(arrival, now)

  function confirm() {
    setConfirming(false)
    onComplete()
  }

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
              Baru siap
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

      <p className="mt-3 flex items-center justify-between text-sm">
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
          Lunas
        </span>
        <span className="font-semibold">
          {formatRupiah(order.total_amount)}
        </span>
      </p>

      {pending ? (
        <button
          type="button"
          disabled
          className="mt-4 w-full rounded-xl bg-stone-300 py-3 text-sm font-medium text-white"
        >
          Memproses…
        </button>
      ) : confirming ? (
        <div
          role="group"
          aria-label={`Konfirmasi meja ${order.table_number}`}
          className="mt-4 space-y-2"
        >
          <p className="text-center text-sm font-medium">
            Pesanan sudah diserahkan ke pelanggan?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-xl border border-stone-300 py-3 text-sm font-medium active:bg-stone-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={confirm}
              className="rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white active:bg-emerald-700"
            >
              Ya, sudah diserahkan
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Selesaikan meja ${order.table_number}`}
          className="mt-4 w-full rounded-xl bg-stone-900 py-3 text-sm font-medium text-white active:bg-stone-700"
        >
          Selesaikan
        </button>
      )}
    </li>
  )
}
