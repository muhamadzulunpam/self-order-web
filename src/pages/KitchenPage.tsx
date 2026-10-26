import { COLUMNS } from '@/features/kitchen/boardLogic'
import { BoardColumn } from '@/features/kitchen/components/BoardColumn'
import { useKitchenBoard } from '@/features/kitchen/useKitchenBoard'
import { ApiError } from '@/lib/api'
import { useNow } from '@/lib/useNow'

function BoardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Memuat pesanan"
      className="grid gap-4 md:grid-cols-3"
    >
      {COLUMNS.map((column) => (
        <div
          key={column.status}
          className="space-y-3 rounded-3xl bg-stone-100 p-3"
        >
          <div className="h-5 w-24 animate-pulse rounded bg-stone-200" />
          <div className="h-32 animate-pulse rounded-2xl bg-stone-200" />
          <div className="h-32 animate-pulse rounded-2xl bg-stone-200" />
        </div>
      ))}
    </div>
  )
}

export function KitchenPage() {
  const board = useKitchenBoard()
  const now = useNow()

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Layar Dapur</h1>
          {board.hasData && (
            <p className="text-sm text-stone-500">
              {board.total} pesanan aktif
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-stone-500">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${
                board.live ? 'bg-emerald-500' : 'bg-stone-300'
              }`}
            />
            {board.live
              ? 'Pembaruan langsung aktif'
              : 'Pesanan diperiksa otomatis setiap beberapa detik'}
          </span>

          <button
            type="button"
            role="switch"
            aria-checked={board.sound.enabled}
            onClick={board.sound.toggle}
            className="flex items-center gap-2 rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium active:bg-stone-100"
          >
            Suara pesanan baru
            <span
              aria-hidden="true"
              className={`rounded-full px-2 py-0.5 text-xs ${
                board.sound.enabled
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {board.sound.enabled ? 'Aktif' : 'Mati'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => board.refetch()}
            disabled={board.isFetching}
            className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium active:bg-stone-100 disabled:opacity-40"
          >
            Segarkan
          </button>
        </div>
      </header>

      {board.sound.blocked && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          Suara belum aktif karena browser memblokirnya. Ketuk layar sekali
          untuk mengaktifkannya.
        </p>
      )}

      {board.notice && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          <p>{board.notice}</p>
          <button
            type="button"
            onClick={board.dismissNotice}
            className="shrink-0 font-medium underline"
          >
            Tutup
          </button>
        </div>
      )}

      {board.isError && board.hasData && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Gagal menyegarkan daftar pesanan. Menampilkan data terakhir.
        </p>
      )}

      {!board.hasData && board.isPending && <BoardSkeleton />}

      {!board.hasData && board.isError && (
        <div className="mx-auto max-w-md space-y-4 py-10 text-center">
          <div role="alert" className="space-y-2">
            <h2 className="text-lg font-bold">Pesanan gagal dimuat</h2>
            <p className="text-stone-600">
              {board.error instanceof ApiError
                ? board.error.message
                : 'Terjadi kesalahan saat memuat pesanan.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => board.refetch()}
            className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white active:bg-stone-700"
          >
            Coba lagi
          </button>
        </div>
      )}

      {board.hasData && (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((column) => (
            <BoardColumn
              key={column.status}
              column={column}
              orders={board.columns[column.status]}
              newIds={board.newIds}
              pendingIds={board.pendingIds}
              now={now}
              onAction={(order, target) =>
                void board.changeStatus(order, target)
              }
            />
          ))}
        </div>
      )}
    </main>
  )
}
