import { describe, expect, it } from 'vitest'
import { makeUser, signIn } from '@/test/auth'
import { mockServer } from '@/test/mockServer'
import { fetchMe, loginRequest, logoutRequest } from './api'

const user = makeUser('kitchen')

describe('loginRequest', () => {
  it('mengirim email dan kata sandi, lalu mengembalikan pengguna dan token', async () => {
    const server = mockServer({
      'POST /auth/login': {
        status: 200,
        data: { data: { user, token: '1|abc' } },
      },
    })

    await expect(loginRequest('a@b.co', 'rahasia')).resolves.toEqual({
      user,
      token: '1|abc',
    })
    expect(server.calls[0].body).toEqual({
      email: 'a@b.co',
      password: 'rahasia',
    })
  })

  it('menolak respons dengan role yang tidak dikenal', async () => {
    mockServer({
      'POST /auth/login': {
        status: 200,
        data: { data: { user: { ...user, role: 'superadmin' }, token: 't' } },
      },
    })

    await expect(loginRequest('a@b.co', 'x')).rejects.toThrow(
      'Data akun dari server tidak valid.',
    )
  })

  it('menolak respons tanpa token', async () => {
    mockServer({
      'POST /auth/login': { status: 200, data: { data: { user } } },
    })

    await expect(loginRequest('a@b.co', 'x')).rejects.toThrow(
      'Data akun dari server tidak valid.',
    )
  })

  it('menolak respons dengan bentuk yang tidak terduga', async () => {
    mockServer({ 'POST /auth/login': { status: 200, data: 'bukan json' } })

    await expect(loginRequest('a@b.co', 'x')).rejects.toThrow()
  })
})

describe('fetchMe', () => {
  it('mengambil pengguna dari /auth/me', async () => {
    signIn('kitchen')
    const server = mockServer({
      'GET /auth/me': { status: 200, data: { data: user } },
    })

    await expect(fetchMe()).resolves.toEqual(user)
    expect(server.calls[0].authorization).toBe('Bearer test-token')
  })

  it('menolak data pengguna yang tidak valid', async () => {
    signIn('kitchen')
    mockServer({
      'GET /auth/me': { status: 200, data: { data: { id: 'x' } } },
    })

    await expect(fetchMe()).rejects.toThrow(
      'Data akun dari server tidak valid.',
    )
  })
})

describe('logoutRequest', () => {
  it('memakai token yang diberikan walau sesi lokal sudah kosong', async () => {
    const server = mockServer({
      'POST /auth/logout': { status: 200, data: { message: 'ok' } },
    })

    await logoutRequest('token-lama')

    expect(server.calls[0].authorization).toBe('Bearer token-lama')
  })

  it('token eksplisit tidak ditimpa token yang ada di store', async () => {
    signIn('kitchen')
    const server = mockServer({
      'POST /auth/logout': { status: 200, data: { message: 'ok' } },
    })

    await logoutRequest('token-lama')

    expect(server.calls[0].authorization).toBe('Bearer token-lama')
  })
})
