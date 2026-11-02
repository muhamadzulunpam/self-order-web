// src/features/staff/useStaffBoard.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchStaffOrders, updateOrderStatus } from '@/features/kitchen/api'
import {
  applyTouched,
  isAdvance,
  isOnBoard,
  isStale,
  upsertOrder,
} from '@/features/kitchen/boardLogic'
import type { BoardStatus, StatusTarget } from '@/features/kitchen/boardLogic'
import { describeStatusError } from '@/features/kitchen/errors'
import { useStaffRealtime } from '@/features/kitchen/useStaffRealtime'
import { staffKeys } from '@/lib/queryKeys'
import { shouldRetry } from '@/lib/retry'
import type { OrderStatus, StaffOrder } from '@/types/order'
import { addRecent } from './recentLogic'
import type { RecentDone } from './recentLogic'

/** Saat real-time aktif, polling hanya jaring pengaman. Saat tidak aktif, layar tetap terasa langsung. */
const POLL_SAFETY_MS = 60_000
const POLL_FAST_MS = 8_000
const NEW_BADGE_MS = 15_000
const EMPTY: StaffOrder[] = []

type Options = {
  /** Status yang dianggap "kedatangan baru": memicu penanda Baru dan bunyi (dapur: paid, kasir: ready). */
  watch: BoardStatus
  notify: () => void
  /** Catat pesanan yang selesai selama layar terbuka (untuk daftar "Baru selesai"). */
  keepRecent?: boolean
}

export function useStaffBoard({ watch, notify, keepRecent = false }: Options) {
  const queryClient = useQueryClient()

  // Kabar yang masuk selama fetch berjalan, diterapkan ulang di atas hasil fetch.
  const touched = useRef(new Map<number, StaffOrder>())
  // Status terakhir yang terlihat per pesanan. null sampai muatan pertama selesai (muatan awal tidak berbunyi).
  const seen = useRef<Map<number, OrderStatus> | null>(null)
  const inFlight = useRef(new Set<number>())

  const [newIds, setNewIds] = useState<ReadonlySet<number>>(() => new Set())
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  )
  const [notice, setNotice] = useState<string | null>(null)
  const [recent, setRecent] = useState<RecentDone[]>([])

  const registerArrivals = useCallback(
    (orders: readonly StaffOrder[]) => {
      const statuses = seen.current

      if (statuses === null) return

      const arrived: StaffOrder[] = []

      for (const order of orders) {
        if (!isAdvance(statuses.get(order.id), order.status)) continue

        statuses.set(order.id, order.status)

        if (order.status === watch) arrived.push(order)
      }

      if (arrived.length === 0) return

      setNewIds(
        (previous) =>
          new Set([...previous, ...arrived.map((order) => order.id)]),
      )
      notify()
    },
    [notify, watch],
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

      if (isOnBoard(order.status)) {
        registerArrivals([order])
      } else if (keepRecent && order.status === 'completed') {
        setRecent((list) => addRecent(list, order, Date.now()))
      }
    },
    [queryClient, registerArrivals, keepRecent],
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

      if (seen.current === null) {
        seen.current = new Map(
          board.map((order): [number, OrderStatus] => [order.id, order.status]),
        )
      } else {
        registerArrivals(board)
      }

      return board
    },
    retry: shouldRetry,
    refetchOnWindowFocus: true,
    // Layar staf sering berada di tab latar belakang: polling tidak boleh berhenti.
    refetchIntervalInBackground: true,
    refetchInterval: realtime.live ? POLL_SAFETY_MS : POLL_FAST_MS,
  })

  useEffect(() => {
    if (newIds.size === 0) return

    const timer = setTimeout(() => setNewIds(new Set()), NEW_BADGE_MS)

    return () => clearTimeout(timer)
  }, [newIds])

  const changeStatus = useCallback(
    async (order: StaffOrder, target: StatusTarget) => {
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

  return {
    orders: query.data ?? EMPTY,
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
    recent,
  }
}
