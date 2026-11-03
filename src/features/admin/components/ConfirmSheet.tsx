import { BottomSheet } from '@/components/BottomSheet'

type Props = {
  title: string
  message: string
  confirmLabel: string
  busy: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  busy,
  error,
  onConfirm,
  onClose,
}: Props) {
  return (
    <BottomSheet
      title={title}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <div className="space-y-4">
        <p className="text-sm text-stone-700">{message}</p>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-stone-300 py-3 text-sm font-medium active:bg-stone-100 disabled:opacity-40"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl bg-red-600 py-3 text-sm font-medium text-white active:bg-red-700 disabled:bg-stone-300"
          >
            {busy ? 'Memproses…' : confirmLabel}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
