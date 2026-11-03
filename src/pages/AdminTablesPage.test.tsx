import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { listReply, makeAdminTable } from '@/test/adminFixtures'
import { renderAdmin } from '@/test/adminRender'
import type { Reply } from '@/test/mockServer'
import { AdminTablesPage } from './AdminTablesPage'

const LIST = 'GET /admin/dining-tables'

const lima = makeAdminTable({
  id: 1,
  number: 5,
  is_active: true,
  orders_count: 3,
})
const enam = makeAdminTable({
  id: 2,
  number: 6,
  is_active: false,
  orders_count: 0,
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AdminTablesPage: tampilan', () => {
  it('menampilkan skeleton saat memuat', () => {
    renderAdmin(<AdminTablesPage />, {
      [LIST]: () => new Promise<Reply>(() => {}),
    })

    expect(
      screen.getByRole('status', { name: 'Memuat meja' }),
    ).toBeInTheDocument()
  })

  it('menampilkan daftar meja dengan status dan jumlah pesanan', async () => {
    const { server } = renderAdmin(<AdminTablesPage />, {
      [LIST]: listReply([lima, enam]),
    })

    expect(await screen.findByText('Meja 5')).toBeInTheDocument()
    expect(screen.getByText('Meja 6')).toBeInTheDocument()
    expect(screen.getByText('3 pesanan')).toBeInTheDocument()
    expect(screen.getByText('Aktif')).toBeInTheDocument()
    expect(screen.getByText('Nonaktif')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Nonaktifkan meja 5' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Aktifkan meja 6' }),
    ).toBeInTheDocument()
    expect(server.calls[0].authorization).toBe('Bearer test-token')
  })

  it('menampilkan pesan jika belum ada meja', async () => {
    renderAdmin(<AdminTablesPage />, { [LIST]: listReply([]) })

    expect(await screen.findByText('Belum ada meja.')).toBeInTheDocument()
  })

  it('menampilkan error dan bisa dicoba lagi', async () => {
    let attempts = 0
    const { user } = renderAdmin(<AdminTablesPage />, {
      [LIST]: () =>
        ++attempts === 1
          ? { status: 429, data: { message: 'Terlalu banyak permintaan.' } }
          : listReply([lima]),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Terlalu banyak permintaan.',
    )

    await user.click(screen.getByRole('button', { name: 'Coba lagi' }))

    expect(await screen.findByText('Meja 5')).toBeInTheDocument()
  })
})

describe('AdminTablesPage: tambah dan ubah', () => {
  it('menambah meja dan token dibuat server', async () => {
    const { server, user } = renderAdmin(<AdminTablesPage />, {
      [LIST]: listReply([lima]),
      'POST /admin/dining-tables': {
        status: 201,
        data: { data: makeAdminTable({ id: 3, number: 11 }) },
      },
    })

    await user.click(await screen.findByRole('button', { name: 'Tambah meja' }))
    const dialog = screen.getByRole('dialog', { name: 'Tambah meja' })

    expect(
      within(dialog).getByLabelText('Aktif (bisa dipakai pembeli)'),
    ).toBeChecked()

    await user.type(within(dialog).getByLabelText('Nomor meja'), '11')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByText('Meja 11 ditambahkan.')).toBeInTheDocument()
    expect(server.callsTo('POST /admin/dining-tables')[0].body).toEqual({
      number: 11,
      is_active: true,
    })
    await vi.waitFor(() => expect(server.callsTo(LIST)).toHaveLength(2))
  })

  it('nomor yang tidak valid tidak dikirim', async () => {
    const { server, user } = renderAdmin(<AdminTablesPage />, {
      [LIST]: listReply([]),
    })

    await user.click(await screen.findByRole('button', { name: 'Tambah meja' }))
    const dialog = screen.getByRole('dialog', { name: 'Tambah meja' })
    await user.type(within(dialog).getByLabelText('Nomor meja'), 'abc')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(
      within(dialog).getByText('Nomor meja harus bilangan bulat 1 sampai 999.'),
    ).toBeInTheDocument()
    expect(server.callsTo('POST /admin/dining-tables')).toHaveLength(0)
  })

  it('nomor yang sudah dipakai (422) tampil di bawah kolom', async () => {
    const { user } = renderAdmin(<AdminTablesPage />, {
      [LIST]: listReply([lima]),
      'POST /admin/dining-tables': {
        status: 422,
        data: { errors: { number: ['The number has already been taken.'] } },
      },
    })

    await user.click(await screen.findByRole('button', { name: 'Tambah meja' }))
    const dialog = screen.getByRole('dialog', { name: 'Tambah meja' })
    await user.type(within(dialog).getByLabelText('Nomor meja'), '5')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(
      await within(dialog).findByText('Nomor meja sudah dipakai.'),
    ).toBeInTheDocument()
  })

  it('mengubah meja: nomor dan status dikirim bersamaan', async () => {
    const { server, user } = renderAdmin(<AdminTablesPage />, {
      [LIST]: listReply([lima]),
      'PUT /admin/dining-tables/1': { status: 200, data: { data: lima } },
    })

    await user.click(await screen.findByRole('button', { name: 'Ubah meja 5' }))
    const dialog = screen.getByRole('dialog', { name: 'Ubah meja' })

    expect(within(dialog).getByLabelText('Nomor meja')).toHaveValue('5')

    await user.click(
      within(dialog).getByLabelText('Aktif (bisa dipakai pembeli)'),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByText('Meja 5 diperbarui.')).toBeInTheDocument()
    expect(server.callsTo('PUT /admin/dining-tables/1')[0].body).toEqual({
      number: 5,
      is_active: false,
    })
  })

  it('menonaktifkan meja dengan satu ketukan', async () => {
    const { server, user } = renderAdmin(<AdminTablesPage />, {
      [LIST]: listReply([lima]),
      'PUT /admin/dining-tables/1': {
        status: 200,
        data: { data: { ...lima, is_active: false } },
      },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Nonaktifkan meja 5' }),
    )

    expect(await screen.findByText('Meja 5 dinonaktifkan.')).toBeInTheDocument()
    expect(server.callsTo('PUT /admin/dining-tables/1')[0].body).toEqual({
      number: 5,
      is_active: false,
    })
  })
})

describe('AdminTablesPage: hapus dan buat ulang token', () => {
  it('menghapus meja setelah konfirmasi', async () => {
    const { server, user } = renderAdmin(<AdminTablesPage />, {
      [LIST]: listReply([lima]),
      'DELETE /admin/dining-tables/1': { status: 200, data: { message: 'ok' } },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Hapus meja 5' }),
    )
    await user.click(
      within(screen.getByRole('dialog', { name: 'Hapus meja' })).getByRole(
        'button',
        {
          name: 'Hapus',
        },
      ),
    )

    expect(await screen.findByText('Meja 5 dihapus.')).toBeInTheDocument()
    expect(server.callsTo('DELETE /admin/dining-tables/1')).toHaveLength(1)
  })

  it('meja yang punya riwayat pesanan (409) tidak terhapus', async () => {
    const { user } = renderAdmin(<AdminTablesPage />, {
      [LIST]: listReply([lima]),
      'DELETE /admin/dining-tables/1': { status: 409 },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Hapus meja 5' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Hapus meja' })
    await user.click(within(dialog).getByRole('button', { name: 'Hapus' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      /riwayat pesanan/i,
    )
  })

  it('membuat ulang token hanya setelah konfirmasi dan mengingatkan QR lama mati', async () => {
    const { server, user } = renderAdmin(<AdminTablesPage />, {
      [LIST]: listReply([lima]),
      'POST /admin/dining-tables/1/regenerate-token': {
        status: 200,
        data: { data: lima },
      },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Buat ulang token meja 5' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Buat ulang token QR' })

    expect(
      within(dialog).getByText(/langsung tidak berlaku/i),
    ).toBeInTheDocument()
    expect(
      server.callsTo('POST /admin/dining-tables/1/regenerate-token'),
    ).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: 'Buat ulang' }))

    expect(
      await screen.findByText(/Token meja 5 dibuat ulang/),
    ).toBeInTheDocument()
    expect(
      server.callsTo('POST /admin/dining-tables/1/regenerate-token'),
    ).toHaveLength(1)
  })
})

describe('AdminTablesPage: QR code', () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'

  it('menampilkan QR code beserta tautan dan mengunduhnya sebagai SVG', async () => {
    const downloads: string[] = []

    vi.spyOn(HTMLElement.prototype, 'click').mockImplementation(function (
      this: HTMLElement,
    ) {
      downloads.push((this as HTMLAnchorElement).download)
    })
    URL.createObjectURL = vi.fn(() => 'blob:qr')
    URL.revokeObjectURL = vi.fn()

    try {
      const { server, user } = renderAdmin(<AdminTablesPage />, {
        [LIST]: listReply([lima]),
        'GET /admin/dining-tables/1/qr': { status: 200, data: svg },
      })

      await user.click(
        await screen.findByRole('button', { name: 'Lihat QR meja 5' }),
      )
      const dialog = screen.getByRole('dialog', { name: 'QR meja 5' })
      const image = await within(dialog).findByRole('img', {
        name: 'QR code meja 5',
      })

      expect(image.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
      expect(
        within(dialog).getByText('http://localhost:5173/order/token-1'),
      ).toBeInTheDocument()
      expect(
        within(dialog).getByRole('link', { name: 'Buka halaman pesan' }),
      ).toHaveAttribute('href', 'http://localhost:5173/order/token-1')
      expect(
        server.callsTo('GET /admin/dining-tables/1/qr')[0].authorization,
      ).toBe('Bearer test-token')

      await user.click(
        within(dialog).getByRole('button', { name: 'Unduh SVG' }),
      )

      expect(downloads).toEqual(['meja-5.svg'])
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    } finally {
      Reflect.deleteProperty(URL, 'createObjectURL')
      Reflect.deleteProperty(URL, 'revokeObjectURL')
    }
  })

  it('meja nonaktif menampilkan peringatan di lembar QR', async () => {
    const { user } = renderAdmin(<AdminTablesPage />, {
      [LIST]: listReply([enam]),
      'GET /admin/dining-tables/2/qr': { status: 200, data: svg },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Lihat QR meja 6' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'QR meja 6' })

    await within(dialog).findByRole('img', { name: 'QR code meja 6' })
    expect(within(dialog).getByText(/meja ini nonaktif/i)).toBeInTheDocument()
  })

  it('gagal memuat QR menampilkan error dan bisa dicoba lagi', async () => {
    let attempts = 0
    const { user } = renderAdmin(<AdminTablesPage />, {
      [LIST]: listReply([lima]),
      'GET /admin/dining-tables/1/qr': () =>
        ++attempts === 1 ? { status: 429 } : { status: 200, data: svg },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Lihat QR meja 5' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'QR meja 5' })

    expect(await within(dialog).findByRole('alert')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Coba lagi' }))

    expect(
      await within(dialog).findByRole('img', { name: 'QR code meja 5' }),
    ).toBeInTheDocument()
  })
})
