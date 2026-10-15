import { describe, expect, it } from 'vitest'
import { makeLine } from '@/test/fixtures'
import {
  CART_TTL_MS,
  MAX_LINES,
  MAX_QUANTITY,
  addToLines,
  cartCount,
  cartTotal,
  makeLineKey,
  reconcileLines,
  sanitizeCarts,
} from './cartLogic'

const input = {
  menuId: 1,
  name: 'Mie',
  price: 12000,
  quantity: 1,
  spiceLevel: 3,
  notes: '',
}

describe('makeLineKey', () => {
  it('sama untuk catatan yang hanya beda spasi dan huruf besar', () => {
    expect(
      makeLineKey({ menuId: 1, spiceLevel: 2, notes: '  Tanpa Bawang ' }),
    ).toBe(makeLineKey({ menuId: 1, spiceLevel: 2, notes: 'tanpa bawang' }))
  })

  it('berbeda untuk level pedas yang berbeda', () => {
    expect(makeLineKey({ menuId: 1, spiceLevel: 1, notes: '' })).not.toBe(
      makeLineKey({ menuId: 1, spiceLevel: 2, notes: '' }),
    )
  })

  it('membedakan tanpa level pedas dari level 0', () => {
    expect(makeLineKey({ menuId: 1, spiceLevel: null, notes: '' })).not.toBe(
      makeLineKey({ menuId: 1, spiceLevel: 0, notes: '' }),
    )
  })
})

describe('addToLines', () => {
  it('menambah baris baru dengan catatan yang sudah dirapikan', () => {
    const result = addToLines([], { ...input, notes: '  tanpa bawang ' })

    expect(result.status).toBe('ok')
    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].notes).toBe('tanpa bawang')
    expect(result.lines[0].key).toBe(
      makeLineKey({ menuId: 1, spiceLevel: 3, notes: 'tanpa bawang' }),
    )
  })

  it('menggabungkan baris yang sama dan memakai harga terbaru', () => {
    const first = addToLines([], input)
    const second = addToLines(first.lines, {
      ...input,
      quantity: 2,
      price: 13000,
    })

    expect(second.lines).toHaveLength(1)
    expect(second.lines[0].quantity).toBe(3)
    expect(second.lines[0].price).toBe(13000)
  })

  it('memisahkan baris dengan level pedas atau catatan berbeda', () => {
    let lines = addToLines([], input).lines
    lines = addToLines(lines, { ...input, spiceLevel: 5 }).lines
    lines = addToLines(lines, { ...input, notes: 'tanpa bawang' }).lines

    expect(lines).toHaveLength(3)
  })

  it('membatasi jumlah per baris maksimal 20', () => {
    const lines = [makeLine({ quantity: 19 })]
    const result = addToLines(lines, { ...input, quantity: 5, notes: '' })

    expect(result.lines[0].quantity).toBe(MAX_QUANTITY)
  })

  it('merapikan jumlah awal yang tidak wajar', () => {
    expect(addToLines([], { ...input, quantity: 99 }).lines[0].quantity).toBe(
      MAX_QUANTITY,
    )
    expect(addToLines([], { ...input, quantity: 0 }).lines[0].quantity).toBe(1)
  })

  it('menolak baris baru jika sudah mencapai batas', () => {
    const lines = Array.from({ length: MAX_LINES }, (_, index) =>
      makeLine({ menuId: index + 1, spiceLevel: null }),
    )

    const result = addToLines(lines, {
      ...input,
      menuId: 999,
      spiceLevel: null,
    })

    expect(result.status).toBe('line_limit')
    expect(result.lines).toBe(lines)
  })

  it('tetap boleh menambah jumlah baris yang sudah ada saat batas tercapai', () => {
    const lines = Array.from({ length: MAX_LINES }, (_, index) =>
      makeLine({ menuId: index + 1, spiceLevel: null }),
    )

    const result = addToLines(lines, {
      ...input,
      menuId: 1,
      spiceLevel: null,
    })

    expect(result.status).toBe('ok')
    expect(result.lines[0].quantity).toBe(2)
  })
})

describe('cartTotal dan cartCount', () => {
  it('menjumlahkan harga dan jumlah semua baris', () => {
    const lines = [
      makeLine({ menuId: 1, price: 12000, quantity: 2 }),
      makeLine({ menuId: 2, price: 5000, quantity: 3, spiceLevel: null }),
    ]

    expect(cartTotal(lines)).toBe(39000)
    expect(cartCount(lines)).toBe(5)
  })

  it('bernilai nol untuk keranjang kosong', () => {
    expect(cartTotal([])).toBe(0)
    expect(cartCount([])).toBe(0)
  })
})

describe('reconcileLines', () => {
  const menu = (overrides = {}) => ({
    id: 1,
    name: 'Mie Pedas Original',
    price: 12000,
    has_spice_level: true,
    ...overrides,
  })

  it('tidak mengubah apa pun jika semuanya sama', () => {
    const lines = [makeLine()]
    const result = reconcileLines(lines, [menu()])

    expect(result.changed).toBe(false)
    expect(result.lines).toBe(lines)
    expect(result.removed).toEqual([])
  })

  it('memperbarui nama dan harga', () => {
    const result = reconcileLines(
      [makeLine()],
      [menu({ name: 'Mie Baru', price: 15000 })],
    )

    expect(result.changed).toBe(true)
    expect(result.lines[0]).toMatchObject({ name: 'Mie Baru', price: 15000 })
    expect(result.removed).toEqual([])
  })

  it('menghapus baris yang menunya sudah tidak ada', () => {
    const result = reconcileLines([makeLine()], [])

    expect(result.lines).toEqual([])
    expect(result.removed).toEqual(['Mie Pedas Original'])
  })

  it('menghapus baris tanpa level pedas jika menunya kini punya level pedas', () => {
    const result = reconcileLines(
      [makeLine({ spiceLevel: null })],
      [menu({ has_spice_level: true })],
    )

    expect(result.lines).toEqual([])
    expect(result.removed).toHaveLength(1)
  })

  it('menghapus baris dengan level pedas jika menunya tidak lagi punya level pedas', () => {
    const result = reconcileLines(
      [makeLine({ spiceLevel: 3 })],
      [menu({ has_spice_level: false })],
    )

    expect(result.lines).toEqual([])
    expect(result.removed).toHaveLength(1)
  })
})

describe('sanitizeCarts', () => {
  const now = Date.now()

  it('mengembalikan objek kosong untuk data yang bukan objek', () => {
    for (const raw of [null, undefined, 'teks', 42, true]) {
      expect(sanitizeCarts(raw, now)).toEqual({})
    }
  })

  it('mempertahankan keranjang yang valid', () => {
    const carts = { abc: { updatedAt: now, lines: [makeLine()] } }

    expect(sanitizeCarts(carts, now)).toEqual(carts)
  })

  it('membuang keranjang yang kedaluwarsa', () => {
    const carts = {
      abc: { updatedAt: now - CART_TTL_MS - 1, lines: [makeLine()] },
    }

    expect(sanitizeCarts(carts, now)).toEqual({})
  })

  it('membuang baris yang rusak dan keranjang yang jadi kosong', () => {
    const carts = {
      ok: {
        updatedAt: now,
        lines: [makeLine(), { menuId: 'x' }, { ...makeLine(), quantity: 999 }],
      },
      rusak: { updatedAt: now, lines: [{ menuId: 'x' }] },
      tanpaLines: { updatedAt: now },
      bukanObjek: 'teks',
    }

    const result = sanitizeCarts(carts, now)

    expect(Object.keys(result)).toEqual(['ok'])
    expect(result.ok.lines).toHaveLength(1)
  })
})
