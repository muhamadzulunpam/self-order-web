import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchOrder } from '@/features/order/api'
import { startPayment } from '@/features/payment/startPayment'
import type { PaymentOutcome } from '@/features/payment/startPayment'
import { ApiError } from '@/lib/api'
import { sampleOrder } from '@/test/fixtures'
import { OrderStatusPage } from './OrderStatusPage'

vi.mock('@/features/order/api', () => ({
  createOrder: vi.fn(),
  fetchOrder: vi.fn(),
  requestPayment: vi.fn(),
}))
vi.mock('@/features/payment/startPayment', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/payment/startPayment')>()

  return { ...actual, startPayment: vi.fn() }
})

const mockFetch = vi.mocked(fetchOrder)
const mockStart = vi.mocked(startPayment)

function renderStatusPage(state?: unknown) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createMemoryRouter(
    [
      { path: '/order/:token/status/:orderCode', element: <OrderStatusPage /> },
      { path: '/order/:token', element: <p>HALAMAN MENU</p> },
    ],
    {
      initialEntries: [
        { pathname: '/order/abc123/status/ORD-261017-ABCD1234', state },
      ],
    },
  )

  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { user: userEvent.setup() }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockResolvedValue(sampleOrder)
})

describe('OrderStatusPage', () => {
  it('menampilkan detail pesanan', async () => {
    renderStatusPage()

    expect(await screen.findByText('Menunggu pembayaran')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledWith('abc123', 'ORD-261017-ABCD1234')
    expect(screen.getByText(/ORD-261017-ABCD1234/)).toBeInTheDocument()
    expect(screen.getByText(/Meja 5/)).toBeInTheDocument()
    expect(screen.getByText(/Mie Pedas Original/)).toBeInTheDocument()
    expect(screen.getByText(/Level 3/)).toBeInTheDocument()
    expect(screen.getByText(/Catatan: tanpa bawang/)).toBeInTheDocument()
    expect(
      screen.getByText(/Catatan pesanan: Meja dekat jendela/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Rp\s*29\.000/)).toBeInTheDocument()
  })

  it('menampilkan tombol bayar untuk pesanan yang menunggu pembayaran', async () => {
    renderStatusPage()

    expect(
      await screen.findByRole('button', { name: 'Bayar sekarang' }),
    ).toBeEnabled()
  })

  it('menamai tombol "Lanjutkan pembayaran" jika pembayaran sudah pernah dibuka', async () => {
    mockFetch.mockResolvedValue({ ...sampleOrder, payment_status: 'pending' })

    renderStatusPage()

    expect(
      await screen.findByRole('button', { name: 'Lanjutkan pembayaran' }),
    ).toBeInTheDocument()
  })

  it('membuka pembayaran, mengunci tombol, lalu memuat ulang status saat popup selesai', async () => {
    let done: (outcome: PaymentOutcome) => void = () => {}
    mockStart.mockImplementation(async (_token, _code, onDone) => {
      done = onDone
    })
    const { user } = renderStatusPage()

    await user.click(
      await screen.findByRole('button', { name: 'Bayar sekarang' }),
    )

    expect(mockStart).toHaveBeenCalledWith(
      'abc123',
      'ORD-261017-ABCD1234',
      expect.any(Function),
    )
    expect(
      await screen.findByRole('button', { name: /membuka pembayaran/i }),
    ).toBeDisabled()

    await act(async () => {
      done('closed')
    })

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
    expect(
      await screen.findByRole('button', { name: 'Bayar sekarang' }),
    ).toBeEnabled()
  })

  it('menampilkan error jika pembayaran gagal dibuka dan memuat ulang status', async () => {
    mockStart.mockRejectedValue(
      new ApiError(409, 'Pesanan ini tidak bisa dibayar.'),
    )
    const { user } = renderStatusPage()

    await user.click(
      await screen.findByRole('button', { name: 'Bayar sekarang' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pesanan ini tidak bisa dibayar.',
    )
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  })

  it('menampilkan pesan dari checkout jika pembayaran gagal dibuka di sana', async () => {
    renderStatusPage({ paymentError: 'Gagal membuat transaksi pembayaran.' })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Gagal membuat transaksi pembayaran.',
    )
  })

  it('tidak menampilkan tombol bayar setelah pembayaran diterima', async () => {
    mockFetch.mockResolvedValue({
      ...sampleOrder,
      status: 'paid',
      status_label: 'Pesanan diterima',
      payment_status: 'success',
    })

    renderStatusPage()

    expect(await screen.findByText('Pesanan diterima')).toBeInTheDocument()
    expect(screen.getByText(/pembayaran diterima/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /bayar|pembayaran/i }),
    ).not.toBeInTheDocument()
  })

  it('menjelaskan pesanan yang dibatalkan dan menyediakan tautan ke menu', async () => {
    mockFetch.mockResolvedValue({
      ...sampleOrder,
      status: 'cancelled',
      status_label: 'Dibatalkan',
      payment_status: 'expired',
    })

    renderStatusPage()

    expect(await screen.findByText(/pesanan dibatalkan/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /bayar/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /kembali ke menu/i }),
    ).toHaveAttribute('href', '/order/abc123')
  })

  it('menampilkan pesan khusus jika pesanan tidak ditemukan', async () => {
    mockFetch.mockRejectedValue(new ApiError(404, 'Pesanan tidak ditemukan.'))

    renderStatusPage()

    expect(
      await screen.findByRole('heading', { name: /pesanan tidak ditemukan/i }),
    ).toBeInTheDocument()
  })

  it('menampilkan error lain dengan tombol coba lagi', async () => {
    mockFetch
      .mockRejectedValueOnce(new ApiError(429, 'Terlalu banyak permintaan.'))
      .mockResolvedValueOnce(sampleOrder)
    const { user } = renderStatusPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Terlalu banyak permintaan.',
    )

    await user.click(screen.getByRole('button', { name: /coba lagi/i }))

    expect(await screen.findByText('Menunggu pembayaran')).toBeInTheDocument()
  })
})
