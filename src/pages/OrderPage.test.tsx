import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchTableMenu } from '@/features/menu/api'
import { ApiError } from '@/lib/api'
import { sampleMenu } from '@/test/fixtures'
import type { TableMenu } from '@/types/menu'
import { OrderPage } from './OrderPage'

vi.mock('@/features/menu/api', () => ({ fetchTableMenu: vi.fn() }))

const mockFetch = vi.mocked(fetchTableMenu)

function renderOrderPage(token = 'abc123') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createMemoryRouter(
    [{ path: '/order/:token', element: <OrderPage /> }],
    { initialEntries: [`/order/${token}`] },
  )

  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockFetch.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('OrderPage', () => {
  it('memuat menu memakai token dari URL', async () => {
    mockFetch.mockResolvedValue(sampleMenu)

    renderOrderPage('abc123')

    await screen.findByText('Meja 5')
    expect(mockFetch).toHaveBeenCalledWith('abc123')
  })

  it('menampilkan skeleton saat memuat', () => {
    mockFetch.mockReturnValue(new Promise<TableMenu>(() => {}))

    renderOrderPage()

    expect(
      screen.getByRole('status', { name: /memuat menu/i }),
    ).toBeInTheDocument()
  })

  it('menampilkan nomor meja, kategori, dan kartu menu', async () => {
    mockFetch.mockResolvedValue(sampleMenu)

    renderOrderPage()

    expect(await screen.findByText('Meja 5')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mie' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Minuman' })).toBeInTheDocument()
    expect(screen.getByText('Mie Pedas Original')).toBeInTheDocument()
    expect(screen.getByText('Mie dengan bumbu pedas khas.')).toBeInTheDocument()
    expect(screen.getByText(/Rp\s*12\.000/)).toBeInTheDocument()
    expect(screen.getByText(/Rp\s*5\.000/)).toBeInTheDocument()
  })

  it('menampilkan gambar jika ada dan placeholder jika tidak ada', async () => {
    mockFetch.mockResolvedValue(sampleMenu)

    renderOrderPage()

    const image = await screen.findByRole('img', { name: 'Mie Pedas Original' })
    expect(image).toHaveAttribute(
      'src',
      'http://localhost:8000/storage/menus/mie.jpg',
    )
    expect(screen.getAllByText('Tanpa foto')).toHaveLength(2)
  })

  it('menandai hanya menu yang punya level pedas', async () => {
    mockFetch.mockResolvedValue(sampleMenu)

    renderOrderPage()

    await screen.findByText('Meja 5')
    expect(screen.getAllByText('Ada level pedas')).toHaveLength(1)
  })

  it('menggulir ke kategori dan menyorot chip saat ditekan', async () => {
    mockFetch.mockResolvedValue(sampleMenu)
    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')
    const user = userEvent.setup()

    renderOrderPage()

    const nav = await screen.findByRole('navigation', {
      name: 'Kategori menu',
    })
    const mie = within(nav).getByRole('button', { name: 'Mie' })
    const minuman = within(nav).getByRole('button', { name: 'Minuman' })

    expect(mie).toHaveAttribute('aria-current', 'true')

    await user.click(minuman)

    expect(scrollSpy).toHaveBeenCalled()
    expect(minuman).toHaveAttribute('aria-current', 'true')
    expect(mie).not.toHaveAttribute('aria-current')
  })

  it('menampilkan pesan khusus untuk token yang tidak valid', async () => {
    mockFetch.mockRejectedValue(
      new ApiError(404, 'Meja tidak ditemukan atau tidak aktif.'),
    )

    renderOrderPage('token-ngawur')

    expect(
      await screen.findByRole('heading', { name: /meja tidak ditemukan/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /coba lagi/i }),
    ).not.toBeInTheDocument()
  })

  it('menampilkan error dan bisa dicoba lagi', async () => {
    mockFetch
      .mockRejectedValueOnce(new ApiError(429, 'Terlalu banyak permintaan.'))
      .mockResolvedValueOnce(sampleMenu)
    const user = userEvent.setup()

    renderOrderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Terlalu banyak permintaan.',
    )

    await user.click(screen.getByRole('button', { name: /coba lagi/i }))

    expect(await screen.findByText('Meja 5')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('menampilkan pesan jika belum ada menu yang tersedia', async () => {
    mockFetch.mockResolvedValue({ table: { number: 3 }, categories: [] })

    renderOrderPage()

    expect(await screen.findByText('Meja 3')).toBeInTheDocument()
    expect(screen.getByText(/belum ada menu/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Kategori menu' }),
    ).not.toBeInTheDocument()
  })
})
