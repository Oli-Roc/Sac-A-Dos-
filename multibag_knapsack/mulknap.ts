import initWasm from './mulknap.out.js'

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

const run = async ({ W, items }: { W: number[]; items: Array<{ p: number; w: number }> }) => {
  Module = Module || initWasm()
  Module = await Module
  const em_p = initArray(items.map(it => it.p))
  const em_w = initArray(items.map(it => it.w))
  const em_x = initArray(items.map(() => 0))
  const em_c = initArray(W)
  Module.ccall(
    'mulknap', // name of C function
    'number', // return type
    ['number', 'number', 'number', 'number', 'number', 'number'], // argument types
    [items.length, W.length, em_p, em_w, em_x, em_c]
  ) // arguments
  const backX = items.map((__, i) => Module.getValue(em_x + i * 4, 'i32'))
  Module._free(em_p)
  Module._free(em_w)
  Module._free(em_x)
  Module._free(em_c)

  const bags: Array<typeof items> = W.map(() => [])
  const sw = Array.from(W).fill(0)
  let sp = 0
  backX.forEach((val, i) => {
    if (val === 0) {
      return
    }
    const item = items[i]
    sp += item.p
    bags[val - 1].push(item)
    sw[val - 1] += item.w
  })

  return {
    bags,
    sp,
    sw
  }
}

export default {
 run
}
