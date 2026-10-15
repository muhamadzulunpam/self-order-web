import type { PublicCategory } from '@/types/menu'

type Props = {
  categories: Pick<PublicCategory, 'id' | 'name'>[]
  activeId: number | null
  onSelect: (id: number) => void
}

export function CategoryNav({ categories, activeId, onSelect }: Props) {
  return (
    <nav
      aria-label="Kategori menu"
      className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {categories.map((category) => {
        const isActive = category.id === activeId

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            aria-current={isActive ? 'true' : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-700 active:bg-stone-200'
            }`}
          >
            {category.name}
          </button>
        )
      })}
    </nav>
  )
}
