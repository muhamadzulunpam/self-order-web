import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'
import { getRealtime } from '@/lib/realtime'
import type { ConnectionState } from '@/lib/realtimeClient'
import { orderQueryKey } from './useOrder'

const noSubscribe = () => () => {}
const alwaysDisconnected = (): ConnectionState => 'disconnected'

export function useRealtimeConnection(): ConnectionState {
  const realtime = getRealtime()

  return useSyncExternalStore(
    realtime ? realtime.onConnectionChange : noSubscribe,
    realtime ? realtime.connectionState : alwaysDisconnected,
  )
}

/**
 * Mendengarkan perubahan status satu pesanan. Event hanya jadi pemicu:
 * data diambil ulang dari API, sehingga server tetap sumber kebenaran.
 */
export function useOrderRealtime(
  token: string,
  orderCode: string,
): { connected: boolean } {
  const queryClient = useQueryClient()
  const connected = useRealtimeConnection() === 'connected'

  useEffect(() => {
    const realtime = getRealtime()

    if (!realtime || orderCode === '') return

    return realtime.subscribeToOrder(orderCode, () => {
      void queryClient.invalidateQueries({
        queryKey: orderQueryKey(token, orderCode),
      })
    })
  }, [token, orderCode, queryClient])

  // Saat (kembali) tersambung, ambil ulang untuk menangkap perubahan yang terlewat selama terputus.
  useEffect(() => {
    if (connected && orderCode !== '') {
      void queryClient.invalidateQueries({
        queryKey: orderQueryKey(token, orderCode),
      })
    }
  }, [connected, token, orderCode, queryClient])

  return { connected }
}
