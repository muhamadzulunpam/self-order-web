import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { formatRupiah } from '@/lib/format'
import type { PublicMenu } from '@/types/menu'
import { SPICE_LEVELS, spiceLabel } from '../cartLogic'
import type { AddStatus, NewLine } from '../cartLogic'
import { QuantityStepper } from './QuantityStepper'

type Props = {
  menu: PublicMenu
  onAdd: (input: NewLine) => AddStatus
  onClose: () => void
}

export function AddToCartSheet({ menu, onAdd, onClose }: Props) {
  const [spiceLevel, setSpiceLevel] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const notesId = useId()
  const hintId = useId()

  const needsSpice = menu.has_spice_level
  const canSubmit = !needsSpice || spiceLevel !== null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) return

    const status = onAdd({
      menuId: menu.id,
      name: menu.name,
      price: menu.price,
      quantity,
      spiceLevel: needsSpice ? spiceLevel : null,
      notes,
    })

    if (status === 'line_limit') {
      setError('Keranjang penuh. Maksimal 50 jenis pesanan.')
      return
    }

    onClose()
  }

  return (
    <BottomSheet title={menu.name} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {needsSpice && (
          <fieldset>
            <legend className="mb-2 font-semibold">
              Level pedas{' '}
              <span className="font-normal text-red-600">(wajib)</span>
            </legend>

            <div className="flex flex-wrap gap-2">
              {SPICE_LEVELS.map((level) => (
                <label key={level} className="cursor-pointer">
                  <input
                    type="radio"
                    name="spice-level"
                    value={level}
                    checked={spiceLevel === level}
                    onChange={() => setSpiceLevel(level)}
                    className="peer sr-only"
                  />
                  <span className="block rounded-full border border-stone-300 px-4 py-2 text-sm peer-checked:border-stone-900 peer-checked:bg-stone-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-stone-900 peer-focus-visible:ring-offset-2">
                    {spiceLabel(level)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div>
          <label htmlFor={notesId} className="mb-1 block font-semibold">
            Catatan{' '}
            <span className="font-normal text-stone-400">(opsional)</span>
          </label>
          <textarea
            id={notesId}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={255}
            rows={2}
            placeholder="Contoh: tanpa bawang"
            className="w-full rounded-xl border border-stone-300 p-3 text-sm focus:border-stone-900 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="font-semibold">Jumlah</span>
          <QuantityStepper
            value={quantity}
            onChange={setQuantity}
            label={menu.name}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={!canSubmit}
            aria-describedby={canSubmit ? undefined : hintId}
            className="w-full rounded-2xl bg-stone-900 py-3.5 font-medium text-white active:bg-stone-700 disabled:bg-stone-300"
          >
            Tambah ke keranjang • {formatRupiah(menu.price * quantity)}
          </button>

          {!canSubmit && (
            <p id={hintId} className="mt-2 text-center text-sm text-stone-500">
              Pilih level pedas dulu.
            </p>
          )}
        </div>
      </form>
    </BottomSheet>
  )
}
