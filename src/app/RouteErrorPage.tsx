import { useEffect } from 'react'
import { Link, useRouteError } from 'react-router-dom'
import { isChunkError } from './routeError'

export function RouteErrorPage() {
  const error = useRouteError()
  const outdated = isChunkError(error)

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <div role="alert" className="space-y-2">
        <h1 className="text-xl font-bold">
          {outdated ? 'Aplikasi baru saja diperbarui' : 'Terjadi kesalahan'}
        </h1>
        <p className="text-stone-600">
          {outdated
            ? 'Muat ulang halaman untuk memakai versi terbaru.'
            : 'Halaman gagal ditampilkan. Coba muat ulang. Jika masalah berlanjut, hubungi staf.'}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white active:bg-stone-700"
        >
          Muat ulang
        </button>
        <Link
          to="/"
          className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium active:bg-stone-100"
        >
          Ke beranda
        </Link>
      </div>
    </main>
  )
}
