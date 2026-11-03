import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  listReply,
  makeAdminCategory,
  makeAdminMenu,
  menuPage,
} from '@/test/adminFixtures'
import { renderAdmin } from '@/test/adminRender'
import type { Reply } from '@/test/mockServer'
import { AdminMenusPage } from './AdminMenusPage'

const MENUS = 'GET /admin/menus'
const CATEGORIES = 'GET /admin/categories'

const categoriesReply = listReply([
  makeAdminCategory({ id: 1, name: 'Mie' }),
  makeAdminCategory({ id: 2, name: 'Minuman' }),
])

const mie = makeAdminMenu({
  id: 1,
  name: 'Mie Suit',
  description: 'Enak',
  price: 12000,
  has_spice_level: true,
  is_available: true,
  image_url: 'http://localhost:8000/storage/menus/mie.jpg',
  category: { id: 1, name: 'Mie' },
})

describe('AdminMenusPage: tampilan', () => {
  it('menampilkan skeleton saat memuat', () => {
    renderAdmin(<AdminMenusPage />, {
      [MENUS]: () => new Promise<Reply>(() => {}),
      [CATEGORIES]: categoriesReply,
    })

    expect(
      screen.getByRole('status', { name: 'Memuat menu' }),
    ).toBeInTheDocument()
  })

  it('menampilkan daftar menu dengan kategori, harga, status, dan penanda level pedas', async () => {
    const { server } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([
        mie,
        makeAdminMenu({
          id: 2,
          name: 'Es Teh',
          price: 5000,
          is_available: false,
          category: { id: 2, name: 'Minuman' },
        }),
      ]),
      [CATEGORIES]: categoriesReply,
    })

    expect(await screen.findByText('Mie Suit')).toBeInTheDocument()
    expect(screen.getByText(/Mie · Rp\s*12\.000/)).toBeInTheDocument()
    expect(screen.getByText(/Minuman · Rp\s*5\.000/)).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Tersedia: Mie Suit' }),
    ).toBeChecked()
    expect(
      screen.getByRole('switch', { name: 'Tersedia: Es Teh' }),
    ).not.toBeChecked()
    expect(screen.getAllByText('Ada level pedas')).toHaveLength(1)
    expect(screen.getByText('2 menu')).toBeInTheDocument()
    expect(server.callsTo(MENUS)[0].params).toEqual({ page: 1 })
    expect(server.callsTo(MENUS)[0].authorization).toBe('Bearer test-token')
  })

  it('menampilkan pesan jika belum ada menu', async () => {
    renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([]),
      [CATEGORIES]: categoriesReply,
    })

    expect(await screen.findByText('Belum ada menu.')).toBeInTheDocument()
  })

  it('menampilkan error dan bisa dicoba lagi', async () => {
    let attempts = 0
    const { user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: () =>
        ++attempts === 1
          ? { status: 429, data: { message: 'Terlalu banyak permintaan.' } }
          : menuPage([mie]),
      [CATEGORIES]: categoriesReply,
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Terlalu banyak permintaan.',
    )

    await user.click(screen.getByRole('button', { name: 'Coba lagi' }))

    expect(await screen.findByText('Mie Suit')).toBeInTheDocument()
  })

  it('tanpa kategori: tombol tambah nonaktif dan ada petunjuk', async () => {
    renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([]),
      [CATEGORIES]: listReply([]),
    })

    expect(await screen.findByText(/belum ada kategori/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tambah menu' })).toBeDisabled()
  })
})

describe('AdminMenusPage: filter dan pagination', () => {
  it('filter kategori mengirim category_id dan kembali ke halaman 1', async () => {
    const { server, user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([mie]),
      [CATEGORIES]: categoriesReply,
    })

    await screen.findByRole('option', { name: 'Minuman' })
    await user.selectOptions(screen.getByLabelText('Filter kategori'), '2')

    await vi.waitFor(() => expect(server.callsTo(MENUS)).toHaveLength(2))
    expect(server.callsTo(MENUS)[1].params).toEqual({ page: 1, category_id: 2 })
  })

  it('filter ketersediaan mengirim is_available', async () => {
    const { server, user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([mie]),
      [CATEGORIES]: categoriesReply,
    })

    await screen.findByText('Mie Suit')
    await user.selectOptions(
      screen.getByLabelText('Filter ketersediaan'),
      'unavailable',
    )

    await vi.waitFor(() => expect(server.callsTo(MENUS)).toHaveLength(2))
    expect(server.callsTo(MENUS)[1].params).toEqual({
      page: 1,
      is_available: 0,
    })
  })

  it('pencarian dijalankan lewat tombol Cari dan nilainya dirapikan', async () => {
    const { server, user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([mie]),
      [CATEGORIES]: categoriesReply,
    })

    await user.type(await screen.findByLabelText('Cari menu'), '  teh ')
    await user.click(screen.getByRole('button', { name: 'Cari' }))

    await vi.waitFor(() => expect(server.callsTo(MENUS)).toHaveLength(2))
    expect(server.callsTo(MENUS)[1].params).toEqual({ page: 1, search: 'teh' })
  })

  it('hasil filter yang kosong memakai pesan khusus', async () => {
    let calls = 0
    const { user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: () => (++calls === 1 ? menuPage([mie]) : menuPage([])),
      [CATEGORIES]: categoriesReply,
    })

    await user.type(await screen.findByLabelText('Cari menu'), 'zzz')
    await user.click(screen.getByRole('button', { name: 'Cari' }))

    expect(
      await screen.findByText('Tidak ada menu yang cocok dengan filter.'),
    ).toBeInTheDocument()
  })

  it('pagination berpindah halaman', async () => {
    const { server, user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: (call) => {
        const page = (call.params as { page: number }).page

        return menuPage(
          [makeAdminMenu({ id: page, name: `Menu halaman ${page}` })],
          {
            current_page: page,
            last_page: 3,
            total: 3,
          },
        )
      },
      [CATEGORIES]: categoriesReply,
    })

    expect(await screen.findByText('Menu halaman 1')).toBeInTheDocument()
    expect(screen.getByText('Halaman 1 dari 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sebelumnya' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Berikutnya' }))

    expect(await screen.findByText('Menu halaman 2')).toBeInTheDocument()
    expect(server.callsTo(MENUS)[1].params).toEqual({ page: 2 })
    expect(screen.getByRole('button', { name: 'Sebelumnya' })).toBeEnabled()
  })
})

describe('AdminMenusPage: aksi', () => {
  it('mengubah ketersediaan dengan satu ketukan', async () => {
    const { server, user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([mie]),
      [CATEGORIES]: categoriesReply,
      'POST /admin/menus/1': {
        status: 200,
        data: { data: { ...mie, is_available: false } },
      },
    })

    await user.click(
      await screen.findByRole('switch', { name: 'Tersedia: Mie Suit' }),
    )

    expect(
      await screen.findByText('Menu "Mie Suit" dinonaktifkan.'),
    ).toBeInTheDocument()

    const body = server.callsTo('POST /admin/menus/1')[0].body as FormData

    expect(Object.fromEntries(body.entries())).toEqual({
      _method: 'PUT',
      category_id: '1',
      name: 'Mie Suit',
      description: 'Enak',
      price: '12000',
      has_spice_level: '1',
      is_available: '0',
    })
    await vi.waitFor(() => expect(server.callsTo(MENUS)).toHaveLength(2))
  })

  it('gagal mengubah ketersediaan menampilkan pesan error', async () => {
    const { user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([mie]),
      [CATEGORIES]: categoriesReply,
      'POST /admin/menus/1': { status: 403 },
    })

    await user.click(
      await screen.findByRole('switch', { name: 'Tersedia: Mie Suit' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/tidak berhak/i)
    expect(
      screen.getByRole('switch', { name: 'Tersedia: Mie Suit' }),
    ).toBeEnabled()
  })

  it('menghapus menu setelah konfirmasi', async () => {
    const { server, user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([mie]),
      [CATEGORIES]: categoriesReply,
      'DELETE /admin/menus/1': { status: 200, data: { message: 'ok' } },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Hapus Mie Suit' }),
    )
    await user.click(
      within(screen.getByRole('dialog', { name: 'Hapus menu' })).getByRole(
        'button',
        {
          name: 'Hapus',
        },
      ),
    )

    expect(
      await screen.findByText('Menu "Mie Suit" dihapus.'),
    ).toBeInTheDocument()
    expect(server.callsTo('DELETE /admin/menus/1')).toHaveLength(1)
  })

  it('menu yang sudah pernah dipesan (409) tidak terhapus dan alasannya jelas', async () => {
    const { user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([mie]),
      [CATEGORIES]: categoriesReply,
      'DELETE /admin/menus/1': {
        status: 409,
        data: { message: 'Menu sudah pernah dipesan dan tidak bisa dihapus.' },
      },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Hapus Mie Suit' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Hapus menu' })
    await user.click(within(dialog).getByRole('button', { name: 'Hapus' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      /sudah pernah dipesan/i,
    )
    expect(
      screen.getByRole('dialog', { name: 'Hapus menu' }),
    ).toBeInTheDocument()
  })
})

describe('AdminMenusPage: formulir', () => {
  async function openCreate(user: ReturnType<typeof renderAdmin>['user']) {
    const add = await screen.findByRole('button', { name: 'Tambah menu' })

    await vi.waitFor(() => expect(add).toBeEnabled())
    await user.click(add)

    return screen.getByRole('dialog', { name: 'Tambah menu' })
  }

  it('menambah menu dengan gambar dan mengirimnya sebagai form-data', async () => {
    const { server, user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([]),
      [CATEGORIES]: categoriesReply,
      'POST /admin/menus': {
        status: 201,
        data: { data: makeAdminMenu({ id: 9, name: 'Mie Baru' }) },
      },
    })

    const dialog = await openCreate(user)

    await user.type(within(dialog).getByLabelText('Nama menu'), 'Mie Baru')
    await user.selectOptions(within(dialog).getByLabelText('Kategori'), '2')
    await user.type(within(dialog).getByLabelText('Deskripsi'), 'Enak sekali')
    await user.type(within(dialog).getByLabelText('Harga (Rp)'), '15000')
    await user.upload(
      within(dialog).getByLabelText('Gambar'),
      new File(['x'], 'mie.png', { type: 'image/png' }),
    )
    await user.click(within(dialog).getByLabelText('Ada pilihan level pedas'))
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(
      await screen.findByText('Menu "Mie Baru" ditambahkan.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const body = server.callsTo('POST /admin/menus')[0].body as FormData

    expect(body.get('name')).toBe('Mie Baru')
    expect(body.get('category_id')).toBe('2')
    expect(body.get('description')).toBe('Enak sekali')
    expect(body.get('price')).toBe('15000')
    expect(body.get('has_spice_level')).toBe('1')
    expect(body.get('is_available')).toBe('1')
    expect((body.get('image') as File).name).toBe('mie.png')
    expect(body.has('_method')).toBe(false)
  })

  it('validasi di sisi klien: isian wajib kosong tidak dikirim', async () => {
    const { server, user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([]),
      [CATEGORIES]: categoriesReply,
    })

    const dialog = await openCreate(user)
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(
      within(dialog).getByText('Nama menu wajib diisi.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('Pilih kategori.')).toBeInTheDocument()
    expect(
      within(dialog).getByText('Harga harus berupa angka bulat.'),
    ).toBeInTheDocument()
    expect(server.callsTo('POST /admin/menus')).toHaveLength(0)
  })

  it('gambar lebih dari 2 MB ditolak di sisi klien', async () => {
    const { server, user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([]),
      [CATEGORIES]: categoriesReply,
    })

    const dialog = await openCreate(user)
    await user.upload(
      within(dialog).getByLabelText('Gambar'),
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'besar.png', {
        type: 'image/png',
      }),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(
      within(dialog).getByText('Ukuran gambar maksimal 2 MB.'),
    ).toBeInTheDocument()
    expect(server.callsTo('POST /admin/menus')).toHaveLength(0)
  })

  it('menampilkan pratinjau gambar yang baru dipilih', async () => {
    const { user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([]),
      [CATEGORIES]: categoriesReply,
    })

    const dialog = await openCreate(user)
    await user.upload(
      within(dialog).getByLabelText('Gambar'),
      new File(['x'], 'mie.png', { type: 'image/png' }),
    )

    expect(
      await within(dialog).findByRole('img', { name: 'Pratinjau gambar baru' }),
    ).toBeInTheDocument()
  })

  it('error gambar dari server (422) tampil di bawah kolom gambar', async () => {
    const { user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([]),
      [CATEGORIES]: categoriesReply,
      'POST /admin/menus': {
        status: 422,
        data: { errors: { image: ['The image failed to upload.'] } },
      },
    })

    const dialog = await openCreate(user)

    await user.type(within(dialog).getByLabelText('Nama menu'), 'Mie Baru')
    await user.selectOptions(within(dialog).getByLabelText('Kategori'), '1')
    await user.type(within(dialog).getByLabelText('Harga (Rp)'), '15000')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(
      await within(dialog).findByText(
        /Gambar tidak valid\. Gunakan JPG, PNG, atau WebP/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('dialog', { name: 'Tambah menu' }),
    ).toBeInTheDocument()
  })

  it('mengubah menu: isian terisi, gambar lama tampil, dan dikirim lewat POST dengan _method PUT', async () => {
    const { server, user } = renderAdmin(<AdminMenusPage />, {
      [MENUS]: menuPage([mie]),
      [CATEGORIES]: categoriesReply,
      'POST /admin/menus/1': { status: 200, data: { data: mie } },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Ubah Mie Suit' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Ubah menu' })

    expect(within(dialog).getByLabelText('Nama menu')).toHaveValue('Mie Suit')
    expect(within(dialog).getByLabelText('Kategori')).toHaveValue('1')
    expect(within(dialog).getByLabelText('Harga (Rp)')).toHaveValue('12000')
    expect(
      within(dialog).getByLabelText('Ada pilihan level pedas'),
    ).toBeChecked()
    expect(
      within(dialog).getByRole('img', { name: 'Gambar saat ini' }),
    ).toBeInTheDocument()

    const price = within(dialog).getByLabelText('Harga (Rp)')

    await user.clear(price)
    await user.type(price, '13000')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(
      await screen.findByText('Menu "Mie Suit" diperbarui.'),
    ).toBeInTheDocument()

    const body = server.callsTo('POST /admin/menus/1')[0].body as FormData

    expect(body.get('_method')).toBe('PUT')
    expect(body.get('price')).toBe('13000')
    expect(body.has('image')).toBe(false)
  })
})
