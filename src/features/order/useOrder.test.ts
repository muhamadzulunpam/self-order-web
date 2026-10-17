import { describe, expect, it } from 'vitest'
import { orderRefetchInterval } from './useOrder'

describe('orderRefetchInterval', () => {
  it('tidak memantau jika belum ada data', () => {
    expect(orderRefetchInterval(undefined)).toBe(false)
  })

  it('berhenti memantau untuk status final', () => {
    expect(orderRefetchInterval('completed')).toBe(false)
    expect(orderRefetchInterval('cancelled')).toBe(false)
  })

  it('memantau lebih rapat saat menunggu pembayaran', () => {
    expect(orderRefetchInterval('pending_payment')).toBe(4000)
  })

  it('memantau lebih longgar saat pesanan diproses', () => {
    for (const status of ['paid', 'preparing', 'ready'] as const) {
      expect(orderRefetchInterval(status)).toBe(10_000)
    }
  })
})
