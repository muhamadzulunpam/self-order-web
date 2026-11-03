import { useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { useFilePreview } from '@/lib/useFilePreview'
import { createMenu, updateMenu } from '../api'
import type { MenuFormValues } from '../api'
import { describeAdminError } from '../errors'
import { invalidateAdmin } from '../hooks'
import type { AdminCategory, AdminMenu } from '../types'
import { validateMenu } from '../validators'
import type { FieldErrors } from '../validators'
import { ariaFor, inputClass } from './formUtils'
import { FieldError, FormError, SubmitButtons } from './FormParts'

type Props = {
  /** null berarti membuat menu baru. */
  menu: AdminMenu | null
  categories: readonly AdminCategory[]
  onSaved: (text: string) => void
  onClose: () => void
}

export function MenuFormSheet({ menu, categories, onSaved, onClose }: Props) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(menu?.name ?? '')
  const [categoryId, setCategoryId] = useState(
    menu ? String(menu.category.id) : '',
  )
  const [description, setDescription] = useState(menu?.description ?? '')
  const [price, setPrice] = useState(menu ? String(menu.price) : '')
  const [hasSpiceLevel, setHasSpiceLevel] = useState(
    menu?.has_spice_level ?? false,
  )
  const [isAvailable, setIsAvailable] = useState(menu?.is_available ?? true)
  const [image, setImage] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const preview = useFilePreview(image)
  const nameId = useId()
  const categoryField = useId()
  const descriptionId = useId()
  const priceId = useId()
  const imageId = useId()

  const noCategories = categories.length === 0

  function handleClose() {
    if (!busyRef.current) onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (busyRef.current) return

    const errors = validateMenu({ name, categoryId, price, description, image })

    setFieldErrors(errors)
    setError(null)

    if (Object.keys(errors).length > 0) return

    busyRef.current = true
    setBusy(true)

    const values: MenuFormValues = {
      categoryId: Number(categoryId),
      name: name.trim(),
      description: description.trim(),
      price: Number(price.trim()),
      hasSpiceLevel,
      isAvailable,
      image,
    }

    try {
      if (menu) await updateMenu(menu.id, values)
      else await createMenu(values)

      void invalidateAdmin(queryClient)
      onSaved(
        menu
          ? `Menu "${values.name}" diperbarui.`
          : `Menu "${values.name}" ditambahkan.`,
      )
    } catch (err) {
      const failure = describeAdminError(err, 'menu')

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
      title={menu ? 'Ubah menu' : 'Tambah menu'}
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {noCategories && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Belum ada kategori. Buat kategori terlebih dahulu di tab Kategori.
          </p>
        )}

        <fieldset disabled={busy} className="space-y-4">
          <div>
            <label htmlFor={nameId} className="mb-1 block font-semibold">
              Nama menu
            </label>
            <input
              {...ariaFor(nameId, fieldErrors.name)}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={255}
              className={inputClass}
            />
            <FieldError id={nameId} error={fieldErrors.name} />
          </div>

          <div>
            <label htmlFor={categoryField} className="mb-1 block font-semibold">
              Kategori
            </label>
            <select
              {...ariaFor(categoryField, fieldErrors.category_id)}
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={inputClass}
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
            <FieldError id={categoryField} error={fieldErrors.category_id} />
          </div>

          <div>
            <label htmlFor={descriptionId} className="mb-1 block font-semibold">
              Deskripsi
            </label>
            <textarea
              {...ariaFor(descriptionId, fieldErrors.description)}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              rows={3}
              className={inputClass}
            />
            <FieldError id={descriptionId} error={fieldErrors.description} />
          </div>

          <div>
            <label htmlFor={priceId} className="mb-1 block font-semibold">
              Harga (Rp)
            </label>
            <input
              {...ariaFor(priceId, fieldErrors.price)}
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="12000"
              className={inputClass}
            />
            <FieldError id={priceId} error={fieldErrors.price} />
          </div>

          <div>
            <label htmlFor={imageId} className="mb-1 block font-semibold">
              Gambar
            </label>

            {preview ? (
              <img
                src={preview}
                alt="Pratinjau gambar baru"
                className="mb-2 h-24 w-24 rounded-xl object-cover"
              />
            ) : (
              menu?.image_url && (
                <img
                  src={menu.image_url}
                  alt="Gambar saat ini"
                  className="mb-2 h-24 w-24 rounded-xl object-cover"
                />
              )
            )}

            <input
              {...ariaFor(imageId, fieldErrors.image)}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
            <p className="mt-1 text-xs text-stone-500">
              JPG, PNG, atau WebP, maksimal 2 MB.
              {menu
                ? ' Memilih gambar baru akan menggantikan gambar lama.'
                : ''}
            </p>
            <FieldError id={imageId} error={fieldErrors.image} />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasSpiceLevel}
                onChange={(event) => setHasSpiceLevel(event.target.checked)}
              />
              Ada pilihan level pedas
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(event) => setIsAvailable(event.target.checked)}
              />
              Tersedia untuk dipesan
            </label>
          </div>
        </fieldset>

        <FormError message={error} />
        <SubmitButtons
          busy={busy}
          disabled={noCategories}
          onCancel={handleClose}
        />
      </form>
    </BottomSheet>
  )
}
