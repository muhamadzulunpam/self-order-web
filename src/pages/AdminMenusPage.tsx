import { useState } from 'react'
import type { FormEvent } from 'react'
import { deleteMenu, menuValuesFrom, updateMenu } from '@/features/admin/api'
import {
  ListSkeleton,
  LoadError,
  NoticeBanner,
  RefreshWarning,
} from '@/features/admin/components/AdminStates'
import { ConfirmSheet } from '@/features/admin/components/ConfirmSheet'
import { MenuFormSheet } from '@/features/admin/components/MenuFormSheet'
import {
  useCategories,
  useConfirmAction,
  useMenus,
  useNotice,
  useRowActions,
} from '@/features/admin/hooks'
import { DEFAULT_MENU_FILTERS } from '@/features/admin/types'
import type {
  AdminMenu,
  AvailabilityFilter,
  MenuFilters,
} from '@/features/admin/types'
import { formatRupiah } from '@/lib/format'

type Sheet = { kind: 'create' } | { kind: 'edit'; menu: AdminMenu } | null

function Thumb({ menu }: { menu: AdminMenu }) {
  const [failed, setFailed] = useState(false)

  if (!menu.image_url || failed) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-[10px] text-stone-400">
        Tanpa foto
      </div>
    )
  }

  return (
    <img
      src={menu.image_url}
      alt={menu.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-16 w-16 shrink-0 rounded-xl bg-stone-100 object-cover"
    />
  )
}

export function AdminMenusPage() {
  const [filters, setFilters] = useState<MenuFilters>(DEFAULT_MENU_FILTERS)
  const [searchText, setSearchText] = useState('')
  const [sheet, setSheet] = useState<Sheet>(null)

  const menus = useMenus(filters)
  const categories = useCategories()
  const { notice, success, error: showError, dismiss } = useNotice()
  const rows = useRowActions('menu', { onSuccess: success, onError: showError })
  const remove = useConfirmAction<AdminMenu>({
    entity: 'menu',
    run: (menu) => deleteMenu(menu.id),
    onSuccess: (menu) => {
      success(`Menu "${menu.name}" dihapus.`)

      // Jika yang dihapus satu-satunya menu di halaman ini, mundur satu halaman.
      if (menus.data && menus.data.items.length === 1 && filters.page > 1) {
        setFilters((current) => ({ ...current, page: current.page - 1 }))
      }
    },
  })

  const categoryList = categories.data ?? []
  const noCategories =
    categories.data !== undefined && categories.data.length === 0
  const items = menus.data?.items ?? []
  const pageInfo = menus.data?.pageInfo
  const filtered =
    filters.search !== '' ||
    filters.categoryId !== null ||
    filters.availability !== 'all'

  function updateFilters(patch: Partial<MenuFilters>) {
    setFilters((current) => ({ ...current, ...patch, page: 1 }))
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateFilters({ search: searchText.trim() })
  }

  function toggleAvailability(menu: AdminMenu) {
    const next = !menu.is_available

    void rows.run(
      menu.id,
      () => updateMenu(menu.id, menuValuesFrom(menu, { isAvailable: next })),
      `Menu "${menu.name}" ${next ? 'diaktifkan' : 'dinonaktifkan'}.`,
    )
  }

  return (
    <section aria-labelledby="admin-menus-title" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="admin-menus-title" className="text-lg font-bold">
            Menu
          </h2>
          {pageInfo && (
            <p className="text-sm text-stone-500">{`${pageInfo.total} menu`}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSheet({ kind: 'create' })}
          disabled={categories.data === undefined || noCategories}
          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white active:bg-stone-700 disabled:bg-stone-300"
        >
          Tambah menu
        </button>
      </div>

      {noCategories && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Belum ada kategori. Buat kategori terlebih dahulu di tab Kategori.
        </p>
      )}

      <NoticeBanner notice={notice} onDismiss={dismiss} />

      <div className="grid gap-3 rounded-2xl bg-white p-3 shadow-sm sm:grid-cols-[1fr_auto_auto]">
        <form
          role="search"
          aria-label="Pencarian menu"
          onSubmit={handleSearch}
          className="flex gap-2"
        >
          <input
            type="search"
            aria-label="Cari menu"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Cari nama menu"
            className="min-w-0 flex-1 rounded-xl border border-stone-300 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-stone-900 px-4 text-sm font-medium text-white active:bg-stone-700"
          >
            Cari
          </button>
        </form>

        <select
          aria-label="Filter kategori"
          value={filters.categoryId === null ? '' : String(filters.categoryId)}
          onChange={(event) =>
            updateFilters({
              categoryId:
                event.target.value === '' ? null : Number(event.target.value),
            })
          }
          className="rounded-xl border border-stone-300 p-2.5 text-sm"
        >
          <option value="">Semua kategori</option>
          {categoryList.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter ketersediaan"
          value={filters.availability}
          onChange={(event) =>
            updateFilters({
              availability: event.target.value as AvailabilityFilter,
            })
          }
          className="rounded-xl border border-stone-300 p-2.5 text-sm"
        >
          <option value="all">Semua status</option>
          <option value="available">Tersedia</option>
          <option value="unavailable">Habis</option>
        </select>
      </div>

      {menus.isPending && <ListSkeleton label="Memuat menu" />}

      {menus.isError && !menus.data && (
        <LoadError error={menus.error} onRetry={() => menus.refetch()} />
      )}

      {menus.isError && menus.data && <RefreshWarning />}

      {menus.data &&
        (items.length === 0 ? (
          <p className="rounded-2xl bg-white py-10 text-center text-sm text-stone-500 shadow-sm">
            {filtered
              ? 'Tidak ada menu yang cocok dengan filter.'
              : 'Belum ada menu.'}
          </p>
        ) : (
          <ul
            aria-busy={menus.isPlaceholderData}
            className="divide-y divide-stone-100 rounded-2xl bg-white shadow-sm"
          >
            {items.map((menu) => (
              <li key={menu.id} className="flex items-center gap-3 p-3">
                <Thumb menu={menu} />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{menu.name}</p>
                  <p className="text-sm text-stone-500">
                    {`${menu.category.name} · ${formatRupiah(menu.price)}`}
                  </p>
                  {menu.has_spice_level && (
                    <span className="mt-1 inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                      Ada level pedas
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={menu.is_available}
                    aria-label={`Tersedia: ${menu.name}`}
                    disabled={rows.pendingIds.has(menu.id)}
                    onClick={() => toggleAvailability(menu)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-40 ${
                      menu.is_available
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {menu.is_available ? 'Tersedia' : 'Habis'}
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSheet({ kind: 'edit', menu })}
                      aria-label={`Ubah ${menu.name}`}
                      className="rounded-full border border-stone-300 px-3 py-1 text-xs font-medium active:bg-stone-100"
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => remove.open(menu)}
                      aria-label={`Hapus ${menu.name}`}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700 active:bg-red-50"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ))}

      {pageInfo && pageInfo.lastPage > 1 && (
        <nav
          aria-label="Halaman menu"
          className="flex items-center justify-between gap-3"
        >
          <button
            type="button"
            disabled={filters.page <= 1}
            onClick={() =>
              setFilters((current) => ({ ...current, page: current.page - 1 }))
            }
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium active:bg-stone-100 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-stone-500">
            {`Halaman ${pageInfo.page} dari ${pageInfo.lastPage}`}
          </span>
          <button
            type="button"
            disabled={filters.page >= pageInfo.lastPage}
            onClick={() =>
              setFilters((current) => ({ ...current, page: current.page + 1 }))
            }
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium active:bg-stone-100 disabled:opacity-40"
          >
            Berikutnya
          </button>
        </nav>
      )}

      {sheet && (
        <MenuFormSheet
          key={sheet.kind === 'edit' ? sheet.menu.id : 'new'}
          menu={sheet.kind === 'edit' ? sheet.menu : null}
          categories={categoryList}
          onSaved={(text) => {
            success(text)
            setSheet(null)
          }}
          onClose={() => setSheet(null)}
        />
      )}

      {remove.target && (
        <ConfirmSheet
          title="Hapus menu"
          message={`Hapus menu "${remove.target.name}"? Menu yang sudah pernah dipesan tidak bisa dihapus, nonaktifkan saja.`}
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
