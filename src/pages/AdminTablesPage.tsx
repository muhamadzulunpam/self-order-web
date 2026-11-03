import { useState } from 'react'
import {
  deleteTable,
  regenerateTableToken,
  updateTable,
} from '@/features/admin/api'
import {
  ListSkeleton,
  LoadError,
  NoticeBanner,
  RefreshWarning,
} from '@/features/admin/components/AdminStates'
import { ConfirmSheet } from '@/features/admin/components/ConfirmSheet'
import { TableFormSheet } from '@/features/admin/components/TableFormSheet'
import { TableQrSheet } from '@/features/admin/components/TableQrSheet'
import {
  useConfirmAction,
  useNotice,
  useRowActions,
  useTables,
} from '@/features/admin/hooks'
import type { AdminTable } from '@/features/admin/types'

type Sheet =
  | { kind: 'create' }
  | { kind: 'edit'; table: AdminTable }
  | { kind: 'qr'; table: AdminTable }
  | null

const smallButton =
  'rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium active:bg-stone-100 disabled:opacity-40'

export function AdminTablesPage() {
  const tables = useTables()
  const { notice, success, error: showError, dismiss } = useNotice()
  const [sheet, setSheet] = useState<Sheet>(null)
  const rows = useRowActions('table', {
    onSuccess: success,
    onError: showError,
  })
  const remove = useConfirmAction<AdminTable>({
    entity: 'table',
    run: (table) => deleteTable(table.id),
    onSuccess: (table) => success(`Meja ${table.number} dihapus.`),
  })
  const regenerate = useConfirmAction<AdminTable>({
    entity: 'table',
    run: (table) => regenerateTableToken(table.id),
    onSuccess: (table) =>
      success(
        `Token meja ${table.number} dibuat ulang. Unduh dan cetak QR code yang baru.`,
      ),
  })

  const items = tables.data ?? []

  function toggleActive(table: AdminTable) {
    const next = !table.is_active

    void rows.run(
      table.id,
      () => updateTable(table.id, { number: table.number, isActive: next }),
      `Meja ${table.number} ${next ? 'diaktifkan' : 'dinonaktifkan'}.`,
    )
  }

  return (
    <section aria-labelledby="admin-tables-title" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="admin-tables-title" className="text-lg font-bold">
          Meja
        </h2>
        <button
          type="button"
          onClick={() => setSheet({ kind: 'create' })}
          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white active:bg-stone-700"
        >
          Tambah meja
        </button>
      </div>

      <NoticeBanner notice={notice} onDismiss={dismiss} />

      {tables.isPending && <ListSkeleton label="Memuat meja" />}

      {tables.isError && !tables.data && (
        <LoadError error={tables.error} onRetry={() => tables.refetch()} />
      )}

      {tables.isError && tables.data && <RefreshWarning />}

      {tables.data &&
        (items.length === 0 ? (
          <p className="rounded-2xl bg-white py-10 text-center text-sm text-stone-500 shadow-sm">
            Belum ada meja.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {items.map((table) => (
              <li
                key={table.id}
                className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">{`Meja ${table.number}`}</p>
                    <p className="text-xs text-stone-500">
                      {`${table.orders_count ?? 0} pesanan`}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      table.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {table.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSheet({ kind: 'qr', table })}
                    aria-label={`Lihat QR meja ${table.number}`}
                    className={smallButton}
                  >
                    Lihat QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheet({ kind: 'edit', table })}
                    aria-label={`Ubah meja ${table.number}`}
                    className={smallButton}
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(table)}
                    disabled={rows.pendingIds.has(table.id)}
                    aria-label={`${table.is_active ? 'Nonaktifkan' : 'Aktifkan'} meja ${table.number}`}
                    className={smallButton}
                  >
                    {table.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => regenerate.open(table)}
                    aria-label={`Buat ulang token meja ${table.number}`}
                    className={smallButton}
                  >
                    Buat ulang token
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.open(table)}
                    aria-label={`Hapus meja ${table.number}`}
                    className="rounded-full border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 active:bg-red-50"
                  >
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ))}

      {sheet?.kind === 'qr' && (
        <TableQrSheet table={sheet.table} onClose={() => setSheet(null)} />
      )}

      {(sheet?.kind === 'create' || sheet?.kind === 'edit') && (
        <TableFormSheet
          key={sheet.kind === 'edit' ? sheet.table.id : 'new'}
          table={sheet.kind === 'edit' ? sheet.table : null}
          onSaved={(text) => {
            success(text)
            setSheet(null)
          }}
          onClose={() => setSheet(null)}
        />
      )}

      {remove.target && (
        <ConfirmSheet
          title="Hapus meja"
          message={`Hapus meja ${remove.target.number}? Meja yang sudah memiliki riwayat pesanan tidak bisa dihapus, nonaktifkan saja.`}
          confirmLabel="Hapus"
          busy={remove.busy}
          error={remove.error}
          onConfirm={() => void remove.confirm()}
          onClose={remove.close}
        />
      )}

      {regenerate.target && (
        <ConfirmSheet
          title="Buat ulang token QR"
          message={`QR code lama meja ${regenerate.target.number} langsung tidak berlaku setelah ini. Cetak ulang QR code yang baru dan tempel di meja. Lanjutkan?`}
          confirmLabel="Buat ulang"
          busy={regenerate.busy}
          error={regenerate.error}
          onConfirm={() => void regenerate.confirm()}
          onClose={regenerate.close}
        />
      )}
    </section>
  )
}
