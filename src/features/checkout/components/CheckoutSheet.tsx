import { useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '@/components/BottomSheet'
import { cartTotal, spiceLabel } from '@/features/cart/cartLogic'
import type { CartLine } from '@/features/cart/cartLogic'
import { useCartStore } from '@/features/cart/store'
import { createOrder } from '@/features/order/api'
import {
  paymentErrorMessage,
  startPayment,
} from '@/features/payment/startPayment'
import { formatRupiah } from '@/lib/format'
import { orderStatusPath } from '@/lib/paths'
import type { PublicOrder } from '@/types/order'
import { describeCheckoutError } from '../errors'
import type { CheckoutFailure } from '../errors'
import { buildOrderPayload } from '../payload'
import { useActiveOrdersStore } from '@/features/order/activeOrdersStore'

type Phase = 'idle' | 'creating' | 'paying'

type Props = {
  token: string
  tableNumber: number
  lines: CartLine[]
  onBack: () => void
  onClose: () => void
}

export function CheckoutSheet({
  token,
  tableNumber,
  lines,
  onBack,
  onClose,
}: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clearCart = useCartStore((state) => state.clear)
  const addActiveOrder = useActiveOrdersStore((state) => state.add)

  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<
    CheckoutFailure['fieldErrors']
  >({})
  // Setelah keranjang dikosongkan, ringkasan tetap menampilkan isi pesanan yang sedang dibayar.
  const [frozenLines, setFrozenLines] = useState<CartLine[] | null>(null)
  const busyRef = useRef(false)
  const nameId = useId()
  const notesId = useId()

  const busy = phase !== 'idle'
  const shownLines = frozenLines ?? lines
  const isEmpty = shownLines.length === 0

  function handleClose() {
    if (!busyRef.current) onClose()
  }

  function handleBack() {
    if (!busyRef.current) onBack()
  }

  function showFailure(failureInfo: CheckoutFailure, snapshot: CartLine[]) {
    setFieldErrors(failureInfo.fieldErrors)

    const names = [
      ...new Set(
        failureInfo.lineIndexes
          .map((index) => snapshot[index]?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ]

    setError(
      names.length > 0
        ? `${names.join(', ')} tidak bisa dipesan lagi. Keranjang disesuaikan dengan menu terbaru, silakan periksa kembali.`
        : failureInfo.message,
    )

    if (failureInfo.refreshMenu) {
      void queryClient.invalidateQueries({ queryKey: ['menu', token] })
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (busyRef.current || lines.length === 0) return

    busyRef.current = true
    setError(null)
    setFieldErrors({})
    setPhase('creating')

    const snapshot = lines
    let order: PublicOrder

    try {
      order = await createOrder(
        token,
        buildOrderPayload(snapshot, customerName, notes),
      )
    } catch (err) {
      showFailure(describeCheckoutError(err), snapshot)
      busyRef.current = false
      setPhase('idle')
      return
    }

    addActiveOrder(token, order.order_code)
    // Pesanan sudah dibuat: kosongkan keranjang dan jangan pernah membuat pesanan kedua dari sini.
    setFrozenLines(snapshot)
    clearCart(token)
    setPhase('paying')

    const statusPath = orderStatusPath(token, order.order_code)

    try {
      await startPayment(token, order.order_code, () => navigate(statusPath))
    } catch (err) {
      navigate(statusPath, {
        state: { paymentError: paymentErrorMessage(err) },
      })
    }
  }

  return (
    <BottomSheet title="Konfirmasi pesanan" onClose={handleClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <section
          aria-label="Ringkasan pesanan"
          className="rounded-2xl bg-stone-50 p-4"
        >
          <p className="text-sm text-stone-500">Meja {tableNumber}</p>

          {isEmpty ? (
            <p className="mt-2 text-sm text-stone-600">
              Keranjang kosong. Kembali ke menu untuk memilih pesanan.
            </p>
          ) : (
            <>
              <ul className="mt-2 space-y-2">
                {shownLines.map((line) => (
                  <li
                    key={line.key}
                    className="flex justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0">
                      {line.quantity}× {line.name}
                      {line.spiceLevel !== null && (
                        <span className="text-stone-500">
                          {' '}
                          · {spiceLabel(line.spiceLevel)}
                        </span>
                      )}
                      {line.notes && (
                        <span className="block text-xs text-stone-500">
                          Catatan: {line.notes}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-medium">
                      {formatRupiah(line.price * line.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 font-bold">
                <span>Total</span>
                <span>{formatRupiah(cartTotal(shownLines))}</span>
              </div>
            </>
          )}
        </section>

        <fieldset disabled={busy} className="space-y-4">
          <div>
            <label htmlFor={nameId} className="mb-1 block font-semibold">
              Nama{' '}
              <span className="font-normal text-stone-400">(opsional)</span>
            </label>
            <input
              id={nameId}
              type="text"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              maxLength={100}
              autoComplete="name"
              placeholder="Agar mudah dipanggil"
              aria-invalid={fieldErrors.customer_name ? true : undefined}
              aria-describedby={
                fieldErrors.customer_name ? `${nameId}-error` : undefined
              }
              className="w-full rounded-xl border border-stone-300 p-3 text-sm focus:border-stone-900 focus:outline-none disabled:bg-stone-100"
            />
            {fieldErrors.customer_name && (
              <p id={`${nameId}-error`} className="mt-1 text-sm text-red-600">
                {fieldErrors.customer_name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={notesId} className="mb-1 block font-semibold">
              Catatan untuk pesanan{' '}
              <span className="font-normal text-stone-400">(opsional)</span>
            </label>
            <textarea
              id={notesId}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Contoh: antar ke meja dekat jendela"
              aria-invalid={fieldErrors.notes ? true : undefined}
              aria-describedby={
                fieldErrors.notes ? `${notesId}-error` : undefined
              }
              className="w-full rounded-xl border border-stone-300 p-3 text-sm focus:border-stone-900 focus:outline-none disabled:bg-stone-100"
            />
            {fieldErrors.notes && (
              <p id={`${notesId}-error`} className="mt-1 text-sm text-red-600">
                {fieldErrors.notes}
              </p>
            )}
          </div>
        </fieldset>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="space-y-2">
          <button
            type="submit"
            disabled={busy || isEmpty}
            className="w-full rounded-2xl bg-stone-900 py-3.5 font-medium text-white active:bg-stone-700 disabled:bg-stone-300"
          >
            {phase === 'creating'
              ? 'Membuat pesanan…'
              : phase === 'paying'
                ? 'Membuka pembayaran…'
                : `Bayar • ${formatRupiah(cartTotal(shownLines))}`}
          </button>

          <button
            type="button"
            onClick={handleBack}
            disabled={busy}
            className="w-full py-2 text-sm text-stone-600 underline disabled:opacity-40"
          >
            ← Kembali ke keranjang
          </button>

          <p className="text-center text-xs text-stone-400">
            Total akhir dihitung ulang oleh sistem. Pembayaran diproses lewat
            Midtrans.
          </p>
        </div>
      </form>
    </BottomSheet>
  )
}
