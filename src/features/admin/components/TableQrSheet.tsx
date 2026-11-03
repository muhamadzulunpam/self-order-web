import { useQuery } from '@tanstack/react-query'
import { BottomSheet } from '@/components/BottomSheet'
import { downloadText } from '@/lib/download'
import { adminKeys } from '@/lib/queryKeys'
import { shouldRetry } from '@/lib/retry'
import { fetchTableQr } from '../api'
import { svgDataUrl } from '../qr'
import type { AdminTable } from '../types'

type Props = { table: AdminTable; onClose: () => void }

export function TableQrSheet({ table, onClose }: Props) {
  // Kunci memuat order_url, jadi QR otomatis diambil ulang setelah token dibuat ulang.
  const qr = useQuery({
    queryKey: adminKeys.qr(table.id, table.order_url),
    queryFn: () => fetchTableQr(table.id),
    retry: shouldRetry,
    staleTime: Infinity,
  })

  return (
    <BottomSheet title={`QR meja ${table.number}`} onClose={onClose}>
      {qr.isPending && (
        <p role="status" className="py-8 text-center text-stone-500">
          Memuat QR code…
        </p>
      )}

      {qr.isError && (
        <div className="space-y-3 py-4 text-center">
          <p role="alert" className="text-sm text-red-700">
            {qr.error instanceof Error
              ? qr.error.message
              : 'QR code gagal dimuat.'}
          </p>
          <button
            type="button"
            onClick={() => qr.refetch()}
            className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white active:bg-stone-700"
          >
            Coba lagi
          </button>
        </div>
      )}

      {qr.data && (
        <div className="space-y-4 text-center">
          <img
            src={svgDataUrl(qr.data)}
            alt={`QR code meja ${table.number}`}
            className="mx-auto h-64 w-64 rounded-xl border border-stone-200 bg-white"
          />

          <p className="text-xs break-all text-stone-500 select-all">
            {table.order_url}
          </p>

          {!table.is_active && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Meja ini nonaktif, jadi QR code belum bisa dipakai pembeli.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <a
              href={table.order_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-stone-300 py-3 text-sm font-medium active:bg-stone-100"
            >
              Buka halaman pesan
            </a>
            <button
              type="button"
              onClick={() => {
                if (qr.data) {
                  downloadText(
                    qr.data,
                    `meja-${table.number}.svg`,
                    'image/svg+xml',
                  )
                }
              }}
              className="rounded-xl bg-stone-900 py-3 text-sm font-medium text-white active:bg-stone-700"
            >
              Unduh SVG
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
