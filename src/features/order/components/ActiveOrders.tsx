import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@/lib/api'
import { orderStatusPath } from '@/lib/paths'
import { useActiveOrderRefs, useActiveOrdersStore } from '../activeOrdersStore'
import { STATUS_STYLE, isFinalStatus } from '../statusInfo'
import { useOrder } from '../useOrder'
import { useOrderRealtime } from '../useOrderRealtime'

type RowProps = { token: string; orderCode: string }

function ActiveOrderRow({ token, orderCode }: RowProps) {
  const realtime = useOrderRealtime(token, orderCode)
  const order = useOrder(token, orderCode, realtime.connected)
  const remove = useActiveOrdersStore((state) => state.remove)

  const gone =
    order.isError &&
    order.error instanceof ApiError &&
    order.error.status === 404
  const finished = order.data !== undefined && isFinalStatus(order.data.status)

  // Pesanan yang sudah selesai, dibatalkan, atau tidak ada lagi dilepas dari daftar.
  useEffect(() => {
    if (gone || finished) remove(token, orderCode)
  }, [gone, finished, remove, token, orderCode])

  if (!order.data || finished) return null

  const { data } = order

  return (
    <li>
      <Link
        to={orderStatusPath(token, orderCode)}
        className={`flex items-center justify-between gap-3 rounded-xl p-3 ${STATUS_STYLE[data.status]}`}
      >
        <span className="min-w-0">
          <span className="block truncate text-xs opacity-70">
            Pesanan {orderCode}
          </span>
          <span className="font-semibold">{data.status_label}</span>
        </span>
        <span className="shrink-0 text-sm font-medium underline">
          {data.status === 'pending_payment' ? 'Bayar' : 'Lihat'}
        </span>
      </Link>
    </li>
  )
}

export function ActiveOrders({ token }: { token: string }) {
  const refs = useActiveOrderRefs(token)

  if (refs.length === 0) return null

  return (
    <section aria-label="Pesanan aktif" className="px-4 pt-3">
      <ul className="space-y-2">
        {refs.map((ref) => (
          <ActiveOrderRow
            key={ref.orderCode}
            token={token}
            orderCode={ref.orderCode}
          />
        ))}
      </ul>
    </section>
  )
}
