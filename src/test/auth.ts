import { useAuthStore } from '@/features/auth/store'
import type { Role, User } from '@/features/auth/types'

const NAMES: Record<Role, string> = {
  admin: 'Sari Admin',
  cashier: 'Rani Kasir',
  kitchen: 'Budi Dapur',
}

export function makeUser(
  role: Role = 'kitchen',
  overrides: Partial<User> = {},
): User {
  return {
    id: 1,
    name: NAMES[role],
    email: `${role}@example.com`,
    role,
    ...overrides,
  }
}

/** Menandai pengguna sudah login (token: "test-token"). */
export function signIn(
  role: Role = 'kitchen',
  overrides: Partial<User> = {},
): User {
  const user = makeUser(role, overrides)

  useAuthStore.setState({
    token: 'test-token',
    user,
    status: 'authenticated',
    endReason: null,
  })

  return user
}
