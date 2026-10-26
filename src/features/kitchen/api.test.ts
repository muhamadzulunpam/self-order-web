import { describe, expect, it } from 'vitest'
import { signIn } from '@/test/auth'
import { makeStaffOrder } from '@/test/fixtures'
import { mockServer } from '@/test/mockServer'
import { fetchStaffOrders, updateOrderStatus } from './api'

describe('fetchStaffOrders', () => {
  it('mengambil daftar pesanan dengan token staf', async () => {
    signIn('kitchen')
    const orders = [makeStaffOrder({ id: 1 }), makeStaffOrder({ id: 2 })]
    const server = mockServer({
      'GET /staff/orders': { status: 200, data: { data: orders } },
    })

    await expect(fetchStaffOrders()).resolves.toEqual(orders)
    expect(server.calls[0].authorization).toBe('Bearer test-token')
  })

  it('daftar kosong menghasilkan array kosong', async () => {
    signIn('kitchen')
    mockServer({ 'GET /staff/orders': { status: 200, data: { data: [] } } })

    await expect(fetchStaffOrders()).resolves.toEqual([])
  })

  it('satu pesanan tidak valid menggagalkan seluruh daftar', async () => {
    signIn('kitchen')
    mockServer({
      'GET /staff/orders': {
        status: 200,
        data: { data: [makeStaffOrder({ id: 1 }), { id: 2 }] },
      },
    })

    await expect(fetchStaffOrders()).rejects.toThrow(/tidak valid/i)
  })

  it('bentuk respons yang bukan daftar ditolak', async () => {
    signIn('kitchen')
    mockServer({ 'GET /staff/orders': { status: 200, data: { data: 'x' } } })

    await expect(fetchStaffOrders()).rejects.toThrow(/tidak valid/i)
  })
})

describe('updateOrderStatus', () => {
  it('mengirim PATCH dengan status tujuan dan mengembalikan pesanan', async () => {
    signIn('kitchen')
    const updated = makeStaffOrder({ id: 4, status: 'preparing' })
    const server = mockServer({
      'PATCH /staff/orders/4/status': { status: 200, data: { data: updated } },
    })

    await expect(updateOrderStatus(4, 'preparing')).resolves.toEqual(updated)
    expect(server.calls[0].body).toEqual({ status: 'preparing' })
    expect(server.calls[0].authorization).toBe('Bearer test-token')
  })

  it('respons yang tidak valid ditolak', async () => {
    signIn('kitchen')
    mockServer({
      'PATCH /staff/orders/4/status': {
        status: 200,
        data: { data: { id: 4 } },
      },
    })

    await expect(updateOrderStatus(4, 'ready')).rejects.toThrow(/tidak valid/i)
  })

  it('409 dari server dilempar sebagai ApiError', async () => {
    signIn('kitchen')
    mockServer({ 'PATCH /staff/orders/4/status': { status: 409 } })

    await expect(updateOrderStatus(4, 'ready')).rejects.toMatchObject({
      status: 409,
    })
  })
})
