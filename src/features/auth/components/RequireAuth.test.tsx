import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  RouterProvider,
  createMemoryRouter,
  useLocation,
} from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { makeUser, signIn } from '@/test/auth'
import { mockServer } from '@/test/mockServer'
import { useAuthStore } from '../store'
import type { Role } from '../types'
import { RequireAuth } from './RequireAuth'

function LoginProbe() {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  return <p>LOGIN from={from ?? 'none'}</p>
}

function renderGuard(path = '/staff/area', roles?: readonly Role[]) {
  const router = createMemoryRouter(
    [
      { path: '/staff/login', element: <LoginProbe /> },
      {
        path: '/staff/area',
        element: <RequireAuth roles={roles} />,
        children: [{ index: true, element: <p>KONTEN RAHASIA</p> }],
      },
    ],
    { initialEntries: [path] },
  )

  return render(<RouterProvider router={router} />)
}

describe('RequireAuth', () => {
  it('pengguna belum login diarahkan ke login dengan mengingat halaman tujuan', async () => {
    renderGuard('/staff/area?x=1')

    expect(
      await screen.findByText('LOGIN from=/staff/area?x=1'),
    ).toBeInTheDocument()
    expect(screen.queryByText('KONTEN RAHASIA')).not.toBeInTheDocument()
  })

  it('pengguna yang sudah login melihat konten', () => {
    signIn('kitchen')

    renderGuard()

    expect(screen.getByText('KONTEN RAHASIA')).toBeInTheDocument()
  })

  it('memulihkan sesi dari token yang tersimpan', async () => {
    useAuthStore.setState({ token: 'saved', status: 'idle' })
    const server = mockServer({
      'GET /auth/me': { status: 200, data: { data: makeUser('kitchen') } },
    })

    renderGuard()

    expect(
      screen.getByRole('status', { name: 'Memeriksa sesi' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('KONTEN RAHASIA')).toBeInTheDocument()
    expect(server.callsTo('GET /auth/me')).toHaveLength(1)
    expect(server.calls[0].authorization).toBe('Bearer saved')
  })

  it('token kedaluwarsa saat dipulihkan: ke halaman login dengan alasan kedaluwarsa', async () => {
    useAuthStore.setState({ token: 'basi', status: 'idle' })
    mockServer({ 'GET /auth/me': { status: 401 } })

    renderGuard()

    expect(
      await screen.findByText('LOGIN from=/staff/area'),
    ).toBeInTheDocument()
    expect(useAuthStore.getState().endReason).toBe('expired')
  })

  it('gagal memverifikasi karena jaringan: tidak logout dan bisa dicoba lagi', async () => {
    useAuthStore.setState({ token: 'saved', status: 'idle' })
    let attempts = 0
    mockServer({
      'GET /auth/me': () =>
        ++attempts === 1
          ? 'network-error'
          : { status: 200, data: { data: makeUser('kitchen') } },
    })
    const user = userEvent.setup()

    renderGuard()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /sesi belum bisa diverifikasi/i,
    )
    expect(useAuthStore.getState().token).toBe('saved')

    await user.click(screen.getByRole('button', { name: /coba lagi/i }))

    expect(await screen.findByText('KONTEN RAHASIA')).toBeInTheDocument()
  })

  it('role yang tidak sesuai mendapat halaman akses ditolak dengan tautan ke halamannya', () => {
    signIn('cashier')

    renderGuard('/staff/area', ['kitchen', 'admin'])

    expect(
      screen.getByRole('heading', { name: 'Akses ditolak' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Kasir/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Ke halaman saya' }),
    ).toHaveAttribute('href', '/staff/cashier')
    expect(screen.queryByText('KONTEN RAHASIA')).not.toBeInTheDocument()
  })

  it('role yang sesuai melihat konten', () => {
    signIn('kitchen')

    renderGuard('/staff/area', ['kitchen', 'admin'])

    expect(screen.getByText('KONTEN RAHASIA')).toBeInTheDocument()
  })

  it('sesi habis saat halaman dibuka: diarahkan ke login', async () => {
    signIn('kitchen')
    renderGuard()
    expect(screen.getByText('KONTEN RAHASIA')).toBeInTheDocument()

    act(() => {
      useAuthStore.getState().handleUnauthorized('test-token')
    })

    expect(
      await screen.findByText('LOGIN from=/staff/area'),
    ).toBeInTheDocument()
  })

  it('logout sengaja: diarahkan ke login tanpa mengingat halaman', async () => {
    signIn('kitchen')
    mockServer({
      'POST /auth/logout': { status: 200, data: { message: 'ok' } },
    })
    renderGuard()

    act(() => {
      useAuthStore.getState().logout()
    })

    expect(await screen.findByText('LOGIN from=none')).toBeInTheDocument()
  })
})
