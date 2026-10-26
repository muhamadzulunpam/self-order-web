import { describe, expect, it, vi } from 'vitest'
import { makeStaffOrder } from '@/test/fixtures'
import {
  ORDER_PAID_EVENT,
  ORDER_UPDATED_EVENT,
  STAFF_CHANNEL,
  createRealtime,
  parseStaffOrderEvent,
} from './realtimeClient'
import type { EchoLike } from './realtimeClient'

type Handler = (payload: unknown) => void

function createFakeEcho() {
  const listeners = new Map<string, Set<Handler>>()
  const subscribedCallbacks: Array<() => void> = []
  const errorCallbacks: Array<() => void> = []

  const channel = {
    listen: vi.fn((event: string, callback: Handler) => {
      const set = listeners.get(event) ?? new Set<Handler>()

      set.add(callback)
      listeners.set(event, set)
    }),
    stopListening: vi.fn((event: string, callback?: Handler) => {
      if (callback) listeners.get(event)?.delete(callback)
    }),
    subscribed: vi.fn((callback: () => void) => {
      subscribedCallbacks.push(callback)
    }),
    error: vi.fn((callback: () => void) => {
      errorCallbacks.push(callback)
    }),
  }

  const echo = {
    private: vi.fn(() => channel),
    channel: vi.fn(() => channel),
    leave: vi.fn(),
    leaveChannel: vi.fn(),
    connector: {
      pusher: {
        connection: { state: 'connected', bind: vi.fn(), unbind: vi.fn() },
      },
    },
  }

  return {
    echo: echo as unknown as EchoLike,
    raw: echo,
    channel,
    emit: (event: string, payload: unknown) =>
      listeners.get(event)?.forEach((handler) => handler(payload)),
    fireSubscribed: () => subscribedCallbacks.forEach((callback) => callback()),
    fireError: () => errorCallbacks.forEach((callback) => callback()),
  }
}

describe('subscribeToStaffOrders', () => {
  it('berlangganan channel privat staff.orders untuk event paid dan updated', () => {
    const { echo, raw, channel } = createFakeEcho()

    createRealtime(echo).subscribeToStaffOrders({ onEvent: vi.fn() })

    expect(raw.private).toHaveBeenCalledWith(STAFF_CHANNEL)
    expect(channel.listen).toHaveBeenCalledWith(
      ORDER_PAID_EVENT,
      expect.any(Function),
    )
    expect(channel.listen).toHaveBeenCalledWith(
      ORDER_UPDATED_EVENT,
      expect.any(Function),
    )
    expect(ORDER_PAID_EVENT).toBe('.order.paid')
    expect(ORDER_UPDATED_EVENT).toBe('.order.updated')
  })

  it('meneruskan pesanan dari event paid dan updated', () => {
    const { echo, emit } = createFakeEcho()
    const onEvent = vi.fn()
    const order = makeStaffOrder({ id: 7 })

    createRealtime(echo).subscribeToStaffOrders({ onEvent })
    emit(ORDER_PAID_EVENT, { order })
    emit(ORDER_UPDATED_EVENT, { order: { ...order, status: 'preparing' } })

    expect(onEvent).toHaveBeenNthCalledWith(1, { kind: 'paid', order })
    expect(onEvent).toHaveBeenNthCalledWith(2, {
      kind: 'updated',
      order: { ...order, status: 'preparing' },
    })
  })

  it.each([[null], ['teks'], [{}], [{ order: null }], [{ order: { id: 1 } }]])(
    'mengabaikan muatan yang rusak: %j',
    (payload) => {
      const { echo, emit } = createFakeEcho()
      const onEvent = vi.fn()

      createRealtime(echo).subscribeToStaffOrders({ onEvent })
      emit(ORDER_PAID_EVENT, payload)
      emit(ORDER_UPDATED_EVENT, payload)

      expect(onEvent).not.toHaveBeenCalled()
    },
  )

  it('memberi tahu saat channel berhasil berlangganan atau gagal', () => {
    const { echo, fireSubscribed, fireError } = createFakeEcho()
    const onSubscribed = vi.fn()
    const onError = vi.fn()

    createRealtime(echo).subscribeToStaffOrders({
      onEvent: vi.fn(),
      onSubscribed,
      onError,
    })

    fireSubscribed()
    fireSubscribed()
    fireError()

    expect(onSubscribed).toHaveBeenCalledTimes(2)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('berhenti menerima apa pun dan keluar dari channel saat berhenti berlangganan', () => {
    const { echo, raw, emit, fireSubscribed } = createFakeEcho()
    const onEvent = vi.fn()
    const onSubscribed = vi.fn()

    const stop = createRealtime(echo).subscribeToStaffOrders({
      onEvent,
      onSubscribed,
    })
    stop()
    emit(ORDER_PAID_EVENT, { order: makeStaffOrder() })
    fireSubscribed()

    expect(onEvent).not.toHaveBeenCalled()
    expect(onSubscribed).not.toHaveBeenCalled()
    expect(raw.leave).toHaveBeenCalledTimes(1)
    expect(raw.leave).toHaveBeenCalledWith(STAFF_CHANNEL)
  })

  it('hanya keluar dari channel setelah pendengar terakhir berhenti', () => {
    const { echo, raw } = createFakeEcho()
    const realtime = createRealtime(echo)

    const first = realtime.subscribeToStaffOrders({ onEvent: vi.fn() })
    const second = realtime.subscribeToStaffOrders({ onEvent: vi.fn() })

    first()
    expect(raw.leave).not.toHaveBeenCalled()

    second()
    expect(raw.leave).toHaveBeenCalledTimes(1)
  })

  it('berhenti berlangganan dua kali tidak menimbulkan masalah', () => {
    const { echo, raw } = createFakeEcho()
    const stop = createRealtime(echo).subscribeToStaffOrders({
      onEvent: vi.fn(),
    })

    stop()
    stop()

    expect(raw.leave).toHaveBeenCalledTimes(1)
  })
})

describe('parseStaffOrderEvent', () => {
  it('membungkus pesanan dengan jenis event', () => {
    const order = makeStaffOrder()

    expect(parseStaffOrderEvent('paid', { order })).toEqual({
      kind: 'paid',
      order,
    })
  })

  it('mengembalikan null untuk muatan yang tidak valid', () => {
    expect(parseStaffOrderEvent('paid', { order: { id: 1 } })).toBeNull()
    expect(parseStaffOrderEvent('updated', undefined)).toBeNull()
  })
})
