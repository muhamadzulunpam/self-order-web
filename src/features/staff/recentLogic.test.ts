import { describe, expect, it } from 'vitest'
import { makeStaffOrder } from '@/test/fixtures'
import { RECENT_LIMIT, addRecent } from './recentLogic'
import type { RecentDone } from './recentLogic'

const done = (id: number) => makeStaffOrder({ id, status: 'completed' })
const ids = (list: RecentDone[]) => list.map((item) => item.order.id)

describe('addRecent', () => {
  it('menaruh yang terbaru di depan dan mencatat waktunya', () => {
    const first = addRecent([], done(1), 1000)
    const second = addRecent(first, done(2), 2000)

    expect(ids(second)).toEqual([2, 1])
    expect(second[0].at).toBe(2000)
  })

  it('tidak menggandakan pesanan yang sama dan mengembalikan daftar yang sama', () => {
    const list = addRecent([], done(1), 1000)

    expect(addRecent(list, done(1), 9999)).toBe(list)
    expect(list[0].at).toBe(1000)
  })

  it('membatasi jumlah dan membuang yang terlama', () => {
    let list: RecentDone[] = []

    for (let id = 1; id <= RECENT_LIMIT + 3; id++) {
      list = addRecent(list, done(id), id)
    }

    expect(list).toHaveLength(RECENT_LIMIT)
    expect(list[0].order.id).toBe(RECENT_LIMIT + 3)
    expect(ids(list)).not.toContain(1)
  })

  it('tidak mengubah daftar asal', () => {
    const list = addRecent([], done(1), 1000)

    addRecent(list, done(2), 2000)

    expect(list).toHaveLength(1)
  })
})
