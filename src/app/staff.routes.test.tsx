import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { signIn } from '@/test/auth'
import { mockServer } from '@/test/mockServer'
import type { Handler } from '@/test/mockServer'
import { routes } from './routes'

function renderAt(path: string, extra: Record<string, Handler> = {}) {
  const server = mockServer({
    'GET /staff/orders': { status: 200, data: { data: [] } },
    ...extra,
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createMemoryRouter(routes, { initialEntries: [path] })

  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { router, server }
}

describe('rute staf', () => {
  it('belum login: diarahkan ke halaman login', async () => {
    const { router } = renderAt('/staff/kitchen')

    expect(
      await screen.findByRole('heading', { name: 'Login Staf' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/staff/login')
  })

  it('jalur staf yang tidak dikenal menampilkan 404', async () => {
    renderAt('/staff/ngawur')

    expect(
      await screen.findByText(/halaman tidak ditemukan/i),
    ).toBeInTheDocument()
  })

  it('dapur: /staff diteruskan ke layar dapur', async () => {
    signIn('kitchen')

    renderAt('/staff')

    expect(
      await screen.findByRole('heading', { name: 'Layar Dapur' }),
    ).toBeInTheDocument()
  })

  it('kasir: /staff diteruskan ke layar kasir', async () => {
    signIn('cashier')

    renderAt('/staff')

    expect(
      await screen.findByRole('heading', { name: 'Layar Kasir' }),
    ).toBeInTheDocument()
  })

  it.each(['/staff/cashier', '/staff/admin'])(
    'dapur tidak bisa membuka %s',
    async (path) => {
      signIn('kitchen')

      renderAt(path)

      expect(
        await screen.findByRole('heading', { name: 'Akses ditolak' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'Ke halaman saya' }),
      ).toHaveAttribute('href', '/staff/kitchen')
      // tombol keluar tetap tersedia di halaman akses ditolak
      expect(screen.getByRole('button', { name: 'Keluar' })).toBeInTheDocument()
    },
  )

  it.each(['/staff/kitchen', '/staff/admin'])(
    'kasir tidak bisa membuka %s',
    async (path) => {
      signIn('cashier')

      renderAt(path)

      expect(
        await screen.findByRole('heading', { name: 'Akses ditolak' }),
      ).toBeInTheDocument()
    },
  )

  it('admin melihat beranda staf dengan semua area', async () => {
    signIn('admin')

    renderAt('/staff')

    expect(
      await screen.findByRole('heading', { name: 'Beranda staf' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /layar dapur/i })).toHaveAttribute(
      'href',
      '/staff/kitchen',
    )
    expect(screen.getByRole('link', { name: /layar kasir/i })).toHaveAttribute(
      'href',
      '/staff/cashier',
    )
    expect(screen.getByRole('link', { name: /panel admin/i })).toHaveAttribute(
      'href',
      '/staff/admin',
    )
  })

  it.each([
    ['/staff/kitchen', 'Layar Dapur'],
    ['/staff/cashier', 'Layar Kasir'],
    ['/staff/admin', 'Panel Admin'],
  ])('admin bisa membuka %s', async (path, heading) => {
    signIn('admin')

    renderAt(path)

    expect(
      await screen.findByRole('heading', { name: heading }),
    ).toBeInTheDocument()
  })

  it('header menampilkan nama dan role pengguna', async () => {
    signIn('kitchen')

    renderAt('/staff/kitchen')

    // Header staf dicari lewat nama pengguna, karena layar dapur punya <header> sendiri.
    const header = (await screen.findByText('Budi Dapur')).closest('header')

    expect(header).not.toBeNull()
    expect(within(header as HTMLElement).getByText('Dapur')).toBeInTheDocument()
    expect(
      within(header as HTMLElement).getByRole('button', { name: 'Keluar' }),
    ).toBeInTheDocument()
  })

  it('tombol Keluar mengakhiri sesi, memberi tahu server, dan kembali ke login', async () => {
    signIn('kitchen')
    const user = userEvent.setup()
    const { router, server } = renderAt('/staff/kitchen', {
      'POST /auth/logout': { status: 200, data: { message: 'ok' } },
    })

    await user.click(await screen.findByRole('button', { name: 'Keluar' }))

    expect(
      await screen.findByRole('heading', { name: 'Login Staf' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/staff/login')
    expect(
      (router.state.location.state as { from?: string } | null)?.from,
    ).toBeUndefined()
    expect(useAuthStore.getState().token).toBeNull()
    expect(
      screen.queryByRole('heading', { name: 'Layar Dapur' }),
    ).not.toBeInTheDocument()

    await vi.waitFor(() =>
      expect(server.callsTo('POST /auth/logout')).toHaveLength(1),
    )
    expect(server.callsTo('POST /auth/logout')[0].authorization).toBe(
      'Bearer test-token',
    )
  })

  it('setelah logout, membuka layar staf lagi diarahkan ke login', async () => {
    signIn('kitchen')
    const user = userEvent.setup()
    const { router } = renderAt('/staff/kitchen', {
      'POST /auth/logout': { status: 200, data: { message: 'ok' } },
    })

    await user.click(await screen.findByRole('button', { name: 'Keluar' }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/staff/login'),
    )

    await act(async () => {
      await router.navigate('/staff/kitchen')
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/staff/login')
      expect(
        screen.getByRole('heading', { name: 'Login Staf' }),
      ).toBeInTheDocument()
    })
    expect(
      screen.queryByRole('heading', { name: 'Layar Dapur' }),
    ).not.toBeInTheDocument()
  })
})
