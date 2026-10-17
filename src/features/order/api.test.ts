import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { sampleOrder } from '@/test/fixtures'
import { createOrder, fetchOrder, requestPayment } from './api'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('order api', () => {
  it('createOrder mengirim payload ke meja yang benar dan membuka pembungkus data', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { data: sampleOrder } })
    const input = { items: [{ menu_id: 1, quantity: 2 }] }

    await expect(createOrder('abc123', input)).resolves.toEqual(sampleOrder)
    expect(post).toHaveBeenCalledWith('/public/tables/abc123/orders', input)
  })

  it('fetchOrder meng-encode token dan kode pesanan', async () => {
    const get = vi
      .spyOn(api, 'get')
      .mockResolvedValue({ data: { data: sampleOrder } })

    await expect(fetchOrder('a/b', 'ORD-1')).resolves.toEqual(sampleOrder)
    expect(get).toHaveBeenCalledWith('/public/tables/a%2Fb/orders/ORD-1')
  })

  it('requestPayment memakai timeout yang lebih panjang', async () => {
    const session = {
      order_code: 'ORD-1',
      snap_token: 'snap-token',
      redirect_url: null,
      client_key: 'SB-Mid-client-x',
      is_production: false,
    }
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { data: session } })

    await expect(requestPayment('abc123', 'ORD-1')).resolves.toEqual(session)
    expect(post).toHaveBeenCalledWith(
      '/public/tables/abc123/orders/ORD-1/pay',
      undefined,
      { timeout: 30_000 },
    )
  })
})
