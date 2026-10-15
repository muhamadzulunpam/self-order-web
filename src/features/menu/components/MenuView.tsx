import { useMemo } from 'react'
import type { TableMenu } from '@/types/menu'
import { sectionId, useActiveCategory } from '../useActiveCategory'
import { CategoryNav } from './CategoryNav'
import { MenuCard } from './MenuCard'

export function MenuView({ data }: { data: TableMenu }) {
  const { table, categories } = data
  const ids = useMemo(() => categories.map((c) => c.id), [categories])
  const { activeId, select } = useActiveCategory(ids)

  function handleSelect(id: number) {
    select(id)
    document
      .getElementById(sectionId(id))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">Menu</h1>
          <span className="rounded-full bg-stone-900 px-3 py-1 text-sm font-medium text-white">
            Meja {table.number}
          </span>
        </div>

        {categories.length > 0 && (
          <CategoryNav
            categories={categories}
            activeId={activeId}
            onSelect={handleSelect}
          />
        )}
      </header>

      {categories.length === 0 ? (
        <p className="p-6 text-center text-stone-500">
          Belum ada menu yang tersedia saat ini.
        </p>
      ) : (
        <main className="px-4">
          {categories.map((category) => (
            <section
              key={category.id}
              id={sectionId(category.id)}
              data-category-id={category.id}
              aria-labelledby={`${sectionId(category.id)}-title`}
              className="scroll-mt-28 py-4"
            >
              <h2
                id={`${sectionId(category.id)}-title`}
                className="mb-1 text-lg font-bold"
              >
                {category.name}
              </h2>

              <ul className="divide-y divide-stone-100">
                {category.menus.map((menu) => (
                  <MenuCard key={menu.id} menu={menu} />
                ))}
              </ul>
            </section>
          ))}
        </main>
      )}
    </div>
  )
}
