import { describe, expect, it } from 'vitest'
import {
  makeAdminCategory,
  makeAdminMenu,
  makeAdminTable,
} from '@/test/adminFixtures'
import {
  asInt,
  parseCategory,
  parseMenu,
  parsePageInfo,
  parseTable,
} from './parsers'

describe('asInt', () => {
  it('menerima bilangan bulat dan string angka', () => {
    expect(asInt(5)).toBe(5)
    expect(asInt(0)).toBe(0)
    expect(asInt('12')).toBe(12)
  })

  it('menolak nilai lain', () => {
    for (const value of [
      1.5,
      '1.5',
      '-1',
      '',
      'abc',
      null,
      undefined,
      true,
      {},
    ]) {
      expect(asInt(value)).toBeNull()
    }
  })
})

describe('parseCategory', () => {
  it('mengembalikan kategori yang valid', () => {
    const category = makeAdminCategory({ id: 2, menus_count: 3 })

    expect(parseCategory(category)).toEqual(category)
  })

  it('menerima kategori tanpa menus_count dan angka berbentuk teks', () => {
    expect(
      parseCategory({ id: '2', name: 'Mie', slug: 'mie', sort_order: '1' }),
    ).toEqual({ id: 2, name: 'Mie', slug: 'mie', sort_order: 1 })
  })

  it.each([
    ['bukan objek', 'teks'],
    ['id bukan angka', { ...makeAdminCategory(), id: 'x' }],
    ['nama bukan string', { ...makeAdminCategory(), name: 5 }],
    ['menus_count tidak valid', { ...makeAdminCategory(), menus_count: 'x' }],
  ])('menolak data dengan %s', (_name, value) => {
    expect(parseCategory(value)).toBeNull()
  })
})

describe('parseMenu', () => {
  it('mengembalikan menu yang valid', () => {
    const menu = makeAdminMenu({
      id: 4,
      description: 'Enak',
      image_url: 'http://x/y.jpg',
      has_spice_level: true,
    })

    expect(parseMenu(menu)).toEqual(menu)
  })

  it('menerima harga berbentuk teks dan membuang field tambahan', () => {
    const parsed = parseMenu({
      ...makeAdminMenu(),
      price: '15000',
      rahasia: 'x',
    })

    expect(parsed?.price).toBe(15000)
    expect(parsed).not.toHaveProperty('rahasia')
  })

  it.each([
    ['tanpa kategori', { ...makeAdminMenu(), category: undefined }],
    [
      'kategori tidak valid',
      { ...makeAdminMenu(), category: { id: 'x', name: 1 } },
    ],
    ['boolean berbentuk angka', { ...makeAdminMenu(), is_available: 1 }],
    ['harga pecahan', { ...makeAdminMenu(), price: 1.5 }],
    ['deskripsi bukan string', { ...makeAdminMenu(), description: 5 }],
  ])('menolak menu %s', (_name, value) => {
    expect(parseMenu(value)).toBeNull()
  })
})

describe('parseTable', () => {
  it('mengembalikan meja yang valid dengan atau tanpa orders_count', () => {
    const table = makeAdminTable({ id: 3, orders_count: 2 })
    const withoutCount = { ...table }

    delete withoutCount.orders_count

    expect(parseTable(table)).toEqual(table)
    expect(parseTable(withoutCount)).toEqual(withoutCount)
  })

  it.each([
    ['is_active bukan boolean', { ...makeAdminTable(), is_active: 1 }],
    ['order_url hilang', { ...makeAdminTable(), order_url: undefined }],
    ['nomor tidak valid', { ...makeAdminTable(), number: 'lima' }],
  ])('menolak meja dengan %s', (_name, value) => {
    expect(parseTable(value)).toBeNull()
  })
})

describe('parsePageInfo', () => {
  it('membaca meta pagination Laravel', () => {
    expect(
      parsePageInfo({ current_page: 2, last_page: 5, total: 70, per_page: 15 }),
    ).toEqual({ page: 2, lastPage: 5, total: 70 })
  })

  it('menolak meta yang tidak lengkap', () => {
    expect(parsePageInfo({ current_page: 1 })).toBeNull()
    expect(parsePageInfo(null)).toBeNull()
  })
})
