import type { Notice } from '../hooks'

export function ListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-2">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-2xl bg-stone-200"
        />
      ))}
    </div>
  )
}

export function LoadError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry: () => void
}) {
  return (
    <div className="space-y-3 rounded-2xl bg-white p-6 text-center shadow-sm">
      <div role="alert" className="space-y-1">
        <p className="font-semibold">Data gagal dimuat</p>
        <p className="text-sm text-stone-600">
          {error instanceof Error
            ? error.message
            : 'Terjadi kesalahan saat memuat data.'}
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

export function RefreshWarning() {
  return (
    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
      Gagal menyegarkan data. Menampilkan data terakhir.
    </p>
  )
}

type NoticeBannerProps = { notice: Notice | null; onDismiss: () => void }

export function NoticeBanner({ notice, onDismiss }: NoticeBannerProps) {
  if (!notice) return null

  const isError = notice.kind === 'error'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-start justify-between gap-3 rounded-xl p-3 text-sm ${
        isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
      }`}
    >
      <p>{notice.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Tutup pemberitahuan"
        className="shrink-0 font-medium underline"
      >
        Tutup
      </button>
    </div>
  )
}
