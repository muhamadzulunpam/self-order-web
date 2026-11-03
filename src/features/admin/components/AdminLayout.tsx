import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/staff/admin/menus', label: 'Menu' },
  { to: '/staff/admin/categories', label: 'Kategori' },
  { to: '/staff/admin/tables', label: 'Meja' },
]

export function AdminLayout() {
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <h1 className="text-xl font-bold">Panel Admin</h1>

      <nav aria-label="Menu admin" className="flex gap-2 overflow-x-auto">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-700 active:bg-stone-100'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </main>
  )
}
