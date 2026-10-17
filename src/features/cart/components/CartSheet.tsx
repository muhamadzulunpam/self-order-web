import { BottomSheet } from '@/components/BottomSheet'
import { formatRupiah } from '@/lib/format'
import { cartTotal, spiceLabel } from '../cartLogic'
import type { CartLine } from '../cartLogic'
import { QuantityStepper } from './QuantityStepper'

type Props = {
  tableNumber: number
  lines: CartLine[]
  onChangeQuantity: (key: string, quantity: number) => void
  onRemove: (key: string) => void
  onClose: () => void
  onCheckout: () => void
}

export function CartSheet({
  tableNumber,
  lines,
  onChangeQuantity,
  onRemove,
  onCheckout,
  onClose,
}: Props) {
  return (
    <BottomSheet title={`Pesanan Anda · Meja ${tableNumber}`} onClose={onClose}>
      {lines.length === 0 ? (
        <p className="py-8 text-center text-stone-500">
          Keranjang masih kosong.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-stone-100">
            {lines.map((line) => {
              const label =
                line.spiceLevel === null
                  ? line.name
                  : `${line.name} (${spiceLabel(line.spiceLevel)})`

              return (
                <li key={line.key} className="space-y-2 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{line.name}</p>

                      {line.spiceLevel !== null && (
                        <span className="mt-1 inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                          {spiceLabel(line.spiceLevel)}
                        </span>
                      )}

                      {line.notes && (
                        <p className="mt-1 text-sm text-stone-500">
                          Catatan: {line.notes}
                        </p>
                      )}
                    </div>

                    <p className="shrink-0 font-semibold">
                      {formatRupiah(line.price * line.quantity)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <QuantityStepper
                      value={line.quantity}
                      onChange={(quantity) =>
                        onChangeQuantity(line.key, quantity)
                      }
                      label={label}
                    />
                    <button
                      type="button"
                      onClick={() => onRemove(line.key)}
                      aria-label={`Hapus ${label}`}
                      className="text-sm text-red-600 underline"
                    >
                      Hapus
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-4">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold">
              {formatRupiah(cartTotal(lines))}
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Total akhir dihitung ulang oleh sistem saat pesanan dibuat.
          </p>
          <button
            type="button"
            onClick={onCheckout}
            className="mt-4 w-full rounded-2xl bg-stone-900 py-3.5 font-medium text-white active:bg-stone-700"
          >
            Lanjut ke pembayaran
          </button>
        </>
      )}
    </BottomSheet>
  )
}
