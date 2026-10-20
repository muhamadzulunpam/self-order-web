import type { OrderStatus } from '@/types/order'

export type ConnectionState = 'connecting' | 'connected' | 'disconnected'
export type Unsubscribe = () => void
export type OrderStatusEvent = { orderCode: string; status: OrderStatus }

export type RealtimeClient = {
  subscribeToOrder: (
    orderCode: string,
    onStatus: (event: OrderStatusEvent) => void,
  ) => Unsubscribe
  connectionState: () => ConnectionState
  onConnectionChange: (listener: () => void) => Unsubscribe
}

type Handler = (payload: unknown) => void

/** Bagian dari Laravel Echo yang kita pakai. Dipisah agar mudah ditiru di test. */
export type EchoLike = {
  channel: (name: string) => {
    listen: (event: string, callback: Handler) => unknown
    stopListening: (event: string, callback?: Handler) => unknown
  }
  leaveChannel: (name: string) => void
  connector: {
    pusher: {
      connection: {
        state: string
        bind: (event: string, callback: () => void) => unknown
        unbind: (event: string, callback?: () => void) => unknown
      }
    }
  }
}

/** Awalan titik berarti nama event dipakai apa adanya (sesuai broadcastAs di backend). */
export const ORDER_STATUS_EVENT = '.order.status-updated'

const ORDER_STATUSES: readonly string[] = [
  'pending_payment',
  'paid',
  'preparing',
  'ready',
  'completed',
  'cancelled',
]

export function parseOrderStatusEvent(
  payload: unknown,
): OrderStatusEvent | null {
  if (typeof payload !== 'object' || payload === null) return null

  const { order_code: orderCode, status } = payload as Record<string, unknown>

  if (typeof orderCode !== 'string' || typeof status !== 'string') return null
  if (!ORDER_STATUSES.includes(status)) return null

  return { orderCode, status: status as OrderStatus }
}

function toConnectionState(state: string): ConnectionState {
  if (state === 'connected') return 'connected'
  if (state === 'connecting' || state === 'initialized') return 'connecting'

  return 'disconnected'
}

export function createRealtime(echo: EchoLike): RealtimeClient {
  // Beberapa komponen bisa mendengarkan channel yang sama. Keluar dari channel hanya saat yang terakhir berhenti.
  const subscribers = new Map<string, number>()
  const connection = echo.connector.pusher.connection

  return {
    subscribeToOrder: (orderCode, onStatus) => {
      const name = `orders.${orderCode}`
      const channel = echo.channel(name)
      const handler: Handler = (payload) => {
        const event = parseOrderStatusEvent(payload)

        if (event) onStatus(event)
      }

      channel.listen(ORDER_STATUS_EVENT, handler)
      subscribers.set(name, (subscribers.get(name) ?? 0) + 1)

      let active = true

      return () => {
        if (!active) return

        active = false
        channel.stopListening(ORDER_STATUS_EVENT, handler)

        const remaining = (subscribers.get(name) ?? 1) - 1

        if (remaining <= 0) {
          subscribers.delete(name)
          echo.leaveChannel(name)
        } else {
          subscribers.set(name, remaining)
        }
      }
    },

    connectionState: () => toConnectionState(connection.state),

    onConnectionChange: (listener) => {
      connection.bind('state_change', listener)

      return () => {
        connection.unbind('state_change', listener)
      }
    },
  }
}
