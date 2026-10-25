import { Link, Navigate } from 'react-router-dom'
import { areasFor } from '@/features/auth/roles'
import { useAuthStore } from '@/features/auth/store'

export function StaffHomePage() {
  const user = useAuthStore((state) => state.user)

  if (!user) return null

  const areas = areasFor(user.role)

  if (areas.length === 1) return <Navigate to={areas[0].path} replace />

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-bold">Beranda staf</h1>

      <ul className="space-y-3">
        {areas.map((area) => (
          <li key={area.path}>
            <Link
              to={area.path}
              className="block rounded-2xl border border-stone-200 bg-white p-4 active:bg-stone-50"
            >
              <span className="block font-semibold">{area.label}</span>
              <span className="block text-sm text-stone-500">
                {area.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
