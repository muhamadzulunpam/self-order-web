import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCartStore } from '@/features/cart/store'
import { fetchTableMenu } from '@/features/menu/api'
import { makeLine, sampleMenu } from '@/test/fixtures'
import { OrderPage } from './OrderPage'

vi.mock('@/features/menu/api', () => ({ fetchTableMenu: vi.fn() }))

const mockFetch = vi.mocked(fetchTableMenu)

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

type User = ReturnType<typeof userEvent.setup>

/** Menambah Es Teh Manis (tanpa level pedas) sebanyak satu. */
async function addTea(user: User) {
  await user.click(
    await screen.findByRole('button', { name: 'Tambah Es Teh Manis' }),
  )
  const dialog = screen.getByRole('dialog', { name: 'Es Teh Manis' })
  await user.click(
    within(dialog).getByRole('button', { name: /tambah ke keranjang/i }),
  )
}

const cartBar = () => screen.getByRole('button', { name: /lihat pesanan/i })

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockResolvedValue(sampleMenu)
})

describe('keranjang di halaman menu', () => {
  it('tidak menampilkan bar keranjang saat keranjang kosong', async () => {
    renderOrderPage()

    await screen.findByText('Meja 5')

    expect(
      screen.queryByRole('button', { name: /lihat pesanan/i }),
    ).not.toBeInTheDocument()
  })

  it('menambah menu tanpa level pedas dengan jumlah dan memunculkan bar keranjang', async () => {
    const user = userEvent.setup()
    renderOrderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Tambah Es Teh Manis' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Es Teh Manis' })

    expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument()

    await user.click(
      within(dialog).getByRole('button', {
        name: 'Tambah jumlah Es Teh Manis',
      }),
    )
    await user.click(
      within(dialog).getByRole('button', { name: /tambah ke keranjang/i }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(cartBar()).toHaveTextContent(/Rp\s*10\.000/)
    expect(screen.getByText('2 di keranjang')).toBeInTheDocument()
  })

  it('menu dengan level pedas wajib memilih level dan catatan tampil di keranjang', async () => {
    const user = userEvent.setup()
    renderOrderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Tambah Mie Pedas Original' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Mie Pedas Original' })
    const submit = within(dialog).getByRole('button', {
      name: /tambah ke keranjang/i,
    })

    expect(submit).toBeDisabled()

    await user.click(within(dialog).getByRole('radio', { name: 'Level 3' }))
    await user.type(within(dialog).getByLabelText(/catatan/i), 'Tanpa bawang')
    await user.click(submit)

    await user.click(cartBar())

    const cart = screen.getByRole('dialog', { name: /pesanan anda/i })
    expect(within(cart).getByText('Mie Pedas Original')).toBeInTheDocument()
    expect(within(cart).getByText('Level 3')).toBeInTheDocument()
    expect(within(cart).getByText(/Tanpa bawang/)).toBeInTheDocument()
    expect(within(cart).getByText(/Meja 5/)).toBeInTheDocument()
  })

  it('menggabungkan penambahan menu yang sama menjadi satu baris', async () => {
    const user = userEvent.setup()
    renderOrderPage()

    await addTea(user)
    await addTea(user)

    expect(screen.getByText('2 di keranjang')).toBeInTheDocument()

    await user.click(cartBar())
    const cart = screen.getByRole('dialog', { name: /pesanan anda/i })

    expect(within(cart).getAllByRole('listitem')).toHaveLength(1)
  })

  it('mengubah jumlah dan menghapus item dari lembar keranjang', async () => {
    const user = userEvent.setup()
    renderOrderPage()

    await addTea(user)
    await user.click(cartBar())
    const cart = screen.getByRole('dialog', { name: /pesanan anda/i })

    await user.click(
      within(cart).getByRole('button', { name: 'Tambah jumlah Es Teh Manis' }),
    )

    // subtotal baris dan total sama-sama Rp 10.000
    expect(within(cart).getAllByText(/Rp\s*10\.000/)).toHaveLength(2)

    await user.click(
      within(cart).getByRole('button', { name: 'Hapus Es Teh Manis' }),
    )

    expect(
      within(cart).getByText(/keranjang masih kosong/i),
    ).toBeInTheDocument()

    await user.click(within(cart).getByRole('button', { name: 'Tutup' }))

    expect(
      screen.queryByRole('button', { name: /lihat pesanan/i }),
    ).not.toBeInTheDocument()
  })

  it('isi keranjang tetap ada saat halaman dimuat ulang', async () => {
    const user = userEvent.setup()
    const first = renderOrderPage()

    await addTea(user)
    first.unmount()

    renderOrderPage()

    expect(
      await screen.findByRole('button', { name: /lihat pesanan/i }),
    ).toHaveTextContent(/Rp\s*5\.000/)
  })

  it('menghapus menu yang sudah tidak tersedia dan menyamakan harga terbaru', async () => {
    useCartStore.setState({
      carts: {
        abc123: {
          updatedAt: Date.now(),
          lines: [
            makeLine({
              menuId: 999,
              name: 'Menu Lama',
              price: 9000,
              spiceLevel: null,
            }),
            makeLine({
              menuId: 20,
              name: 'Es Teh Manis',
              price: 1000,
              spiceLevel: null,
            }),
          ],
        },
      },
    })

    renderOrderPage()

    expect(
      await screen.findByText(/menu lama dihapus dari keranjang/i),
    ).toBeInTheDocument()
    // harga disamakan dengan menu terbaru (Rp 5.000), menu lama tidak ikut dihitung
    expect(cartBar()).toHaveTextContent(/Rp\s*5\.000/)
  })
})
