import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import type { Role } from '@/features/auth/types'
import { makeUser, signIn } from '@/test/auth'
import { mockServer } from '@/test/mockServer'
import type { Reply } from '@/test/mockServer'
import { StaffLoginPage } from './StaffLoginPage'

type Entry = string | { pathname: string; state?: unknown }
type User = ReturnType<typeof userEvent.setup>

function renderLogin(entry: Entry = '/staff/login') {
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>BERANDA</p> },
      { path: '/staff/login', element: <StaffLoginPage /> },
      { path: '/staff', element: <p>HUB ADMIN</p> },
      { path: '/staff/kitchen', element: <p>HALAMAN DAPUR</p> },
      { path: '/staff/cashier', element: <p>HALAMAN KASIR</p> },
      { path: '/staff/admin', element: <p>HALAMAN ADMIN</p> },
    ],
    { initialEntries: [entry] },
  )

  render(<RouterProvider router={router} />)

  return userEvent.setup()
}

const loginOk = (role: Role): Reply => ({
  status: 200,
  data: { data: { user: makeUser(role), token: 'tok-123' } },
})

async function fill(
  user: User,
  email = 'dapur@example.com',
  password = 'rahasia',
) {
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Kata sandi'), password)
}

const submit = (user: User) =>
  user.click(screen.getByRole('button', { name: 'Masuk' }))

describe('StaffLoginPage', () => {
  it('menampilkan form login', () => {
    renderLogin()

    expect(
      screen.getByRole('heading', { name: 'Login Staf' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Kata sandi')).toHaveAttribute(
      'type',
      'password',
    )
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeEnabled()
  })

  it('form kosong: menampilkan error, memfokuskan email, dan tidak memanggil server', async () => {
    const server = mockServer({})
    const user = renderLogin()

    await submit(user)

    expect(screen.getByText('Email wajib diisi.')).toBeInTheDocument()
    expect(screen.getByText('Kata sandi wajib diisi.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveFocus()
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(server.calls).toHaveLength(0)
  })

  it('format email tidak valid ditolak di sisi klien', async () => {
    const server = mockServer({})
    const user = renderLogin()

    await fill(user, 'bukan-email', 'rahasia')
    await submit(user)

    expect(screen.getByText('Format email tidak valid.')).toBeInTheDocument()
    expect(server.calls).toHaveLength(0)
  })

  it('kata sandi kosong memfokuskan kolom kata sandi', async () => {
    mockServer({})
    const user = renderLogin()

    await user.type(screen.getByLabelText('Email'), 'dapur@example.com')
    await submit(user)

    expect(screen.getByText('Kata sandi wajib diisi.')).toBeInTheDocument()
    expect(screen.getByLabelText('Kata sandi')).toHaveFocus()
  })

  it('login dapur berhasil: email dirapikan dan menuju layar dapur', async () => {
    const server = mockServer({ 'POST /auth/login': loginOk('kitchen') })
    const user = renderLogin()

    await fill(user, '  dapur@example.com ', 'rahasia')
    await submit(user)

    expect(await screen.findByText('HALAMAN DAPUR')).toBeInTheDocument()
    expect(server.calls[0].body).toEqual({
      email: 'dapur@example.com',
      password: 'rahasia',
    })
    expect(useAuthStore.getState()).toMatchObject({
      token: 'tok-123',
      status: 'authenticated',
    })
  })

  it.each<[Role, string]>([
    ['cashier', 'HALAMAN KASIR'],
    ['admin', 'HUB ADMIN'],
  ])('login %s menuju halaman utamanya', async (role, expected) => {
    mockServer({ 'POST /auth/login': loginOk(role) })
    const user = renderLogin()

    await fill(user)
    await submit(user)

    expect(await screen.findByText(expected)).toBeInTheDocument()
  })

  it('kembali ke halaman yang tadi dituju jika boleh diakses', async () => {
    mockServer({ 'POST /auth/login': loginOk('admin') })
    const user = renderLogin({
      pathname: '/staff/login',
      state: { from: '/staff/kitchen' },
    })

    await fill(user)
    await submit(user)

    expect(await screen.findByText('HALAMAN DAPUR')).toBeInTheDocument()
  })

  it('mengabaikan halaman tujuan yang tidak boleh diakses role-nya', async () => {
    mockServer({ 'POST /auth/login': loginOk('cashier') })
    const user = renderLogin({
      pathname: '/staff/login',
      state: { from: '/staff/admin' },
    })

    await fill(user)
    await submit(user)

    expect(await screen.findByText('HALAMAN KASIR')).toBeInTheDocument()
  })

  it('mengabaikan tujuan di luar area staf', async () => {
    mockServer({ 'POST /auth/login': loginOk('kitchen') })
    const user = renderLogin({
      pathname: '/staff/login',
      state: { from: 'https://evil.example' },
    })

    await fill(user)
    await submit(user)

    expect(await screen.findByText('HALAMAN DAPUR')).toBeInTheDocument()
  })

  it('kredensial salah (422): menampilkan pesan, mengosongkan kata sandi, memfokuskannya, dan menjaga email', async () => {
    mockServer({
      'POST /auth/login': {
        status: 422,
        data: {
          message: 'The given data was invalid.',
          errors: { email: ['Email atau password salah.'] },
        },
      },
    })
    const user = renderLogin()

    await fill(user)
    await submit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email atau kata sandi salah.',
    )
    expect(screen.getByLabelText('Email')).toHaveValue('dapur@example.com')
    expect(screen.getByLabelText('Kata sandi')).toHaveValue('')
    expect(screen.getByLabelText('Kata sandi')).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeEnabled()
    expect(useAuthStore.getState().status).toBe('anonymous')
  })

  it.each<[string, Reply, RegExp]>([
    ['terlalu banyak percobaan', { status: 429 }, /terlalu banyak percobaan/i],
    ['server error', { status: 500 }, /server sedang bermasalah/i],
    ['jaringan putus', 'network-error', /tidak dapat terhubung/i],
  ])('%s: menampilkan pesan yang sesuai', async (_name, reply, pattern) => {
    mockServer({ 'POST /auth/login': reply })
    const user = renderLogin()

    await fill(user)
    await submit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(pattern)
  })

  it('bisa mencoba lagi setelah gagal', async () => {
    let attempts = 0
    mockServer({
      'POST /auth/login': () =>
        ++attempts === 1 ? { status: 422 } : loginOk('kitchen'),
    })
    const user = renderLogin()

    await fill(user)
    await submit(user)
    await screen.findByRole('alert')

    await user.type(screen.getByLabelText('Kata sandi'), 'benar')
    await submit(user)

    expect(await screen.findByText('HALAMAN DAPUR')).toBeInTheDocument()
  })

  it('tidak mengirim dua kali saat tombol ditekan dua kali', async () => {
    const server = mockServer({
      'POST /auth/login': () => new Promise<Reply>(() => {}),
    })
    const user = renderLogin()

    await fill(user)
    await user.dblClick(screen.getByRole('button', { name: 'Masuk' }))

    await vi.waitFor(() =>
      expect(server.callsTo('POST /auth/login')).toHaveLength(1),
    )
    expect(screen.getByRole('button', { name: 'Memproses…' })).toBeDisabled()
  })

  it('menampilkan pemberitahuan jika sesi sebelumnya habis', () => {
    useAuthStore.setState({ endReason: 'expired' })

    renderLogin()

    expect(screen.getByRole('status')).toHaveTextContent(
      /sesi anda telah berakhir/i,
    )
  })

  it('tidak menampilkan pemberitahuan pada kunjungan biasa atau setelah logout', () => {
    useAuthStore.setState({ endReason: 'logout' })

    renderLogin()

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('pengguna yang sudah login langsung diarahkan pergi', async () => {
    signIn('kitchen')

    renderLogin()

    expect(await screen.findByText('HALAMAN DAPUR')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('token tersimpan: memeriksa sesi lalu mengarahkan pergi', async () => {
    useAuthStore.setState({ token: 'saved', status: 'idle' })
    mockServer({
      'GET /auth/me': { status: 200, data: { data: makeUser('kitchen') } },
    })

    renderLogin()

    expect(
      screen.getByRole('status', { name: 'Memeriksa sesi' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('HALAMAN DAPUR')).toBeInTheDocument()
  })
})
