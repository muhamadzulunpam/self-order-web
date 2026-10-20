import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  RouterProvider,
  createMemoryRouter,
  useLocation,
} from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCartStore } from '@/features/cart/store'
import { createOrder } from '@/features/order/api'
import { startPayment } from '@/features/payment/startPayment'
import type { PaymentOutcome } from '@/features/payment/startPayment'
import { ApiError } from '@/lib/api'
import { makeLine, sampleOrder } from '@/test/fixtures'
import { CheckoutSheet } from './CheckoutSheet'
import { useActiveOrdersStore } from '@/features/order/activeOrdersStore'

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

const mockCreate = vi.mocked(createOrder)
const mockStart = vi.mocked(startPayment)

const defaultLines = [
  makeLine({
    menuId: 10,
    name: 'Mie Pedas Original',
    price: 12000,
    quantity: 2,
    spiceLevel: 3,
    notes: 'tanpa bawang',
  }),
  makeLine({
    menuId: 20,
    name: 'Es Teh Manis',
    price: 5000,
    quantity: 1,
    spiceLevel: null,
  }),
]

function StatusProbe() {
  const location = useLocation()
  const state = location.state as { paymentError?: string } | null

  return (
    <div>
      <p>HALAMAN STATUS {location.pathname}</p>
      {state?.paymentError && <p>{state.paymentError}</p>}
    </div>
  )
}

function setup(lines = defaultLines) {
  const onBack = vi.fn()
  const onClose = vi.fn()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')

  useCartStore.setState({
    carts: lines.length ? { abc123: { updatedAt: Date.now(), lines } } : {},
  })

  const router = createMemoryRouter(
    [
      {
        path: '/order/:token',
        element: (
          <CheckoutSheet
            token="abc123"
            tableNumber={5}
            lines={lines}
            onBack={onBack}
            onClose={onClose}
          />
        ),
      },
      { path: '/order/:token/status/:orderCode', element: <StatusProbe /> },
    ],
    { initialEntries: ['/order/abc123'] },
  )

  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { onBack, onClose, invalidate, user: userEvent.setup() }
}

const submitButton = () =>
  screen.getByRole('button', {
    name: /^(bayar|membuat pesanan|membuka pembayaran)/i,
  })

const cartLines = () => useCartStore.getState().carts.abc123?.lines

function payImmediately(outcome: PaymentOutcome = 'success') {
  mockStart.mockImplementation(async (_token, _code, onDone) => {
    onDone(outcome)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CheckoutSheet', () => {
  it('menampilkan ringkasan pesanan dan total pada tombol bayar', () => {
    setup()

    expect(screen.getByText(/Mie Pedas Original/)).toBeInTheDocument()
    expect(screen.getByText(/Catatan: tanpa bawang/)).toBeInTheDocument()
    expect(screen.getByText(/Meja 5/)).toBeInTheDocument()
    expect(submitButton()).toHaveTextContent(/29\.000/)
    expect(submitButton()).toBeEnabled()
  })

  it('membuat pesanan, mengosongkan keranjang, membuka pembayaran, lalu menuju halaman status', async () => {
    mockCreate.mockResolvedValue({ ...sampleOrder, order_code: 'ORD-1' })
    payImmediately()
    const { user } = setup()

    await user.type(screen.getByLabelText(/^nama/i), '  Budi ')
    await user.type(
      screen.getByLabelText(/catatan untuk pesanan/i),
      'Meja dekat jendela',
    )
    await user.click(submitButton())

    expect(
      await screen.findByText('HALAMAN STATUS /order/abc123/status/ORD-1'),
    ).toBeInTheDocument()
    expect(mockCreate).toHaveBeenCalledWith('abc123', {
      customer_name: 'Budi',
      notes: 'Meja dekat jendela',
      items: [
        { menu_id: 10, quantity: 2, spice_level: 3, notes: 'tanpa bawang' },
        { menu_id: 20, quantity: 1 },
      ],
    })
    expect(mockStart).toHaveBeenCalledWith(
      'abc123',
      'ORD-1',
      expect.any(Function),
    )
    expect(cartLines()).toBeUndefined()
  })

  it('mengosongkan keranjang begitu pesanan dibuat, sebelum pembayaran selesai', async () => {
    mockCreate.mockResolvedValue({ ...sampleOrder, order_code: 'ORD-1' })
    let finish: () => void = () => {}
    mockStart.mockImplementation(async (_token, _code, onDone) => {
      finish = () => onDone('closed')
    })
    const { user } = setup()

    await user.click(submitButton())

    expect(
      await screen.findByRole('button', { name: /membuka pembayaran/i }),
    ).toBeDisabled()
    expect(cartLines()).toBeUndefined()
    // ringkasan tetap menampilkan isi pesanan yang sedang dibayar
    expect(screen.getByText(/Mie Pedas Original/)).toBeInTheDocument()
    expect(screen.queryByText(/halaman status/i)).not.toBeInTheDocument()

    await act(async () => {
      finish()
    })

    expect(await screen.findByText(/halaman status/i)).toBeInTheDocument()
  })

  it('menolak pesanan dan menyebut menu yang tidak bisa dipesan (422)', async () => {
    mockCreate.mockRejectedValue(
      new ApiError(422, 'x', {
        'items.0.menu_id': ['Menu Mie Pedas Original sedang tidak tersedia.'],
      }),
    )
    const { user, invalidate } = setup()

    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Mie Pedas Original tidak bisa dipesan lagi/,
    )
    expect(mockStart).not.toHaveBeenCalled()
    expect(cartLines()).toHaveLength(2)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['menu', 'abc123'] })
    expect(submitButton()).toBeEnabled()
  })

  it('menyebut semua menu yang ditolak', async () => {
    mockCreate.mockRejectedValue(
      new ApiError(422, 'x', {
        'items.0.menu_id': ['x'],
        'items.1.spice_level': ['y'],
      }),
    )
    const { user } = setup()

    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Mie Pedas Original, Es Teh Manis tidak bisa dipesan lagi/,
    )
  })

  it('menampilkan error validasi pada field nama', async () => {
    mockCreate.mockRejectedValue(
      new ApiError(422, 'x', { customer_name: ['x'] }),
    )
    const { user } = setup()

    await user.click(submitButton())

    expect(await screen.findByText(/nama terlalu panjang/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^nama/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it.each([
    [404, /meja tidak ditemukan/i],
    [429, /terlalu banyak percobaan/i],
    [500, /server sedang bermasalah/i],
  ])(
    'menampilkan pesan yang sesuai untuk status %i dan menjaga keranjang',
    async (status, pattern) => {
      mockCreate.mockRejectedValue(new ApiError(status, 'x'))
      const { user } = setup()

      await user.click(submitButton())

      expect(await screen.findByRole('alert')).toHaveTextContent(pattern)
      expect(cartLines()).toHaveLength(2)
      expect(mockStart).not.toHaveBeenCalled()
    },
  )

  it('bisa dicoba lagi setelah jaringan gagal tanpa kehilangan keranjang', async () => {
    mockCreate
      .mockRejectedValueOnce(
        new ApiError(null, 'Tidak dapat terhubung ke server.'),
      )
      .mockResolvedValueOnce({ ...sampleOrder, order_code: 'ORD-2' })
    payImmediately()
    const { user } = setup()

    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /belum terkirim/i,
    )
    expect(cartLines()).toHaveLength(2)

    await user.click(submitButton())

    expect(
      await screen.findByText('HALAMAN STATUS /order/abc123/status/ORD-2'),
    ).toBeInTheDocument()
    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(cartLines()).toBeUndefined()
  })

  it('jika pembayaran gagal dibuka, pesanan tidak dibuat ulang dan pembeli dibawa ke halaman status dengan pesan', async () => {
    mockCreate.mockResolvedValue({ ...sampleOrder, order_code: 'ORD-3' })
    mockStart.mockRejectedValue(
      new ApiError(502, 'Gagal membuat transaksi pembayaran, coba lagi.'),
    )
    const { user } = setup()

    await user.click(submitButton())

    expect(
      await screen.findByText('HALAMAN STATUS /order/abc123/status/ORD-3'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Gagal membuat transaksi pembayaran, coba lagi.'),
    ).toBeInTheDocument()
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(cartLines()).toBeUndefined()
  })

  it('tidak mengirim pesanan dua kali saat tombol ditekan dua kali', async () => {
    mockCreate.mockReturnValue(new Promise(() => {}))
    const { user } = setup()

    await user.dblClick(submitButton())

    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('mengunci form dan menolak ditutup selama pesanan diproses', async () => {
    mockCreate.mockReturnValue(new Promise(() => {}))
    const { user, onClose, onBack } = setup()

    await user.click(submitButton())

    await waitFor(() => expect(screen.getByLabelText(/^nama/i)).toBeDisabled())
    expect(screen.getByLabelText(/catatan untuk pesanan/i)).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /kembali ke keranjang/i }),
    ).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Tutup' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(onBack).not.toHaveBeenCalled()
  })

  it('tombol kembali memanggil onBack', async () => {
    const { user, onBack } = setup()

    await user.click(
      screen.getByRole('button', { name: /kembali ke keranjang/i }),
    )

    expect(onBack).toHaveBeenCalled()
  })

  it('menonaktifkan pembayaran jika keranjang kosong', () => {
    setup([])

    expect(screen.getByText(/keranjang kosong/i)).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()
  })

  it('menyimpan pesanan sebagai pesanan aktif meja agar bisa ditemukan lagi', async () => {
    mockCreate.mockResolvedValue({ ...sampleOrder, order_code: 'ORD-1' })
    payImmediately()
    const { user } = setup()

    await user.click(submitButton())
    await screen.findByText(/halaman status/i)

    expect(useActiveOrdersStore.getState().byToken.abc123?.[0].orderCode).toBe(
      'ORD-1',
    )
  })

  it('tidak menyimpan pesanan aktif jika pesanan gagal dibuat', async () => {
    mockCreate.mockRejectedValue(new ApiError(500, 'x'))
    const { user } = setup()

    await user.click(submitButton())
    await screen.findByRole('alert')

    expect(useActiveOrdersStore.getState().byToken.abc123).toBeUndefined()
  })
})
