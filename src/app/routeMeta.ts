export const APP_NAME = 'Self-Order'

export type RouteHandle = { title?: string }

export function documentTitle(title: string | undefined): string {
  return title ? `${title} · ${APP_NAME}` : APP_NAME
}

/** Mengambil judul dari rute paling dalam yang punya judul. */
export function titleFromMatches(
  matches: readonly { handle?: unknown }[],
): string | undefined {
  for (let index = matches.length - 1; index >= 0; index--) {
    const handle = matches[index].handle as RouteHandle | undefined

    if (handle?.title) return handle.title
  }

  return undefined
}
