import { off } from 'process'

export class Bucket {
  sum: number = 0
  count: number = 0

  add(v: number) {
    this.sum += v
    this.count++
  }

  reset() {
    this.sum = 0
    this.count = 0
  }
}

export type Reducer = (b: Bucket) => void

export class Window {
  private readonly buckets: Bucket[] = []
  constructor(private readonly size: number) {
    for (let i = 0; i < this.size; i++) {
      this.buckets.push(new Bucket())
    }
  }

  add(offset: number, v: number) {
    this.buckets[offset % this.size].add(v)
  }

  resetBucket(offset: number) {
    this.buckets[offset % this.size].reset()
  }

  reduce(start: number, count: number, f: Reducer) {
    for (let i = 0; i < count; i++) {
      f(this.buckets[(start + i) % this.size])
    }
  }
}

export interface RollingWindowOpts {
  size: number
  interval: number
  ignoreCurrent?: boolean
}

const hr2nano = (hr: [number, number]) => hr[0] * 1e9 + hr[1]

export class RollingWindow {
  private readonly win: Window
  private lastTime: ReturnType<typeof process.hrtime> = process.hrtime()
  private offset: number = 0
  constructor(private readonly opts: RollingWindowOpts) {
    this.win = new Window(this.opts.size)
    // ms to nano
    this.opts.interval *= 1e6
  }

  add(v: number) {
    this.updateOffset()
    this.win.add(this.offset, v)
  }

  reduce(f: Reducer) {
    let diff: number
    const span = this.span()
    // ignore current bucket, because of partial data
    if (span === 0 && this.opts.ignoreCurrent) {
      diff = this.opts.size - 1
    } else {
      diff = this.opts.size - span
    }
    if (diff > 0) {
      const offset = (this.offset + span + 1) % this.opts.size
      this.win.reduce(offset, diff, f)
    }
  }

  private span() {
    const offset = Math.floor(
      hr2nano(process.hrtime(this.lastTime)) / this.opts.interval
    )
    if (offset >= 0 && offset < this.opts.size) {
      return offset
    }

    return this.opts.size
  }

  private updateOffset() {
    const span = this.span()
    if (span <= 0) {
      return
    }

    let offset = this.offset
    // reset expired buckets
    const start = offset + 1
    let steps = start + span
    let remainder: number
    if (steps > this.opts.size) {
      remainder = steps - this.opts.size
      steps = this.opts.size
    }
    for (let i = start; i < steps; i++) {
      this.win.resetBucket(i)
      offset = i
    }
    for (let i = 0; i < remainder; i++) {
      this.win.resetBucket(i)
      offset = i
    }
    this.offset = offset
    this.lastTime = process.hrtime()
  }
}
