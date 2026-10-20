import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  ACTIVE_ORDERS_STORAGE_KEY,
  addRef,
  removeRef,
  sanitizeActiveOrders,
} from './activeOrdersLogic'
import type { ActiveOrderRef, ActiveOrders } from './activeOrdersLogic'

type ActiveOrdersState = {
  byToken: ActiveOrders
  add: (token: string, orderCode: string) => void
  remove: (token: string, orderCode: string) => void
}

export const useActiveOrdersStore = create<ActiveOrdersState>()(
  persist(
    (set) => ({
      byToken: {},

      add: (token, orderCode) =>
        set((state) => ({
          byToken: {
            ...state.byToken,
            [token]: addRef(state.byToken[token] ?? [], {
              orderCode,
              createdAt: Date.now(),
            }),
          },
        })),

      remove: (token, orderCode) =>
        set((state) => {
          const refs = state.byToken[token]

          if (!refs || !refs.some((ref) => ref.orderCode === orderCode)) {
            return state
          }

          const next = removeRef(refs, orderCode)
          const byToken = { ...state.byToken }

          if (next.length === 0) delete byToken[token]
          else byToken[token] = next

          return { byToken }
        }),
    }),
    {
      name: ACTIVE_ORDERS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ byToken: state.byToken }),
      merge: (persisted, current) => ({
        ...current,
        byToken: sanitizeActiveOrders(
          (persisted as { byToken?: unknown } | null | undefined)?.byToken,
          Date.now(),
        ),
      }),
    },
  ),
)

const EMPTY_REFS: ActiveOrderRef[] = []

/** Konstanta EMPTY_REFS wajib dipakai agar selector tidak mengembalikan array baru di tiap render. */
export function useActiveOrderRefs(token: string): ActiveOrderRef[] {
  return useActiveOrdersStore((state) => state.byToken[token] ?? EMPTY_REFS)
}
