import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'
import { staffKeys } from '@/lib/queryKeys'
import { signIn } from '@/test/auth'
import { makeStaffOrder } from '@/test/fixtures'
import { registerSessionCleanup } from './sessionCleanup'
import { useAuthStore } from './store'

let client: QueryClient

beforeEach(() => {
  client = new QueryClient()
  client.setQueryData(staffKeys.orders, [makeStaffOrder()])
  client.setQueryData(['menu', 'abc'], { ada: true })
})

describe('registerSessionCleanup', () => {
  it('menghapus cache staf saat logout, tanpa menyentuh data pembeli', () => {
    signIn('kitchen')
    registerSessionCleanup(client)

    useAuthStore.setState({ token: null, user: null, status: 'anonymous' })

    expect(client.getQueryData(staffKeys.orders)).toBeUndefined()
    expect(client.getQueryData(['menu', 'abc'])).toEqual({ ada: true })
  })

  it('menghapus cache staf saat sesi habis (401)', () => {
    signIn('kitchen')
    registerSessionCleanup(client)

    useAuthStore.getState().handleUnauthorized('test-token')

    expect(client.getQueryData(staffKeys.orders)).toBeUndefined()
  })

  it('menghapus cache staf saat token berganti ke akun lain', () => {
    signIn('kitchen')
    registerSessionCleanup(client)

    useAuthStore.setState({ token: 'token-akun-lain' })

    expect(client.getQueryData(staffKeys.orders)).toBeUndefined()
  })

  it('tidak menghapus apa pun saat login (token dari kosong menjadi ada)', () => {
    registerSessionCleanup(client)

    useAuthStore.setState({ token: 'token-baru' })

    expect(client.getQueryData(staffKeys.orders)).toBeDefined()
  })

  it('tidak menghapus apa pun jika token tidak berubah', () => {
    signIn('kitchen')
    registerSessionCleanup(client)

    useAuthStore.setState({ endReason: null })

    expect(client.getQueryData(staffKeys.orders)).toBeDefined()
  })

  it('berhenti bekerja setelah dilepas', () => {
    signIn('kitchen')
    const stop = registerSessionCleanup(client)

    stop()
    useAuthStore.setState({ token: null, user: null, status: 'anonymous' })

    expect(client.getQueryData(staffKeys.orders)).toBeDefined()
  })
})
