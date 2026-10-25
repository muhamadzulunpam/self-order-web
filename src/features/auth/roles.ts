import type { Role } from './types'

export const ROLES: readonly Role[] = ['admin', 'cashier', 'kitchen']

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  cashier: 'Kasir',
  kitchen: 'Dapur',
}

export function isRole(value: unknown): value is Role {
  return (
    typeof value === 'string' && (ROLES as readonly string[]).includes(value)
  )
}

export const KITCHEN_ROLES: readonly Role[] = ['kitchen', 'admin']
export const CASHIER_ROLES: readonly Role[] = ['cashier', 'admin']
export const ADMIN_ROLES: readonly Role[] = ['admin']

export type StaffArea = {
  path: string
  label: string
  description: string
  roles: readonly Role[]
}

export const STAFF_AREAS: readonly StaffArea[] = [
  {
    path: '/staff/kitchen',
    label: 'Layar dapur',
    description: 'Pesanan masuk dan proses memasak.',
    roles: KITCHEN_ROLES,
  },
  {
    path: '/staff/cashier',
    label: 'Layar kasir',
    description: 'Serahkan pesanan yang sudah siap.',
    roles: CASHIER_ROLES,
  },
  {
    path: '/staff/admin',
    label: 'Panel admin',
    description: 'Kelola kategori, menu, dan meja.',
    roles: ADMIN_ROLES,
  },
]

export function areasFor(role: Role): StaffArea[] {
  return STAFF_AREAS.filter((area) => area.roles.includes(role))
}

/** Role dengan satu area langsung ke area itu. Admin (banyak area) ke beranda staf. */
export function homePathFor(role: Role): string {
  const areas = areasFor(role)

  return areas.length === 1 ? areas[0].path : '/staff'
}

export function canAccessPath(role: Role, pathname: string): boolean {
  if (pathname === '/staff') return true

  const area = STAFF_AREAS.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  )

  return area ? area.roles.includes(role) : false
}

/** Hanya menerima jalur internal di bawah /staff yang boleh diakses role tersebut. */
export function safeRedirectPath(from: unknown, role: Role): string {
  if (typeof from === 'string') {
    const pathname = from.split(/[?#]/)[0]

    if (canAccessPath(role, pathname)) return from
  }

  return homePathFor(role)
}
