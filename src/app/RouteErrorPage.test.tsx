import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouteErrorPage } from './RouteErrorPage'

function renderThrowing(error: unknown) {
  vi.spyOn(console, 'error').mockImplementation(() => {})

  const Thrower = (): ReactElement => {
    throw error
  }

  const router = createMemoryRouter([
    { path: '/', element: <Thrower />, errorElement: <RouteErrorPage /> },
  ])

  render(<RouterProvider router={router} />)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RouteErrorPage', () => {
  it('menampilkan halaman error untuk crash tak terduga dengan jalan keluar', () => {
    renderThrowing(new Error('meledak'))

    expect(screen.getByRole('alert')).toHaveTextContent('Terjadi kesalahan')
    expect(
      screen.getByRole('button', { name: 'Muat ulang' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ke beranda' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('mencatat error ke konsol', () => {
    renderThrowing(new Error('meledak'))

    expect(console.error).toHaveBeenCalled()
  })

  it('memberi pesan khusus jika potongan kode gagal dimuat setelah deploy', () => {
    renderThrowing(
      new Error('Failed to fetch dynamically imported module: /assets/x.js'),
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Aplikasi baru saja diperbarui',
    )
    expect(screen.getByText(/memakai versi terbaru/i)).toBeInTheDocument()
  })
})
