import { useQuery } from '@tanstack/react-query'
import { shouldRetry } from '@/lib/retry'
import type { OrderStatus } from '@/types/order'
import { fetchOrder } from './api'

export function orderQueryKey(token: string, orderCode: string) {
  return ['order', token, orderCode] as const
}

/** Berhenti memantau jika pesanan sudah final. Lebih rapat saat menunggu pembayaran. */
export function orderRefetchInterval(
  status: OrderStatus | undefined,
): number | false {
  if (!status || status === 'completed' || status === 'cancelled') return false

  return status === 'pending_payment' ? 4000 : 10_000
}

export function useOrder(token: string, orderCode: string) {
  return useQuery({
    queryKey: orderQueryKey(token, orderCode),
    queryFn: () => fetchOrder(token, orderCode),
    enabled: token !== '' && orderCode !== '',
    retry: shouldRetry,
    refetchInterval: (query) => orderRefetchInterval(query.state.data?.status),
  })
}
