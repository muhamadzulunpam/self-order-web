import { describe, expect, it } from 'vitest'
import {
  ROLES,
  STAFF_AREAS,
  areasFor,
  canAccessPath,
  homePathFor,
  isRole,
  safeRedirectPath,
} from './roles'

describe('isRole', () => {
  it('hanya menerima role yang dikenal', () => {
    for (const role of ROLES) expect(isRole(role)).toBe(true)

    for (const value of ['superadmin', '', 'Admin', null, undefined, 1, {}]) {
      expect(isRole(value)).toBe(false)
    }
  })
})

describe('areasFor dan homePathFor', () => {
  it('dapur dan kasir masing-masing hanya punya satu area', () => {
    expect(areasFor('kitchen').map((area) => area.path)).toEqual([
      '/staff/kitchen',
    ])
    expect(areasFor('cashier').map((area) => area.path)).toEqual([
      '/staff/cashier',
    ])
  })

  it('admin punya semua area', () => {
    expect(areasFor('admin')).toHaveLength(STAFF_AREAS.length)
  })

  it('role dengan satu area langsung ke areanya, admin ke beranda staf', () => {
    expect(homePathFor('kitchen')).toBe('/staff/kitchen')
    expect(homePathFor('cashier')).toBe('/staff/cashier')
    expect(homePathFor('admin')).toBe('/staff')
  })
})

describe('canAccessPath', () => {
  it('semua role boleh membuka beranda staf', () => {
    for (const role of ROLES) expect(canAccessPath(role, '/staff')).toBe(true)
  })

  it('mengikuti pembagian area per role', () => {
    expect(canAccessPath('kitchen', '/staff/kitchen')).toBe(true)
    expect(canAccessPath('kitchen', '/staff/kitchen/detail')).toBe(true)
    expect(canAccessPath('kitchen', '/staff/cashier')).toBe(false)
    expect(canAccessPath('kitchen', '/staff/admin')).toBe(false)

    expect(canAccessPath('cashier', '/staff/cashier')).toBe(true)
    expect(canAccessPath('cashier', '/staff/kitchen')).toBe(false)
    expect(canAccessPath('cashier', '/staff/admin')).toBe(false)

    expect(canAccessPath('admin', '/staff/kitchen')).toBe(true)
    expect(canAccessPath('admin', '/staff/cashier')).toBe(true)
    expect(canAccessPath('admin', '/staff/admin')).toBe(true)
  })

  it('menolak jalur yang tidak dikenal atau di luar /staff', () => {
    for (const path of [
      '/staff/ngawur',
      '/staff/kitchenx',
      '/staffx',
      '/staff/login',
      '/order/abc',
      '//evil.example',
      'https://evil.example/staff',
      '',
    ]) {
      expect(canAccessPath('admin', path)).toBe(false)
    }
  })
})

describe('safeRedirectPath', () => {
  it('mengembalikan jalur asal jika boleh diakses, termasuk query-nya', () => {
    expect(safeRedirectPath('/staff/kitchen?tab=1', 'admin')).toBe(
      '/staff/kitchen?tab=1',
    )
    expect(safeRedirectPath('/staff/kitchen', 'kitchen')).toBe('/staff/kitchen')
  })

  it('memakai halaman utama role jika jalur asal tidak boleh diakses', () => {
    expect(safeRedirectPath('/staff/admin', 'cashier')).toBe('/staff/cashier')
    expect(safeRedirectPath('/staff/kitchen', 'cashier')).toBe('/staff/cashier')
  })

  it('memakai halaman utama role untuk nilai yang tidak valid', () => {
    for (const from of [
      undefined,
      null,
      42,
      {},
      '/staff/login',
      '/order/abc',
      'https://evil.example',
      '//evil.example',
    ]) {
      expect(safeRedirectPath(from, 'kitchen')).toBe('/staff/kitchen')
    }
  })
})
