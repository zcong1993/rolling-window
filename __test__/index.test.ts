import { RollingWindow } from '../src'

it('should work well', async () => {
  const interval = 50
  const rw = new RollingWindow({
    size: 3,
    interval,
  })

  const sleep = () => new Promise((r) => setTimeout(r, interval))

  const listBuckets = () => {
    const buckets: number[] = []
    rw.reduce((b) => {
      buckets.push(b.sum)
    })
    return buckets
  }

  expect(listBuckets()).toEqual([0, 0, 0])
  rw.add(1)
  expect(listBuckets()).toEqual([0, 0, 1])
  await sleep()
  rw.add(2)
  rw.add(3)
  expect(listBuckets()).toEqual([0, 1, 5])
  await sleep()
  rw.add(4)
  rw.add(5)
  rw.add(6)
  expect(listBuckets()).toEqual([1, 5, 15])
  await sleep()
  rw.add(7)
  expect(listBuckets()).toEqual([5, 15, 7])
})

it('reset should works well', async () => {
  const interval = 50
  const rw = new RollingWindow({
    size: 3,
    interval,
    ignoreCurrent: true,
  })

  const sleep = (n: number = interval) => new Promise((r) => setTimeout(r, n))

  const listBuckets = () => {
    const buckets: number[] = []
    rw.reduce((b) => {
      buckets.push(b.sum)
    })
    return buckets
  }

  rw.add(1)
  await sleep()
  expect(listBuckets()).toEqual([0, 1])
  await sleep()
  expect(listBuckets()).toEqual([1])
  await sleep()
  expect(listBuckets()).toEqual([])
  // cross window
  rw.add(1)
  await sleep(interval * 3)
  expect(listBuckets()).toEqual([])
})

const initRw = async (ignoreCurrent: boolean) => {
  const interval = 50
  const size = 4
  const rw = new RollingWindow({
    size,
    interval,
    ignoreCurrent,
  })

  const sleep = (n: number = interval) => new Promise((r) => setTimeout(r, n))

  for (let x = 0; x < size; x++) {
    for (let i = 0; i <= x; i++) {
      rw.add(i)
    }

    if (x < size - 1) {
      await sleep()
    }
  }

  return rw
}

it('reduce should works well', async () => {
  const rw = await initRw(false)

  let res: number = 0
  rw.reduce((b) => (res += b.sum))

  expect(res).toBe(10)
})

it('reduce should works well 2', async () => {
  const rw = await initRw(true)

  let res: number = 0
  rw.reduce((b) => (res += b.sum))

  expect(res).toBe(4)
})
