import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })

  return render(<RouterProvider router={router} />)
}

describe('routes', () => {
  it('menampilkan beranda di /', () => {
    renderAt('/')

    expect(screen.getByText(/scan qr code/i)).toBeInTheDocument()
  })

  it('menampilkan halaman login staf', () => {
    renderAt('/staff/login')

    expect(
      screen.getByRole('heading', { name: 'Login Staf' }),
    ).toBeInTheDocument()
  })

  it('menampilkan halaman 404 untuk path yang tidak dikenal', () => {
    renderAt('/ngawur')

    expect(screen.getByText(/halaman tidak ditemukan/i)).toBeInTheDocument()
  })
})
