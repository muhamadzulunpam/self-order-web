import type { RouteObject } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { KitchenPage } from '@/pages/KitchenPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OrderPage } from '@/pages/OrderPage'
import { StaffLoginPage } from '@/pages/StaffLoginPage'
import { OrderStatusPage } from '@/pages/OrderStatusPage'

export const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: '/order/:token', element: <OrderPage /> },
  { path: '/order/:token/status/:orderCode', element: <OrderStatusPage /> },
  { path: '/staff/login', element: <StaffLoginPage /> },
  { path: '/staff/kitchen', element: <KitchenPage /> },
  { path: '*', element: <NotFoundPage /> },
]
