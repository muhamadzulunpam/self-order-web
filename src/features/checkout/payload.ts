import type { CartLine } from '@/features/cart/cartLogic'
import type { CreateOrderInput } from '@/types/order'

/** Hanya mengirim id, jumlah, level pedas, dan catatan. Harga sengaja tidak dikirim: server yang menghitung. */
export function buildOrderPayload(
  lines: CartLine[],
  customerName: string,
  notes: string,
): CreateOrderInput {
  const name = customerName.trim()
  const note = notes.trim()

  return {
    ...(name ? { customer_name: name } : {}),
    ...(note ? { notes: note } : {}),
    items: lines.map((line) => ({
      menu_id: line.menuId,
      quantity: line.quantity,
      ...(line.spiceLevel !== null ? { spice_level: line.spiceLevel } : {}),
      ...(line.notes ? { notes: line.notes } : {}),
    })),
  }
}
