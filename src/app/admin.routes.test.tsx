import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { listReply, menuPage } from '@/test/adminFixtures'
import { signIn } from '@/test/auth'
import { mockServer } from '@/test/mockServer'
import type { Role } from '@/features/auth/types'
import { routes } from './routes'

function renderAt(path: string, role: Role = 'admin') {
  signIn(role)
  mockServer({
    'GET /admin/menus': menuPage([]),
    'GET /admin/categories': listReply([]),
    'GET /admin/dining-tables': listReply([]),
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

  return { router, user: userEvent.setup() }
}

describe('rute panel admin', () => {
  it('/staff/admin diarahkan ke tab Menu dan menampilkan navigasi tab', async () => {
    const { router } = renderAt('/staff/admin')

    expect(
      await screen.findByRole('heading', { name: 'Panel Admin' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/staff/admin/menus')

    const nav = screen.getByRole('navigation', { name: 'Menu admin' })

    expect(within(nav).getByRole('link', { name: 'Menu' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      within(nav).getByRole('link', { name: 'Kategori' }),
    ).not.toHaveAttribute('aria-current')
    expect(within(nav).getByRole('link', { name: 'Meja' })).toBeInTheDocument()
  })

  it('berpindah antar tab', async () => {
    const { router, user } = renderAt('/staff/admin/menus')
    const nav = await screen.findByRole('navigation', { name: 'Menu admin' })

    await user.click(within(nav).getByRole('link', { name: 'Kategori' }))

    expect(
      await screen.findByRole('heading', { name: 'Kategori' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/staff/admin/categories')

    await user.click(within(nav).getByRole('link', { name: 'Meja' }))

    expect(
      await screen.findByRole('heading', { name: 'Meja' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/staff/admin/tables')
  })

  it.each(['cashier', 'kitchen'] as const)(
    '%s tidak bisa membuka halaman admin',
    async (role) => {
      renderAt('/staff/admin/tables', role)

      expect(
        await screen.findByRole('heading', { name: 'Akses ditolak' }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: 'Panel Admin' }),
      ).not.toBeInTheDocument()
    },
  )
})
