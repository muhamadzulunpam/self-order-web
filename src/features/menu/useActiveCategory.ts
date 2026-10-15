import { useEffect, useState } from 'react'

export function sectionId(categoryId: number): string {
  return `category-${categoryId}`
}

/**
 * Melacak kategori yang sedang terlihat di layar saat pembeli menggulir.
 * Jika IntersectionObserver tidak tersedia, kategori pertama dianggap aktif.
 */
export function useActiveCategory(ids: number[]) {
  const [activeId, setActiveId] = useState<number | null>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const visible = new Set<number>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = Number(entry.target.getAttribute('data-category-id'))

          if (entry.isIntersecting) visible.add(id)
          else visible.delete(id)
        }

        const current = ids.filter((id) => visible.has(id)).at(-1)

        if (current !== undefined) setActiveId(current)
      },
      { rootMargin: '-120px 0px -50% 0px' },
    )

    for (const id of ids) {
      const element = document.getElementById(sectionId(id))

      if (element) observer.observe(element)
    }

    return () => observer.disconnect()
  }, [ids])

  const current =
    activeId !== null && ids.includes(activeId) ? activeId : (ids[0] ?? null)

  return { activeId: current, select: setActiveId }
}
