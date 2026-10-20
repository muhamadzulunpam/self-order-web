import { describe, expect, it } from 'vitest'
import {
  ACTIVE_ORDER_TTL_MS,
  MAX_ACTIVE_ORDERS,
  addRef,
  removeRef,
  sanitizeActiveOrders,
} from './activeOrdersLogic'

const ref = (orderCode: string, createdAt = 1000) => ({ orderCode, createdAt })

describe('addRef', () => {
  it('menaruh pesanan terbaru di depan', () => {
    expect(addRef([ref('A')], ref('B')).map((r) => r.orderCode)).toEqual([
      'B',
      'A',
    ])
  })

  it('tidak menggandakan kode yang sama dan memindahkannya ke depan', () => {
    const result = addRef([ref('A'), ref('B')], ref('B', 2000))

    expect(result.map((r) => r.orderCode)).toEqual(['B', 'A'])
    expect(result[0].createdAt).toBe(2000)
  })

  it('membatasi jumlah dan membuang yang terlama', () => {
    let refs = [] as ReturnType<typeof addRef>

    for (let index = 1; index <= MAX_ACTIVE_ORDERS + 2; index++) {
      refs = addRef(refs, ref(`ORD-${index}`))
    }

    expect(refs).toHaveLength(MAX_ACTIVE_ORDERS)
    expect(refs[0].orderCode).toBe(`ORD-${MAX_ACTIVE_ORDERS + 2}`)
    expect(refs.map((r) => r.orderCode)).not.toContain('ORD-1')
  })
})

describe('removeRef', () => {
  it('membuang pesanan yang dimaksud saja', () => {
    expect(
      removeRef([ref('A'), ref('B')], 'A').map((r) => r.orderCode),
    ).toEqual(['B'])
  })
})

describe('sanitizeActiveOrders', () => {
  const now = 10_000_000

  it('mengembalikan objek kosong untuk data yang bukan objek', () => {
    for (const raw of [null, undefined, 'teks', 42]) {
      expect(sanitizeActiveOrders(raw, now)).toEqual({})
    }
  })

  it('mempertahankan data yang valid', () => {
    const data = { abc: [ref('A', now - 1000)] }

    expect(sanitizeActiveOrders(data, now)).toEqual(data)
  })

  it('membuang pesanan yang kedaluwarsa', () => {
    const data = { abc: [ref('A', now - ACTIVE_ORDER_TTL_MS - 1)] }

    expect(sanitizeActiveOrders(data, now)).toEqual({})
  })

  it('membuang entri rusak dan meja yang jadi kosong', () => {
    const data = {
      ok: [ref('A', now), { orderCode: '', createdAt: now }, { orderCode: 1 }],
      rusak: [{ nonsense: true }],
      bukanArray: 'teks',
    }

    const result = sanitizeActiveOrders(data, now)

    expect(Object.keys(result)).toEqual(['ok'])
    expect(result.ok).toHaveLength(1)
  })

  it('membatasi jumlah pesanan per meja', () => {
    const many = Array.from({ length: 12 }, (_, index) => ref(`O${index}`, now))

    expect(sanitizeActiveOrders({ abc: many }, now).abc).toHaveLength(
      MAX_ACTIVE_ORDERS,
    )
  })
})
