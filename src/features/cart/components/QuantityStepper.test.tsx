import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QuantityStepper } from './QuantityStepper'

describe('QuantityStepper', () => {
  it('memanggil onChange dengan nilai baru', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<QuantityStepper value={3} onChange={onChange} label="Mie" />)

    await user.click(screen.getByRole('button', { name: 'Tambah jumlah Mie' }))
    await user.click(screen.getByRole('button', { name: 'Kurangi jumlah Mie' }))

    expect(onChange).toHaveBeenNthCalledWith(1, 4)
    expect(onChange).toHaveBeenNthCalledWith(2, 2)
  })

  it('menonaktifkan tombol kurang di nilai minimum', () => {
    render(<QuantityStepper value={1} onChange={vi.fn()} label="Mie" />)

    expect(
      screen.getByRole('button', { name: 'Kurangi jumlah Mie' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Tambah jumlah Mie' }),
    ).toBeEnabled()
  })

  it('menonaktifkan tombol tambah di nilai maksimum', () => {
    render(<QuantityStepper value={20} onChange={vi.fn()} label="Mie" />)

    expect(
      screen.getByRole('button', { name: 'Tambah jumlah Mie' }),
    ).toBeDisabled()
  })
})
