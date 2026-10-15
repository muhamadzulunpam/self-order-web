import { describe, expect, it, vi } from 'vitest'
import { makeLine } from '@/test/fixtures'
import {
  CART_STORAGE_KEY,
  CART_TTL_MS,
  MAX_LINES,
  MAX_QUANTITY,
} from './cartLogic'
import { useCartStore } from './store'

const base = {
  menuId: 1,
  name: 'Mie',
  price: 12000,
  quantity: 1,
  spiceLevel: 3,
  notes: '',
}

const state = () => useCartStore.getState()

describe('cart store', () => {
  it('menambah dan menggabungkan item yang sama', () => {
    state().addLine('abc', base)
    state().addLine('abc', base)

    expect(state().carts.abc.lines).toHaveLength(1)
    expect(state().carts.abc.lines[0].quantity).toBe(2)
  })

  it('memisahkan keranjang per token meja', () => {
    state().addLine('meja-1', base)
    state().addLine('meja-2', { ...base, menuId: 2 })

    expect(state().carts['meja-1'].lines).toHaveLength(1)
    expect(state().carts['meja-2'].lines[0].menuId).toBe(2)
  })

  it('mengubah jumlah dan membatasinya maksimal 20', () => {
    state().addLine('abc', base)
    const key = state().carts.abc.lines[0].key

    state().setQuantity('abc', key, 5)
    expect(state().carts.abc.lines[0].quantity).toBe(5)

    state().setQuantity('abc', key, 99)
    expect(state().carts.abc.lines[0].quantity).toBe(MAX_QUANTITY)
  })

  it('menghapus baris jika jumlah menjadi nol', () => {
    state().addLine('abc', base)
    const key = state().carts.abc.lines[0].key

    state().setQuantity('abc', key, 0)

    expect(state().carts.abc).toBeUndefined()
  })

  it('menghapus entri keranjang saat baris terakhir dihapus', () => {
    state().addLine('abc', base)
    state().addLine('abc', { ...base, menuId: 2 })
    const [first, second] = state().carts.abc.lines

    state().removeLine('abc', first.key)
    expect(state().carts.abc.lines).toHaveLength(1)

    state().removeLine('abc', second.key)
    expect(state().carts.abc).toBeUndefined()
  })

  it('mengosongkan keranjang satu meja tanpa menyentuh meja lain', () => {
    state().addLine('meja-1', base)
    state().addLine('meja-2', base)

    state().clear('meja-1')

    expect(state().carts['meja-1']).toBeUndefined()
    expect(state().carts['meja-2']).toBeDefined()
  })

  it('menolak baris baru setelah batas 50 baris', () => {
    for (let id = 1; id <= MAX_LINES; id++) {
      expect(state().addLine('abc', { ...base, menuId: id })).toBe('ok')
    }

    expect(state().addLine('abc', { ...base, menuId: 999 })).toBe('line_limit')
    expect(state().carts.abc.lines).toHaveLength(MAX_LINES)
  })

  it('reconcile memperbarui harga dan mencatat menu yang dihapus', () => {
    state().addLine('abc', base)
    state().addLine('abc', { ...base, menuId: 2, name: 'Menu Lama' })

    state().reconcile('abc', [
      { id: 1, name: 'Mie', price: 15000, has_spice_level: true },
    ])

    expect(state().carts.abc.lines).toHaveLength(1)
    expect(state().carts.abc.lines[0].price).toBe(15000)
    expect(state().removedNotices.abc).toEqual(['Menu Lama'])
  })

  it('reconcile tidak mengubah state jika tidak ada perubahan', () => {
    state().addLine('abc', base)
    const before = state()

    state().reconcile('abc', [
      { id: 1, name: 'Mie', price: 12000, has_spice_level: true },
    ])

    expect(state()).toBe(before)
  })

  it('dismissNotice menghapus pemberitahuan', () => {
    state().addLine('abc', base)
    state().reconcile('abc', [])
    expect(state().removedNotices.abc).toBeDefined()

    state().dismissNotice('abc')

    expect(state().removedNotices.abc).toBeUndefined()
  })

  it('menyimpan ke localStorage dan memulihkannya setelah reload', async () => {
    state().addLine('abc', base)

    expect(localStorage.getItem(CART_STORAGE_KEY)).toContain('"menuId":1')

    vi.resetModules()
    const { useCartStore: reloaded } = await import('./store')

    expect(reloaded.getState().carts.abc.lines).toHaveLength(1)
    expect(reloaded.getState().carts.abc.lines[0].name).toBe('Mie')
  })

  it('mengabaikan keranjang kedaluwarsa dan data rusak saat dipulihkan', async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: {
          carts: {
            segar: { updatedAt: Date.now(), lines: [makeLine({ menuId: 1 })] },
            lama: {
              updatedAt: Date.now() - CART_TTL_MS - 1000,
              lines: [makeLine({ menuId: 2 })],
            },
            rusak: { updatedAt: Date.now(), lines: [{ menuId: 'x' }] },
          },
        },
      }),
    )

    vi.resetModules()
    const { useCartStore: reloaded } = await import('./store')

    expect(Object.keys(reloaded.getState().carts)).toEqual(['segar'])
  })

  it('tidak error jika isi localStorage bukan JSON yang valid', async () => {
    localStorage.setItem(CART_STORAGE_KEY, '{bukan json')

    vi.resetModules()
    const { useCartStore: reloaded } = await import('./store')

    expect(reloaded.getState().carts).toEqual({})
  })
})
