import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { AdminLayout } from '@/features/admin/components/AdminLayout'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { StaffLayout } from '@/features/auth/components/StaffLayout'
import {
  ADMIN_ROLES,
  CASHIER_ROLES,
  KITCHEN_ROLES,
} from '@/features/auth/roles'
import { AdminCategoriesPage } from '@/pages/AdminCategoriesPage'
import { AdminMenusPage } from '@/pages/AdminMenusPage'
import { AdminTablesPage } from '@/pages/AdminTablesPage'
import { CashierPage } from '@/pages/CashierPage'
import { HomePage } from '@/pages/HomePage'
import { KitchenPage } from '@/pages/KitchenPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OrderPage } from '@/pages/OrderPage'
import { OrderStatusPage } from '@/pages/OrderStatusPage'
import { StaffHomePage } from '@/pages/StaffHomePage'
import { StaffLoginPage } from '@/pages/StaffLoginPage'

export const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: '/order/:token', element: <OrderPage /> },
  { path: '/order/:token/status/:orderCode', element: <OrderStatusPage /> },
  { path: '/staff/login', element: <StaffLoginPage /> },
  {
    path: '/staff',
    element: <RequireAuth />,
    children: [
      {
        element: <StaffLayout />,
        children: [
          { index: true, element: <StaffHomePage /> },
          {
            path: 'kitchen',
            element: <RequireAuth roles={KITCHEN_ROLES} />,
            children: [{ index: true, element: <KitchenPage /> }],
          },
          {
            path: 'cashier',
            element: <RequireAuth roles={CASHIER_ROLES} />,
            children: [{ index: true, element: <CashierPage /> }],
          },
          {
            path: 'admin',
            element: <RequireAuth roles={ADMIN_ROLES} />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  {
                    index: true,
                    element: <Navigate to="/staff/admin/menus" replace />,
                  },
                  { path: 'menus', element: <AdminMenusPage /> },
                  { path: 'categories', element: <AdminCategoriesPage /> },
                  { path: 'tables', element: <AdminTablesPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]
