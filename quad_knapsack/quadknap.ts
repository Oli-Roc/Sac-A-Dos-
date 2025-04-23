import initWasm from './quadknap.out.js'

const initArray = a => {
  const nByte = 4
  const length = a.length
  const buffer = Module._malloc(length * nByte)
  a.forEach((val, i) => {
    Module.setValue(buffer + i * nByte, val, 'i32')
  })
  return buffer
}

let Module

const initMatrix = mat => {
  // expects an array
  const values = mat.flat()
  const mSize = Module.ccall('mSize')
  const back = values.concat(Array.from({ length: mSize ** 2 - values.length }, () => 0))
  return initArray(back)
}

const buildResults = ({ x, items, pMatrix }) => {
  let sp = 0
  const taken = new Map()
  for (let i = 0; i < x.length; ++i) {
    if (x[i] === 0) {
      continue
    }
    taken.set(i, items[i].w)
    for (let j = 0; j < x.length; ++j) {
      if (x[j] === 0) {
        continue
      }
      sp += pMatrix[i][j]
      taken.set(j, items[j].w)
    }
  }
  const sw = [...taken.values()].reduce((acc, v) => acc + v)
  return {
    x,
    sp,
    sw
  }
}

const run = async ({ W: maxWeight, pMatrix, items }) => {
  Module = Module || initWasm()
  Module = await Module

  const em_p = initMatrix(pMatrix)
  const em_w = initArray(items.map(it => it.w))
  const em_x = initArray(Array.from({ length: Module.ccall('mSize') }, () => 0))

  Module.ccall(
    'quadknap', // name of C function
    'number', // return type
    ['number', 'number', 'number', 'number', 'number'], // argument types
    [items.length, maxWeight, em_p, em_w, em_x]
  )
  const backX = items.map((__, i) => Module.getValue(em_x + i * 4, 'i32'))
  Module._free(em_p)
  Module._free(em_w)
  Module._free(em_x)

  return await buildResults({ x: backX, items, pMatrix })
}

export default {
  run,
  buildResults
}
