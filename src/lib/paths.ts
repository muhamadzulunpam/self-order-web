export function orderPath(token: string): string {
  return `/order/${encodeURIComponent(token)}`
}

export function orderStatusPath(token: string, orderCode: string): string {
  return `${orderPath(token)}/status/${encodeURIComponent(orderCode)}`
}
