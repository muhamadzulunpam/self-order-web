import { useEffect, useRef, useState } from 'react'
import { useRealtimeConnection } from '@/features/order/useOrderRealtime'
import { getRealtime } from '@/lib/realtime'
import type { StaffOrderEvent } from '@/lib/realtimeClient'

type Handlers = {
  onEvent: (event: StaffOrderEvent) => void
  onSubscribed?: () => void
}

/**
 * Berlangganan channel privat staf. `live` hanya true jika koneksi tersambung DAN
 * channel privat berhasil berlangganan (otorisasi lolos).
 */
export function useStaffRealtime(handlers: Handlers): { live: boolean } {
  const connection = useRealtimeConnection()
  const [subscribed, setSubscribed] = useState(false)
  const latest = useRef(handlers)

  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    const realtime = getRealtime()

    if (!realtime) return

    return realtime.subscribeToStaffOrders({
      onEvent: (event) => latest.current.onEvent(event),
      onSubscribed: () => {
        setSubscribed(true)
        latest.current.onSubscribed?.()
      },
      onError: () => setSubscribed(false),
    })
  }, [])

  return { live: connection === 'connected' && subscribed }
}
