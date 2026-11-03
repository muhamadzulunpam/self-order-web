import { useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { createTable, updateTable } from '../api'
import { describeAdminError } from '../errors'
import { invalidateAdmin } from '../hooks'
import type { AdminTable } from '../types'
import { validateTable } from '../validators'
import type { FieldErrors } from '../validators'
import { ariaFor, inputClass } from './formUtils'
import { FieldError, FormError, SubmitButtons } from './FormParts'

type Props = {
  /** null berarti membuat meja baru. */
  table: AdminTable | null
  onSaved: (text: string) => void
  onClose: () => void
}

export function TableFormSheet({ table, onSaved, onClose }: Props) {
  const queryClient = useQueryClient()
  const [number, setNumber] = useState(table ? String(table.number) : '')
  const [isActive, setIsActive] = useState(table?.is_active ?? true)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const numberId = useId()

  function handleClose() {
    if (!busyRef.current) onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (busyRef.current) return

    const errors = validateTable({ number })

    setFieldErrors(errors)
    setError(null)

    if (Object.keys(errors).length > 0) return

    busyRef.current = true
    setBusy(true)

    const input = { number: Number(number.trim()), isActive }

    try {
      if (table) await updateTable(table.id, input)
      else await createTable(input)

      void invalidateAdmin(queryClient)
      onSaved(
        table
          ? `Meja ${input.number} diperbarui.`
          : `Meja ${input.number} ditambahkan.`,
      )
    } catch (err) {
      const failure = describeAdminError(err, 'table')

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
      title={table ? 'Ubah meja' : 'Tambah meja'}
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          <div>
            <label htmlFor={numberId} className="mb-1 block font-semibold">
              Nomor meja
            </label>
            <input
              {...ariaFor(numberId, fieldErrors.number)}
              type="text"
              inputMode="numeric"
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              className={inputClass}
            />
            <FieldError id={numberId} error={fieldErrors.number} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Aktif (bisa dipakai pembeli)
          </label>

          {table && (
            <p className="text-xs text-stone-500">
              Mengubah nomor tidak mengubah QR code. Token meja tetap sama.
            </p>
          )}
        </fieldset>

        <FormError message={error} />
        <SubmitButtons busy={busy} onCancel={handleClose} />
      </form>
    </BottomSheet>
  )
}
