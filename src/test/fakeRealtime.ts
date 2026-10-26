import { vi } from 'vitest'
import type {
  ConnectionState,
  OrderStatusEvent,
  RealtimeClient,
  StaffOrderEvent,
  StaffSubscription,
} from '@/lib/realtimeClient'
import type { OrderStatus, StaffOrder } from '@/types/order'

/** Klien real-time tiruan: test bisa mengirim event dan mengubah status koneksi. */
export function createFakeRealtime(initial: ConnectionState = 'connecting') {
  let state = initial
  const handlers = new Map<string, Set<(event: OrderStatusEvent) => void>>()
  const connectionListeners = new Set<() => void>()
  const staffSubscriptions = new Set<StaffSubscription>()
  const unsubscribe = vi.fn<(orderCode: string) => void>()
  const unsubscribeStaff = vi.fn<() => void>()

  const subscribe = vi.fn(
    (orderCode: string, onStatus: (event: OrderStatusEvent) => void) => {
      const set = handlers.get(orderCode) ?? new Set()

      set.add(onStatus)
      handlers.set(orderCode, set)

      return () => {
        unsubscribe(orderCode)
        set.delete(onStatus)
      }
    },
  )

  const subscribeStaff = vi.fn((subscription: StaffSubscription) => {
    staffSubscriptions.add(subscription)

    return () => {
      unsubscribeStaff()
      staffSubscriptions.delete(subscription)
    }
  })

  const client: RealtimeClient = {
    subscribeToOrder: subscribe,
    subscribeToStaffOrders: subscribeStaff,
    connectionState: () => state,
    onConnectionChange: (listener) => {
      connectionListeners.add(listener)

      return () => {
        connectionListeners.delete(listener)
      }
    },
  }

  return {
    client,
    subscribe,
    unsubscribe,
    subscribeStaff,
    unsubscribeStaff,
    emit: (orderCode: string, status: OrderStatus) => {
      handlers
        .get(orderCode)
        ?.forEach((handler) => handler({ orderCode, status }))
    },
    emitStaff: (kind: StaffOrderEvent['kind'], order: StaffOrder) => {
      staffSubscriptions.forEach((subscription) =>
        subscription.onEvent({ kind, order }),
      )
    },
    staffSubscribed: () => {
      staffSubscriptions.forEach((subscription) =>
        subscription.onSubscribed?.(),
      )
    },
    staffError: () => {
      staffSubscriptions.forEach((subscription) => subscription.onError?.())
    },
    setState: (next: ConnectionState) => {
      state = next
      connectionListeners.forEach((listener) => listener())
    },
  }
}
