import type { OrderStatus, StaffOrder } from '@/types/order'
import { isOrderStatus, parseStaffOrder } from './staffOrderParser'

export type ConnectionState = 'connecting' | 'connected' | 'disconnected'
export type Unsubscribe = () => void
export type OrderStatusEvent = { orderCode: string; status: OrderStatus }
export type StaffOrderEvent = { kind: 'paid' | 'updated'; order: StaffOrder }

export type StaffSubscription = {
  onEvent: (event: StaffOrderEvent) => void
  /** Dipanggil setiap kali channel berhasil berlangganan, termasuk setelah tersambung ulang. */
  onSubscribed?: () => void
  /** Dipanggil jika otorisasi atau langganan channel gagal. */
  onError?: () => void
}

export type RealtimeClient = {
  subscribeToOrder: (
    orderCode: string,
    onStatus: (event: OrderStatusEvent) => void,
  ) => Unsubscribe
  subscribeToStaffOrders: (subscription: StaffSubscription) => Unsubscribe
  connectionState: () => ConnectionState
  onConnectionChange: (listener: () => void) => Unsubscribe
}

type Handler = (payload: unknown) => void

type ChannelLike = {
  listen: (event: string, callback: Handler) => unknown
  stopListening: (event: string, callback?: Handler) => unknown
  subscribed?: (callback: () => void) => unknown
  error?: (callback: (status?: unknown) => void) => unknown
}

/** Bagian dari Laravel Echo yang kita pakai. Dipisah agar mudah ditiru di test. */
export type EchoLike = {
  channel: (name: string) => ChannelLike
  private: (name: string) => ChannelLike
  leaveChannel: (name: string) => void
  leave: (name: string) => void
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
export const ORDER_PAID_EVENT = '.order.paid'
export const ORDER_UPDATED_EVENT = '.order.updated'
export const STAFF_CHANNEL = 'staff.orders'

export function parseOrderStatusEvent(
  payload: unknown,
): OrderStatusEvent | null {
  if (typeof payload !== 'object' || payload === null) return null

  const { order_code: orderCode, status } = payload as Record<string, unknown>

  if (typeof orderCode !== 'string' || !isOrderStatus(status)) return null

  return { orderCode, status }
}

export function parseStaffOrderEvent(
  kind: StaffOrderEvent['kind'],
  payload: unknown,
): StaffOrderEvent | null {
  if (typeof payload !== 'object' || payload === null) return null

  const order = parseStaffOrder((payload as Record<string, unknown>).order)

  return order ? { kind, order } : null
}

function toConnectionState(state: string): ConnectionState {
  if (state === 'connected') return 'connected'
  if (state === 'connecting' || state === 'initialized') return 'connecting'

  return 'disconnected'
}

export function createRealtime(echo: EchoLike): RealtimeClient {
  // Beberapa komponen bisa mendengarkan channel yang sama. Keluar dari channel hanya saat yang terakhir berhenti.
  const subscribers = new Map<string, number>()
  let staffSubscribers = 0
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

    subscribeToStaffOrders: ({ onEvent, onSubscribed, onError }) => {
      const channel = echo.private(STAFF_CHANNEL)
      let active = true

      const onPaid: Handler = (payload) => {
        const event = parseStaffOrderEvent('paid', payload)

        if (active && event) onEvent(event)
      }
      const onUpdated: Handler = (payload) => {
        const event = parseStaffOrderEvent('updated', payload)

        if (active && event) onEvent(event)
      }

      channel.listen(ORDER_PAID_EVENT, onPaid)
      channel.listen(ORDER_UPDATED_EVENT, onUpdated)
      channel.subscribed?.(() => {
        if (active) onSubscribed?.()
      })
      channel.error?.(() => {
        if (active) onError?.()
      })
      staffSubscribers += 1

      return () => {
        if (!active) return

        active = false
        channel.stopListening(ORDER_PAID_EVENT, onPaid)
        channel.stopListening(ORDER_UPDATED_EVENT, onUpdated)
        staffSubscribers -= 1

        if (staffSubscribers <= 0) {
          staffSubscribers = 0
          echo.leave(STAFF_CHANNEL)
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
