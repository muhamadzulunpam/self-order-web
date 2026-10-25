import { Link } from 'react-router-dom'
import { ROLE_LABEL, homePathFor } from '../roles'
import type { Role } from '../types'

export function SessionLoading() {
  return (
    <main
      role="status"
      aria-label="Memeriksa sesi"
      className="flex min-h-screen items-center justify-center p-6 text-stone-500"
    >
      Memeriksa sesi…
    </main>
  )
}

export function SessionError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <div role="alert" className="space-y-2">
        <h1 className="text-xl font-bold">Sesi belum bisa diverifikasi</h1>
        <p className="text-stone-600">
          Periksa koneksi internet Anda, lalu coba lagi. Anda tidak keluar dari
          akun.
        </p>
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

export function ForbiddenState({ role }: { role: Role }) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-3 p-6 pt-16 text-center">
      <h1 className="text-xl font-bold">Akses ditolak</h1>
      <p className="text-stone-600">
        Akun Anda ({ROLE_LABEL[role]}) tidak memiliki akses ke halaman ini.
      </p>
      <Link to={homePathFor(role)} className="text-stone-600 underline">
        Ke halaman saya
      </Link>
    </main>
  )
}
