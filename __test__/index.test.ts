import { RollingWindow, MockTimer } from '../src'

it('should work well', async () => {
  const timer = new MockTimer()
  const interval = 50
  const rw = new RollingWindow(
    {
      size: 3,
      interval,
    },
    timer
  )

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
  timer.add(interval * 1e6)
  rw.add(2)
  rw.add(3)
  expect(listBuckets()).toEqual([0, 1, 5])
  timer.add(interval * 1e6)
  rw.add(4)
  rw.add(5)
  rw.add(6)
  expect(listBuckets()).toEqual([1, 5, 15])
  timer.add(interval * 1e6)
  rw.add(7)
  expect(listBuckets()).toEqual([5, 15, 7])
})

it('reset should works well', async () => {
  const timer = new MockTimer()
  const interval = 50
  const rw = new RollingWindow(
    {
      size: 3,
      interval,
      ignoreCurrent: true,
    },
    timer
  )

  const listBuckets = () => {
    const buckets: number[] = []
    rw.reduce((b) => {
      buckets.push(b.sum)
    })
    return buckets
  }

  rw.add(1)
  timer.add(interval * 1e6)
  expect(listBuckets()).toEqual([0, 1])
  timer.add(interval * 1e6)
  expect(listBuckets()).toEqual([1])
  timer.add(interval * 1e6)
  expect(listBuckets()).toEqual([])
  // cross window
  rw.add(1)
  timer.add(interval * 1e6 * 3)
  expect(listBuckets()).toEqual([])
})

const initRw = (ignoreCurrent: boolean) => {
  const timer = new MockTimer()
  const interval = 50
  const size = 4
  const rw = new RollingWindow(
    {
      size,
      interval,
      ignoreCurrent,
    },
    timer
  )

  for (let x = 0; x < size; x++) {
    for (let i = 0; i <= x; i++) {
      rw.add(i)
    }

    if (x < size - 1) {
      timer.add(interval * 1e6)
    }
  }

  return rw
}

it('reduce should works well', async () => {
  const rw = initRw(false)

  let res: number = 0
  rw.reduce((b) => (res += b.sum))

  expect(res).toBe(10)
})

it('reduce should works well 2', async () => {
  const rw = initRw(true)

  let res: number = 0
  rw.reduce((b) => (res += b.sum))

  expect(res).toBe(4)
})

it('TestRollingWindowBucketTimeBoundary', async () => {
  const timer = new MockTimer()
  const interval = 30
  const rw = new RollingWindow(
    {
      size: 3,
      interval,
    },
    timer
  )

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
  timer.add(45 * 1e6)
  rw.add(2)
  rw.add(3)
  expect(listBuckets()).toEqual([0, 1, 5])
  timer.add(20 * 1e6)
  rw.add(4)
  rw.add(5)
  rw.add(6)
  expect(listBuckets()).toEqual([1, 5, 15])
  timer.add(100 * 1e6)
  rw.add(7)
  rw.add(8)
  rw.add(9)
  expect(listBuckets()).toEqual([0, 0, 24])
})
