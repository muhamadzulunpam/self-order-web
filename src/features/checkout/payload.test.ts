import { describe, expect, it } from 'vitest'
import { makeLine } from '@/test/fixtures'
import { buildOrderPayload } from './payload'

describe('buildOrderPayload', () => {
  it('mengubah baris keranjang menjadi item pesanan', () => {
    const payload = buildOrderPayload(
      [
        makeLine({
          menuId: 10,
          quantity: 2,
          spiceLevel: 3,
          notes: 'tanpa bawang',
        }),
        makeLine({ menuId: 20, quantity: 1, spiceLevel: null, notes: '' }),
      ],
      '',
      '',
    )

    expect(payload).toEqual({
      items: [
        { menu_id: 10, quantity: 2, spice_level: 3, notes: 'tanpa bawang' },
        { menu_id: 20, quantity: 1 },
      ],
    })
  })

  it('tetap mengirim level pedas 0', () => {
    const payload = buildOrderPayload([makeLine({ spiceLevel: 0 })], '', '')

    expect(payload.items[0].spice_level).toBe(0)
  })

  it('merapikan nama dan catatan, dan membuang yang kosong', () => {
    expect(
      buildOrderPayload([makeLine()], '  Budi ', ' Dekat jendela '),
    ).toMatchObject({
      customer_name: 'Budi',
      notes: 'Dekat jendela',
    })

    const blank = buildOrderPayload([makeLine()], '   ', '  ')

    expect(blank).not.toHaveProperty('customer_name')
    expect(blank).not.toHaveProperty('notes')
  })

  it('tidak pernah mengirim harga', () => {
    const payload = buildOrderPayload([makeLine({ price: 12000 })], 'Budi', '')

    expect(JSON.stringify(payload)).not.toMatch(/price|harga|total/i)
  })
})
