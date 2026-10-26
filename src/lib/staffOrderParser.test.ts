import { describe, expect, it } from 'vitest'
import { makeStaffOrder } from '@/test/fixtures'
import { isOrderStatus, parseStaffOrder } from './staffOrderParser'

describe('isOrderStatus', () => {
  it('hanya menerima status yang dikenal', () => {
    for (const status of [
      'pending_payment',
      'paid',
      'preparing',
      'ready',
      'completed',
      'cancelled',
    ]) {
      expect(isOrderStatus(status)).toBe(true)
    }

    for (const value of ['ngawur', '', null, undefined, 1]) {
      expect(isOrderStatus(value)).toBe(false)
    }
  })
})

describe('parseStaffOrder', () => {
  it('mengembalikan pesanan yang valid', () => {
    const order = makeStaffOrder({
      customer_name: 'Budi',
      notes: 'Dekat jendela',
      items: [
        { id: 1, menu_name: 'Mie', quantity: 2, spice_level: 0, notes: 'x' },
        {
          id: 2,
          menu_name: 'Teh',
          quantity: 1,
          spice_level: null,
          notes: null,
        },
      ],
    })

    expect(parseStaffOrder(order)).toEqual(order)
  })

  it('menerima paid_at dan next_status null', () => {
    const order = makeStaffOrder({
      status: 'completed',
      next_status: null,
      paid_at: null,
    })

    expect(parseStaffOrder(order)).toEqual(order)
  })

  it('membuang field tambahan yang tidak dikenal', () => {
    const parsed = parseStaffOrder({ ...makeStaffOrder(), rahasia: 'x' })

    expect(parsed).not.toHaveProperty('rahasia')
  })

  it.each([
    ['bukan objek', 'teks'],
    ['null', null],
    ['array', []],
  ])('menolak nilai yang %s', (_name, value) => {
    expect(parseStaffOrder(value)).toBeNull()
  })

  it.each<[string, Record<string, unknown>]>([
    ['id bukan angka', { id: '1' }],
    ['status tidak dikenal', { status: 'ngawur' }],
    ['next_status tidak dikenal', { next_status: 'ngawur' }],
    ['next_status hilang', { next_status: undefined }],
    ['nomor meja bukan angka', { table_number: 'lima' }],
    ['total bukan angka', { total_amount: null }],
    ['items bukan array', { items: 'x' }],
    ['created_at hilang', { created_at: undefined }],
    ['customer_name bukan string', { customer_name: 5 }],
    ['paid_at bukan string', { paid_at: 5 }],
  ])('menolak pesanan dengan %s', (_name, patch) => {
    expect(parseStaffOrder({ ...makeStaffOrder(), ...patch })).toBeNull()
  })

  it('menolak pesanan yang salah satu item-nya tidak valid', () => {
    const base = makeStaffOrder()
    const good = base.items[0]

    expect(
      parseStaffOrder({ ...base, items: [good, { id: 1, menu_name: 'x' }] }),
    ).toBeNull()
    expect(
      parseStaffOrder({ ...base, items: [{ ...good, spice_level: 'pedas' }] }),
    ).toBeNull()
    expect(
      parseStaffOrder({ ...base, items: [{ ...good, notes: 5 }] }),
    ).toBeNull()
  })
})
