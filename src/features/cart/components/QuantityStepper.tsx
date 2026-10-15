import { MAX_QUANTITY } from '../cartLogic'

type Props = {
  value: number
  onChange: (value: number) => void
  label: string
  min?: number
  max?: number
}

const buttonClass =
  'flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 text-lg leading-none active:bg-stone-100 disabled:opacity-40'

export function QuantityStepper({
  value,
  onChange,
  label,
  min = 1,
  max = MAX_QUANTITY,
}: Props) {
  return (
    <div className="inline-flex items-center gap-3">
      <button
        type="button"
        aria-label={`Kurangi jumlah ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={buttonClass}
      >
        −
      </button>

      <output
        aria-label={`Jumlah ${label}`}
        className="min-w-6 text-center font-semibold tabular-nums"
      >
        {value}
      </output>

      <button
        type="button"
        aria-label={`Tambah jumlah ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={buttonClass}
      >
        +
      </button>
    </div>
  )
}
