const Module = require('./minknap.out.js')

const initArray = a => {
  const nByte = 4
  const length = a.length
  const buffer = Module._malloc(length * nByte)
  a.forEach((val, i) => {
    Module.setValue(buffer + i * nByte, val, 'i32')
  })
  return buffer
}

let resolved: () => void
const ready = new Promise(resolve => {
  resolved = resolve
})
Module.onRuntimeInitialized = resolved

type Run = { W: number; items: Array<{ p: number; w: number }> }

const buildResults = ({ x, items }) => {
  let sp = 0
  let sw = 0
  for (let i = 0; i < x.length; ++i) {
    if (x[i] === 0) {
      continue
    }
    const item = items[i]
    sp += item.p
    sw += item.w
  }
  return {
    x,
    sp,
    sw
  }
}

const run = async ({ W, items }: Run) => {
  await ready

  const em_p = initArray(items.map(it => it.p))
  const em_w = initArray(items.map(it => it.w))
  const em_x = initArray(items.map(() => 0))

  Module.ccall(
    'minknap', // name of C function
    'number', // return type
    ['number', 'number', 'number', 'number', 'number'], // argument types
    [items.length, em_p, em_w, em_x, W]
  )
  const backX = items.map((__, i) => Module.getValue(em_x + i * 4, 'i32'))
  Module._free(em_p)
  Module._free(em_w)
  Module._free(em_x)

  return buildResults({ x: backX, items })
}

module.exports = {
  run,
  buildResults
}
