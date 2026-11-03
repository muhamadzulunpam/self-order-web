export const inputClass =
  'w-full rounded-xl border border-stone-300 p-3 text-sm focus:border-stone-900 focus:outline-none disabled:bg-stone-100'

export function ariaFor(id: string, error?: string) {
  return {
    id,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  }
}
