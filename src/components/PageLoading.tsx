// src/components/PageLoading.tsx
export function PageLoading() {
  return (
    <div
      role="status"
      aria-label="Memuat halaman"
      className="flex min-h-[50vh] items-center justify-center text-stone-500"
    >
      Memuat…
    </div>
  )
}
