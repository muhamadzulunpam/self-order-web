import { useOnlineStatus } from '@/lib/useOnlineStatus'

export function OnlineBanner() {
  const online = useOnlineStatus()

  if (online) return null

  return (
    <div
      role="status"
      className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900"
    >
      Anda sedang offline. Pesanan dan pembaruan status baru berjalan lagi
      setelah koneksi kembali.
    </div>
  )
}
