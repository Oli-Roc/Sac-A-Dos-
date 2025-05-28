// https://arxiv.org/pdf/2406.18752
type Item = {
  v: number,
  w: number,
  p: number
}
export const getBounds = ({ items }: { items: Item[] }) => {
  const sorted = items.slice(0).sort((a, b) => b.v - a.v)
  return {
    U: sorted[0].v,
    L: sorted[sorted.length - 1].v
  }
}
export const getV = ({ items }: { items: Item[] }) => {
  const sorted = items.slice(0).sort((a, b) => b.v - a.v)
  let s = 0
  for (const { w, v } of sorted) {
    s += w
    if (s >= 1) {
      return v
    }
  }
}
export const fr2Int = ({ ppa, delta, eps, U, L }: { ppa: ReturnType<typeof makePpa>, delta: number, eps: number, U: number, L: number }) => {
  const logDCeil = (z: number) => Math.ceil(Math.log(z) / Math.log(1 + delta))
  const A = Array.from({ length: logDCeil(U / L) + 1 }, () => 0)
  const R = A.slice(0)
  const state = {
    items: [] as Item[],
    total: 0,
    sp: 0,
    onItem(it: Item) {
      const { v: vi, w: wi, p } = it
      const xi = ppa.onItem({ v: vi, w: wi, p })
      const j = logDCeil(vi / L)
      R[j] += xi * vi
      if (A[j] < (R[j] * (1 - eps * (logDCeil(U / L) + 1))) / (1 + delta)) {
        const xi = wi
        if (wi + state.total > 1) {
          // when delta chosen too small
          return
        }
        state.items.push(it)
        A[j] += xi * vi
        state.total += wi
        state.sp += p
      }
    }
  }
  return state
}
export const makePpa = ({ v }: { v: number }) => {
  let w = 0
  let s = 0
  const state = {
    sp: 0,
    total: 0,
    onItem({ v: vi, w: wi, p }: Item) {
      if (vi < v) {
        return 0
      }
      if (vi > v) {
        const xi = wi / (1 + w)
        s += xi
        state.sp += (xi / wi) * p
        state.total += (xi / wi) * w

        return xi
      }
      const tmp = Math.min(wi, 1 - w)
      w += tmp
      if (Number.isNaN(tmp)) {
        throw new Error('failed')
      }
      const xi = (tmp * (1 - s)) / (1 + w)
      if (xi < 0) {
        // likely to occur when prediction is wrong. Ignore defensively
        return 0
      }
      s += xi
      state.sp += (xi / wi) * p
      state.total += (xi / wi) * w

      return xi
    }
  }
  return state
}
