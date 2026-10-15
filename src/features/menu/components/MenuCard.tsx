import { useState } from 'react'
import { formatRupiah } from '@/lib/format'
import type { PublicMenu } from '@/types/menu'

type Props = {
  menu: PublicMenu
  inCartQuantity: number
  onAdd: () => void
}

export function MenuCard({ menu, inCartQuantity, onAdd }: Props) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = menu.image_url !== null && !imageFailed

  return (
    <li className="flex gap-3 py-3">
      {showImage ? (
        <img
          src={menu.image_url ?? undefined}
          alt={menu.name}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="h-24 w-24 shrink-0 rounded-xl bg-stone-100 object-cover"
        />
      ) : (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-xs text-stone-400">
          Tanpa foto
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h3 className="leading-snug font-semibold">{menu.name}</h3>

        {menu.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-stone-500">
            {menu.description}
          </p>
        )}

        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="space-y-1">
            <p className="font-semibold">{formatRupiah(menu.price)}</p>

            <div className="flex flex-wrap gap-1.5">
              {menu.has_spice_level && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                  Ada level pedas
                </span>
              )}
              {inCartQuantity > 0 && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                  {inCartQuantity} di keranjang
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onAdd}
            aria-label={`Tambah ${menu.name}`}
            className="shrink-0 rounded-full bg-stone-900 px-4 py-1.5 text-sm font-medium text-white active:bg-stone-700"
          >
            Tambah
          </button>
        </div>
      </div>
    </li>
  )
}
