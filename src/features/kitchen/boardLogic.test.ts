import { describe, expect, it } from 'vitest'
import { makeStaffOrder } from '@/test/fixtures'
import {
  applyTouched,
  elapsedLabel,
  groupByColumn,
  isOnBoard,
  isStale,
  upsertOrder,
} from './boardLogic'

const order = (id: number, status: Parameters<typeof makeStaffOrder>[0] = {}) =>
  makeStaffOrder({ id, ...status })

const ids = (orders: { id: number }[]) => orders.map((o) => o.id)

describe('isOnBoard dan isStale', () => {
  it('hanya paid, preparing, dan ready yang tampil di papan', () => {
    expect(isOnBoard('paid')).toBe(true)
    expect(isOnBoard('preparing')).toBe(true)
    expect(isOnBoard('ready')).toBe(true)
    expect(isOnBoard('pending_payment')).toBe(false)
    expect(isOnBoard('completed')).toBe(false)
    expect(isOnBoard('cancelled')).toBe(false)
  })

  it('status yang lebih mundur dianggap usang', () => {
    const preparing = order(1, { status: 'preparing' })

    expect(isStale(preparing, order(1, { status: 'paid' }))).toBe(true)
    expect(isStale(preparing, order(1, { status: 'preparing' }))).toBe(false)
    expect(isStale(preparing, order(1, { status: 'ready' }))).toBe(false)
  })
})

describe('upsertOrder', () => {
  it('menambah pesanan baru yang statusnya tampil di papan', () => {
    expect(ids(upsertOrder([order(1)], order(2)))).toEqual([1, 2])
  })

  it.each(['pending_payment', 'completed', 'cancelled'] as const)(
    'tidak menambah pesanan baru berstatus %s',
    (status) => {
      expect(ids(upsertOrder([order(1)], order(2, { status })))).toEqual([1])
    },
  )

  it('mengganti pesanan yang sama dengan data terbaru', () => {
    const result = upsertOrder([order(1)], order(1, { status: 'preparing' }))

    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('preparing')
  })

  it('mengabaikan kabar yang lebih usang', () => {
    const current = [order(1, { status: 'preparing' })]
    const result = upsertOrder(current, order(1, { status: 'paid' }))

    expect(result[0].status).toBe('preparing')
  })

  it('membuang pesanan yang sudah selesai', () => {
    const result = upsertOrder(
      [order(1), order(2)],
      order(1, { status: 'completed' }),
    )

    expect(ids(result)).toEqual([2])
  })

  it('tidak mengubah array asal', () => {
    const current = [order(1)]

    upsertOrder(current, order(2))

    expect(current).toHaveLength(1)
  })
})

describe('applyTouched', () => {
  it('menambahkan pesanan yang datang saat fetch berjalan', () => {
    expect(ids(applyTouched([order(1)], [order(2)]))).toEqual([1, 2])
  })

  it('kabar yang lebih baru mengalahkan hasil fetch', () => {
    const result = applyTouched(
      [order(1, { status: 'preparing' })],
      [order(1, { status: 'ready' })],
    )

    expect(result[0].status).toBe('ready')
  })

  it('kabar yang lebih usang kalah dari hasil fetch', () => {
    const result = applyTouched(
      [order(1, { status: 'ready' })],
      [order(1, { status: 'paid' })],
    )

    expect(result[0].status).toBe('ready')
  })

  it('kabar bahwa pesanan selesai membuangnya dari hasil fetch', () => {
    const result = applyTouched(
      [order(1), order(2)],
      [order(1, { status: 'completed' })],
    )

    expect(ids(result)).toEqual([2])
  })

  it('membuang pesanan yang tidak tampil di papan dari hasil fetch', () => {
    const result = applyTouched(
      [order(1), order(2, { status: 'pending_payment' })],
      [],
    )

    expect(ids(result)).toEqual([1])
  })
})

describe('groupByColumn', () => {
  it('mengelompokkan pesanan berdasarkan status', () => {
    const groups = groupByColumn([
      order(1, { status: 'paid' }),
      order(2, { status: 'preparing' }),
      order(3, { status: 'ready' }),
      order(4, { status: 'paid' }),
      order(5, { status: 'completed' }),
    ])

    expect(ids(groups.paid)).toEqual([1, 4])
    expect(ids(groups.preparing)).toEqual([2])
    expect(ids(groups.ready)).toEqual([3])
  })

  it('mengurutkan dari yang paling dulu dibayar', () => {
    const groups = groupByColumn([
      order(1, { paid_at: '2026-10-25T10:10:00Z' }),
      order(2, { paid_at: '2026-10-25T10:00:00Z' }),
      order(3, { paid_at: '2026-10-25T10:05:00Z' }),
    ])

    expect(ids(groups.paid)).toEqual([2, 3, 1])
  })

  it('waktu yang sama diurutkan menurut id, dan paid_at kosong memakai created_at', () => {
    const groups = groupByColumn([
      order(3, { paid_at: '2026-10-25T10:00:00Z' }),
      order(2, { paid_at: '2026-10-25T10:00:00Z' }),
      order(1, { paid_at: null, created_at: '2026-10-25T09:00:00Z' }),
    ])

    expect(ids(groups.paid)).toEqual([1, 2, 3])
  })

  it('mengembalikan kolom kosong untuk daftar kosong', () => {
    expect(groupByColumn([])).toEqual({ paid: [], preparing: [], ready: [] })
  })
})

describe('elapsedLabel', () => {
  const now = Date.parse('2026-10-25T12:00:00Z')
  const ago = (ms: number) => new Date(now - ms).toISOString()

  it.each([
    [30_000, 'baru saja'],
    [5 * 60_000, '5 menit lalu'],
    [59 * 60_000, '59 menit lalu'],
    [65 * 60_000, '1 jam 5 menit lalu'],
    [120 * 60_000, '2 jam lalu'],
  ])('selisih %i ms menjadi "%s"', (diff, expected) => {
    expect(elapsedLabel(ago(diff), now)).toBe(expected)
  })

  it('waktu di masa depan (selisih jam perangkat) dianggap baru saja', () => {
    expect(elapsedLabel(ago(-5 * 60_000), now)).toBe('baru saja')
  })

  it('tanggal kosong atau tidak valid menghasilkan teks kosong', () => {
    expect(elapsedLabel(null, now)).toBe('')
    expect(elapsedLabel('bukan tanggal', now)).toBe('')
  })
})
