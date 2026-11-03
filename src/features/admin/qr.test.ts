import { describe, expect, it } from 'vitest'
import { svgDataUrl } from './qr'

describe('svgDataUrl', () => {
  it('membentuk data URL yang aman untuk dipasang di <img>', () => {
    const url = svgDataUrl('<svg a="b"></svg>')

    expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true)
    expect(url).not.toContain('<')
    expect(decodeURIComponent(url.split(',')[1])).toBe('<svg a="b"></svg>')
  })
})
