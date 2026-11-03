import { describe, expect, it } from 'vitest'
import {
  MAX_IMAGE_BYTES,
  parseWholeNumber,
  validateCategory,
  validateMenu,
  validateTable,
} from './validators'

const validMenu = {
  name: 'Mie Suit',
  categoryId: '1',
  price: '12000',
  description: '',
  image: null,
}

describe('parseWholeNumber', () => {
  it('hanya menerima angka bulat tanpa tanda', () => {
    expect(parseWholeNumber(' 12 ')).toBe(12)
    expect(parseWholeNumber('0')).toBe(0)

    for (const text of ['', 'abc', '-1', '1.5', '1,5', '1e3']) {
      expect(parseWholeNumber(text)).toBeNull()
    }
  })
})

describe('validateCategory', () => {
  it('lolos untuk isian yang valid', () => {
    expect(validateCategory({ name: 'Mie', sortOrder: '1' })).toEqual({})
  })

  it('menolak nama kosong atau terlalu panjang', () => {
    expect(validateCategory({ name: '  ', sortOrder: '1' }).name).toMatch(
      /wajib/i,
    )
    expect(
      validateCategory({ name: 'x'.repeat(101), sortOrder: '1' }).name,
    ).toMatch(/maksimal 100/)
  })

  it('menolak urutan yang bukan bilangan bulat 0 sampai 9999', () => {
    for (const sortOrder of ['', 'a', '-1', '10000']) {
      expect(
        validateCategory({ name: 'Mie', sortOrder }).sort_order,
      ).toBeTruthy()
    }

    expect(validateCategory({ name: 'Mie', sortOrder: '0' })).toEqual({})
  })
})

describe('validateMenu', () => {
  it('lolos untuk isian yang valid', () => {
    expect(validateMenu(validMenu)).toEqual({})
  })

  it('menolak isian wajib yang kosong', () => {
    const errors = validateMenu({
      ...validMenu,
      name: '',
      categoryId: '',
      price: '',
    })

    expect(errors.name).toBeTruthy()
    expect(errors.category_id).toBe('Pilih kategori.')
    expect(errors.price).toBeTruthy()
  })

  it('menolak harga yang bukan angka bulat atau terlalu besar', () => {
    expect(validateMenu({ ...validMenu, price: '12.5' }).price).toBeTruthy()
    expect(validateMenu({ ...validMenu, price: '100000000' }).price).toMatch(
      /terlalu besar/i,
    )
    expect(validateMenu({ ...validMenu, price: '0' })).toEqual({})
  })

  it('menolak deskripsi terlalu panjang', () => {
    expect(
      validateMenu({ ...validMenu, description: 'x'.repeat(1001) }).description,
    ).toBeTruthy()
  })

  it('memeriksa tipe dan ukuran gambar', () => {
    const ok = new File(['x'], 'a.png', { type: 'image/png' })
    const wrongType = new File(['x'], 'a.gif', { type: 'image/gif' })
    const tooBig = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'b.png', {
      type: 'image/png',
    })

    expect(validateMenu({ ...validMenu, image: ok })).toEqual({})
    expect(validateMenu({ ...validMenu, image: wrongType }).image).toMatch(
      /JPG, PNG, atau WebP/,
    )
    expect(validateMenu({ ...validMenu, image: tooBig }).image).toMatch(/2 MB/)
  })
})

describe('validateTable', () => {
  it('menerima nomor 1 sampai 999', () => {
    expect(validateTable({ number: '1' })).toEqual({})
    expect(validateTable({ number: '999' })).toEqual({})
  })

  it('menolak nomor di luar rentang atau bukan angka', () => {
    for (const number of ['', '0', '1000', 'a', '-3', '2.5']) {
      expect(validateTable({ number }).number).toBeTruthy()
    }
  })
})
