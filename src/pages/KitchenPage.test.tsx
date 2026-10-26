// src/pages/KitchenPage.test.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playNewOrderChime, unlockSound } from '@/features/kitchen/sound'
import { useKitchenSoundStore } from '@/features/kitchen/soundStore'
import { getRealtime } from '@/lib/realtime'
import type { ConnectionState } from '@/lib/realtimeClient'
import { signIn } from '@/test/auth'
import { createFakeRealtime } from '@/test/fakeRealtime'
import { makeStaffOrder } from '@/test/fixtures'
import { mockServer } from '@/test/mockServer'
import type { Handler, Reply } from '@/test/mockServer'
import type { StaffOrder } from '@/types/order'
import { KitchenPage } from './KitchenPage'

vi.mock('@/features/kitchen/sound', () => ({
  playNewOrderChime: vi.fn(() => true),
  unlockSound: vi.fn(async () => true),
}))

const mockChime = vi.mocked(playNewOrderChime)
const mockUnlock = vi.mocked(unlockSound)

const ok = (orders: StaffOrder[]): Reply => ({
  status: 200,
  data: { data: orders },
})

function renderKitchen(routes: Record<string, Handler> = {}) {
  signIn('kitchen')

  const server = mockServer({ 'GET /staff/orders': ok([]), ...routes })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={client}>
      <KitchenPage />
    </QueryClientProvider>,
  )

  return { server, client, user: userEvent.setup() }
}

function renderLive(
  orders: StaffOrder[] = [],
  connection: ConnectionState = 'connected',
) {
  const fake = createFakeRealtime(connection)

  vi.mocked(getRealtime).mockReturnValue(fake.client)

  return { fake, ...renderKitchen({ 'GET /staff/orders': ok(orders) }) }
}

const column = (name: string) => screen.getByRole('region', { name })

beforeEach(() => {
  vi.clearAllMocks()
  mockChime.mockReturnValue(true)
  mockUnlock.mockResolvedValue(true)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('papan dapur: tampilan', () => {
  it('menampilkan skeleton saat memuat', () => {
    renderKitchen({
      'GET /staff/orders': () => new Promise<Reply>(() => {}),
    })

    expect(
      screen.getByRole('status', { name: 'Memuat pesanan' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Layar Dapur' }),
    ).toBeInTheDocument()
  })

  it('mengambil pesanan dengan token staf dan mengelompokkannya per kolom', async () => {
    const { server } = renderKitchen({
      'GET /staff/orders': ok([
        makeStaffOrder({ id: 1, table_number: 5 }),
        makeStaffOrder({ id: 2, table_number: 7, status: 'preparing' }),
        makeStaffOrder({ id: 3, table_number: 9, status: 'ready' }),
      ]),
    })

    expect(
      await within(
        await screen.findByRole('region', { name: 'Diterima' }),
      ).findByText('Meja 5'),
    ).toBeInTheDocument()
    expect(within(column('Dimasak')).getByText('Meja 7')).toBeInTheDocument()
    expect(
      within(column('Siap diantar')).getByText('Meja 9'),
    ).toBeInTheDocument()
    expect(server.calls[0].authorization).toBe('Bearer test-token')
    expect(screen.getByText('3 pesanan aktif')).toBeInTheDocument()
    expect(
      within(column('Diterima')).getByLabelText('1 pesanan'),
    ).toBeInTheDocument()
  })

  it('kolom kosong menampilkan pesan', async () => {
    renderKitchen()

    expect(
      await screen.findByText('Belum ada pesanan masuk.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Tidak ada yang sedang dimasak.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Belum ada yang siap.')).toBeInTheDocument()
    expect(screen.getByText('0 pesanan aktif')).toBeInTheDocument()
  })

  it('kartu menampilkan rincian pesanan', async () => {
    renderKitchen({
      'GET /staff/orders': ok([
        makeStaffOrder({
          id: 1,
          table_number: 12,
          customer_name: 'Budi',
          notes: 'Antar ke dekat jendela',
          paid_at: new Date(Date.now() - 5 * 60_000).toISOString(),
          items: [
            {
              id: 1,
              menu_name: 'Mie Suit',
              quantity: 2,
              spice_level: 3,
              notes: 'tanpa bawang',
            },
            {
              id: 2,
              menu_name: 'Es Teh',
              quantity: 1,
              spice_level: null,
              notes: null,
            },
          ],
        }),
      ]),
    })

    expect(await screen.findByText('Meja 12')).toBeInTheDocument()
    expect(screen.getByText('ORD-TEST-1')).toBeInTheDocument()
    expect(screen.getByText('Budi')).toBeInTheDocument()
    expect(screen.getByText('Level 3')).toBeInTheDocument()
    expect(screen.getByText('Catatan: tanpa bawang')).toBeInTheDocument()
    expect(
      screen.getByText('Catatan pesanan: Antar ke dekat jendela'),
    ).toBeInTheDocument()
    expect(screen.getByText('Dibayar 5 menit lalu')).toBeInTheDocument()
    expect(screen.getByText(/Mie Suit/)).toBeInTheDocument()
    expect(screen.getByText(/Es Teh/)).toBeInTheDocument()
  })

  it('pesanan yang lebih dulu dibayar berada paling atas', async () => {
    renderKitchen({
      'GET /staff/orders': ok([
        makeStaffOrder({
          id: 1,
          table_number: 1,
          paid_at: new Date(Date.now() - 60_000).toISOString(),
        }),
        makeStaffOrder({
          id: 2,
          table_number: 2,
          paid_at: new Date(Date.now() - 10 * 60_000).toISOString(),
        }),
      ]),
    })

    await screen.findByText('Meja 1')

    expect(
      within(column('Diterima'))
        .getAllByText(/^Meja \d+$/)
        .map((el) => el.textContent),
    ).toEqual(['Meja 2', 'Meja 1'])
  })

  it('kolom siap diantar tidak punya tombol aksi', async () => {
    renderKitchen({
      'GET /staff/orders': ok([
        makeStaffOrder({ id: 3, table_number: 9, status: 'ready' }),
      ]),
    })

    await screen.findByText('Meja 9')

    expect(
      within(column('Siap diantar')).queryByRole('button'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/menunggu diantar atau diserahkan kasir/i),
    ).toBeInTheDocument()
  })
})

describe('papan dapur: gagal memuat', () => {
  it('menampilkan error dan bisa dicoba lagi', async () => {
    let attempts = 0
    const { user } = renderKitchen({
      'GET /staff/orders': () =>
        ++attempts === 1
          ? { status: 429, data: { message: 'Terlalu banyak permintaan.' } }
          : ok([makeStaffOrder({ id: 1, table_number: 5 })]),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Terlalu banyak permintaan.',
    )
    expect(
      screen.getByRole('heading', { name: 'Layar Dapur' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Coba lagi' }))

    expect(await screen.findByText('Meja 5')).toBeInTheDocument()
  })

  it('jika penyegaran gagal, data terakhir tetap tampil dengan peringatan', async () => {
    let attempts = 0
    const { user } = renderKitchen({
      'GET /staff/orders': () =>
        ++attempts === 1
          ? ok([makeStaffOrder({ id: 1, table_number: 5 })])
          : { status: 429 },
    })

    await screen.findByText('Meja 5')
    await user.click(screen.getByRole('button', { name: 'Segarkan' }))

    expect(
      await screen.findByText(/gagal menyegarkan daftar pesanan/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Meja 5')).toBeInTheDocument()
  })
})

describe('papan dapur: tombol aksi', () => {
  const paid = makeStaffOrder({ id: 1, table_number: 5 })
  const preparing = makeStaffOrder({
    id: 1,
    table_number: 5,
    status: 'preparing',
  })
  const ready = makeStaffOrder({ id: 1, table_number: 5, status: 'ready' })

  it('Mulai masak mengubah status dan memindahkan kartu ke kolom Dimasak', async () => {
    const { server, user } = renderKitchen({
      'GET /staff/orders': ok([paid]),
      'PATCH /staff/orders/1/status': {
        status: 200,
        data: { data: preparing },
      },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Mulai masak meja 5' }),
    )

    expect(
      await within(column('Dimasak')).findByText('Meja 5'),
    ).toBeInTheDocument()
    expect(
      within(column('Diterima')).queryByText('Meja 5'),
    ).not.toBeInTheDocument()
    expect(server.callsTo('PATCH /staff/orders/1/status')[0].body).toEqual({
      status: 'preparing',
    })
    expect(server.callsTo('GET /staff/orders')).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'Tandai siap meja 5' }),
    ).toBeInTheDocument()
  })

  it('Tandai siap memindahkan kartu ke kolom Siap diantar', async () => {
    const { server, user } = renderKitchen({
      'GET /staff/orders': ok([preparing]),
      'PATCH /staff/orders/1/status': { status: 200, data: { data: ready } },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Tandai siap meja 5' }),
    )

    expect(
      await within(column('Siap diantar')).findByText('Meja 5'),
    ).toBeInTheDocument()
    expect(server.callsTo('PATCH /staff/orders/1/status')[0].body).toEqual({
      status: 'ready',
    })
    expect(
      within(column('Siap diantar')).queryByRole('button'),
    ).not.toBeInTheDocument()
  })

  it('tombol dikunci selama diproses dan tidak mengirim dua kali', async () => {
    const { server, user } = renderKitchen({
      'GET /staff/orders': ok([paid]),
      'PATCH /staff/orders/1/status': () => new Promise<Reply>(() => {}),
    })
    const button = await screen.findByRole('button', {
      name: 'Mulai masak meja 5',
    })

    await user.dblClick(button)

    await vi.waitFor(() =>
      expect(server.callsTo('PATCH /staff/orders/1/status')).toHaveLength(1),
    )
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Memproses…')
  })

  it('409: menampilkan pesan, menyegarkan daftar, dan kartu mengikuti keadaan server', async () => {
    let gets = 0
    const { server, user } = renderKitchen({
      'GET /staff/orders': () => ok(++gets === 1 ? [paid] : [preparing]),
      'PATCH /staff/orders/1/status': {
        status: 409,
        data: {
          message: "Pesanan berstatus 'Sedang dimasak' tidak bisa diubah.",
        },
      },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Mulai masak meja 5' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Meja 5: Pesanan ini sudah diubah oleh staf lain. Daftar disegarkan.',
    )
    expect(
      await within(column('Dimasak')).findByText('Meja 5'),
    ).toBeInTheDocument()
    expect(server.callsTo('GET /staff/orders')).toHaveLength(2)
  })

  it('403: menampilkan pesan tanpa menyegarkan daftar', async () => {
    const { server, user } = renderKitchen({
      'GET /staff/orders': ok([paid]),
      'PATCH /staff/orders/1/status': { status: 403 },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Mulai masak meja 5' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/tidak berhak/i)
    expect(within(column('Diterima')).getByText('Meja 5')).toBeInTheDocument()
    expect(server.callsTo('GET /staff/orders')).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'Mulai masak meja 5' }),
    ).toBeEnabled()
  })

  it('jaringan putus: pesan belum terkirim dan tombol bisa dipakai lagi', async () => {
    const { user } = renderKitchen({
      'GET /staff/orders': ok([paid]),
      'PATCH /staff/orders/1/status': 'network-error',
    })

    await user.click(
      await screen.findByRole('button', { name: 'Mulai masak meja 5' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /belum terkirim/i,
    )
    expect(
      screen.getByRole('button', { name: 'Mulai masak meja 5' }),
    ).toBeEnabled()
  })

  it('spanduk error bisa ditutup', async () => {
    const { user } = renderKitchen({
      'GET /staff/orders': ok([paid]),
      'PATCH /staff/orders/1/status': { status: 403 },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Mulai masak meja 5' }),
    )
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Tutup' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('percobaan berikutnya menghapus pesan error sebelumnya', async () => {
    let attempts = 0
    const { user } = renderKitchen({
      'GET /staff/orders': ok([paid]),
      'PATCH /staff/orders/1/status': () =>
        ++attempts === 1
          ? { status: 403 }
          : { status: 200, data: { data: preparing } },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Mulai masak meja 5' }),
    )
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Mulai masak meja 5' }))

    expect(
      await within(column('Dimasak')).findByText('Meja 5'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

it('berlangganan channel staf dan berhenti saat halaman ditutup', async () => {
  const fake = createFakeRealtime('connected')
  vi.mocked(getRealtime).mockReturnValue(fake.client)
  signIn('kitchen')
  mockServer({
    'GET /staff/orders': ok([]),
  })

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const view = render(
    <QueryClientProvider client={client}>
      <KitchenPage />
    </QueryClientProvider>,
  )

  await screen.findByText('Belum ada pesanan masuk.')
  expect(fake.subscribeStaff).toHaveBeenCalledTimes(1)

  view.unmount()

  expect(fake.unsubscribeStaff).toHaveBeenCalledTimes(1)
})

describe('papan dapur: indikator koneksi', () => {
  it('tanpa real-time: pemeriksaan berkala', async () => {
    renderKitchen()

    await screen.findByText('Belum ada pesanan masuk.')

    expect(screen.getByText(/diperiksa otomatis/i)).toBeInTheDocument()
    expect(
      screen.queryByText('Pembaruan langsung aktif'),
    ).not.toBeInTheDocument()
  })

  it('tersambung dan channel berhasil berlangganan: pembaruan langsung aktif', async () => {
    const { fake } = renderLive()

    await screen.findByText('Belum ada pesanan masuk.')
    act(() => {
      fake.staffSubscribed()
    })

    expect(
      await screen.findByText('Pembaruan langsung aktif'),
    ).toBeInTheDocument()
  })

  it('tersambung tetapi channel belum berlangganan: belum dianggap langsung', async () => {
    renderLive()

    await screen.findByText('Belum ada pesanan masuk.')

    expect(screen.getByText(/diperiksa otomatis/i)).toBeInTheDocument()
  })

  it('otorisasi channel gagal: kembali ke pemeriksaan berkala', async () => {
    const { fake } = renderLive()

    await screen.findByText('Belum ada pesanan masuk.')
    act(() => {
      fake.staffSubscribed()
    })
    await screen.findByText('Pembaruan langsung aktif')

    act(() => {
      fake.staffError()
    })

    expect(await screen.findByText(/diperiksa otomatis/i)).toBeInTheDocument()
  })

  it('koneksi terputus: kembali ke pemeriksaan berkala', async () => {
    const { fake } = renderLive()

    await screen.findByText('Belum ada pesanan masuk.')
    act(() => {
      fake.staffSubscribed()
    })
    await screen.findByText('Pembaruan langsung aktif')

    act(() => {
      fake.setState('disconnected')
    })

    expect(await screen.findByText(/diperiksa otomatis/i)).toBeInTheDocument()
  })
})

describe('papan dapur: suara', () => {
  it('saklar mematikan dan menyalakan suara serta menyimpan pilihan', async () => {
    const { user } = renderKitchen()
    const toggle = await screen.findByRole('switch', {
      name: 'Suara pesanan baru',
    })

    expect(toggle).toBeChecked()

    await user.click(toggle)

    expect(toggle).not.toBeChecked()
    expect(useKitchenSoundStore.getState().enabled).toBe(false)
    expect(mockChime).not.toHaveBeenCalled()

    await user.click(toggle)

    expect(toggle).toBeChecked()
    expect(useKitchenSoundStore.getState().enabled).toBe(true)
    // menyalakan suara membuka kunci dan memutar contoh bunyi
    await vi.waitFor(() => expect(mockChime).toHaveBeenCalledTimes(1))
  })

  it('menampilkan petunjuk jika browser memblokir suara, dan hilang setelah layar disentuh', async () => {
    mockChime.mockReturnValue(false)
    const { fake, user } = renderLive([
      makeStaffOrder({ id: 1, table_number: 5 }),
    ])

    await screen.findByText('Meja 5')
    act(() => {
      fake.emitStaff('paid', makeStaffOrder({ id: 2, table_number: 8 }))
    })

    expect(
      await screen.findByText(/suara belum aktif karena browser/i),
    ).toBeInTheDocument()

    await user.click(document.body)

    await vi.waitFor(() =>
      expect(
        screen.queryByText(/suara belum aktif karena browser/i),
      ).not.toBeInTheDocument(),
    )
    expect(mockUnlock).toHaveBeenCalled()
  })
})
