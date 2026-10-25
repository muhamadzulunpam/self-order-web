import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { makeUser, signIn } from '@/test/auth'
import { mockServer } from '@/test/mockServer'
import type { Reply } from '@/test/mockServer'
import { AUTH_STORAGE_KEY, useAuthStore } from './store'

const user = makeUser('kitchen')
const state = () => useAuthStore.getState()

const loginOk: Reply = {
  status: 200,
  data: { data: { user, token: '1|abc' } },
}
const meOk: Reply = { status: 200, data: { data: user } }

function deferred() {
  let resolve!: (reply: Reply) => void
  const promise = new Promise<Reply>((done) => {
    resolve = done
  })

  return { promise, resolve }
}

beforeEach(() => {
  useAuthStore.setState({
    token: null,
    user: null,
    status: 'anonymous',
    endReason: null,
  })
})

describe('login', () => {
  it('menyimpan token dan pengguna lalu menjadi authenticated', async () => {
    const server = mockServer({ 'POST /auth/login': loginOk })

    await state().login('dapur@example.com', 'password')

    expect(state()).toMatchObject({
      token: '1|abc',
      user,
      status: 'authenticated',
      endReason: null,
    })
    expect(server.calls[0].body).toEqual({
      email: 'dapur@example.com',
      password: 'password',
    })
  })

  it('menghapus alasan sesi berakhir sebelumnya', async () => {
    useAuthStore.setState({ endReason: 'expired' })
    mockServer({ 'POST /auth/login': loginOk })

    await state().login('dapur@example.com', 'password')

    expect(state().endReason).toBeNull()
  })

  it('gagal: melempar error dan keadaan tidak berubah', async () => {
    mockServer({
      'POST /auth/login': {
        status: 422,
        data: { errors: { email: ['Email atau password salah.'] } },
      },
    })

    await expect(state().login('a@b.co', 'salah')).rejects.toMatchObject({
      status: 422,
    })
    expect(state()).toMatchObject({
      token: null,
      user: null,
      status: 'anonymous',
    })
  })

  it('menolak data akun yang tidak valid tanpa mengubah keadaan', async () => {
    mockServer({
      'POST /auth/login': {
        status: 200,
        data: { data: { user: { ...user, role: 'superadmin' }, token: 't' } },
      },
    })

    await expect(state().login('a@b.co', 'x')).rejects.toThrow()
    expect(state().token).toBeNull()
    expect(state().status).toBe('anonymous')
  })
})

describe('logout', () => {
  it('menghapus sesi seketika dan memberi tahu server dengan token lama', async () => {
    signIn('kitchen')
    const server = mockServer({
      'POST /auth/logout': { status: 200, data: { message: 'ok' } },
    })

    state().logout()

    expect(state()).toMatchObject({
      token: null,
      user: null,
      status: 'anonymous',
      endReason: 'logout',
    })

    await vi.waitFor(() =>
      expect(server.callsTo('POST /auth/logout')).toHaveLength(1),
    )
    expect(server.callsTo('POST /auth/logout')[0].authorization).toBe(
      'Bearer test-token',
    )
  })

  it('tetap keluar walau server tidak bisa dihubungi', async () => {
    signIn('kitchen')
    const server = mockServer({ 'POST /auth/logout': 'network-error' })

    state().logout()
    await vi.waitFor(() => expect(server.calls).toHaveLength(1))

    expect(state().status).toBe('anonymous')
    expect(state().token).toBeNull()
  })

  it('401 dari permintaan logout tidak dianggap sesi habis', async () => {
    signIn('kitchen')
    const server = mockServer({ 'POST /auth/logout': { status: 401 } })

    state().logout()
    await vi.waitFor(() => expect(server.calls).toHaveLength(1))

    expect(state().endReason).toBe('logout')
  })

  it('tanpa token tidak memanggil server', async () => {
    const server = mockServer({})

    state().logout()
    await Promise.resolve()

    expect(server.calls).toHaveLength(0)
  })
})

describe('restore', () => {
  it('tanpa token: menjadi anonymous tanpa memanggil server', async () => {
    const server = mockServer({})

    await state().restore()

    expect(state().status).toBe('anonymous')
    expect(server.calls).toHaveLength(0)
  })

  it('token valid: memulihkan pengguna', async () => {
    useAuthStore.setState({ token: 'saved', status: 'idle' })
    const server = mockServer({ 'GET /auth/me': meOk })

    await state().restore()

    expect(state()).toMatchObject({ user, status: 'authenticated' })
    expect(server.calls[0].authorization).toBe('Bearer saved')
  })

  it('token ditolak (401): sesi dihapus dan ditandai kedaluwarsa', async () => {
    useAuthStore.setState({ token: 'basi', status: 'idle' })
    mockServer({
      'GET /auth/me': { status: 401, data: { message: 'Unauthenticated.' } },
    })

    await state().restore()

    expect(state()).toMatchObject({
      token: null,
      user: null,
      status: 'anonymous',
      endReason: 'expired',
    })
  })

  it.each<[string, Reply]>([
    ['jaringan putus', 'network-error'],
    ['server error', { status: 500 }],
    ['data tidak valid', { status: 200, data: { data: { id: 'x' } } }],
  ])('%s: status error dan token dipertahankan', async (_name, reply) => {
    useAuthStore.setState({ token: 'saved', status: 'idle' })
    mockServer({ 'GET /auth/me': reply })

    await state().restore()

    expect(state()).toMatchObject({ token: 'saved', status: 'error' })
  })

  it('bisa dicoba lagi setelah gagal', async () => {
    useAuthStore.setState({ token: 'saved', status: 'idle' })
    let attempts = 0
    mockServer({
      'GET /auth/me': () => (++attempts === 1 ? 'network-error' : meOk),
    })

    await state().restore()
    expect(state().status).toBe('error')

    await state().restore()
    expect(state()).toMatchObject({ user, status: 'authenticated' })
  })

  it('beberapa panggilan bersamaan hanya memverifikasi sekali', async () => {
    useAuthStore.setState({ token: 'saved', status: 'idle' })
    const pending = deferred()
    const server = mockServer({ 'GET /auth/me': () => pending.promise })

    const first = state().restore()
    const second = state().restore()

    await vi.waitFor(() => expect(server.calls).toHaveLength(1))
    pending.resolve(meOk)
    await Promise.all([first, second])

    expect(server.calls).toHaveLength(1)
    expect(state().status).toBe('authenticated')
  })

  it('mengabaikan hasil verifikasi jika sesi sudah berganti', async () => {
    useAuthStore.setState({ token: 'lama', status: 'idle' })
    const pending = deferred()
    const server = mockServer({
      'GET /auth/me': () => pending.promise,
      'POST /auth/login': loginOk,
    })

    const restoring = state().restore()
    await vi.waitFor(() =>
      expect(server.callsTo('GET /auth/me')).toHaveLength(1),
    )

    await state().login('dapur@example.com', 'password')
    pending.resolve({
      status: 200,
      data: { data: makeUser('admin', { id: 99 }) },
    })
    await restoring

    expect(state().token).toBe('1|abc')
    expect(state().user).toEqual(user)
  })
})

describe('handleUnauthorized', () => {
  it('mengakhiri sesi jika token yang ditolak masih token aktif', () => {
    signIn('kitchen')

    state().handleUnauthorized('test-token')

    expect(state()).toMatchObject({
      token: null,
      user: null,
      status: 'anonymous',
      endReason: 'expired',
    })
  })

  it('tidak melakukan apa pun jika token sudah berbeda', () => {
    signIn('kitchen')

    state().handleUnauthorized('token-lain')

    expect(state()).toMatchObject({
      token: 'test-token',
      status: 'authenticated',
      endReason: null,
    })
  })
})

describe('penyimpanan sesi', () => {
  it('hanya menyimpan token ke localStorage, bukan data pengguna', async () => {
    mockServer({ 'POST /auth/login': loginOk })

    await state().login('dapur@example.com', 'password')

    const stored = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? '{}')

    expect(stored.state).toEqual({ token: '1|abc' })
  })

  it('setelah reload: token dipulihkan, pengguna belum, status idle', async () => {
    mockServer({ 'POST /auth/login': loginOk })
    await state().login('dapur@example.com', 'password')

    vi.resetModules()
    const { useAuthStore: reloaded } = await import('./store')

    expect(reloaded.getState()).toMatchObject({
      token: '1|abc',
      user: null,
      status: 'idle',
    })
  })

  it('tanpa token tersimpan: anonymous', async () => {
    vi.resetModules()
    const { useAuthStore: reloaded } = await import('./store')

    expect(reloaded.getState()).toMatchObject({
      token: null,
      status: 'anonymous',
    })
  })

  it('mengabaikan token yang bukan string', async () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ version: 1, state: { token: 123 } }),
    )

    vi.resetModules()
    const { useAuthStore: reloaded } = await import('./store')

    expect(reloaded.getState()).toMatchObject({
      token: null,
      status: 'anonymous',
    })
  })

  it('tidak error jika isi localStorage bukan JSON yang valid', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, '{bukan json')

    vi.resetModules()
    const { useAuthStore: reloaded } = await import('./store')

    expect(reloaded.getState().token).toBeNull()
  })
})

describe('ApiError', () => {
  it('login yang ditolak melempar ApiError', async () => {
    mockServer({ 'POST /auth/login': { status: 429 } })

    await expect(state().login('a@b.co', 'x')).rejects.toBeInstanceOf(ApiError)
  })
})
