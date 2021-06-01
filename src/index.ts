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
  /**
   * ms
   */
  interval: number
  ignoreCurrent?: boolean
}

export class RollingWindow {
  private readonly win: Window
  private lastTime: number
  private offset: number = 0
  constructor(
    private readonly opts: RollingWindowOpts,
    private readonly timer: Timer = new DefaultTimer()
  ) {
    this.win = new Window(this.opts.size)
    // ms to nano
    this.opts.interval *= 1e6
    this.lastTime = timer.now()
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
      (this.timer.now() - this.lastTime) / this.opts.interval
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

    const offset = this.offset
    // reset expired buckets
    for (let i = 0; i < span; i++) {
      this.win.resetBucket(offset + i + 1)
    }

    this.offset = (offset + span) % this.opts.size
    const now = this.timer.now()
    const last = now - ((now - this.lastTime) % this.opts.interval)
    // align to interval time boundary
    this.lastTime = last
  }
}

export interface Timer {
  now(): number // nano
}

export class DefaultTimer implements Timer {
  now() {
    return hr2nano(process.hrtime())
  }
}

export const hr2nano = (hr: [number, number]) => hr[0] * 1e9 + hr[1]

/**
 * for test
 */
export class MockTimer implements Timer {
  constructor(private _now: number = hr2nano(process.hrtime())) {}

  now() {
    return this._now
  }

  add(interval: number) {
    this._now += interval
  }
}
