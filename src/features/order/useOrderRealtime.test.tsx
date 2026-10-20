import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getRealtime } from '@/lib/realtime'
import type { ConnectionState } from '@/lib/realtimeClient'
import { createFakeRealtime } from '@/test/fakeRealtime'
import { orderQueryKey } from './useOrder'
import { useOrderRealtime } from './useOrderRealtime'

function setup(initial: ConnectionState, orderCode = 'ORD-1') {
  const fake = createFakeRealtime(initial)
  vi.mocked(getRealtime).mockReturnValue(fake.client)

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useOrderRealtime('abc123', orderCode), {
    wrapper,
  })

  return { fake, invalidate, ...hook }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useOrderRealtime', () => {
  it('berlangganan channel pesanan dan berhenti saat dilepas', () => {
    const { fake, unmount } = setup('connecting')

    expect(fake.subscribe).toHaveBeenCalledWith('ORD-1', expect.any(Function))

    unmount()

    expect(fake.unsubscribe).toHaveBeenCalledWith('ORD-1')
  })

  it('event status memicu pengambilan ulang data pesanan', () => {
    const { fake, invalidate } = setup('connecting')

    act(() => {
      fake.emit('ORD-1', 'paid')
    })

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: orderQueryKey('abc123', 'ORD-1'),
    })
  })

  it('connected mengikuti status koneksi dan data diambil ulang saat tersambung', () => {
    const { fake, invalidate, result } = setup('connecting')

    expect(result.current.connected).toBe(false)
    expect(invalidate).not.toHaveBeenCalled()

    act(() => {
      fake.setState('connected')
    })

    expect(result.current.connected).toBe(true)
    expect(invalidate).toHaveBeenCalledTimes(1)

    act(() => {
      fake.setState('disconnected')
    })

    expect(result.current.connected).toBe(false)
  })

  it('sudah tersambung saat dibuka: data langsung diselaraskan satu kali', () => {
    const { invalidate, result } = setup('connected')

    expect(result.current.connected).toBe(true)
    expect(invalidate).toHaveBeenCalledTimes(1)
  })

  it('tanpa real-time: connected false dan tidak ada error', () => {
    vi.mocked(getRealtime).mockReturnValue(null)
    const client = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useOrderRealtime('abc123', 'ORD-1'), {
      wrapper,
    })

    expect(result.current.connected).toBe(false)
  })

  it('kode pesanan kosong tidak berlangganan', () => {
    const { fake } = setup('connected', '')

    expect(fake.subscribe).not.toHaveBeenCalled()
  })
})
