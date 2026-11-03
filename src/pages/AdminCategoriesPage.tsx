import { useState } from 'react'
import { deleteCategory } from '@/features/admin/api'
import {
  ListSkeleton,
  LoadError,
  NoticeBanner,
  RefreshWarning,
} from '@/features/admin/components/AdminStates'
import { CategoryFormSheet } from '@/features/admin/components/CategoryFormSheet'
import { ConfirmSheet } from '@/features/admin/components/ConfirmSheet'
import {
  useCategories,
  useConfirmAction,
  useNotice,
} from '@/features/admin/hooks'
import type { AdminCategory } from '@/features/admin/types'

type Sheet =
  { kind: 'create' } | { kind: 'edit'; category: AdminCategory } | null

export function AdminCategoriesPage() {
  const categories = useCategories()
  const { notice, success, dismiss } = useNotice()
  const [sheet, setSheet] = useState<Sheet>(null)
  const remove = useConfirmAction<AdminCategory>({
    entity: 'category',
    run: (category) => deleteCategory(category.id),
    onSuccess: (category) => success(`Kategori "${category.name}" dihapus.`),
  })

  const items = categories.data ?? []
  const nextOrder = items.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1

  return (
    <section aria-labelledby="admin-categories-title" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="admin-categories-title" className="text-lg font-bold">
          Kategori
        </h2>
        <button
          type="button"
          onClick={() => setSheet({ kind: 'create' })}
          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white active:bg-stone-700"
        >
          Tambah kategori
        </button>
      </div>

      <NoticeBanner notice={notice} onDismiss={dismiss} />

      {categories.isPending && <ListSkeleton label="Memuat kategori" />}

      {categories.isError && !categories.data && (
        <LoadError
          error={categories.error}
          onRetry={() => categories.refetch()}
        />
      )}

      {categories.isError && categories.data && <RefreshWarning />}

      {categories.data &&
        (items.length === 0 ? (
          <p className="rounded-2xl bg-white py-10 text-center text-sm text-stone-500 shadow-sm">
            Belum ada kategori.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-2xl bg-white shadow-sm">
            {items.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{category.name}</p>
                  <p className="text-xs text-stone-500">
                    {`Urutan ${category.sort_order} · ${category.menus_count ?? 0} menu`}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setSheet({ kind: 'edit', category })}
                    aria-label={`Ubah ${category.name}`}
                    className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium active:bg-stone-100"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.open(category)}
                    aria-label={`Hapus ${category.name}`}
                    className="rounded-full border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 active:bg-red-50"
                  >
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ))}

      {sheet && (
        <CategoryFormSheet
          key={sheet.kind === 'edit' ? sheet.category.id : 'new'}
          category={sheet.kind === 'edit' ? sheet.category : null}
          defaultOrder={nextOrder}
          onSaved={(text) => {
            success(text)
            setSheet(null)
          }}
          onClose={() => setSheet(null)}
        />
      )}

      {remove.target && (
        <ConfirmSheet
          title="Hapus kategori"
          message={`Hapus kategori "${remove.target.name}"? Kategori yang masih memiliki menu tidak bisa dihapus.`}
          confirmLabel="Hapus"
          busy={remove.busy}
          error={remove.error}
          onConfirm={() => void remove.confirm()}
          onClose={remove.close}
        />
      )}
    </section>
  )
}
