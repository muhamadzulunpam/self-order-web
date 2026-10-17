import { describe, expect, it } from 'vitest'
import { orderPath, orderStatusPath } from './paths'

describe('paths', () => {
  it('membentuk path menu dan status pesanan', () => {
    expect(orderPath('abc123')).toBe('/order/abc123')
    expect(orderStatusPath('abc123', 'ORD-1')).toBe(
      '/order/abc123/status/ORD-1',
    )
  })

  it('meng-encode karakter khusus', () => {
    expect(orderPath('a/b')).toBe('/order/a%2Fb')
  })
})
