import { Suspense, lazy } from 'react'
import type { ComponentType } from 'react'
import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { PageLoading } from '@/components/PageLoading'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { StaffLayout } from '@/features/auth/components/StaffLayout'
import {
  ADMIN_ROLES,
  CASHIER_ROLES,
  KITCHEN_ROLES,
} from '@/features/auth/roles'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OrderPage } from '@/pages/OrderPage'
import { OrderStatusPage } from '@/pages/OrderStatusPage'
import { StaffHomePage } from '@/pages/StaffHomePage'
import { StaffLoginPage } from '@/pages/StaffLoginPage'
import { RootLayout } from './RootLayout'
import { RouteErrorPage } from './RouteErrorPage'

/**
 * Layar staf dimuat saat dibutuhkan (code splitting), sehingga pembeli tidak mengunduh
 * kode dapur, kasir, dan admin. Modul ini TIDAK boleh diimpor secara statis di tempat lain.
 */
function lazyPage<K extends string>(
  load: () => Promise<Record<K, ComponentType>>,
  name: K,
) {
  const Component = lazy(() =>
    load().then((module) => ({ default: module[name] })),
  )

  return (
    <Suspense fallback={<PageLoading />}>
      <Component />
    </Suspense>
  )
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      {
        path: '/order/:token',
        element: <OrderPage />,
        handle: { title: 'Menu' },
      },
      {
        path: '/order/:token/status/:orderCode',
        element: <OrderStatusPage />,
        handle: { title: 'Status pesanan' },
      },
      {
        path: '/staff/login',
        element: <StaffLoginPage />,
        handle: { title: 'Login staf' },
      },
      {
        path: '/staff',
        element: <RequireAuth />,
        children: [
          {
            element: <StaffLayout />,
            children: [
              {
                index: true,
                element: <StaffHomePage />,
                handle: { title: 'Beranda staf' },
              },
              {
                path: 'kitchen',
                element: <RequireAuth roles={KITCHEN_ROLES} />,
                children: [
                  {
                    index: true,
                    element: lazyPage(
                      () => import('@/pages/KitchenPage'),
                      'KitchenPage',
                    ),
                    handle: { title: 'Layar dapur' },
                  },
                ],
              },
              {
                path: 'cashier',
                element: <RequireAuth roles={CASHIER_ROLES} />,
                children: [
                  {
                    index: true,
                    element: lazyPage(
                      () => import('@/pages/CashierPage'),
                      'CashierPage',
                    ),
                    handle: { title: 'Layar kasir' },
                  },
                ],
              },
              {
                path: 'admin',
                element: <RequireAuth roles={ADMIN_ROLES} />,
                children: [
                  {
                    element: lazyPage(
                      () => import('@/features/admin/components/AdminLayout'),
                      'AdminLayout',
                    ),
                    children: [
                      {
                        index: true,
                        element: <Navigate to="/staff/admin/menus" replace />,
                      },
                      {
                        path: 'menus',
                        element: lazyPage(
                          () => import('@/pages/AdminMenusPage'),
                          'AdminMenusPage',
                        ),
                        handle: { title: 'Admin · Menu' },
                      },
                      {
                        path: 'categories',
                        element: lazyPage(
                          () => import('@/pages/AdminCategoriesPage'),
                          'AdminCategoriesPage',
                        ),
                        handle: { title: 'Admin · Kategori' },
                      },
                      {
                        path: 'tables',
                        element: lazyPage(
                          () => import('@/pages/AdminTablesPage'),
                          'AdminTablesPage',
                        ),
                        handle: { title: 'Admin · Meja' },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
        handle: { title: 'Halaman tidak ditemukan' },
      },
    ],
  },
]
