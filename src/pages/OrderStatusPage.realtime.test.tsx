import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchOrder } from '@/features/order/api'
import { getRealtime } from '@/lib/realtime'
import { createFakeRealtime } from '@/test/fakeRealtime'
import { sampleOrder } from '@/test/fixtures'
import type { PublicOrder } from '@/types/order'
import { OrderStatusPage } from './OrderStatusPage'

vi.mock('@/features/order/api', () => ({
  createOrder: vi.fn(),
  fetchOrder: vi.fn(),
  requestPayment: vi.fn(),
}))

const mockFetch = vi.mocked(fetchOrder)
const CODE = 'ORD-261017-ABCD1234'

const paidOrder: PublicOrder = {
  ...sampleOrder,
  status: 'paid',
  status_label: 'Pesanan diterima',
  payment_status: 'success',
}

function renderStatusPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createMemoryRouter(
    [{ path: '/order/:token/status/:orderCode', element: <OrderStatusPage /> }],
    { initialEntries: [`/order/abc123/status/${CODE}`] },
  )

  const result = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { user: userEvent.setup(), unmount: result.unmount }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockResolvedValue(sampleOrder)
})

describe('OrderStatusPage real-time', () => {
  it('berlangganan channel pesanan ini dan menampilkan indikator saat tersambung', async () => {
    const fake = createFakeRealtime('connected')
    vi.mocked(getRealtime).mockReturnValue(fake.client)

    renderStatusPage()

    expect(await screen.findByText('Menunggu pembayaran')).toBeInTheDocument()
    expect(fake.subscribe).toHaveBeenCalledWith(CODE, expect.any(Function))
    expect(screen.getByText('Pembaruan langsung aktif')).toBeInTheDocument()
  })

  it('event dari server membuat status langsung diperbarui', async () => {
    mockFetch.mockResolvedValueOnce(sampleOrder).mockResolvedValue(paidOrder)
    const fake = createFakeRealtime('connecting')
    vi.mocked(getRealtime).mockReturnValue(fake.client)

    renderStatusPage()

    expect(await screen.findByText('Menunggu pembayaran')).toBeInTheDocument()

    await act(async () => {
      fake.emit(CODE, 'paid')
    })

    expect(await screen.findByText('Pesanan diterima')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('beralih dari pemeriksaan berkala ke pembaruan langsung saat tersambung', async () => {
    const fake = createFakeRealtime('disconnected')
    vi.mocked(getRealtime).mockReturnValue(fake.client)

    renderStatusPage()

    await screen.findByText('Menunggu pembayaran')
    expect(screen.getByText(/diperiksa otomatis/i)).toBeInTheDocument()

    await act(async () => {
      fake.setState('connected')
    })

    expect(
      await screen.findByText('Pembaruan langsung aktif'),
    ).toBeInTheDocument()
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  })

  it('tanpa real-time, halaman tetap jalan dengan pemeriksaan berkala', async () => {
    renderStatusPage()

    await screen.findByText('Menunggu pembayaran')

    expect(screen.getByText(/diperiksa otomatis/i)).toBeInTheDocument()
    expect(
      screen.queryByText('Pembaruan langsung aktif'),
    ).not.toBeInTheDocument()
  })

  it('menampilkan garis waktu sesuai status', async () => {
    mockFetch.mockResolvedValue(paidOrder)

    renderStatusPage()

    await screen.findByText('Pesanan diterima')

    const items = within(
      screen.getByRole('list', { name: 'Progres pesanan' }),
    ).getAllByRole('listitem')

    expect(items).toHaveLength(5)
    expect(items[1]).toHaveAttribute('aria-current', 'step')
  })

  it('tombol "Perbarui status" mengambil ulang data', async () => {
    const { user } = renderStatusPage()

    await user.click(
      await screen.findByRole('button', { name: 'Perbarui status' }),
    )

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  })

  it('pesanan selesai: semua langkah selesai dan indikator pembaruan disembunyikan', async () => {
    mockFetch.mockResolvedValue({
      ...sampleOrder,
      status: 'completed',
      status_label: 'Selesai',
      payment_status: 'success',
    })

    renderStatusPage()

    await screen.findByText('Selesai')

    expect(screen.getAllByText('(selesai)')).toHaveLength(5)
    expect(
      screen.queryByRole('button', { name: 'Perbarui status' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/diperiksa otomatis/i)).not.toBeInTheDocument()
  })

  it('pesanan dibatalkan: tidak ada garis waktu', async () => {
    mockFetch.mockResolvedValue({
      ...sampleOrder,
      status: 'cancelled',
      status_label: 'Dibatalkan',
      payment_status: 'expired',
    })

    renderStatusPage()

    await screen.findByText('Dibatalkan')

    expect(
      screen.queryByRole('list', { name: 'Progres pesanan' }),
    ).not.toBeInTheDocument()
  })

  it('berhenti berlangganan saat halaman ditutup', async () => {
    const fake = createFakeRealtime('connected')
    vi.mocked(getRealtime).mockReturnValue(fake.client)
    const { unmount } = renderStatusPage()

    await screen.findByText('Menunggu pembayaran')
    unmount()

    expect(fake.unsubscribe).toHaveBeenCalledWith(CODE)
  })
})
