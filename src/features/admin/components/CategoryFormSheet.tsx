import { useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { createCategory, updateCategory } from '../api'
import { describeAdminError } from '../errors'
import { invalidateAdmin } from '../hooks'
import type { AdminCategory } from '../types'
import { validateCategory } from '../validators'
import type { FieldErrors } from '../validators'
import { ariaFor, inputClass } from './formUtils'
import { FieldError, FormError, SubmitButtons } from './FormParts'

type Props = {
  /** null berarti membuat kategori baru. */
  category: AdminCategory | null
  defaultOrder: number
  onSaved: (text: string) => void
  onClose: () => void
}

export function CategoryFormSheet({
  category,
  defaultOrder,
  onSaved,
  onClose,
}: Props) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(category?.name ?? '')
  const [sortOrder, setSortOrder] = useState(
    String(category?.sort_order ?? defaultOrder),
  )
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const nameId = useId()
  const orderId = useId()

  function handleClose() {
    if (!busyRef.current) onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (busyRef.current) return

    const errors = validateCategory({ name, sortOrder })

    setFieldErrors(errors)
    setError(null)

    if (Object.keys(errors).length > 0) return

    busyRef.current = true
    setBusy(true)

    const input = { name: name.trim(), sortOrder: Number(sortOrder.trim()) }

    try {
      if (category) await updateCategory(category.id, input)
      else await createCategory(input)

      void invalidateAdmin(queryClient)
      onSaved(category ? 'Kategori diperbarui.' : 'Kategori ditambahkan.')
    } catch (err) {
      const failure = describeAdminError(err, 'category')

      setFieldErrors(failure.fieldErrors)
      setError(
        Object.keys(failure.fieldErrors).length > 0 ? null : failure.message,
      )

      if (failure.refresh) void invalidateAdmin(queryClient)

      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <BottomSheet
      title={category ? 'Ubah kategori' : 'Tambah kategori'}
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          <div>
            <label htmlFor={nameId} className="mb-1 block font-semibold">
              Nama kategori
            </label>
            <input
              {...ariaFor(nameId, fieldErrors.name)}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              className={inputClass}
            />
            <FieldError id={nameId} error={fieldErrors.name} />
          </div>

          <div>
            <label htmlFor={orderId} className="mb-1 block font-semibold">
              Urutan tampil
            </label>
            <input
              {...ariaFor(orderId, fieldErrors.sort_order)}
              type="text"
              inputMode="numeric"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-stone-500">
              Angka lebih kecil tampil lebih dulu di menu pembeli.
            </p>
            <FieldError id={orderId} error={fieldErrors.sort_order} />
          </div>
        </fieldset>

        <FormError message={error} />
        <SubmitButtons busy={busy} onCancel={handleClose} />
      </form>
    </BottomSheet>
  )
}
