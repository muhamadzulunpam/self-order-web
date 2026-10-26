import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { staffKeys } from '@/lib/queryKeys'
import { shouldRetry } from '@/lib/retry'
import type { StaffOrder } from '@/types/order'
import { fetchStaffOrders, updateOrderStatus } from './api'
import {
  applyTouched,
  groupByColumn,
  isOnBoard,
  isStale,
  upsertOrder,
} from './boardLogic'
import type { KitchenTarget } from './boardLogic'
import { describeStatusError } from './errors'
import { useKitchenSound } from './useKitchenSound'
import { useStaffRealtime } from './useStaffRealtime'

/** Saat real-time aktif, polling hanya jaring pengaman. Saat tidak aktif, dapur tetap terasa langsung. */
const POLL_SAFETY_MS = 60_000
const POLL_FAST_MS = 8_000
const NEW_BADGE_MS = 15_000

export function useKitchenBoard() {
  const queryClient = useQueryClient()
  const sound = useKitchenSound()
  const { notify } = sound

  // Kabar yang masuk selama fetch berjalan, diterapkan ulang di atas hasil fetch.
  const touched = useRef(new Map<number, StaffOrder>())
  // Id pesanan yang pernah tampil. null sampai muatan pertama selesai (agar muatan awal tidak berbunyi).
  const known = useRef<Set<number> | null>(null)
  const inFlight = useRef(new Set<number>())

  const [newIds, setNewIds] = useState<ReadonlySet<number>>(() => new Set())
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  )
  const [notice, setNotice] = useState<string | null>(null)

  const registerArrivals = useCallback(
    (orders: readonly StaffOrder[]) => {
      const seen = known.current

      if (seen === null) return

      const fresh = orders.filter((order) => !seen.has(order.id))

      if (fresh.length === 0) return

      fresh.forEach((order) => seen.add(order.id))

      const arrived = fresh.filter((order) => order.status === 'paid')

      if (arrived.length === 0) return

      setNewIds(
        (previous) => new Set([...previous, ...arrived.map((o) => o.id)]),
      )
      notify()
    },
    [notify],
  )

  const applyOrder = useCallback(
    (order: StaffOrder) => {
      const previous = touched.current.get(order.id)

      if (!previous || !isStale(previous, order)) {
        touched.current.set(order.id, order)
      }

      queryClient.setQueryData<StaffOrder[]>(staffKeys.orders, (current) =>
        current ? upsertOrder(current, order) : current,
      )

      if (isOnBoard(order.status)) registerArrivals([order])
    },
    [queryClient, registerArrivals],
  )

  const realtime = useStaffRealtime({
    onEvent: (event) => applyOrder(event.order),
    // Setiap (kembali) berlangganan, ambil ulang untuk menutup celah selama terputus.
    onSubscribed: () => {
      void queryClient.invalidateQueries({ queryKey: staffKeys.orders })
    },
  })

  const query = useQuery({
    queryKey: staffKeys.orders,
    queryFn: async () => {
      touched.current.clear()

      const fetched = await fetchStaffOrders()
      const board = applyTouched(fetched, [...touched.current.values()])

      if (known.current === null)
        known.current = new Set(board.map((o) => o.id))
      else registerArrivals(board)

      return board
    },
    retry: shouldRetry,
    refetchOnWindowFocus: true,
    // Layar dapur sering berada di tab latar belakang: polling tidak boleh berhenti.
    refetchIntervalInBackground: true,
    refetchInterval: realtime.live ? POLL_SAFETY_MS : POLL_FAST_MS,
  })

  useEffect(() => {
    if (newIds.size === 0) return

    const timer = setTimeout(() => setNewIds(new Set()), NEW_BADGE_MS)

    return () => clearTimeout(timer)
  }, [newIds])

  const changeStatus = useCallback(
    async (order: StaffOrder, target: KitchenTarget) => {
      if (inFlight.current.has(order.id)) return

      inFlight.current.add(order.id)
      setPendingIds(new Set(inFlight.current))
      setNotice(null)

      try {
        applyOrder(await updateOrderStatus(order.id, target))
      } catch (error) {
        const failure = describeStatusError(error)

        setNotice(`Meja ${order.table_number}: ${failure.message}`)

        if (failure.refresh) {
          void queryClient.invalidateQueries({ queryKey: staffKeys.orders })
        }
      } finally {
        inFlight.current.delete(order.id)
        setPendingIds(new Set(inFlight.current))
      }
    },
    [applyOrder, queryClient],
  )

  const columns = useMemo(() => groupByColumn(query.data ?? []), [query.data])

  return {
    columns,
    total:
      columns.paid.length + columns.preparing.length + columns.ready.length,
    hasData: query.data !== undefined,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
    live: realtime.live,
    newIds,
    pendingIds,
    notice,
    dismissNotice: () => setNotice(null),
    changeStatus,
    sound,
  }
}
