import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { spiceLabel } from '@/features/cart/cartLogic'
import { OrderTimeline } from '@/features/order/components/OrderTimeline'
import {
  STATUS_HINT,
  STATUS_STYLE,
  isFinalStatus,
} from '@/features/order/statusInfo'
import { orderQueryKey, useOrder } from '@/features/order/useOrder'
import { useOrderRealtime } from '@/features/order/useOrderRealtime'
import {
  paymentErrorMessage,
  startPayment,
} from '@/features/payment/startPayment'
import { ApiError } from '@/lib/api'
import { formatRupiah } from '@/lib/format'
import { orderPath } from '@/lib/paths'

export function OrderStatusPage() {
  const { token = '', orderCode = '' } = useParams<{
    token: string
    orderCode: string
  }>()
  const location = useLocation()
  const queryClient = useQueryClient()
  const realtime = useOrderRealtime(token, orderCode)
  const order = useOrder(token, orderCode, realtime.connected)

  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(
    (location.state as { paymentError?: string } | null)?.paymentError ?? null,
  )

  function refreshOrder() {
    void queryClient.invalidateQueries({
      queryKey: orderQueryKey(token, orderCode),
    })
  }

  async function handlePay() {
    if (paying) return

    setPaying(true)
    setPayError(null)

    try {
      await startPayment(token, orderCode, () => {
        setPaying(false)
        refreshOrder()
      })
    } catch (error) {
      setPaying(false)
      setPayError(paymentErrorMessage(error))
      refreshOrder()
    }
  }

  if (order.isPending) {
    return (
      <main
        role="status"
        aria-label="Memuat pesanan"
        className="mx-auto min-h-screen max-w-md p-6 text-center text-stone-500"
      >
        Memuat pesanan…
      </main>
    )
  }

  if (order.isError) {
    if (order.error instanceof ApiError && order.error.status === 404) {
      return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
          <h1 className="text-xl font-bold">Pesanan tidak ditemukan</h1>
          <Link to={orderPath(token)} className="text-stone-600 underline">
            Kembali ke menu
          </Link>
        </main>
      )
    }

    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <div role="alert" className="space-y-2">
          <h1 className="text-xl font-bold">Status pesanan gagal dimuat</h1>
          <p className="text-stone-600">
            {order.error instanceof ApiError
              ? order.error.message
              : 'Terjadi kesalahan saat memuat pesanan.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => order.refetch()}
          className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white active:bg-stone-700"
        >
          Coba lagi
        </button>
      </main>
    )
  }

  const data = order.data

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-4 bg-white p-4">
      <header>
        <h1 className="text-lg font-bold">Status pesanan</h1>
        <p className="text-sm text-stone-500">
          Meja {data.table_number} · {data.order_code}
        </p>
      </header>

      <div
        role="status"
        className={`rounded-2xl p-4 ${STATUS_STYLE[data.status]}`}
      >
        <p className="text-lg font-bold">{data.status_label}</p>
        <p className="mt-1 text-sm">{STATUS_HINT[data.status]}</p>
      </div>

      {payError && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {payError}
        </p>
      )}

      {data.status === 'pending_payment' && (
        <button
          type="button"
          onClick={handlePay}
          disabled={paying}
          className="w-full rounded-2xl bg-stone-900 py-3.5 font-medium text-white active:bg-stone-700 disabled:bg-stone-300"
        >
          {paying
            ? 'Membuka pembayaran…'
            : data.payment_status === 'pending'
              ? 'Lanjutkan pembayaran'
              : 'Bayar sekarang'}
        </button>
      )}

      <OrderTimeline status={data.status} />

      {!isFinalStatus(data.status) && (
        <div className="flex items-center justify-between gap-3 text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${
                realtime.connected ? 'bg-emerald-500' : 'bg-stone-300'
              }`}
            />
            {realtime.connected
              ? 'Pembaruan langsung aktif'
              : 'Status diperiksa otomatis setiap beberapa detik'}
          </span>

          <button
            type="button"
            onClick={() => order.refetch()}
            disabled={order.isFetching}
            className="underline disabled:opacity-40"
          >
            Perbarui status
          </button>
        </div>
      )}

      <section aria-label="Rincian pesanan">
        <ul className="divide-y divide-stone-100">
          {data.items.map((item, index) => (
            <li key={index} className="flex justify-between gap-3 py-3 text-sm">
              <span className="min-w-0">
                {item.quantity}× {item.menu_name}
                {item.spice_level !== null && (
                  <span className="text-stone-500">
                    {' '}
                    · {spiceLabel(item.spice_level)}
                  </span>
                )}
                {item.notes && (
                  <span className="block text-xs text-stone-500">
                    Catatan: {item.notes}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-medium">
                {formatRupiah(item.subtotal)}
              </span>
            </li>
          ))}
        </ul>

        {data.notes && (
          <p className="mt-1 text-sm text-stone-500">
            Catatan pesanan: {data.notes}
          </p>
        )}

        <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 font-bold">
          <span>Total</span>
          <span>{formatRupiah(data.total_amount)}</span>
        </div>
      </section>

      <Link
        to={orderPath(token)}
        className="block py-2 text-center text-sm text-stone-600 underline"
      >
        Kembali ke menu
      </Link>
    </main>
  )
}
