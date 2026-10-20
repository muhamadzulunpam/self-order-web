import { describe, expect, it } from 'vitest'
import { STATUS_HINT, STATUS_STYLE, isFinalStatus } from './statusInfo'
import type { OrderStatus } from '@/types/order'

const ALL: OrderStatus[] = [
  'pending_payment',
  'paid',
  'preparing',
  'ready',
  'completed',
  'cancelled',
]

describe('statusInfo', () => {
  it('hanya selesai dan dibatalkan yang dianggap final', () => {
    expect(ALL.filter(isFinalStatus)).toEqual(['completed', 'cancelled'])
  })

  it('setiap status punya gaya dan petunjuk', () => {
    for (const status of ALL) {
      expect(STATUS_STYLE[status]).toBeTruthy()
      expect(STATUS_HINT[status]).toBeTruthy()
    }
  })
})
