import { describe, expect, it } from 'vitest'
import { signIn } from '@/test/auth'
import {
  listReply,
  makeAdminCategory,
  makeAdminMenu,
  makeAdminTable,
  menuPage,
} from '@/test/adminFixtures'
import { mockServer } from '@/test/mockServer'
import {
  buildMenuFormData,
  createCategory,
  createMenu,
  createTable,
  deleteMenu,
  fetchCategories,
  fetchMenus,
  fetchTableQr,
  fetchTables,
  menuParams,
  menuValuesFrom,
  regenerateTableToken,
  updateCategory,
  updateMenu,
  updateTable,
} from './api'
import { DEFAULT_MENU_FILTERS } from './types'

const values = {
  categoryId: 2,
  name: '  Mie Suit ',
  description: ' Enak ',
  price: 12000,
  hasSpiceLevel: true,
  isAvailable: false,
}

describe('buildMenuFormData', () => {
  it('mengirim boolean sebagai 1 atau 0 dan merapikan teks', () => {
    const form = buildMenuFormData(values)

    expect(Object.fromEntries(form.entries())).toEqual({
      category_id: '2',
      name: 'Mie Suit',
      description: 'Enak',
      price: '12000',
      has_spice_level: '1',
      is_available: '0',
    })
  })

  it('menyertakan gambar dan _method hanya jika diminta', () => {
    const image = new File(['x'], 'mie.png', { type: 'image/png' })
    const form = buildMenuFormData({ ...values, image }, 'PUT')

    expect((form.get('image') as File).name).toBe('mie.png')
    expect(form.get('_method')).toBe('PUT')
    expect(buildMenuFormData(values).has('_method')).toBe(false)
    expect(buildMenuFormData({ ...values, image: null }).has('image')).toBe(
      false,
    )
  })
})

describe('menuValuesFrom', () => {
  it('mengubah menu menjadi nilai formulir dan menerapkan perubahan', () => {
    const menu = makeAdminMenu({
      name: 'Mie',
      description: null,
      price: 9000,
      category: { id: 3, name: 'Mie' },
    })

    expect(menuValuesFrom(menu, { isAvailable: false })).toEqual({
      categoryId: 3,
      name: 'Mie',
      description: '',
      price: 9000,
      hasSpiceLevel: false,
      isAvailable: false,
    })
  })
})

describe('menuParams', () => {
  it('hanya menyertakan filter yang aktif', () => {
    expect(menuParams(DEFAULT_MENU_FILTERS)).toEqual({ page: 1 })
    expect(
      menuParams({
        search: ' teh ',
        categoryId: 2,
        availability: 'available',
        page: 3,
      }),
    ).toEqual({ page: 3, search: 'teh', category_id: 2, is_available: 1 })
    expect(
      menuParams({ ...DEFAULT_MENU_FILTERS, availability: 'unavailable' }),
    ).toEqual({
      page: 1,
      is_available: 0,
    })
  })
})

describe('kategori', () => {
  it('mengambil, membuat, dan mengubah kategori dengan token admin', async () => {
    signIn('admin')
    const created = makeAdminCategory({ id: 2, name: 'Minuman' })
    const server = mockServer({
      'GET /admin/categories': listReply([makeAdminCategory()]),
      'POST /admin/categories': { status: 201, data: { data: created } },
      'PUT /admin/categories/2': { status: 200, data: { data: created } },
    })

    await expect(fetchCategories()).resolves.toHaveLength(1)
    await expect(
      createCategory({ name: 'Minuman', sortOrder: 2 }),
    ).resolves.toEqual(created)
    await updateCategory(2, { name: 'Minuman', sortOrder: 3 })

    expect(server.callsTo('POST /admin/categories')[0].body).toEqual({
      name: 'Minuman',
      sort_order: 2,
    })
    expect(server.callsTo('PUT /admin/categories/2')[0].body).toEqual({
      name: 'Minuman',
      sort_order: 3,
    })
    expect(
      server.calls.every((call) => call.authorization === 'Bearer test-token'),
    ).toBe(true)
  })

  it('daftar dengan satu entri tidak valid ditolak seluruhnya', async () => {
    signIn('admin')
    mockServer({
      'GET /admin/categories': listReply([makeAdminCategory(), { id: 'x' }]),
    })

    await expect(fetchCategories()).rejects.toThrow(/tidak valid/i)
  })
})

describe('menu', () => {
  it('fetchMenus mengirim parameter dan membaca meta pagination', async () => {
    signIn('admin')
    const server = mockServer({
      'GET /admin/menus': menuPage([makeAdminMenu()], {
        last_page: 4,
        total: 50,
      }),
    })

    const page = await fetchMenus({
      ...DEFAULT_MENU_FILTERS,
      search: 'mie',
      page: 2,
    })

    expect(server.calls[0].params).toEqual({ page: 2, search: 'mie' })
    expect(page.pageInfo).toEqual({ page: 1, lastPage: 4, total: 50 })
    expect(page.items).toHaveLength(1)
  })

  it('fetchMenus menolak respons tanpa meta', async () => {
    signIn('admin')
    mockServer({ 'GET /admin/menus': { status: 200, data: { data: [] } } })

    await expect(fetchMenus(DEFAULT_MENU_FILTERS)).rejects.toThrow(
      /tidak valid/i,
    )
  })

  it('createMenu mengirim form-data, updateMenu lewat POST dengan _method PUT', async () => {
    signIn('admin')
    const menu = makeAdminMenu({ id: 5 })
    const server = mockServer({
      'POST /admin/menus': { status: 201, data: { data: menu } },
      'POST /admin/menus/5': { status: 200, data: { data: menu } },
      'DELETE /admin/menus/5': { status: 200, data: { message: 'ok' } },
    })

    await expect(createMenu(values)).resolves.toEqual(menu)
    await updateMenu(5, values)
    await deleteMenu(5)

    const created = server.callsTo('POST /admin/menus')[0].body as FormData
    const updated = server.callsTo('POST /admin/menus/5')[0].body as FormData

    expect(created).toBeInstanceOf(FormData)
    expect(created.has('_method')).toBe(false)
    expect(updated.get('_method')).toBe('PUT')
    expect(server.callsTo('DELETE /admin/menus/5')).toHaveLength(1)
  })
})

describe('meja', () => {
  it('mengambil, membuat, mengubah, dan membuat ulang token', async () => {
    signIn('admin')
    const table = makeAdminTable({ id: 4, number: 4 })
    const server = mockServer({
      'GET /admin/dining-tables': listReply([table]),
      'POST /admin/dining-tables': { status: 201, data: { data: table } },
      'PUT /admin/dining-tables/4': { status: 200, data: { data: table } },
      'POST /admin/dining-tables/4/regenerate-token': {
        status: 200,
        data: { data: table },
      },
    })

    await expect(fetchTables()).resolves.toEqual([table])
    await createTable({ number: 4, isActive: true })
    await updateTable(4, { number: 4, isActive: false })
    await regenerateTableToken(4)

    expect(server.callsTo('POST /admin/dining-tables')[0].body).toEqual({
      number: 4,
      is_active: true,
    })
    expect(server.callsTo('PUT /admin/dining-tables/4')[0].body).toEqual({
      number: 4,
      is_active: false,
    })
    expect(
      server.callsTo('POST /admin/dining-tables/4/regenerate-token'),
    ).toHaveLength(1)
  })

  it('fetchTableQr mengambil teks SVG dengan token admin', async () => {
    signIn('admin')
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    const server = mockServer({
      'GET /admin/dining-tables/4/qr': { status: 200, data: svg },
    })

    await expect(fetchTableQr(4)).resolves.toBe(svg)
    expect(server.calls[0].authorization).toBe('Bearer test-token')
  })

  it('fetchTableQr menolak respons yang bukan SVG', async () => {
    signIn('admin')
    mockServer({
      'GET /admin/dining-tables/4/qr': { status: 200, data: '<html></html>' },
    })

    await expect(fetchTableQr(4)).rejects.toThrow(/QR/i)
  })
})
