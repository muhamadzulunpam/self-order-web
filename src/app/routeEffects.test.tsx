import { act, render, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })

  render(<RouterProvider router={router} />)

  return router
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('efek rute', () => {
  it('beranda memakai nama aplikasi saja sebagai judul', async () => {
    renderAt('/')

    await waitFor(() => expect(document.title).toBe('Self-Order'))
  })

  it('halaman login staf punya judul sendiri', async () => {
    renderAt('/staff/login')

    await waitFor(() => expect(document.title).toBe('Login staf · Self-Order'))
  })

  it('halaman yang tidak ditemukan punya judul sendiri', async () => {
    renderAt('/ngawur')

    await waitFor(() =>
      expect(document.title).toBe('Halaman tidak ditemukan · Self-Order'),
    )
  })

  it('judul berubah dan halaman digulir ke atas saat berpindah halaman', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo')
    const router = renderAt('/')

    await waitFor(() => expect(document.title).toBe('Self-Order'))
    scrollTo.mockClear()

    await act(async () => {
      await router.navigate('/staff/login')
    })

    await waitFor(() => expect(document.title).toBe('Login staf · Self-Order'))
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })
})
