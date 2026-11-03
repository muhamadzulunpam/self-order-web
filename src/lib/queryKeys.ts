export const staffKeys = {
  all: ['staff'] as const,
  orders: ['staff', 'orders'] as const,
}

/** Semua data admin berada di bawah ['staff'], sehingga ikut terhapus oleh pembersihan cache saat logout. */
export const adminKeys = {
  all: ['staff', 'admin'] as const,
  categories: ['staff', 'admin', 'categories'] as const,
  menus: ['staff', 'admin', 'menus'] as const,
  tables: ['staff', 'admin', 'tables'] as const,
  qr: (id: number, url: string) => ['staff', 'admin', 'qr', id, url] as const,
}
