import { describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { signIn } from '@/test/auth'
import { mockServer } from '@/test/mockServer'
import { channelAuthorizer } from './channelAuthorizer'

describe('channelAuthorizer', () => {
  it('meminta otorisasi ke /broadcasting/auth dengan token staf', async () => {
    signIn('kitchen')
    const server = mockServer({
      'POST /broadcasting/auth': { status: 200, data: { auth: 'kunci:tanda' } },
    })
    const callback = vi.fn()

    channelAuthorizer({ name: 'private-staff.orders' }).authorize(
      '123.456',
      callback,
    )

    await vi.waitFor(() => expect(callback).toHaveBeenCalled())
    expect(callback).toHaveBeenCalledWith(null, { auth: 'kunci:tanda' })
    expect(server.calls[0].body).toEqual({
      socket_id: '123.456',
      channel_name: 'private-staff.orders',
    })
    expect(server.calls[0].authorization).toBe('Bearer test-token')
  })

  it('meneruskan error jika otorisasi ditolak (403)', async () => {
    signIn('kitchen')
    mockServer({ 'POST /broadcasting/auth': { status: 403 } })
    const callback = vi.fn()

    channelAuthorizer({ name: 'private-staff.orders' }).authorize(
      '1.2',
      callback,
    )

    await vi.waitFor(() => expect(callback).toHaveBeenCalled())
    expect(callback).toHaveBeenCalledWith(expect.any(Error), null)
  })

  it('401 mengakhiri sesi lewat interceptor dan error tetap diteruskan', async () => {
    signIn('kitchen')
    mockServer({ 'POST /broadcasting/auth': { status: 401 } })
    const callback = vi.fn()

    channelAuthorizer({ name: 'private-staff.orders' }).authorize(
      '1.2',
      callback,
    )

    await vi.waitFor(() => expect(callback).toHaveBeenCalled())
    expect(callback).toHaveBeenCalledWith(expect.any(Error), null)
    expect(useAuthStore.getState()).toMatchObject({
      token: null,
      endReason: 'expired',
    })
  })

  it('error jaringan diteruskan sebagai error', async () => {
    signIn('kitchen')
    mockServer({ 'POST /broadcasting/auth': 'network-error' })
    const callback = vi.fn()

    channelAuthorizer({ name: 'private-staff.orders' }).authorize(
      '1.2',
      callback,
    )

    await vi.waitFor(() => expect(callback).toHaveBeenCalled())
    expect(callback).toHaveBeenCalledWith(expect.any(Error), null)
  })
})
