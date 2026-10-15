import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Self-Order</h1>
      <p className="text-stone-600">
        Scan QR code di meja Anda untuk mulai memesan.
      </p>
      <Link to="/staff/login" className="text-sm text-stone-500 underline">
        Masuk sebagai staf
      </Link>
    </main>
  )
}
