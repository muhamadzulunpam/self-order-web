import { describe, expect, it } from 'vitest'
import { makeStaffOrder } from '@/test/fixtures'
import {
  CONFIRM_WINDOW_MS,
  groupForCashier,
  itemCount,
  processingLabel,
} from './cashierLogic'

const order = (
  id: number,
  overrides: Parameters<typeof makeStaffOrder>[0] = {},
) => makeStaffOrder({ id, ...overrides })
const ids = (orders: { id: number }[]) => orders.map((item) => item.id)

describe('groupForCashier', () => {
  it('memisahkan yang siap dari yang masih diproses dan membuang status lain', () => {
    const { ready, processing } = groupForCashier([
      order(1, { status: 'ready' }),
      order(2, { status: 'preparing' }),
      order(3, { status: 'paid' }),
      order(4, { status: 'completed' }),
      order(5, { status: 'pending_payment' }),
    ])

    expect(ids(ready)).toEqual([1])
    expect(ids(processing).sort()).toEqual([2, 3])
  })

  it('pesanan siap diurutkan dari yang paling dulu dibayar', () => {
    const { ready } = groupForCashier([
      order(1, { status: 'ready', paid_at: '2026-10-25T10:10:00Z' }),
      order(2, { status: 'ready', paid_at: '2026-10-25T10:00:00Z' }),
    ])

    expect(ids(ready)).toEqual([2, 1])
  })

  it('pesanan diproses digabung dan diurutkan menurut waktu bayar, bukan menurut status', () => {
    const { processing } = groupForCashier([
      order(1, { status: 'paid', paid_at: '2026-10-25T10:10:00Z' }),
      order(2, { status: 'preparing', paid_at: '2026-10-25T10:00:00Z' }),
      order(3, { status: 'paid', paid_at: '2026-10-25T10:05:00Z' }),
    ])

    expect(ids(processing)).toEqual([2, 3, 1])
  })

  it('daftar kosong menghasilkan dua daftar kosong', () => {
    expect(groupForCashier([])).toEqual({ ready: [], processing: [] })
  })
})

describe('itemCount dan processingLabel', () => {
  it('menjumlahkan jumlah semua item', () => {
    expect(
      itemCount(
        order(1, {
          items: [
            {
              id: 1,
              menu_name: 'A',
              quantity: 2,
              spice_level: null,
              notes: null,
            },
            {
              id: 2,
              menu_name: 'B',
              quantity: 3,
              spice_level: null,
              notes: null,
            },
          ],
        }),
      ),
    ).toBe(5)
  })

  it('memberi label status yang sesuai', () => {
    expect(processingLabel('paid')).toBe('Diterima')
    expect(processingLabel('preparing')).toBe('Dimasak')
  })

  it('jendela konfirmasi 5 detik', () => {
    expect(CONFIRM_WINDOW_MS).toBe(5000)
  })
})
