type Item = {
  p: number // profit
  v: number // profit / weight
  w: number // weight
}
export const getV = (items: Item[], W: number[]) => {
  let s = 0
  const sorted = items.slice(0).sort((a, b) => b.v - a.v)

  let n = 0
  const sortedW = W.slice(0).sort((a, b) => a - b)
  let allBagsAllocated = false
  for (const { w, v, p } of sorted) {
    if (!allBagsAllocated) {
      const a = sortedW.findIndex(C => w <= C)
      if (a === -1) {
        continue
      }
      sortedW.splice(a, 1)
      if (sortedW.length === 0) {
        allBagsAllocated = true
      }
    }
    s += w
    // not the most accurate but handles edge cases where too big items make an unreachable predicted value
    if (s >= 1 && allBagsAllocated) {
      return v
    }
  }
  return 0
}

type MultiProps = {
  v: number // critical value
  W: number[] // weight of each bag
}
type Bag = {
  total: number
  i: number
  items: Item[]
  max: number
  sp: number
}
export const multi = ({ v, W }: MultiProps) => {
  const bags = W.map((C, i):Bag => ({
    i,
    total: 0,
    items: [],
    max: C,
    sp: 0
  }))
  let bag: typeof bags[number]
  const state = {
    bags: bags.slice(0),
    total: 0,
    sp: 0,
    getN: () => state.bags.reduce((acc, b) => acc + b.items.length, 0),
    onItem(it: Item) {
      const { v: vi, w: wi, p } = it
      const xi = vi >= v ? wi : 0

      if (xi) {
        // here, we simplified, bc xi is always the whole item anyway
        const add = (it:Item) => {
          bag.items.push(it)
          bag.total += wi
          bag.sp += p
          state.total += wi
          state.sp += p
        }

        if (bag.total + wi <= bag.max) {
          add(it)
        } else {
          for (let b = 0; b < bags.length; ++b) {
            if (bag.max - bag.total > 1e-2) {
              // rotate the bag to the end, in case it was overfilled but not reached full capacity
              bags.push(bag)
            }
            bag = bags.shift()!
            if (bag.total + wi < bag.max) {
              add(it)
              break
            }
          }
          //console.log('could not match')
        }
      }

    }
  }
  bag = bags.shift()!
  bags.push(bag)
  return state
}
