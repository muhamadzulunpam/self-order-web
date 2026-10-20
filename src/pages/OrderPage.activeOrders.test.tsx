import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useActiveOrdersStore } from '@/features/order/activeOrdersStore'
import { fetchTableMenu } from '@/features/menu/api'
import { fetchOrder } from '@/features/order/api'
import { ApiError } from '@/lib/api'
import { getRealtime } from '@/lib/realtime'
import { createFakeRealtime } from '@/test/fakeRealtime'
import { sampleMenu, sampleOrder } from '@/test/fixtures'
import type { OrderStatus, PublicOrder } from '@/types/order'
import { OrderPage } from './OrderPage'

vi.mock('@/features/menu/api', () => ({ fetchTableMenu: vi.fn() }))
vi.mock('@/features/order/api', () => ({
  createOrder: vi.fn(),
  fetchOrder: vi.fn(),
  requestPayment: vi.fn(),
}))

const mockFetchMenu = vi.mocked(fetchTableMenu)
const mockFetchOrder = vi.mocked(fetchOrder)

let orders: Record<string, PublicOrder> = {}

function makeOrder(
  orderCode: string,
  status: OrderStatus,
  label: string,
): PublicOrder {
  return { ...sampleOrder, order_code: orderCode, status, status_label: label }
}

function seed(codes: string[], token = 'abc123') {
  useActiveOrdersStore.setState({
    byToken: {
      [token]: codes.map((orderCode) => ({ orderCode, createdAt: Date.now() })),
    },
  })
}

function renderOrderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createMemoryRouter(
    [{ path: '/order/:token', element: <OrderPage /> }],
    { initialEntries: ['/order/abc123'] },
  )

  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const banner = () => screen.queryByRole('region', { name: 'Pesanan aktif' })

beforeEach(() => {
  vi.clearAllMocks()
  orders = {}
  mockFetchMenu.mockResolvedValue(sampleMenu)
  mockFetchOrder.mockImplementation(async (_token, orderCode) => {
    const order = orders[orderCode]

    if (!order) throw new ApiError(404, 'Pesanan tidak ditemukan.')

    return order
  })
})

describe('banner pesanan aktif di halaman menu', () => {
  it('tidak menampilkan banner jika tidak ada pesanan aktif', async () => {
    renderOrderPage()

    await screen.findByText('Meja 5')

    expect(banner()).not.toBeInTheDocument()
    expect(mockFetchOrder).not.toHaveBeenCalled()
  })

  it('menampilkan status pesanan aktif dengan tautan ke halaman status', async () => {
    orders['ORD-A'] = makeOrder('ORD-A', 'preparing', 'Sedang dimasak')
    seed(['ORD-A'])

    renderOrderPage()

    const link = await screen.findByRole('link', { name: /sedang dimasak/i })

    expect(link).toHaveAttribute('href', '/order/abc123/status/ORD-A')
    expect(within(link).getByText('Lihat')).toBeInTheDocument()
  })

  it('pesanan yang belum dibayar menawarkan tombol Bayar', async () => {
    orders['ORD-A'] = makeOrder(
      'ORD-A',
      'pending_payment',
      'Menunggu pembayaran',
    )
    seed(['ORD-A'])

    renderOrderPage()

    const link = await screen.findByRole('link', {
      name: /menunggu pembayaran/i,
    })

    expect(within(link).getByText('Bayar')).toBeInTheDocument()
  })

  it('menampilkan satu baris per pesanan aktif', async () => {
    orders['ORD-A'] = makeOrder('ORD-A', 'preparing', 'Sedang dimasak')
    orders['ORD-B'] = makeOrder('ORD-B', 'ready', 'Siap disajikan')
    seed(['ORD-A', 'ORD-B'])

    renderOrderPage()

    expect(
      await screen.findByRole('link', { name: /sedang dimasak/i }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: /siap disajikan/i }),
    ).toBeInTheDocument()
  })

  it('tidak menampilkan pesanan milik meja lain', async () => {
    orders['ORD-A'] = makeOrder('ORD-A', 'preparing', 'Sedang dimasak')
    seed(['ORD-A'], 'meja-lain')

    renderOrderPage()

    await screen.findByText('Meja 5')

    expect(banner()).not.toBeInTheDocument()
    expect(mockFetchOrder).not.toHaveBeenCalled()
  })

  it('melepas pesanan yang sudah selesai dari banner dan penyimpanan', async () => {
    orders['ORD-A'] = makeOrder('ORD-A', 'completed', 'Selesai')
    seed(['ORD-A'])

    renderOrderPage()

    await waitFor(() =>
      expect(useActiveOrdersStore.getState().byToken.abc123).toBeUndefined(),
    )
    expect(banner()).not.toBeInTheDocument()
  })

  it('melepas pesanan yang dibatalkan', async () => {
    orders['ORD-A'] = makeOrder('ORD-A', 'cancelled', 'Dibatalkan')
    seed(['ORD-A'])

    renderOrderPage()

    await waitFor(() =>
      expect(useActiveOrdersStore.getState().byToken.abc123).toBeUndefined(),
    )
  })

  it('melepas pesanan yang tidak ditemukan di server', async () => {
    seed(['ORD-HILANG'])

    renderOrderPage()

    await waitFor(() =>
      expect(useActiveOrdersStore.getState().byToken.abc123).toBeUndefined(),
    )
  })

  it('hanya melepas pesanan yang sudah final, yang lain tetap tampil', async () => {
    orders['ORD-A'] = makeOrder('ORD-A', 'completed', 'Selesai')
    orders['ORD-B'] = makeOrder('ORD-B', 'preparing', 'Sedang dimasak')
    seed(['ORD-A', 'ORD-B'])

    renderOrderPage()

    expect(
      await screen.findByRole('link', { name: /sedang dimasak/i }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        useActiveOrdersStore.getState().byToken.abc123?.map((r) => r.orderCode),
      ).toEqual(['ORD-B']),
    )
  })

  it('status di banner ikut berubah saat ada event real-time', async () => {
    orders['ORD-A'] = makeOrder('ORD-A', 'preparing', 'Sedang dimasak')
    seed(['ORD-A'])
    const fake = createFakeRealtime('connecting')
    vi.mocked(getRealtime).mockReturnValue(fake.client)

    renderOrderPage()

    await screen.findByRole('link', { name: /sedang dimasak/i })
    expect(fake.subscribe).toHaveBeenCalledWith('ORD-A', expect.any(Function))

    orders['ORD-A'] = makeOrder('ORD-A', 'ready', 'Siap disajikan')

    await act(async () => {
      fake.emit('ORD-A', 'ready')
    })

    expect(
      await screen.findByRole('link', { name: /siap disajikan/i }),
    ).toBeInTheDocument()
  })
})
