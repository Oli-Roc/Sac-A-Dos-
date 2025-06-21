import { exec } from 'node:child_process'
import fsp from 'node:fs/promises'
import util from 'node:util'
import path from 'node:path'
const execp = util.promisify(exec)

const readKnapItems = async (fname:string): Promise<ReadItem[]> => {
  // item x y dx dy
  const data = await fsp.readFile(fname, 'utf8')
  const lines = data.split('\n').filter(Boolean)
  return lines.map(l => {
    const [id, x, y, w, h] = [...l.matchAll(/\d+/g)].map(cap => parseInt(cap[0], 10)) as [number, number, number, number, number]
    return { id, x, y, w, h }
  })
}

const writePackingSolverFiles = async (data:[string, ...string[]], filePrefix:string) => {
  const packingsolverBins = `ID,WIDTH,HEIGHT
0,${data[0].trim().replace(/ /g, ',').replace(/[^0-9]+/g, ',').replace(/,$/,'')}
`
  const packingsolverItems = `ID,WIDTH,HEIGHT,PROFIT
${data
  .slice(1)
  .map((r, i) => {
    return `${i},${r.replace(/[^0-9]+/g, ',')}`.replace(/,$/,'')
  })
  .join('\n')}
`

  await fsp.writeFile(`${filePrefix}_items.csv`, packingsolverItems)
  await fsp.writeFile(`${filePrefix}_bins.csv`, packingsolverBins)
}

type ReadItem = { id: number, x: number, y: number, w: number, h: number }
const readPackingsolverItems = async (fname:string): Promise<ReadItem[]> => {
  const data = await fsp.readFile(fname, 'utf8')
  const lines = data.split('\n')
  const itemIndex = lines.findIndex(l => l.includes('PACKEDZ')) + 2
  const itemLines = lines.slice(itemIndex).filter(l => l.match(/\d+/))
  const items: ReadItem[] = []
  for (const itemLine of itemLines) {
    // TYPE,ID,COPIES,BIN,X,Y,LX,LY
    const [type, ...values] = itemLine.split(/,/).filter(x => x != '')
    const [id, copies, bin, x, y, w, h] = values.map(x => Number.parseInt(x, 10)) as [number, number, number, number, number, number, number]
    if (type === 'ITEM') {
      items.push({ id, x, y, w, h }) // already rotated :)
    }
  }

  return items
}

type ThreeItem = { i: number, X: number, Y: number, Z: number, w: number, h: number, d: number }
const run = async ({ items: iItems, W }: { items: {w: number, h: number}[], W: { w: number, h: number }}) => {
  const data:[string, ...string[]] = [`${[W.w, W.h].join(' ')} // WBIN HBIN`]
  iItems.forEach(({ w, h }, i) => {
    data.push(`${[w, h, w * h].join(' ')}${i === 0 ? ' // W H value' : '' }`)
  })

  const tmpDir = 'tmp'

  const knapFileName = 'instance_knap.txt' 
  await fsp.writeFile(path.join(tmpDir, knapFileName), data.join('\n'))

  const packingFilePrefix = 'packingsolver_rectangle_sample'
  await writePackingSolverFiles(data, path.join(tmpDir, packingFilePrefix))

  const [{ stdout: a, stderr: aErr }, { stdout: b }] = await Promise.all([
    execp(`make run input_file=${path.join(tmpDir, knapFileName)} params=max_time_in_seconds:10`),
    execp(`cd tmp && ../packingsolver/install/bin/packingsolver_rectangle \
        --verbosity-level 1 \
        --items ${packingFilePrefix}_items.csv \
        --bins ${packingFilePrefix}_bins.csv \
        --objective knapsack \
        --certificate ${packingFilePrefix}_solution.csv \
        --time-limit 10`.replace(/\s+/g, ' ')),
  ])

  const matchA = Number.parseFloat(String([...aErr.matchAll(/area used:\s*(\d+)/g)].pop()![1]))
  if (isNaN(matchA)) {
    throw new Error('failed to capture knap area')
  }
  const matchB = Number.parseFloat(String(b.match(/Item area:\s*(\d+)/)![1]))
  if (isNaN(matchA)) {
    throw new Error('failed to capture packingsolver area')
  }

  let items: ReadItem[] = []
  const area = W.w * W.h
  console.log(`(knap|packing) = (${(matchA/area * 100).toFixed(2)}|${(matchB/area * 100).toFixed(4)})%`)
  if (matchA > matchB) {
    items = await readKnapItems(`${path.join(tmpDir, knapFileName)}.solution`)
  } else {
    items = await readPackingsolverItems(path.join(tmpDir, `${packingFilePrefix}_solution.csv`))
  }

  await fsp.writeFile(
    'visu/threedata.js',
    `
export const C = Object.assign(${JSON.stringify(W)}, { d: 1 })
export const items = ${JSON.stringify(
      items.map(({ id, x, y, w, h }): ThreeItem => {
        return { i: id, X: x, Y: y, Z: 0, w, h, d: 1 }
      }),
      null,
      2
    )}`
  )
}

const main = async (fname:string) => {
  if (!fname) {
    console.error(process.argv)
    throw new Error('need filename argument')
  }
  const json = await fsp.readFile(fname, 'utf8').then(JSON.parse)
  await run(json)
}


main(process.argv[2])