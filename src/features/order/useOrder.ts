import { useQuery } from '@tanstack/react-query'
import { shouldRetry } from '@/lib/retry'
import type { OrderStatus } from '@/types/order'
import { fetchOrder } from './api'
import { isFinalStatus } from './statusInfo'

export function orderQueryKey(token: string, orderCode: string) {
  return ['order', token, orderCode] as const
}

/**
 * Berhenti memantau jika pesanan sudah final.
 * Saat koneksi real-time aktif, polling hanya jadi jaring pengaman.
 * Saat tidak aktif, polling lebih rapat agar status tetap terasa langsung.
 */
export function orderRefetchInterval(
  status: OrderStatus | undefined,
  realtimeConnected = false,
): number | false {
  if (!status || isFinalStatus(status)) return false
  if (realtimeConnected) return 30_000

  return status === 'pending_payment' ? 4000 : 10_000
}

export function useOrder(
  token: string,
  orderCode: string,
  realtimeConnected = false,
) {
  return useQuery({
    queryKey: orderQueryKey(token, orderCode),
    queryFn: () => fetchOrder(token, orderCode),
    enabled: token !== '' && orderCode !== '',
    retry: shouldRetry,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      orderRefetchInterval(query.state.data?.status, realtimeConnected),
  })
}
