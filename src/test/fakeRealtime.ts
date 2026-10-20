import { vi } from 'vitest'
import type {
  ConnectionState,
  OrderStatusEvent,
  RealtimeClient,
} from '@/lib/realtimeClient'
import type { OrderStatus } from '@/types/order'

/** Klien real-time tiruan: test bisa mengirim event dan mengubah status koneksi. */
export function createFakeRealtime(initial: ConnectionState = 'connecting') {
  let state = initial
  const handlers = new Map<string, Set<(event: OrderStatusEvent) => void>>()
  const connectionListeners = new Set<() => void>()
  const unsubscribe = vi.fn<(orderCode: string) => void>()

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

  const client: RealtimeClient = {
    subscribeToOrder: subscribe,
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
    emit: (orderCode: string, status: OrderStatus) => {
      handlers
        .get(orderCode)
        ?.forEach((handler) => handler({ orderCode, status }))
    },
    setState: (next: ConnectionState) => {
      state = next
      connectionListeners.forEach((listener) => listener())
    },
  }
}
