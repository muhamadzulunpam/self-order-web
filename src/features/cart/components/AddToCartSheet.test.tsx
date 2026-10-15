import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PublicMenu } from '@/types/menu'
import type { AddStatus } from '../cartLogic'
import { AddToCartSheet } from './AddToCartSheet'

const spicy: PublicMenu = {
  id: 10,
  name: 'Mie Pedas Original',
  description: null,
  price: 12000,
  image_url: null,
  has_spice_level: true,
}

const plain: PublicMenu = {
  id: 20,
  name: 'Es Teh Manis',
  description: null,
  price: 5000,
  image_url: null,
  has_spice_level: false,
}

function setup(menu: PublicMenu, status: AddStatus = 'ok') {
  const onAdd = vi.fn(() => status)
  const onClose = vi.fn()
  const user = userEvent.setup()

  render(<AddToCartSheet menu={menu} onAdd={onAdd} onClose={onClose} />)

  return { onAdd, onClose, user }
}

const submitButton = () =>
  screen.getByRole('button', { name: /tambah ke keranjang/i })

describe('AddToCartSheet', () => {
  it('menu tanpa level pedas: tidak ada pilihan pedas dan bisa langsung ditambah', async () => {
    const { onAdd, onClose, user } = setup(plain)

    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(submitButton()).toBeEnabled()

    await user.click(submitButton())

    expect(onAdd).toHaveBeenCalledWith({
      menuId: 20,
      name: 'Es Teh Manis',
      price: 5000,
      quantity: 1,
      spiceLevel: null,
      notes: '',
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('menu dengan level pedas: wajib memilih level sebelum bisa ditambah', async () => {
    const { onAdd, user } = setup(spicy)

    expect(screen.getAllByRole('radio')).toHaveLength(6)
    expect(submitButton()).toBeDisabled()
    expect(screen.getByText(/pilih level pedas dulu/i)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Level 3' }))
    expect(submitButton()).toBeEnabled()

    await user.click(submitButton())

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ menuId: 10, spiceLevel: 3 }),
    )
  })

  it('level "Tidak pedas" (0) diterima sebagai pilihan yang sah', async () => {
    const { onAdd, user } = setup(spicy)

    await user.click(screen.getByRole('radio', { name: 'Tidak pedas' }))
    await user.click(submitButton())

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ spiceLevel: 0 }),
    )
  })

  it('mengirim catatan dan jumlah, dan total pada tombol ikut berubah', async () => {
    const { onAdd, user } = setup(spicy)

    await user.click(screen.getByRole('radio', { name: 'Level 2' }))
    await user.type(screen.getByLabelText(/catatan/i), 'Tanpa bawang')
    await user.click(
      screen.getByRole('button', { name: 'Tambah jumlah Mie Pedas Original' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Tambah jumlah Mie Pedas Original' }),
    )

    expect(
      screen.getByLabelText('Jumlah Mie Pedas Original'),
    ).toHaveTextContent('3')
    expect(submitButton()).toHaveTextContent(/Rp\s*36\.000/)

    await user.click(submitButton())

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 3,
        spiceLevel: 2,
        notes: 'Tanpa bawang',
      }),
    )
  })

  it('menampilkan error dan tetap terbuka jika keranjang penuh', async () => {
    const { onClose, user } = setup(plain, 'line_limit')

    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /keranjang penuh/i,
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it('menutup lembar dengan tombol Escape', async () => {
    const { onClose, user } = setup(plain)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  it('menutup lembar dengan tombol Tutup', async () => {
    const { onClose, user } = setup(plain)

    await user.click(screen.getByRole('button', { name: 'Tutup' }))

    expect(onClose).toHaveBeenCalled()
  })
})
