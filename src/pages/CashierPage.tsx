// src/pages/CashierPage.tsx
import { CashierOrderCard } from '@/features/cashier/components/CashierOrderCard'
import { ProcessingList } from '@/features/cashier/components/ProcessingList'
import { RecentList } from '@/features/cashier/components/RecentList'
import { useCashierBoard } from '@/features/cashier/useCashierBoard'
import {
  BoardLoadError,
  LiveIndicator,
  RefreshButton,
  SoundSwitch,
  StationNotices,
} from '@/features/staff/components/StationParts'
import { useNow } from '@/lib/useNow'

function CashierSkeleton() {
  return (
    <div role="status" aria-label="Memuat pesanan" className="space-y-4">
      <div className="h-6 w-40 animate-pulse rounded bg-stone-200" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-48 animate-pulse rounded-2xl bg-stone-200" />
        <div className="h-48 animate-pulse rounded-2xl bg-stone-200" />
      </div>
      <div className="h-24 animate-pulse rounded-2xl bg-stone-200" />
    </div>
  )
}

export function CashierPage() {
  const board = useCashierBoard()
  const now = useNow()

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Layar Kasir</h1>
          {board.hasData && (
            <p className="text-sm text-stone-500">
              {board.ready.length} siap diserahkan · {board.processing.length}{' '}
              sedang diproses
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LiveIndicator live={board.live} />
          <SoundSwitch
            label="Suara pesanan siap"
            enabled={board.sound.enabled}
            onToggle={board.sound.toggle}
          />
          <RefreshButton
            onRefresh={() => board.refetch()}
            busy={board.isFetching}
          />
        </div>
      </header>

      <StationNotices
        soundBlocked={board.sound.blocked}
        notice={board.notice}
        onDismissNotice={board.dismissNotice}
        refreshFailed={board.isError && board.hasData}
      />

      {!board.hasData && board.isPending && <CashierSkeleton />}

      {!board.hasData && board.isError && (
        <BoardLoadError error={board.error} onRetry={() => board.refetch()} />
      )}

      {board.hasData && (
        <>
          <section aria-labelledby="cashier-ready-title" className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 id="cashier-ready-title" className="text-lg font-bold">
                Siap diserahkan
              </h2>
              <span
                aria-label={`${board.ready.length} pesanan`}
                className="rounded-full bg-stone-100 px-2.5 py-0.5 text-sm font-semibold"
              >
                {board.ready.length}
              </span>
            </div>

            {board.ready.length === 0 ? (
              <p className="rounded-2xl bg-stone-100 py-8 text-center text-sm text-stone-500">
                Belum ada pesanan yang siap diserahkan.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {board.ready.map((order) => (
                  <CashierOrderCard
                    key={order.id}
                    order={order}
                    isNew={board.newIds.has(order.id)}
                    pending={board.pendingIds.has(order.id)}
                    now={now}
                    onComplete={() =>
                      void board.changeStatus(order, 'completed')
                    }
                  />
                ))}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="cashier-processing-title"
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <h2 id="cashier-processing-title" className="text-lg font-bold">
                Sedang diproses
              </h2>
              <span
                aria-label={`${board.processing.length} pesanan`}
                className="rounded-full bg-stone-100 px-2.5 py-0.5 text-sm font-semibold"
              >
                {board.processing.length}
              </span>
            </div>

            {board.processing.length === 0 ? (
              <p className="rounded-2xl bg-stone-100 py-6 text-center text-sm text-stone-500">
                Tidak ada pesanan yang sedang diproses.
              </p>
            ) : (
              <ProcessingList orders={board.processing} now={now} />
            )}
          </section>

          <section aria-labelledby="cashier-recent-title" className="space-y-3">
            <div>
              <h2 id="cashier-recent-title" className="text-lg font-bold">
                Baru selesai
              </h2>
              <p className="text-xs text-stone-500">
                Pesanan yang diselesaikan selama layar ini terbuka.
              </p>
            </div>

            {board.recent.length === 0 ? (
              <p className="rounded-2xl bg-stone-100 py-6 text-center text-sm text-stone-500">
                Belum ada pesanan yang diselesaikan.
              </p>
            ) : (
              <RecentList items={board.recent} now={now} />
            )}
          </section>
        </>
      )}
    </main>
  )
}
