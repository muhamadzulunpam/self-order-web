import { describe, expect, it } from 'vitest'
import { orderRefetchInterval } from './useOrder'

describe('orderRefetchInterval', () => {
  it('tidak memantau jika belum ada data', () => {
    expect(orderRefetchInterval(undefined)).toBe(false)
  })

  it('berhenti memantau untuk status final, juga saat real-time aktif', () => {
    expect(orderRefetchInterval('completed')).toBe(false)
    expect(orderRefetchInterval('cancelled')).toBe(false)
    expect(orderRefetchInterval('completed', true)).toBe(false)
  })

  it('memantau lebih rapat saat menunggu pembayaran dan real-time belum aktif', () => {
    expect(orderRefetchInterval('pending_payment')).toBe(4000)
  })

  it('memantau lebih longgar saat pesanan diproses dan real-time belum aktif', () => {
    for (const status of ['paid', 'preparing', 'ready'] as const) {
      expect(orderRefetchInterval(status)).toBe(10_000)
    }
  })

  it('hanya jadi jaring pengaman 30 detik saat real-time aktif', () => {
    for (const status of [
      'pending_payment',
      'paid',
      'preparing',
      'ready',
    ] as const) {
      expect(orderRefetchInterval(status, true)).toBe(30_000)
    }
  })
})
