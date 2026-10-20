import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OrderTimeline } from './OrderTimeline'

describe('OrderTimeline', () => {
  it('menampilkan lima langkah dan menandai langkah yang sedang berlangsung', () => {
    render(<OrderTimeline status="preparing" />)

    const list = screen.getByRole('list', { name: 'Progres pesanan' })
    const items = within(list).getAllByRole('listitem')

    expect(items).toHaveLength(5)
    expect(items[2]).toHaveAttribute('aria-current', 'step')
    expect(within(items[2]).getByText('Dimasak')).toBeInTheDocument()
    expect(screen.getAllByText('(selesai)')).toHaveLength(2)
    expect(screen.getAllByText('(belum)')).toHaveLength(2)
  })

  it('menandai semua langkah selesai untuk pesanan yang sudah selesai', () => {
    render(<OrderTimeline status="completed" />)

    expect(screen.getAllByText('(selesai)')).toHaveLength(5)
    expect(
      screen
        .getAllByRole('listitem')
        .some((item) => item.hasAttribute('aria-current')),
    ).toBe(false)
  })

  it('tidak menampilkan apa pun untuk pesanan yang dibatalkan', () => {
    const { container } = render(<OrderTimeline status="cancelled" />)

    expect(container).toBeEmptyDOMElement()
  })
})
