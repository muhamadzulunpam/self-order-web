import { requestPayment } from '@/features/order/api'
import { loadSnap } from './snap'

export type PaymentOutcome = 'success' | 'pending' | 'error' | 'closed'

/**
 * Meminta Snap token lalu membuka popup pembayaran. Promise selesai saat popup terbuka.
 * `onDone` dipanggil tepat satu kali ketika popup berakhir (bayar, tertunda, error, atau ditutup).
 * Hasil callback hanya petunjuk: status pesanan yang sebenarnya selalu diambil dari server.
 */
export async function startPayment(
  token: string,
  orderCode: string,
  onDone: (outcome: PaymentOutcome) => void,
): Promise<void> {
  const session = await requestPayment(token, orderCode)
  const snap = await loadSnap({
    clientKey: session.client_key,
    isProduction: session.is_production,
  })

  let finished = false
  const finish = (outcome: PaymentOutcome) => {
    if (finished) return

    finished = true
    onDone(outcome)
  }

  snap.pay(session.snap_token, {
    onSuccess: () => finish('success'),
    onPending: () => finish('pending'),
    onError: () => finish('error'),
    onClose: () => finish('closed'),
  })
}

export function paymentErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message

  return 'Pembayaran belum bisa dibuka. Silakan coba lagi.'
}
