export type Role = 'admin' | 'cashier' | 'kitchen'

export type User = {
  id: number
  name: string
  email: string
  role: Role
}
