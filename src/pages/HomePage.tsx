// src/pages/HomePage.tsx
import { Link } from 'react-router-dom'

const STEPS = [
  'Pindai QR code di meja Anda.',
  'Pilih menu dan level pedasnya.',
  'Bayar online lewat Midtrans.',
  'Pantau pesanan sampai siap diantar.',
]

export function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Self-Order</h1>
        <p className="text-stone-600">
          Scan QR code di meja Anda untuk mulai memesan.
        </p>
      </header>

      <ol className="space-y-3 rounded-2xl bg-white p-4 text-sm shadow-sm">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white"
            >
              {index + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      <Link
        to="/staff/login"
        className="text-center text-sm text-stone-500 underline"
      >
        Masuk sebagai staf
      </Link>
    </main>
  )
}
