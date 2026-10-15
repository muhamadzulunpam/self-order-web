export function InvalidTableState() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-bold">Meja tidak ditemukan</h1>
      <p className="text-stone-600">
        QR code ini tidak valid atau meja sedang tidak aktif. Silakan pindai
        ulang QR code di meja Anda, atau minta bantuan staf.
      </p>
    </main>
  )
}

type MenuErrorStateProps = {
  message: string
  onRetry: () => void
}

export function MenuErrorState({ message, onRetry }: MenuErrorStateProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <div role="alert" className="space-y-2">
        <h1 className="text-xl font-bold">Menu gagal dimuat</h1>
        <p className="text-stone-600">{message}</p>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white active:bg-stone-700"
      >
        Coba lagi
      </button>
    </main>
  )
}
