import { api } from '@/lib/api'
import { isRole } from './roles'
import type { User } from './types'

const INVALID_DATA = 'Data akun dari server tidak valid.'

function parseUser(value: unknown): User {
  if (typeof value === 'object' && value !== null) {
    const user = value as Record<string, unknown>

    if (
      typeof user.id === 'number' &&
      typeof user.name === 'string' &&
      typeof user.email === 'string' &&
      isRole(user.role)
    ) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    }
  }

  throw new Error(INVALID_DATA)
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<{ user: User; token: string }> {
  const { data } = await api.post<{
    data?: { user?: unknown; token?: unknown }
  }>('/auth/login', { email, password })

  const token = data?.data?.token

  if (typeof token !== 'string' || token === '') throw new Error(INVALID_DATA)

  return { user: parseUser(data.data?.user), token }
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<{ data?: unknown }>('/auth/me')

  return parseUser(data?.data)
}

/** Token diberikan eksplisit karena sesi lokal sudah dihapus lebih dulu saat logout. */
export async function logoutRequest(token: string): Promise<void> {
  await api.post('/auth/logout', undefined, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 5000,
  })
}
