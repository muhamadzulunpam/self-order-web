import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { listReply, makeAdminCategory } from '@/test/adminFixtures'
import { renderAdmin } from '@/test/adminRender'
import type { Reply } from '@/test/mockServer'
import { AdminCategoriesPage } from './AdminCategoriesPage'

const LIST = 'GET /admin/categories'

describe('AdminCategoriesPage', () => {
  it('menampilkan skeleton saat memuat', () => {
    renderAdmin(<AdminCategoriesPage />, {
      [LIST]: () => new Promise<Reply>(() => {}),
    })

    expect(
      screen.getByRole('status', { name: 'Memuat kategori' }),
    ).toBeInTheDocument()
  })

  it('menampilkan daftar kategori dengan urutan dan jumlah menu', async () => {
    const { server } = renderAdmin(<AdminCategoriesPage />, {
      [LIST]: listReply([
        makeAdminCategory({
          id: 1,
          name: 'Mie',
          sort_order: 1,
          menus_count: 3,
        }),
        makeAdminCategory({
          id: 2,
          name: 'Minuman',
          sort_order: 2,
          menus_count: 0,
        }),
      ]),
    })

    expect(await screen.findByText('Mie')).toBeInTheDocument()
    expect(screen.getByText('Urutan 1 · 3 menu')).toBeInTheDocument()
    expect(screen.getByText('Urutan 2 · 0 menu')).toBeInTheDocument()
    expect(server.calls[0].authorization).toBe('Bearer test-token')
  })

  it('menampilkan pesan jika belum ada kategori', async () => {
    renderAdmin(<AdminCategoriesPage />, { [LIST]: listReply([]) })

    expect(await screen.findByText('Belum ada kategori.')).toBeInTheDocument()
  })

  it('menampilkan error dan bisa dicoba lagi', async () => {
    let attempts = 0
    const { user } = renderAdmin(<AdminCategoriesPage />, {
      [LIST]: () =>
        ++attempts === 1
          ? { status: 429, data: { message: 'Terlalu banyak permintaan.' } }
          : listReply([makeAdminCategory({ id: 1, name: 'Mie' })]),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Terlalu banyak permintaan.',
    )

    await user.click(screen.getByRole('button', { name: 'Coba lagi' }))

    expect(await screen.findByText('Mie')).toBeInTheDocument()
  })

  it('menambah kategori dengan urutan berikutnya sebagai bawaan', async () => {
    const { server, user } = renderAdmin(<AdminCategoriesPage />, {
      [LIST]: listReply([
        makeAdminCategory({ id: 1, name: 'Mie', sort_order: 4 }),
      ]),
      'POST /admin/categories': {
        status: 201,
        data: {
          data: makeAdminCategory({ id: 2, name: 'Minuman', sort_order: 5 }),
        },
      },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Tambah kategori' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Tambah kategori' })

    expect(within(dialog).getByLabelText('Urutan tampil')).toHaveValue('5')

    await user.type(
      within(dialog).getByLabelText('Nama kategori'),
      '  Minuman ',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByText('Kategori ditambahkan.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(server.callsTo('POST /admin/categories')[0].body).toEqual({
      name: 'Minuman',
      sort_order: 5,
    })
    await vi.waitFor(() => expect(server.callsTo(LIST)).toHaveLength(2))
  })

  it('validasi di sisi klien: nama kosong tidak dikirim', async () => {
    const { server, user } = renderAdmin(<AdminCategoriesPage />, {
      [LIST]: listReply([]),
    })

    await user.click(
      await screen.findByRole('button', { name: 'Tambah kategori' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Tambah kategori' })
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(
      within(dialog).getByText('Nama kategori wajib diisi.'),
    ).toBeInTheDocument()
    expect(server.callsTo('POST /admin/categories')).toHaveLength(0)
  })

  it('nama yang sudah dipakai (422) tampil di bawah kolom dan lembar tetap terbuka', async () => {
    const { user } = renderAdmin(<AdminCategoriesPage />, {
      [LIST]: listReply([]),
      'POST /admin/categories': {
        status: 422,
        data: {
          message: 'The name has already been taken.',
          errors: { name: ['The name has already been taken.'] },
        },
      },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Tambah kategori' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Tambah kategori' })
    await user.type(within(dialog).getByLabelText('Nama kategori'), 'Mie')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(
      await within(dialog).findByText('Nama sudah dipakai.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Nama kategori')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(within(dialog).getByRole('button', { name: 'Simpan' })).toBeEnabled()
  })

  it('mengubah kategori', async () => {
    const { server, user } = renderAdmin(<AdminCategoriesPage />, {
      [LIST]: listReply([
        makeAdminCategory({ id: 1, name: 'Mie', sort_order: 1 }),
      ]),
      'PUT /admin/categories/1': {
        status: 200,
        data: { data: makeAdminCategory({ id: 1, name: 'Mie Pedas' }) },
      },
    })

    await user.click(await screen.findByRole('button', { name: 'Ubah Mie' }))
    const dialog = screen.getByRole('dialog', { name: 'Ubah kategori' })
    const name = within(dialog).getByLabelText('Nama kategori')

    expect(name).toHaveValue('Mie')

    await user.clear(name)
    await user.type(name, 'Mie Pedas')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByText('Kategori diperbarui.')).toBeInTheDocument()
    expect(server.callsTo('PUT /admin/categories/1')[0].body).toEqual({
      name: 'Mie Pedas',
      sort_order: 1,
    })
  })

  it('menghapus kategori setelah konfirmasi', async () => {
    const { server, user } = renderAdmin(<AdminCategoriesPage />, {
      [LIST]: listReply([makeAdminCategory({ id: 1, name: 'Mie' })]),
      'DELETE /admin/categories/1': { status: 200, data: { message: 'ok' } },
    })

    await user.click(await screen.findByRole('button', { name: 'Hapus Mie' }))
    const dialog = screen.getByRole('dialog', { name: 'Hapus kategori' })

    expect(server.callsTo('DELETE /admin/categories/1')).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: 'Hapus' }))

    expect(
      await screen.findByText('Kategori "Mie" dihapus.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await vi.waitFor(() => expect(server.callsTo(LIST)).toHaveLength(2))
  })

  it('kategori yang masih punya menu (409) tidak terhapus dan pesannya tampil di lembar', async () => {
    const { user } = renderAdmin(<AdminCategoriesPage />, {
      [LIST]: listReply([makeAdminCategory({ id: 1, name: 'Mie' })]),
      'DELETE /admin/categories/1': {
        status: 409,
        data: { message: 'Kategori masih memiliki menu.' },
      },
    })

    await user.click(await screen.findByRole('button', { name: 'Hapus Mie' }))
    const dialog = screen.getByRole('dialog', { name: 'Hapus kategori' })
    await user.click(within(dialog).getByRole('button', { name: 'Hapus' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      /masih memiliki menu/i,
    )
    expect(
      screen.getByRole('dialog', { name: 'Hapus kategori' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Hapus' })).toBeEnabled()
  })

  it('Batal pada konfirmasi hapus tidak mengirim apa pun', async () => {
    const { server, user } = renderAdmin(<AdminCategoriesPage />, {
      [LIST]: listReply([makeAdminCategory({ id: 1, name: 'Mie' })]),
    })

    await user.click(await screen.findByRole('button', { name: 'Hapus Mie' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Hapus kategori' })).getByRole(
        'button',
        { name: 'Batal' },
      ),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(server.callsTo('DELETE /admin/categories/1')).toHaveLength(0)
  })
})
