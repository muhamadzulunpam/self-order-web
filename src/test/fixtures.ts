import type { TableMenu } from '@/types/menu'

export const sampleMenu: TableMenu = {
  table: { number: 5 },
  categories: [
    {
      id: 1,
      name: 'Mie',
      slug: 'mie',
      menus: [
        {
          id: 10,
          name: 'Mie Pedas Original',
          description: 'Mie dengan bumbu pedas khas.',
          price: 12000,
          image_url: 'http://localhost:8000/storage/menus/mie.jpg',
          has_spice_level: true,
        },
        {
          id: 11,
          name: 'Mie Goreng Spesial',
          description: null,
          price: 15000,
          image_url: null,
          has_spice_level: false,
        },
      ],
    },
    {
      id: 2,
      name: 'Minuman',
      slug: 'minuman',
      menus: [
        {
          id: 20,
          name: 'Es Teh Manis',
          description: 'Teh manis dingin.',
          price: 5000,
          image_url: null,
          has_spice_level: false,
        },
      ],
    },
  ],
}
