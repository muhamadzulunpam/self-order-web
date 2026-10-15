export function MenuSkeleton() {
  return (
    <div
      role="status"
      aria-label="Memuat menu"
      className="mx-auto min-h-screen max-w-md bg-white"
    >
      <div className="space-y-3 border-b border-stone-200 p-4">
        <div className="h-6 w-32 animate-pulse rounded bg-stone-200" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-9 w-20 animate-pulse rounded-full bg-stone-200"
            />
          ))}
        </div>
      </div>

      <div className="space-y-5 p-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-stone-200" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200" />
              <div className="h-3 w-full animate-pulse rounded bg-stone-200" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-stone-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
