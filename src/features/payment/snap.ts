export type SnapCallbacks = {
  onSuccess?: (result: unknown) => void
  onPending?: (result: unknown) => void
  onError?: (result: unknown) => void
  onClose?: () => void
}

export type SnapApi = {
  pay: (snapToken: string, callbacks?: SnapCallbacks) => void
}

declare global {
  interface Window {
    snap?: SnapApi
  }
}

type LoadOptions = { clientKey: string; isProduction: boolean }

const SCRIPT_ID = 'midtrans-snap-script'

let current: {
  src: string
  clientKey: string
  promise: Promise<SnapApi>
} | null = null

export function snapScriptUrl(isProduction: boolean): string {
  return isProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js'
}

/** Memuat snap.js sekali saja. Jika gagal, percobaan berikutnya memuat ulang dari awal. */
export function loadSnap({
  clientKey,
  isProduction,
}: LoadOptions): Promise<SnapApi> {
  const src = snapScriptUrl(isProduction)

  if (current && current.src === src && current.clientKey === clientKey) {
    return current.promise
  }

  const promise = new Promise<SnapApi>((resolve, reject) => {
    document.getElementById(SCRIPT_ID)?.remove()

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = src
    script.async = true
    script.setAttribute('data-client-key', clientKey)

    script.onload = () => {
      if (window.snap) resolve(window.snap)
      else reject(new Error('Halaman pembayaran gagal diinisialisasi.'))
    }

    script.onerror = () => {
      script.remove()
      reject(
        new Error(
          'Gagal memuat halaman pembayaran. Periksa koneksi internet Anda.',
        ),
      )
    }

    document.head.appendChild(script)
  })

  const entry = { src, clientKey, promise }
  current = entry
  promise.catch(() => {
    if (current === entry) current = null
  })

  return promise
}
