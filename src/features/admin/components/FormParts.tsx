export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null

  return (
    <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
      {error}
    </p>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
      {message}
    </p>
  )
}

type SubmitButtonsProps = {
  busy: boolean
  disabled?: boolean
  onCancel: () => void
}

export function SubmitButtons({
  busy,
  disabled = false,
  onCancel,
}: SubmitButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="rounded-xl border border-stone-300 py-3 text-sm font-medium active:bg-stone-100 disabled:opacity-40"
      >
        Batal
      </button>
      <button
        type="submit"
        disabled={busy || disabled}
        className="rounded-xl bg-stone-900 py-3 text-sm font-medium text-white active:bg-stone-700 disabled:bg-stone-300"
      >
        {busy ? 'Menyimpan…' : 'Simpan'}
      </button>
    </div>
  )
}
