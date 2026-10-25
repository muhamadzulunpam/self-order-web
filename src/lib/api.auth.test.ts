import { describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { ApiError, api } from '@/lib/api'
import { makeUser, signIn } from '@/test/auth'
import { mockServer } from '@/test/mockServer'

const state = () => useAuthStore.getState()

describe('interceptor token', () => {
  it('menyisipkan Bearer token pada endpoint staf', async () => {
    signIn('kitchen')
    const server = mockServer({
      'GET /staff/orders': { status: 200, data: { data: [] } },
    })

    await api.get('/staff/orders')

    expect(server.calls[0].authorization).toBe('Bearer test-token')
  })

  it.each([
    ['GET /public/tables/abc/menu'],
    ['GET /public/tables/abc/orders/ORD-1'],
  ])('tidak menyisipkan token ke endpoint pembeli: %s', async (key) => {
    signIn('kitchen')
    const server = mockServer({ [key]: { status: 200, data: {} } })

    await api.get(key.replace('GET ', ''))

    expect(server.calls[0].authorization).toBeNull()
  })

  it('tidak menyisipkan token ke endpoint login', async () => {
    signIn('kitchen')
    const server = mockServer({ 'POST /auth/login': { status: 200, data: {} } })

    await api.post('/auth/login', { email: 'a@b.co', password: 'x' })

    expect(server.calls[0].authorization).toBeNull()
  })

  it('tanpa token tidak ada header Authorization', async () => {
    const server = mockServer({
      'GET /staff/orders': { status: 200, data: { data: [] } },
    })

    await api.get('/staff/orders')

    expect(server.calls[0].authorization).toBeNull()
  })

  it('tidak menimpa header Authorization yang diberikan eksplisit', async () => {
    signIn('kitchen')
    const server = mockServer({
      'GET /staff/orders': { status: 200, data: { data: [] } },
    })

    await api.get('/staff/orders', {
      headers: { Authorization: 'Bearer eksplisit' },
    })

    expect(server.calls[0].authorization).toBe('Bearer eksplisit')
  })
})

describe('interceptor 401', () => {
  it('menghapus sesi dan tetap melempar ApiError', async () => {
    signIn('kitchen')
    mockServer({
      'GET /staff/orders': {
        status: 401,
        data: { message: 'Unauthenticated.' },
      },
    })

    await expect(api.get('/staff/orders')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    })
    expect(state()).toMatchObject({
      token: null,
      user: null,
      status: 'anonymous',
      endReason: 'expired',
    })
  })

  it('401 dari token lama tidak mengeluarkan sesi yang lebih baru', async () => {
    signIn('kitchen')
    mockServer({
      'GET /staff/orders': () => {
        // Selagi request berjalan, pengguna sudah login ulang dengan token baru.
        useAuthStore.setState({ token: 'token-baru' })

        return { status: 401 }
      },
    })

    await expect(api.get('/staff/orders')).rejects.toBeInstanceOf(ApiError)
    expect(state().token).toBe('token-baru')
    expect(state().status).toBe('authenticated')
    expect(state().endReason).toBeNull()
  })

  it('401 pada request tanpa token tidak mengubah keadaan', async () => {
    mockServer({ 'GET /staff/orders': { status: 401 } })

    await expect(api.get('/staff/orders')).rejects.toBeInstanceOf(ApiError)
    expect(state().status).toBe('anonymous')
    expect(state().endReason).toBeNull()
  })

  it.each([403, 422, 500])(
    'status %i tidak mengeluarkan pengguna',
    async (status) => {
      signIn('kitchen')
      mockServer({ 'GET /staff/orders': { status } })

      await expect(api.get('/staff/orders')).rejects.toMatchObject({ status })
      expect(state()).toMatchObject({
        token: 'test-token',
        status: 'authenticated',
        endReason: null,
      })
    },
  )

  it('gangguan jaringan tidak mengeluarkan pengguna', async () => {
    signIn('kitchen')
    mockServer({ 'GET /staff/orders': 'network-error' })

    await expect(api.get('/staff/orders')).rejects.toMatchObject({
      name: 'ApiError',
      status: null,
    })
    expect(state().token).toBe('test-token')
    expect(state().status).toBe('authenticated')
  })

  it('pengguna yang sama bisa login lagi setelah sesi habis', async () => {
    signIn('kitchen')
    mockServer({
      'GET /staff/orders': { status: 401 },
      'POST /auth/login': {
        status: 200,
        data: { data: { user: makeUser('kitchen'), token: 'baru' } },
      },
    })

    await expect(api.get('/staff/orders')).rejects.toBeInstanceOf(ApiError)
    await state().login('kitchen@example.com', 'password')

    expect(state()).toMatchObject({
      token: 'baru',
      status: 'authenticated',
      endReason: null,
    })
  })
})
