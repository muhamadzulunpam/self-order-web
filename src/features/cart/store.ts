import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  CART_STORAGE_KEY,
  addToLines,
  clampQuantity,
  reconcileLines,
  sanitizeCarts,
  type AddStatus,
  type CartLine,
  type Carts,
  type NewLine,
} from './cartLogic'
import type { PublicMenu } from '@/types/menu'

type CartState = {
  carts: Carts
  /** Menu yang dihapus otomatis dari keranjang (tidak disimpan ke localStorage). */
  removedNotices: Record<string, string[]>
  addLine: (token: string, input: NewLine) => AddStatus
  setQuantity: (token: string, key: string, quantity: number) => void
  removeLine: (token: string, key: string) => void
  clear: (token: string) => void
  reconcile: (
    token: string,
    menus: Pick<PublicMenu, 'id' | 'name' | 'price' | 'has_spice_level'>[],
  ) => void
  dismissNotice: (token: string) => void
}

function withLines(carts: Carts, token: string, lines: CartLine[]): Carts {
  const next = { ...carts }

  if (lines.length === 0) {
    delete next[token]
  } else {
    next[token] = { lines, updatedAt: Date.now() }
  }

  return next
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      carts: {},
      removedNotices: {},

      addLine: (token, input) => {
        const current = get().carts[token]?.lines ?? []
        const result = addToLines(current, input)

        if (result.status === 'ok') {
          set((state) => ({
            carts: withLines(state.carts, token, result.lines),
          }))
        }

        return result.status
      },

      setQuantity: (token, key, quantity) =>
        set((state) => {
          const lines = state.carts[token]?.lines

          if (!lines) return state

          const next =
            quantity <= 0
              ? lines.filter((line) => line.key !== key)
              : lines.map((line) =>
                  line.key === key
                    ? { ...line, quantity: clampQuantity(quantity) }
                    : line,
                )

          return { carts: withLines(state.carts, token, next) }
        }),

      removeLine: (token, key) =>
        set((state) => {
          const lines = state.carts[token]?.lines

          if (!lines) return state

          return {
            carts: withLines(
              state.carts,
              token,
              lines.filter((line) => line.key !== key),
            ),
          }
        }),

      clear: (token) =>
        set((state) => ({ carts: withLines(state.carts, token, []) })),

      reconcile: (token, menus) => {
        const lines = get().carts[token]?.lines

        if (!lines) return

        const result = reconcileLines(lines, menus)

        if (!result.changed) return

        set((state) => {
          const previous = state.removedNotices[token] ?? []

          return {
            carts: withLines(state.carts, token, result.lines),
            removedNotices:
              result.removed.length > 0
                ? {
                    ...state.removedNotices,
                    [token]: [...new Set([...previous, ...result.removed])],
                  }
                : state.removedNotices,
          }
        })
      },

      dismissNotice: (token) =>
        set((state) => {
          const next = { ...state.removedNotices }
          delete next[token]

          return { removedNotices: next }
        }),
    }),
    {
      name: CART_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ carts: state.carts }),
      merge: (persisted, current) => ({
        ...current,
        carts: sanitizeCarts(
          (persisted as { carts?: unknown } | null | undefined)?.carts,
          Date.now(),
        ),
      }),
    },
  ),
)

const EMPTY_LINES: CartLine[] = []

/**
 * Konstanta EMPTY_LINES wajib dipakai: selector Zustand v5 tidak boleh
 * mengembalikan array baru di setiap render, kalau tidak akan terjadi loop tak terbatas.
 */
export function useCartLines(token: string): CartLine[] {
  return useCartStore((state) => state.carts[token]?.lines ?? EMPTY_LINES)
}
