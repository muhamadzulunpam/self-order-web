import { formatRupiah } from '@/lib/format'

type Props = {
  count: number
  total: number
  onOpen: () => void
}

export function CartBar({ count, total, onOpen }: Props) {
  if (count === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Lihat pesanan, ${count} item, ${formatRupiah(total)}`}
        className="mx-auto flex w-full max-w-md items-center justify-between rounded-2xl bg-stone-900 px-4 py-3.5 text-white shadow-lg active:bg-stone-700"
      >
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-sm font-semibold">
            {count}
          </span>
          <span className="font-medium">Lihat pesanan</span>
        </span>
        <span className="font-semibold">{formatRupiah(total)}</span>
      </button>
    </div>
  )
}
