import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter, useParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCartStore } from '@/features/cart/store'
import { fetchTableMenu } from '@/features/menu/api'
import { createOrder, fetchOrder } from '@/features/order/api'
import { startPayment } from '@/features/payment/startPayment'
import { ApiError } from '@/lib/api'
import { sampleMenu, sampleOrder } from '@/test/fixtures'
import { OrderPage } from './OrderPage'

vi.mock('@/features/menu/api', () => ({ fetchTableMenu: vi.fn() }))
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

const mockFetchMenu = vi.mocked(fetchTableMenu)
const mockCreate = vi.mocked(createOrder)
const mockFetchOrder = vi.mocked(fetchOrder)
const mockStart = vi.mocked(startPayment)

function StatusStub() {
  const { orderCode } = useParams()

  return <p>STATUS {orderCode}</p>
}

function renderApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createMemoryRouter(
    [
      { path: '/order/:token', element: <OrderPage /> },
      { path: '/order/:token/status/:orderCode', element: <StatusStub /> },
    ],
    { initialEntries: ['/order/abc123'] },
  )

  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

type User = ReturnType<typeof userEvent.setup>

async function addTea(user: User) {
  await user.click(
    await screen.findByRole('button', { name: 'Tambah Es Teh Manis' }),
  )
  const dialog = screen.getByRole('dialog', { name: 'Es Teh Manis' })
  await user.click(
    within(dialog).getByRole('button', { name: /tambah ke keranjang/i }),
  )
}

async function openCheckout(user: User) {
  await user.click(screen.getByRole('button', { name: /lihat pesanan/i }))
  const cart = screen.getByRole('dialog', { name: /pesanan anda/i })
  await user.click(
    within(cart).getByRole('button', { name: /lanjut ke pembayaran/i }),
  )

  return screen.getByRole('dialog', { name: 'Konfirmasi pesanan' })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFetchMenu.mockResolvedValue(sampleMenu)
  mockFetchOrder.mockResolvedValue({
    ...sampleOrder,
    order_code: 'ORD-9',
  })
})

describe('checkout dari halaman menu', () => {
  it('dari keranjang ke checkout, membuat pesanan, lalu membuka pembayaran', async () => {
    mockCreate.mockResolvedValue({ ...sampleOrder, order_code: 'ORD-9' })
    mockStart.mockImplementation(async (_token, _code, onDone) => {
      onDone('pending')
    })
    const user = userEvent.setup()
    renderApp()

    await addTea(user)
    const checkout = await openCheckout(user)

    expect(within(checkout).getByText(/Es Teh Manis/)).toBeInTheDocument()

    await user.click(within(checkout).getByRole('button', { name: /^bayar/i }))

    expect(await screen.findByText('STATUS ORD-9')).toBeInTheDocument()
    expect(mockCreate).toHaveBeenCalledWith('abc123', {
      items: [{ menu_id: 20, quantity: 1 }],
    })
    expect(useCartStore.getState().carts.abc123).toBeUndefined()
  })

  it('tombol kembali membawa pembeli ke keranjang', async () => {
    const user = userEvent.setup()
    renderApp()

    await addTea(user)
    const checkout = await openCheckout(user)

    await user.click(
      within(checkout).getByRole('button', { name: /kembali ke keranjang/i }),
    )

    expect(
      screen.getByRole('dialog', { name: /pesanan anda/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('dialog', { name: 'Konfirmasi pesanan' }),
    ).not.toBeInTheDocument()
  })

  it('menu yang habis saat checkout: pesanan ditolak dan keranjang disesuaikan dengan menu terbaru', async () => {
    const withoutTea = {
      ...sampleMenu,
      categories: sampleMenu.categories.map((category) => ({
        ...category,
        menus: category.menus.filter((menu) => menu.id !== 20),
      })),
    }
    mockFetchMenu
      .mockResolvedValueOnce(sampleMenu)
      .mockResolvedValue(withoutTea)
    mockCreate.mockRejectedValue(
      new ApiError(422, 'x', {
        'items.0.menu_id': ['Menu Es Teh Manis sedang tidak tersedia.'],
      }),
    )
    const user = userEvent.setup()
    renderApp()

    await addTea(user)
    const checkout = await openCheckout(user)

    await user.click(within(checkout).getByRole('button', { name: /^bayar/i }))

    expect(await within(checkout).findByRole('alert')).toHaveTextContent(
      /Es Teh Manis tidak bisa dipesan lagi/,
    )
    expect(mockStart).not.toHaveBeenCalled()

    // menu dimuat ulang, lalu keranjang otomatis dibersihkan dari menu yang habis
    await waitFor(() =>
      expect(useCartStore.getState().carts.abc123).toBeUndefined(),
    )
    expect(
      await within(checkout).findByText(/keranjang kosong/i),
    ).toBeInTheDocument()
    expect(
      within(checkout).getByRole('button', { name: /^bayar/i }),
    ).toBeDisabled()
    expect(screen.getByText(/dihapus dari keranjang/i)).toBeInTheDocument()
  })
})
