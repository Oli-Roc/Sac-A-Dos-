// http://deeparnab.github.io/PUBS/CZL-full.pdf
const czl = ({ capacities, U, L }: { capacities: number[], U: number, L: number }) => {
  const bins = capacities.map(C => ({
    C, items: [], total: 0
  }))
  const psi = z => Math.pow(U * Math.exp(1) / L, z) * (L / Math.exp(1))
  const state = {
    bins,
    sp: 0,
    onItem (item) {
      const { p, w } = item
      const taken = bins.find((bin) => {
        const { total, C, items } = bin
        if (p / w > psi(total / C) && total + w <= C) {
          bin.total += w
          state.sp += p
          items.push(item)
          return true
        }
      })
      return taken
    }
  }
  return state
}

export default { run: czl }