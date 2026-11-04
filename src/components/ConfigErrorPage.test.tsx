import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConfigErrorPage } from './ConfigErrorPage'

describe('ConfigErrorPage', () => {
  it('menampilkan semua masalah konfigurasi', () => {
    render(<ConfigErrorPage problems={['Masalah satu.', 'Masalah dua.']} />)

    expect(
      screen.getByRole('heading', {
        name: 'Konfigurasi aplikasi belum lengkap',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Masalah satu.')
    expect(screen.getByText('Masalah dua.')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
