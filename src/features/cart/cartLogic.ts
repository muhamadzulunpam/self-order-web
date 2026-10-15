import type { PublicMenu } from '@/types/menu'

export type CartLine = {
  key: string
  menuId: number
  name: string
  price: number
  quantity: number
  spiceLevel: number | null
  notes: string
}

export type NewLine = Omit<CartLine, 'key'>
export type AddStatus = 'ok' | 'line_limit'
export type CartEntry = { lines: CartLine[]; updatedAt: number }
export type Carts = Record<string, CartEntry>

export const CART_STORAGE_KEY = 'self-order-cart'
export const CART_TTL_MS = 12 * 60 * 60 * 1000
export const MAX_QUANTITY = 20
export const MAX_LINES = 50
export const MIN_SPICE_LEVEL = 0
export const MAX_SPICE_LEVEL = 5

export const SPICE_LEVELS = Array.from(
  { length: MAX_SPICE_LEVEL - MIN_SPICE_LEVEL + 1 },
  (_, index) => MIN_SPICE_LEVEL + index,
)

export function spiceLabel(level: number): string {
  return level === 0 ? 'Tidak pedas' : `Level ${level}`
}

export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1

  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)))
}

export function makeLineKey(
  line: Pick<NewLine, 'menuId' | 'spiceLevel' | 'notes'>,
): string {
  return `${line.menuId}|${line.spiceLevel ?? ''}|${line.notes.trim().toLowerCase()}`
}

export function addToLines(
  lines: CartLine[],
  input: NewLine,
): { lines: CartLine[]; status: AddStatus } {
  const key = makeLineKey(input)
  const existing = lines.find((line) => line.key === key)

  if (existing) {
    return {
      status: 'ok',
      lines: lines.map((line) =>
        line.key === key
          ? {
              ...line,
              name: input.name,
              price: input.price,
              quantity: clampQuantity(line.quantity + input.quantity),
            }
          : line,
      ),
    }
  }

  if (lines.length >= MAX_LINES) return { status: 'line_limit', lines }

  return {
    status: 'ok',
    lines: [
      ...lines,
      {
        ...input,
        key,
        notes: input.notes.trim(),
        quantity: clampQuantity(input.quantity),
      },
    ],
  }
}

type MenuSnapshot = Pick<
  PublicMenu,
  'id' | 'name' | 'price' | 'has_spice_level'
>

/**
 * Samakan isi keranjang dengan menu terbaru dari server.
 * Baris dihapus jika menunya tidak ada lagi atau jenis level pedasnya berubah.
 */
export function reconcileLines(
  lines: CartLine[],
  menus: MenuSnapshot[],
): { lines: CartLine[]; removed: string[]; changed: boolean } {
  const byId = new Map(menus.map((menu) => [menu.id, menu]))
  const removed: string[] = []
  const next: CartLine[] = []
  let changed = false

  for (const line of lines) {
    const menu = byId.get(line.menuId)

    if (!menu || menu.has_spice_level !== (line.spiceLevel !== null)) {
      removed.push(line.name)
      changed = true
      continue
    }

    if (menu.name !== line.name || menu.price !== line.price) {
      changed = true
      next.push({ ...line, name: menu.name, price: menu.price })
    } else {
      next.push(line)
    }
  }

  return { lines: changed ? next : lines, removed, changed }
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0)
}

function isInt(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  )
}

function isLine(value: unknown): value is CartLine {
  if (typeof value !== 'object' || value === null) return false

  const line = value as Record<string, unknown>

  return (
    typeof line.key === 'string' &&
    typeof line.name === 'string' &&
    typeof line.notes === 'string' &&
    isInt(line.menuId, 1, Number.MAX_SAFE_INTEGER) &&
    isInt(line.price, 0, Number.MAX_SAFE_INTEGER) &&
    isInt(line.quantity, 1, MAX_QUANTITY) &&
    (line.spiceLevel === null ||
      isInt(line.spiceLevel, MIN_SPICE_LEVEL, MAX_SPICE_LEVEL))
  )
}

/** Bersihkan data dari localStorage: buang yang kedaluwarsa atau rusak. */
export function sanitizeCarts(raw: unknown, now: number): Carts {
  if (typeof raw !== 'object' || raw === null) return {}

  const result: Carts = {}

  for (const [token, entry] of Object.entries(raw)) {
    if (typeof entry !== 'object' || entry === null) continue

    const { lines, updatedAt } = entry as {
      lines?: unknown
      updatedAt?: unknown
    }

    if (typeof updatedAt !== 'number' || now - updatedAt > CART_TTL_MS) continue
    if (!Array.isArray(lines)) continue

    const valid = lines.filter(isLine).slice(0, MAX_LINES)

    if (valid.length > 0) result[token] = { lines: valid, updatedAt }
  }

  return result
}
