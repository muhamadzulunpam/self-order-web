import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { adminKeys } from '@/lib/queryKeys'
import { shouldRetry } from '@/lib/retry'
import { fetchCategories, fetchMenus, fetchTables } from './api'
import { describeAdminError } from './errors'
import type { Entity } from './errors'
import type { MenuFilters } from './types'

export function invalidateAdmin(client: QueryClient) {
  return client.invalidateQueries({ queryKey: adminKeys.all })
}

export function useCategories() {
  return useQuery({
    queryKey: adminKeys.categories,
    queryFn: fetchCategories,
    retry: shouldRetry,
  })
}

export function useTables() {
  return useQuery({
    queryKey: adminKeys.tables,
    queryFn: fetchTables,
    retry: shouldRetry,
  })
}

export function useMenus(filters: MenuFilters) {
  return useQuery({
    queryKey: [...adminKeys.menus, filters],
    queryFn: () => fetchMenus(filters),
    retry: shouldRetry,
    placeholderData: keepPreviousData,
  })
}

export type Notice = { kind: 'success' | 'error'; text: string }

export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null)
  const success = useCallback(
    (text: string) => setNotice({ kind: 'success', text }),
    [],
  )
  const error = useCallback(
    (text: string) => setNotice({ kind: 'error', text }),
    [],
  )
  const dismiss = useCallback(() => setNotice(null), [])

  return { notice, success, error, dismiss }
}

type ConfirmOptions<T> = {
  entity: Entity
  run: (item: T) => Promise<unknown>
  onSuccess: (item: T) => void
}

/** Aksi yang harus dikonfirmasi (hapus, buat ulang token): satu aksi per waktu, error tampil di lembar konfirmasi. */
export function useConfirmAction<T>({
  entity,
  run,
  onSuccess,
}: ConfirmOptions<T>) {
  const queryClient = useQueryClient()
  const [target, setTarget] = useState<T | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)

  const open = useCallback((item: T) => {
    setError(null)
    setTarget(item)
  }, [])

  const close = useCallback(() => {
    if (!busyRef.current) setTarget(null)
  }, [])

  const confirm = useCallback(async () => {
    if (target === null || busyRef.current) return

    busyRef.current = true
    setBusy(true)
    setError(null)

    try {
      await run(target)
      void invalidateAdmin(queryClient)
      setTarget(null)
      onSuccess(target)
    } catch (err) {
      const failure = describeAdminError(err, entity)

      setError(failure.message)

      if (failure.refresh) void invalidateAdmin(queryClient)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [target, run, onSuccess, entity, queryClient])

  return { target, busy, error, open, close, confirm }
}

type RowActionOptions = {
  onSuccess: (text: string) => void
  onError: (text: string) => void
}

/** Aksi langsung per baris (toggle): dikunci per id selama diproses, hasilnya jadi pemberitahuan di halaman. */
export function useRowActions(
  entity: Entity,
  { onSuccess, onError }: RowActionOptions,
) {
  const queryClient = useQueryClient()
  const inFlight = useRef(new Set<number>())
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  )

  const run = useCallback(
    async (id: number, action: () => Promise<unknown>, successText: string) => {
      if (inFlight.current.has(id)) return

      inFlight.current.add(id)
      setPendingIds(new Set(inFlight.current))

      try {
        await action()
        void invalidateAdmin(queryClient)
        onSuccess(successText)
      } catch (err) {
        const failure = describeAdminError(err, entity)

        onError(failure.message)

        if (failure.refresh) void invalidateAdmin(queryClient)
      } finally {
        inFlight.current.delete(id)
        setPendingIds(new Set(inFlight.current))
      }
    },
    [entity, onError, onSuccess, queryClient],
  )

  return { pendingIds, run }
}
