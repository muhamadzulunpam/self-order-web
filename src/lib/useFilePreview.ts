import { useEffect, useState } from 'react'

/** Pratinjau gambar yang baru dipilih, sebagai data URL (tanpa object URL yang perlu dibersihkan). */
export function useFilePreview(file: File | null): string | null {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(
    null,
  )

  useEffect(() => {
    if (!file) return

    let active = true
    const reader = new FileReader()

    reader.onload = () => {
      if (active && typeof reader.result === 'string') {
        setPreview({ file, url: reader.result })
      }
    }
    reader.readAsDataURL(file)

    return () => {
      active = false
    }
  }, [file])

  return preview !== null && preview.file === file ? preview.url : null
}
