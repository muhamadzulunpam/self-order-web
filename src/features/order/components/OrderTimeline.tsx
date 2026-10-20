import type { OrderStatus } from '@/types/order'
import { getTimeline } from '../timeline'
import type { StepState } from '../timeline'

const SR_TEXT: Record<StepState, string> = {
  done: '(selesai)',
  current: '(sedang berlangsung)',
  upcoming: '(belum)',
}

const CIRCLE: Record<StepState, string> = {
  done: 'bg-emerald-500 text-white',
  current: 'border-2 border-stone-900 bg-white',
  upcoming: 'border-2 border-stone-200 bg-white',
}

const LABEL: Record<StepState, string> = {
  done: 'text-stone-700',
  current: 'font-semibold text-stone-900',
  upcoming: 'text-stone-400',
}

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const steps = getTimeline(status)

  if (!steps) return null

  return (
    <ol aria-label="Progres pesanan">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1

        return (
          <li
            key={step.status}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className="relative flex gap-3 pb-5 last:pb-0"
          >
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute top-6 bottom-0 left-3 w-0.5 -translate-x-1/2 ${
                  step.state === 'done' ? 'bg-emerald-500' : 'bg-stone-200'
                }`}
              />
            )}

            <span
              aria-hidden="true"
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${CIRCLE[step.state]}`}
            >
              {step.state === 'done' && '✓'}
              {step.state === 'current' && (
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-stone-900" />
              )}
            </span>

            <span className={`text-sm leading-6 ${LABEL[step.state]}`}>
              <span>{step.label}</span>
              <span className="sr-only"> {SR_TEXT[step.state]}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
