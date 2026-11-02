import { ApiError } from '@/lib/api'

export function LiveIndicator({ live }: { live: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-stone-500">
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${
          live ? 'bg-emerald-500' : 'bg-stone-300'
        }`}
      />
      {live
        ? 'Pembaruan langsung aktif'
        : 'Pesanan diperiksa otomatis setiap beberapa detik'}
    </span>
  )
}

type SoundSwitchProps = {
  label: string
  enabled: boolean
  onToggle: () => void
}

export function SoundSwitch({ label, enabled, onToggle }: SoundSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className="flex items-center gap-2 rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium active:bg-stone-100"
    >
      {label}
      <span
        aria-hidden="true"
        className={`rounded-full px-2 py-0.5 text-xs ${
          enabled
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-stone-200 text-stone-600'
        }`}
      >
        {enabled ? 'Aktif' : 'Mati'}
      </span>
    </button>
  )
}

type RefreshButtonProps = { onRefresh: () => void; busy: boolean }

export function RefreshButton({ onRefresh, busy }: RefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={busy}
      className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium active:bg-stone-100 disabled:opacity-40"
    >
      Segarkan
    </button>
  )
}

type NoticesProps = {
  soundBlocked: boolean
  notice: string | null
  onDismissNotice: () => void
  /** True jika penyegaran gagal padahal data lama masih ditampilkan. */
  refreshFailed: boolean
}

export function StationNotices({
  soundBlocked,
  notice,
  onDismissNotice,
  refreshFailed,
}: NoticesProps) {
  return (
    <>
      {soundBlocked && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          Suara belum aktif karena browser memblokirnya. Ketuk layar sekali
          untuk mengaktifkannya.
        </p>
      )}

      {notice && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          <p>{notice}</p>
          <button
            type="button"
            onClick={onDismissNotice}
            className="shrink-0 font-medium underline"
          >
            Tutup
          </button>
        </div>
      )}

      {refreshFailed && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Gagal menyegarkan daftar pesanan. Menampilkan data terakhir.
        </p>
      )}
    </>
  )
}

type LoadErrorProps = { error: unknown; onRetry: () => void }

export function BoardLoadError({ error, onRetry }: LoadErrorProps) {
  return (
    <div className="mx-auto max-w-md space-y-4 py-10 text-center">
      <div role="alert" className="space-y-2">
        <h2 className="text-lg font-bold">Pesanan gagal dimuat</h2>
        <p className="text-stone-600">
          {error instanceof ApiError
            ? error.message
            : 'Terjadi kesalahan saat memuat pesanan.'}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white active:bg-stone-700"
      >
        Coba lagi
      </button>
    </div>
  )
}
