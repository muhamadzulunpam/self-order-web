/** Mengunduh teks sebagai file. Mengembalikan false jika browser tidak mendukung. */
export function downloadText(
  content: string,
  filename: string,
  mime: string,
): boolean {
  if (typeof URL.createObjectURL !== 'function') return false

  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => {
    if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url)
  }, 1000)

  return true
}
