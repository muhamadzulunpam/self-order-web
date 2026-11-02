// src/pages/KitchenPage.tsx
import { COLUMNS } from '@/features/kitchen/boardLogic'
import { BoardColumn } from '@/features/kitchen/components/BoardColumn'
import { useKitchenBoard } from '@/features/kitchen/useKitchenBoard'
import {
  BoardLoadError,
  LiveIndicator,
  RefreshButton,
  SoundSwitch,
  StationNotices,
} from '@/features/staff/components/StationParts'
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
          <LiveIndicator live={board.live} />
          <SoundSwitch
            label="Suara pesanan baru"
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

      {!board.hasData && board.isPending && <BoardSkeleton />}

      {!board.hasData && board.isError && (
        <BoardLoadError error={board.error} onRetry={() => board.refetch()} />
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
