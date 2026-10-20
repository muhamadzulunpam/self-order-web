import { useEffect, useMemo, useState } from 'react'
import { cartCount, cartTotal } from '@/features/cart/cartLogic'
import type { NewLine } from '@/features/cart/cartLogic'
import { AddToCartSheet } from '@/features/cart/components/AddToCartSheet'
import { CartBar } from '@/features/cart/components/CartBar'
import { CartSheet } from '@/features/cart/components/CartSheet'
import { useCartLines, useCartStore } from '@/features/cart/store'
import type { PublicMenu, TableMenu } from '@/types/menu'
import { sectionId, useActiveCategory } from '../useActiveCategory'
import { CategoryNav } from './CategoryNav'
import { MenuCard } from './MenuCard'
import { CheckoutSheet } from '@/features/checkout/components/CheckoutSheet'
import { ActiveOrders } from '@/features/order/components/ActiveOrders'

type Props = {
  token: string
  data: TableMenu
}

export function MenuView({ token, data }: Props) {
  const { table, categories } = data
  const ids = useMemo(() => categories.map((c) => c.id), [categories])
  const { activeId, select } = useActiveCategory(ids)

  const lines = useCartLines(token)
  const notice = useCartStore((state) => state.removedNotices[token])
  const addLine = useCartStore((state) => state.addLine)
  const setQuantity = useCartStore((state) => state.setQuantity)
  const removeLine = useCartStore((state) => state.removeLine)
  const reconcile = useCartStore((state) => state.reconcile)
  const dismissNotice = useCartStore((state) => state.dismissNotice)

  const [selectedMenu, setSelectedMenu] = useState<PublicMenu | null>(null)
  const [view, setView] = useState<'cart' | 'checkout' | null>(null)

  // Samakan keranjang dengan menu terbaru (harga berubah, menu habis, dst.)
  useEffect(() => {
    reconcile(
      token,
      categories.flatMap((category) => category.menus),
    )
  }, [token, categories, reconcile])

  const quantityByMenu = useMemo(() => {
    const map = new Map<number, number>()

    for (const line of lines) {
      map.set(line.menuId, (map.get(line.menuId) ?? 0) + line.quantity)
    }

    return map
  }, [lines])

  const count = cartCount(lines)
  const total = cartTotal(lines)

  function handleSelect(id: number) {
    select(id)
    document
      .getElementById(sectionId(id))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      className={`mx-auto min-h-screen max-w-md bg-white ${count > 0 ? 'pb-28' : ''}`}
    >
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

      <ActiveOrders token={token} />

      {notice && notice.length > 0 && (
        <div
          role="status"
          className="mx-4 mt-3 flex items-start justify-between gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p>
            {notice.join(', ')} dihapus dari keranjang karena sudah tidak
            tersedia atau berubah.
          </p>
          <button
            type="button"
            onClick={() => dismissNotice(token)}
            aria-label="Tutup pemberitahuan"
            className="shrink-0 font-medium underline"
          >
            Tutup
          </button>
        </div>
      )}

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
                  <MenuCard
                    key={menu.id}
                    menu={menu}
                    inCartQuantity={quantityByMenu.get(menu.id) ?? 0}
                    onAdd={() => setSelectedMenu(menu)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </main>
      )}

      <CartBar count={count} total={total} onOpen={() => setView('cart')} />

      {selectedMenu && (
        <AddToCartSheet
          key={selectedMenu.id}
          menu={selectedMenu}
          onAdd={(input: NewLine) => addLine(token, input)}
          onClose={() => setSelectedMenu(null)}
        />
      )}

      {view === 'cart' && (
        <CartSheet
          tableNumber={table.number}
          lines={lines}
          onChangeQuantity={(key, quantity) =>
            setQuantity(token, key, quantity)
          }
          onRemove={(key) => removeLine(token, key)}
          onCheckout={() => setView('checkout')}
          onClose={() => setView(null)}
        />
      )}

      {view === 'checkout' && (
        <CheckoutSheet
          token={token}
          tableNumber={table.number}
          lines={lines}
          onBack={() => setView('cart')}
          onClose={() => setView(null)}
        />
      )}
    </div>
  )
}
