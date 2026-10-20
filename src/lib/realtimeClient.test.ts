import { describe, expect, it, vi } from 'vitest'
import { ORDER_STATUS_EVENT, createRealtime } from './realtimeClient'
import type { EchoLike } from './realtimeClient'

type Handler = (payload: unknown) => void

function createFakeEcho(initialState = 'initialized') {
  const channels = new Map<string, Map<string, Set<Handler>>>()
  const stateHandlers = new Set<() => void>()

  const connection = {
    state: initialState,
    bind: vi.fn((event: string, callback: () => void) => {
      if (event === 'state_change') stateHandlers.add(callback)
    }),
    unbind: vi.fn((event: string, callback?: () => void) => {
      if (event === 'state_change' && callback) stateHandlers.delete(callback)
    }),
  }

  const leaveChannel = vi.fn((name: string) => {
    channels.delete(name)
  })

  const echo = {
    channel: (name: string) => {
      const events = channels.get(name) ?? new Map<string, Set<Handler>>()

      channels.set(name, events)

      return {
        listen: (event: string, callback: Handler) => {
          const set = events.get(event) ?? new Set<Handler>()

          set.add(callback)
          events.set(event, set)
        },
        stopListening: (event: string, callback?: Handler) => {
          if (callback) events.get(event)?.delete(callback)
        },
      }
    },
    leaveChannel,
    connector: { pusher: { connection } },
  } as unknown as EchoLike

  return {
    echo,
    connection,
    leaveChannel,
    emit: (channel: string, event: string, payload: unknown) => {
      channels
        .get(channel)
        ?.get(event)
        ?.forEach((handler) => handler(payload))
    },
    setState: (state: string) => {
      connection.state = state
      stateHandlers.forEach((handler) => handler())
    },
  }
}

describe('createRealtime', () => {
  it('berlangganan channel pesanan dan meneruskan event status yang valid', () => {
    const { echo, emit } = createFakeEcho()
    const realtime = createRealtime(echo)
    const onStatus = vi.fn()

    realtime.subscribeToOrder('ORD-1', onStatus)
    emit('orders.ORD-1', ORDER_STATUS_EVENT, {
      order_code: 'ORD-1',
      status: 'paid',
    })

    expect(onStatus).toHaveBeenCalledWith({
      orderCode: 'ORD-1',
      status: 'paid',
    })
  })

  it.each([
    [null],
    ['teks'],
    [{ order_code: 'ORD-1' }],
    [{ order_code: 'ORD-1', status: 'ngawur' }],
    [{ order_code: 1, status: 'paid' }],
  ])('mengabaikan event yang rusak: %j', (payload) => {
    const { echo, emit } = createFakeEcho()
    const onStatus = vi.fn()

    createRealtime(echo).subscribeToOrder('ORD-1', onStatus)
    emit('orders.ORD-1', ORDER_STATUS_EVENT, payload)

    expect(onStatus).not.toHaveBeenCalled()
  })

  it('berhenti menerima event dan keluar dari channel saat berhenti berlangganan', () => {
    const { echo, emit, leaveChannel } = createFakeEcho()
    const onStatus = vi.fn()

    const stop = createRealtime(echo).subscribeToOrder('ORD-1', onStatus)
    stop()
    emit('orders.ORD-1', ORDER_STATUS_EVENT, {
      order_code: 'ORD-1',
      status: 'ready',
    })

    expect(onStatus).not.toHaveBeenCalled()
    expect(leaveChannel).toHaveBeenCalledTimes(1)
    expect(leaveChannel).toHaveBeenCalledWith('orders.ORD-1')
  })

  it('hanya keluar dari channel setelah pendengar terakhir berhenti', () => {
    const { echo, emit, leaveChannel } = createFakeEcho()
    const realtime = createRealtime(echo)
    const first = vi.fn()
    const second = vi.fn()

    const stopFirst = realtime.subscribeToOrder('ORD-1', first)
    const stopSecond = realtime.subscribeToOrder('ORD-1', second)

    stopFirst()
    expect(leaveChannel).not.toHaveBeenCalled()

    emit('orders.ORD-1', ORDER_STATUS_EVENT, {
      order_code: 'ORD-1',
      status: 'preparing',
    })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)

    stopSecond()
    expect(leaveChannel).toHaveBeenCalledTimes(1)
  })

  it('berhenti berlangganan dua kali tidak menimbulkan masalah', () => {
    const { echo, leaveChannel } = createFakeEcho()
    const stop = createRealtime(echo).subscribeToOrder('ORD-1', vi.fn())

    stop()
    stop()

    expect(leaveChannel).toHaveBeenCalledTimes(1)
  })

  it('memetakan status koneksi Pusher', () => {
    const { echo, setState } = createFakeEcho('initialized')
    const realtime = createRealtime(echo)

    expect(realtime.connectionState()).toBe('connecting')

    setState('connecting')
    expect(realtime.connectionState()).toBe('connecting')

    setState('connected')
    expect(realtime.connectionState()).toBe('connected')

    for (const state of ['unavailable', 'failed', 'disconnected']) {
      setState(state)
      expect(realtime.connectionState()).toBe('disconnected')
    }
  })

  it('memberi tahu pendengar saat koneksi berubah dan berhenti setelah dilepas', () => {
    const { echo, setState, connection } = createFakeEcho()
    const listener = vi.fn()

    const stop = createRealtime(echo).onConnectionChange(listener)

    setState('connected')
    expect(listener).toHaveBeenCalledTimes(1)

    stop()
    setState('disconnected')

    expect(listener).toHaveBeenCalledTimes(1)
    expect(connection.unbind).toHaveBeenCalled()
  })
})
