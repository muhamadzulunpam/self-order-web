import { describe, expect, it } from 'vitest'
import { documentTitle, titleFromMatches } from './routeMeta'

describe('documentTitle', () => {
  it('memakai nama aplikasi saja jika tidak ada judul', () => {
    expect(documentTitle(undefined)).toBe('Self-Order')
  })

  it('menambahkan nama aplikasi di belakang judul', () => {
    expect(documentTitle('Menu')).toBe('Menu · Self-Order')
  })
})

describe('titleFromMatches', () => {
  it('memakai judul dari rute paling dalam', () => {
    expect(
      titleFromMatches([
        { handle: { title: 'Luar' } },
        { handle: undefined },
        { handle: { title: 'Dalam' } },
      ]),
    ).toBe('Dalam')
  })

  it('melewati rute tanpa judul', () => {
    expect(
      titleFromMatches([{ handle: { title: 'Luar' } }, { handle: {} }]),
    ).toBe('Luar')
  })

  it('mengembalikan undefined jika tidak ada judul sama sekali', () => {
    expect(titleFromMatches([{ handle: undefined }, {}])).toBeUndefined()
    expect(titleFromMatches([])).toBeUndefined()
  })
})
