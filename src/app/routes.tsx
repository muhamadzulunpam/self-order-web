// src/app/routes.tsx
import type { RouteObject } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { StaffLayout } from '@/features/auth/components/StaffLayout'
import {
  ADMIN_ROLES,
  CASHIER_ROLES,
  KITCHEN_ROLES,
} from '@/features/auth/roles'
import { AdminPage } from '@/pages/AdminPage'
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
            children: [{ index: true, element: <AdminPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]
