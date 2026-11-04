const CHUNK_ERROR =
  /dynamically imported module|importing a module script failed|ChunkLoadError|Loading chunk .* failed/i

/** Kegagalan memuat potongan kode, biasanya karena aplikasi baru di-deploy saat tab lama masih terbuka. */
export function isChunkError(error: unknown): boolean {
  return (
    error instanceof Error && CHUNK_ERROR.test(`${error.name} ${error.message}`)
  )
}
