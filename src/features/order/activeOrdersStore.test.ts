import { describe, expect, it, vi } from 'vitest'
import {
  ACTIVE_ORDERS_STORAGE_KEY,
  ACTIVE_ORDER_TTL_MS,
} from './activeOrdersLogic'
import { useActiveOrdersStore } from './activeOrdersStore'

const state = () => useActiveOrdersStore.getState()
const codes = (token: string) =>
  state().byToken[token]?.map((ref) => ref.orderCode)

describe('active orders store', () => {
  it('menambah pesanan dengan yang terbaru di depan', () => {
    state().add('abc', 'ORD-1')
    state().add('abc', 'ORD-2')

    expect(codes('abc')).toEqual(['ORD-2', 'ORD-1'])
  })

  it('memisahkan pesanan per token meja', () => {
    state().add('meja-1', 'ORD-1')
    state().add('meja-2', 'ORD-2')

    expect(codes('meja-1')).toEqual(['ORD-1'])
    expect(codes('meja-2')).toEqual(['ORD-2'])
  })

  it('menghapus satu pesanan dan membuang entri meja saat kosong', () => {
    state().add('abc', 'ORD-1')
    state().add('abc', 'ORD-2')

    state().remove('abc', 'ORD-1')
    expect(codes('abc')).toEqual(['ORD-2'])

    state().remove('abc', 'ORD-2')
    expect(state().byToken.abc).toBeUndefined()
  })

  it('menghapus pesanan yang tidak ada tidak mengubah state', () => {
    state().add('abc', 'ORD-1')
    const before = state()

    state().remove('abc', 'ORD-X')
    state().remove('lain', 'ORD-1')

    expect(state()).toBe(before)
  })

  it('menyimpan ke localStorage dan memulihkannya setelah reload', async () => {
    state().add('abc', 'ORD-1')

    expect(localStorage.getItem(ACTIVE_ORDERS_STORAGE_KEY)).toContain('ORD-1')

    vi.resetModules()
    const { useActiveOrdersStore: reloaded } =
      await import('./activeOrdersStore')

    expect(reloaded.getState().byToken.abc?.[0].orderCode).toBe('ORD-1')
  })

  it('mengabaikan data kedaluwarsa dan rusak saat dipulihkan', async () => {
    localStorage.setItem(
      ACTIVE_ORDERS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: {
          byToken: {
            segar: [{ orderCode: 'ORD-1', createdAt: Date.now() }],
            lama: [
              {
                orderCode: 'ORD-2',
                createdAt: Date.now() - ACTIVE_ORDER_TTL_MS - 1000,
              },
            ],
            rusak: [{ nonsense: true }],
          },
        },
      }),
    )

    vi.resetModules()
    const { useActiveOrdersStore: reloaded } =
      await import('./activeOrdersStore')

    expect(Object.keys(reloaded.getState().byToken)).toEqual(['segar'])
  })

  it('tidak error jika isi localStorage bukan JSON yang valid', async () => {
    localStorage.setItem(ACTIVE_ORDERS_STORAGE_KEY, '{bukan json')

    vi.resetModules()
    const { useActiveOrdersStore: reloaded } =
      await import('./activeOrdersStore')

    expect(reloaded.getState().byToken).toEqual({})
  })
})
