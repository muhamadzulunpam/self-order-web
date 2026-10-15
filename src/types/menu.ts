export type PublicMenu = {
  id: number
  name: string
  description: string | null
  price: number
  image_url: string | null
  has_spice_level: boolean
}

export type PublicCategory = {
  id: number
  name: string
  slug: string
  menus: PublicMenu[]
}

export type TableMenu = {
  table: { number: number }
  categories: PublicCategory[]
}
