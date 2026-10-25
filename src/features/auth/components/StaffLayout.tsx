import { Link, Outlet } from 'react-router-dom'
import { ROLE_LABEL, homePathFor } from '../roles'
import { useAuthStore } from '../store'

export function StaffLayout() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  if (!user) return null

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to={homePathFor(user.role)} className="font-bold">
            Self-Order · Staf
          </Link>

          <div className="flex items-center gap-3">
            <div className="text-right text-sm leading-tight">
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-stone-500">{ROLE_LABEL[user.role]}</p>
            </div>

            <button
              type="button"
              onClick={() => logout()}
              className="rounded-full border border-stone-300 px-3.5 py-1.5 text-sm font-medium active:bg-stone-100"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  )
}
