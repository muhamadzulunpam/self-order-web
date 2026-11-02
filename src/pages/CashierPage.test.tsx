import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONFIRM_WINDOW_MS } from '@/features/cashier/cashierLogic'
import { playNewOrderChime, unlockSound } from '@/features/kitchen/sound'
import {
  useCashierSoundStore,
  useKitchenSoundStore,
} from '@/features/kitchen/soundStore'
import { getRealtime } from '@/lib/realtime'
import type { ConnectionState } from '@/lib/realtimeClient'
import { signIn } from '@/test/auth'
import { createFakeRealtime } from '@/test/fakeRealtime'
import { makeStaffOrder } from '@/test/fixtures'
import { mockServer } from '@/test/mockServer'
import type { Handler, Reply } from '@/test/mockServer'
import type { StaffOrder } from '@/types/order'
import { CashierPage } from './CashierPage'

vi.mock('@/features/kitchen/sound', () => ({
  playNewOrderChime: vi.fn(() => true),
  unlockSound: vi.fn(async () => true),
}))

const mockChime = vi.mocked(playNewOrderChime)
const mockUnlock = vi.mocked(unlockSound)

type User = ReturnType<typeof userEvent.setup>

const ok = (orders: StaffOrder[]): Reply => ({
  status: 200,
  data: { data: orders },
})

const ready = (id = 1, table = 5) =>
  makeStaffOrder({ id, table_number: table, status: 'ready' })
const preparing = (id = 1, table = 5) =>
  makeStaffOrder({ id, table_number: table, status: 'preparing' })
const paid = (id = 1, table = 5) =>
  makeStaffOrder({ id, table_number: table, status: 'paid' })
const completed = (id = 1, table = 5) =>
  makeStaffOrder({ id, table_number: table, status: 'completed' })

function renderCashier(routes: Record<string, Handler> = {}) {
  signIn('cashier')

  const server = mockServer({ 'GET /staff/orders': ok([]), ...routes })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const view = render(
    <QueryClientProvider client={client}>
      <CashierPage />
    </QueryClientProvider>,
  )

  return { server, client, view, user: userEvent.setup() }
}

function renderLive(
  orders: StaffOrder[] = [],
  connection: ConnectionState = 'connected',
) {
  const fake = createFakeRealtime(connection)

  vi.mocked(getRealtime).mockReturnValue(fake.client)

  return { fake, ...renderCashier({ 'GET /staff/orders': ok(orders) }) }
}

const region = (name: string) => screen.getByRole('region', { name })

async function complete(user: User, table = 5) {
  await user.click(
    await screen.findByRole('button', { name: `Selesaikan meja ${table}` }),
  )
  await user.click(screen.getByRole('button', { name: 'Ya, sudah diserahkan' }))
}

const PATCH_1 = 'PATCH /staff/orders/1/status'

beforeEach(() => {
  vi.clearAllMocks()
  mockChime.mockReturnValue(true)
  mockUnlock.mockResolvedValue(true)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('layar kasir: tampilan', () => {
  it('menampilkan skeleton saat memuat', () => {
    renderCashier({ 'GET /staff/orders': () => new Promise<Reply>(() => {}) })

    expect(
      screen.getByRole('status', { name: 'Memuat pesanan' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Layar Kasir' }),
    ).toBeInTheDocument()
  })

  it('memisahkan pesanan siap dari yang masih diproses, dengan ringkasan jumlah', async () => {
    const { server } = renderCashier({
      'GET /staff/orders': ok([ready(1, 5), preparing(2, 7), paid(3, 9)]),
    })

    await screen.findByText('Meja 5')

    expect(
      within(region('Siap diserahkan')).getByText('Meja 5'),
    ).toBeInTheDocument()
    expect(
      within(region('Sedang diproses')).getByText('Meja 7'),
    ).toBeInTheDocument()
    expect(
      within(region('Sedang diproses')).getByText('Meja 9'),
    ).toBeInTheDocument()
    expect(
      within(region('Sedang diproses')).getByText('Dimasak'),
    ).toBeInTheDocument()
    expect(
      within(region('Sedang diproses')).getByText('Diterima'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('1 siap diserahkan · 2 sedang diproses'),
    ).toBeInTheDocument()
    expect(server.calls[0].authorization).toBe('Bearer test-token')
  })

  it('menampilkan pesan di bagian yang kosong', async () => {
    renderCashier()

    expect(
      await screen.findByText('Belum ada pesanan yang siap diserahkan.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Tidak ada pesanan yang sedang diproses.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Belum ada pesanan yang diselesaikan.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('0 siap diserahkan · 0 sedang diproses'),
    ).toBeInTheDocument()
  })

  it('kartu pesanan siap menampilkan rincian dan status lunas', async () => {
    renderCashier({
      'GET /staff/orders': ok([
        makeStaffOrder({
          id: 1,
          table_number: 12,
          status: 'ready',
          customer_name: 'Budi',
          notes: 'Antar ke dekat jendela',
          total_amount: 29000,
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
    expect(screen.getByText('Lunas')).toBeInTheDocument()
    expect(screen.getByText(/Rp\s*29\.000/)).toBeInTheDocument()
    expect(screen.getByText(/Mie Suit/)).toBeInTheDocument()
  })

  it('pesanan yang lebih dulu dibayar berada paling atas', async () => {
    renderCashier({
      'GET /staff/orders': ok([
        makeStaffOrder({
          id: 1,
          table_number: 1,
          status: 'ready',
          paid_at: new Date(Date.now() - 60_000).toISOString(),
        }),
        makeStaffOrder({
          id: 2,
          table_number: 2,
          status: 'ready',
          paid_at: new Date(Date.now() - 10 * 60_000).toISOString(),
        }),
      ]),
    })

    await screen.findByText('Meja 1')

    expect(
      within(region('Siap diserahkan'))
        .getAllByText(/^Meja \d+$/)
        .map((element) => element.textContent),
    ).toEqual(['Meja 2', 'Meja 1'])
  })

  it('bagian sedang diproses hanya untuk dibaca, tanpa tombol aksi', async () => {
    renderCashier({ 'GET /staff/orders': ok([preparing(2, 7), paid(3, 9)]) })

    await screen.findByText('Meja 7')

    expect(
      within(region('Sedang diproses')).queryByRole('button'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /selesaikan/i }),
    ).not.toBeInTheDocument()
  })
})

describe('layar kasir: gagal memuat', () => {
  it('menampilkan error dan bisa dicoba lagi', async () => {
    let attempts = 0
    const { user } = renderCashier({
      'GET /staff/orders': () =>
        ++attempts === 1
          ? { status: 429, data: { message: 'Terlalu banyak permintaan.' } }
          : ok([ready(1, 5)]),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Terlalu banyak permintaan.',
    )

    await user.click(screen.getByRole('button', { name: 'Coba lagi' }))

    expect(await screen.findByText('Meja 5')).toBeInTheDocument()
  })

  it('jika penyegaran gagal, data terakhir tetap tampil dengan peringatan', async () => {
    let attempts = 0
    const { user } = renderCashier({
      'GET /staff/orders': () =>
        ++attempts === 1 ? ok([ready(1, 5)]) : { status: 429 },
    })

    await screen.findByText('Meja 5')
    await user.click(screen.getByRole('button', { name: 'Segarkan' }))

    expect(
      await screen.findByText(/gagal menyegarkan daftar pesanan/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Meja 5')).toBeInTheDocument()
  })
})

describe('layar kasir: menyelesaikan pesanan', () => {
  it('ketukan pertama hanya meminta konfirmasi dan belum mengirim apa pun', async () => {
    const { server, user } = renderCashier({
      'GET /staff/orders': ok([ready()]),
    })

    await user.click(
      await screen.findByRole('button', { name: 'Selesaikan meja 5' }),
    )

    expect(
      screen.getByText('Pesanan sudah diserahkan ke pelanggan?'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Selesaikan meja 5' }),
    ).not.toBeInTheDocument()
    expect(server.callsTo(PATCH_1)).toHaveLength(0)
  })

  it('konfirmasi menyelesaikan pesanan, memindahkannya ke Baru selesai, tanpa memuat ulang daftar', async () => {
    const { server, user } = renderCashier({
      'GET /staff/orders': ok([ready()]),
      [PATCH_1]: { status: 200, data: { data: completed() } },
    })

    await complete(user)

    await vi.waitFor(() =>
      expect(
        within(region('Siap diserahkan')).queryByText('Meja 5'),
      ).not.toBeInTheDocument(),
    )
    expect(
      within(region('Baru selesai')).getByText('Meja 5'),
    ).toBeInTheDocument()
    expect(
      within(region('Baru selesai')).getByText(/Selesai baru saja/),
    ).toBeInTheDocument()
    expect(server.callsTo(PATCH_1)[0].body).toEqual({ status: 'completed' })
    expect(server.callsTo(PATCH_1)[0].authorization).toBe('Bearer test-token')
    expect(server.callsTo('GET /staff/orders')).toHaveLength(1)
    expect(
      screen.getByText('0 siap diserahkan · 0 sedang diproses'),
    ).toBeInTheDocument()
  })

  it('Batal mengembalikan tombol semula tanpa mengirim apa pun', async () => {
    const { server, user } = renderCashier({
      'GET /staff/orders': ok([ready()]),
    })

    await user.click(
      await screen.findByRole('button', { name: 'Selesaikan meja 5' }),
    )
    await user.click(screen.getByRole('button', { name: 'Batal' }))

    expect(
      screen.getByRole('button', { name: 'Selesaikan meja 5' }),
    ).toBeInTheDocument()
    expect(server.callsTo(PATCH_1)).toHaveLength(0)
  })

  it('konfirmasi kembali ke tombol semula jika tidak dilanjutkan', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { server } = renderCashier({ 'GET /staff/orders': ok([ready()]) })

    fireEvent.click(
      await screen.findByRole('button', { name: 'Selesaikan meja 5' }),
    )
    expect(
      screen.getByRole('button', { name: 'Ya, sudah diserahkan' }),
    ).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(CONFIRM_WINDOW_MS)
    })

    expect(
      screen.queryByRole('button', { name: 'Ya, sudah diserahkan' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Selesaikan meja 5' }),
    ).toBeInTheDocument()
    expect(server.callsTo(PATCH_1)).toHaveLength(0)
  })

  it('tidak mengirim dua kali saat tombol konfirmasi ditekan dua kali', async () => {
    const { server, user } = renderCashier({
      'GET /staff/orders': ok([ready()]),
      [PATCH_1]: () => new Promise<Reply>(() => {}),
    })

    await user.click(
      await screen.findByRole('button', { name: 'Selesaikan meja 5' }),
    )
    await user.dblClick(
      screen.getByRole('button', { name: 'Ya, sudah diserahkan' }),
    )

    await vi.waitFor(() => expect(server.callsTo(PATCH_1)).toHaveLength(1))
    expect(
      await screen.findByRole('button', { name: 'Memproses…' }),
    ).toBeDisabled()
  })

  it('beberapa pesanan yang diselesaikan berurutan: yang terbaru di atas', async () => {
    const { user } = renderCashier({
      'GET /staff/orders': ok([ready(1, 5), ready(2, 6)]),
      [PATCH_1]: { status: 200, data: { data: completed(1, 5) } },
      'PATCH /staff/orders/2/status': {
        status: 200,
        data: { data: completed(2, 6) },
      },
    })

    await complete(user, 5)
    await vi.waitFor(() =>
      expect(
        within(region('Baru selesai')).getByText('Meja 5'),
      ).toBeInTheDocument(),
    )
    await complete(user, 6)

    await vi.waitFor(() =>
      expect(
        within(region('Baru selesai')).getByText('Meja 6'),
      ).toBeInTheDocument(),
    )
    expect(
      within(region('Baru selesai'))
        .getAllByText(/^Meja \d+$/)
        .map((element) => element.textContent),
    ).toEqual(['Meja 6', 'Meja 5'])
  })

  it('409: menampilkan pesan, menyegarkan daftar, dan tidak mencatat pesanan sebagai selesai', async () => {
    let gets = 0
    const { server, user } = renderCashier({
      'GET /staff/orders': () => ok(++gets === 1 ? [ready()] : []),
      [PATCH_1]: {
        status: 409,
        data: { message: 'Pesanan sudah diselesaikan.' },
      },
    })

    await complete(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Meja 5: Pesanan ini sudah diubah oleh staf lain. Daftar disegarkan.',
    )
    await vi.waitFor(() =>
      expect(
        within(region('Siap diserahkan')).queryByText('Meja 5'),
      ).not.toBeInTheDocument(),
    )
    expect(server.callsTo('GET /staff/orders')).toHaveLength(2)
    expect(
      within(region('Baru selesai')).queryByText('Meja 5'),
    ).not.toBeInTheDocument()
  })

  it('403: menampilkan pesan tanpa menyegarkan daftar, dan tombol bisa dipakai lagi', async () => {
    const { server, user } = renderCashier({
      'GET /staff/orders': ok([ready()]),
      [PATCH_1]: { status: 403 },
    })

    await complete(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(/tidak berhak/i)
    expect(
      within(region('Siap diserahkan')).getByText('Meja 5'),
    ).toBeInTheDocument()
    expect(server.callsTo('GET /staff/orders')).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'Selesaikan meja 5' }),
    ).toBeEnabled()
  })

  it('jaringan putus: pesan belum terkirim dan pesanan tetap di tempatnya', async () => {
    const { user } = renderCashier({
      'GET /staff/orders': ok([ready()]),
      [PATCH_1]: 'network-error',
    })

    await complete(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /belum terkirim/i,
    )
    expect(
      within(region('Siap diserahkan')).getByText('Meja 5'),
    ).toBeInTheDocument()
    expect(
      within(region('Baru selesai')).queryByText('Meja 5'),
    ).not.toBeInTheDocument()
  })
})

describe('layar kasir: real-time', () => {
  it('berlangganan channel staf dan berhenti saat halaman ditutup', async () => {
    const { fake, view } = renderLive()

    await screen.findByText('Belum ada pesanan yang siap diserahkan.')
    expect(fake.subscribeStaff).toHaveBeenCalledTimes(1)

    view.unmount()

    expect(fake.unsubscribeStaff).toHaveBeenCalledTimes(1)
  })

  it('pesanan yang berubah menjadi siap muncul dengan penanda Baru siap dan bunyi', async () => {
    const { fake } = renderLive([preparing()])

    await screen.findByText('Meja 5')
    expect(
      within(region('Sedang diproses')).getByText('Meja 5'),
    ).toBeInTheDocument()

    act(() => {
      fake.emitStaff('updated', ready())
    })

    expect(
      await within(region('Siap diserahkan')).findByText('Meja 5'),
    ).toBeInTheDocument()
    expect(
      within(region('Sedang diproses')).queryByText('Meja 5'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Baru siap')).toBeInTheDocument()
    expect(mockChime).toHaveBeenCalledTimes(1)
  })

  it('event ganda untuk pesanan yang sama tidak berbunyi dua kali', async () => {
    const { fake } = renderLive([preparing()])

    await screen.findByText('Meja 5')
    act(() => {
      fake.emitStaff('updated', ready())
      fake.emitStaff('updated', ready())
    })

    await within(region('Siap diserahkan')).findByText('Meja 5')
    expect(mockChime).toHaveBeenCalledTimes(1)
  })

  it('pesanan yang sudah siap saat halaman dibuka tidak berbunyi dan tidak diberi penanda', async () => {
    renderLive([ready(1, 5), ready(2, 6)])

    await screen.findByText('Meja 6')

    expect(mockChime).not.toHaveBeenCalled()
    expect(screen.queryByText('Baru siap')).not.toBeInTheDocument()
  })

  it('pesanan yang baru dibayar muncul di Sedang diproses tanpa bunyi', async () => {
    const { fake } = renderLive([ready(1, 5)])

    await screen.findByText('Meja 5')
    act(() => {
      fake.emitStaff('paid', paid(2, 8))
    })

    expect(
      await within(region('Sedang diproses')).findByText('Meja 8'),
    ).toBeInTheDocument()
    expect(
      within(region('Sedang diproses')).getByText('Diterima'),
    ).toBeInTheDocument()
    expect(mockChime).not.toHaveBeenCalled()
  })

  it('pesanan yang mulai dimasak berpindah label di Sedang diproses', async () => {
    const { fake } = renderLive([paid()])

    await within(
      await screen.findByRole('region', { name: 'Sedang diproses' }),
    ).findByText('Diterima')
    act(() => {
      fake.emitStaff('updated', preparing())
    })

    expect(
      await within(region('Sedang diproses')).findByText('Dimasak'),
    ).toBeInTheDocument()
    expect(
      within(region('Sedang diproses')).queryByText('Diterima'),
    ).not.toBeInTheDocument()
    expect(mockChime).not.toHaveBeenCalled()
  })

  it('kabar usang tidak memundurkan pesanan dan tidak berbunyi', async () => {
    const { fake } = renderLive([ready()])

    await screen.findByText('Meja 5')
    act(() => {
      fake.emitStaff('updated', preparing())
    })

    expect(
      within(region('Siap diserahkan')).getByText('Meja 5'),
    ).toBeInTheDocument()
    expect(
      within(region('Sedang diproses')).queryByText('Meja 5'),
    ).not.toBeInTheDocument()
    expect(mockChime).not.toHaveBeenCalled()
  })

  it('pesanan yang diselesaikan staf lain hilang dari papan dan tercatat di Baru selesai', async () => {
    const { fake } = renderLive([ready()])

    await screen.findByText('Meja 5')
    act(() => {
      fake.emitStaff('updated', completed())
    })

    await vi.waitFor(() =>
      expect(
        within(region('Siap diserahkan')).queryByText('Meja 5'),
      ).not.toBeInTheDocument(),
    )
    expect(
      within(region('Baru selesai')).getByText('Meja 5'),
    ).toBeInTheDocument()
    expect(mockChime).not.toHaveBeenCalled()
  })

  it('selesai lewat aksi sendiri lalu event yang sama: tercatat sekali saja', async () => {
    const { fake, user } = renderLive([ready()])

    // renderLive tidak menyediakan rute PATCH, jadi daftarkan lewat server yang sama.
    mockServer({
      'GET /staff/orders': ok([ready()]),
      [PATCH_1]: { status: 200, data: { data: completed() } },
    })

    await complete(user)
    await vi.waitFor(() =>
      expect(
        within(region('Baru selesai')).getByText('Meja 5'),
      ).toBeInTheDocument(),
    )

    act(() => {
      fake.emitStaff('updated', completed())
    })

    expect(within(region('Baru selesai')).getAllByText('Meja 5')).toHaveLength(
      1,
    )
  })

  it('pesanan siap yang terlewat selama terputus terdeteksi saat berlangganan ulang dan berbunyi', async () => {
    let gets = 0
    const fake = createFakeRealtime('connected')
    vi.mocked(getRealtime).mockReturnValue(fake.client)
    renderCashier({
      'GET /staff/orders': () => ok(++gets === 1 ? [preparing()] : [ready()]),
    })

    await screen.findByText('Meja 5')
    act(() => {
      fake.staffSubscribed()
    })

    expect(
      await within(region('Siap diserahkan')).findByText('Meja 5'),
    ).toBeInTheDocument()
    expect(mockChime).toHaveBeenCalledTimes(1)
  })

  it('suara yang dimatikan tidak berbunyi, tetapi pesanan tetap muncul', async () => {
    useCashierSoundStore.setState({ enabled: false })
    const { fake } = renderLive([preparing()])

    await screen.findByText('Meja 5')
    act(() => {
      fake.emitStaff('updated', ready())
    })

    expect(
      await within(region('Siap diserahkan')).findByText('Meja 5'),
    ).toBeInTheDocument()
    expect(mockChime).not.toHaveBeenCalled()
  })

  it('penanda Baru siap hilang setelah beberapa saat', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { fake } = renderLive([preparing()])

    await screen.findByText('Meja 5')
    act(() => {
      fake.emitStaff('updated', ready())
    })

    expect(await screen.findByText('Baru siap')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(15_000)
    })

    expect(screen.queryByText('Baru siap')).not.toBeInTheDocument()
  })
})

describe('layar kasir: indikator koneksi dan suara', () => {
  it('tanpa real-time: pemeriksaan berkala', async () => {
    renderCashier()

    await screen.findByText('Belum ada pesanan yang siap diserahkan.')

    expect(screen.getByText(/diperiksa otomatis/i)).toBeInTheDocument()
  })

  it('tersambung dan channel berhasil berlangganan: pembaruan langsung aktif', async () => {
    const { fake } = renderLive()

    await screen.findByText('Belum ada pesanan yang siap diserahkan.')
    act(() => {
      fake.staffSubscribed()
    })

    expect(
      await screen.findByText('Pembaruan langsung aktif'),
    ).toBeInTheDocument()
  })

  it('saklar suara memakai pengaturan kasir yang terpisah dari dapur', async () => {
    const { user } = renderCashier()
    const toggle = await screen.findByRole('switch', {
      name: 'Suara pesanan siap',
    })

    expect(toggle).toBeChecked()

    await user.click(toggle)

    expect(toggle).not.toBeChecked()
    expect(useCashierSoundStore.getState().enabled).toBe(false)
    expect(useKitchenSoundStore.getState().enabled).toBe(true)

    await user.click(toggle)

    expect(useCashierSoundStore.getState().enabled).toBe(true)
    await vi.waitFor(() => expect(mockChime).toHaveBeenCalledTimes(1))
  })

  it('menampilkan petunjuk jika browser memblokir suara, dan hilang setelah layar disentuh', async () => {
    mockChime.mockReturnValue(false)
    const { fake, user } = renderLive([preparing()])

    await screen.findByText('Meja 5')
    act(() => {
      fake.emitStaff('updated', ready())
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
