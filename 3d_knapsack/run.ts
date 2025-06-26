import { exec } from 'node:child_process'
import fsp from 'node:fs/promises'
import util from 'node:util'
import path from 'node:path'

const execp = util.promisify(exec)

const readEabfitItems = async (prefix:string): Promise<ReadItem[]> => {
  const data = await fsp.readFile(`${prefix}.out`, 'utf8')
  const lines = data.split('\n')
  const itemIndex = lines.findIndex(l => l.includes('PACKEDZ')) + 2
  const itemLines = lines.slice(itemIndex).filter(l => l.match(/\d+/))
  const items: ReadItem[] = []
  // NO: PACKSTA DIMEN-1  DMEN-2  DIMEN-3   COOR-X   COOR-Y   COOR-Z   PACKEDX  PACKEDY  PACKEDZ
  for (const itemLine of itemLines) {
    const [id, _packsta, _dim1, _dim2, _dim3, x, y, z, w, h, d] = itemLine
      .split(/\s+/)
      .filter(x => x != '')
      .map(x => Number.parseInt(x, 10)) as [number, number, number, number, number, number, number, number, number, number, number, ]
    items.push({ id, x, y, z, w, h, d })
  }
  return items
}

const writePackingSolverFiles = async (data: [string, ...string[]], filePrefix: string) => {
  const packingsolverBins = `ID,X,Y,Z
0,${data[0].trim().replace(/ /g, ',')}
`
  const packingsolverItems = `ID,X,Y,Z,ROTATIONS,COPIES
${data
  .slice(1)
  .map(r => {
    return r.replace(/[^0-9]+/g, ',').replace(/,1$/, ',6,1')
  })
  .join('\n')}
`

  await fsp.writeFile(`${filePrefix}_items.csv`, packingsolverItems)
  await fsp.writeFile(`${filePrefix}_bins.csv`, packingsolverBins)
}
const readPackingsolverItems = async (fname:string): Promise<ReadItem[]> => {
  const data = await fsp.readFile(fname, 'utf8')
  const lines = data.split('\n')
  const itemIndex = lines.findIndex(l => l.includes('PACKEDZ')) + 2
  const itemLines = lines.slice(itemIndex).filter(l => l.match(/\d+/))
  const items: ReadItem[] = []
  for (const itemLine of itemLines) {
    // TYPE,ID,COPIES,BIN,X,Y,Z,LX,LY,LZ,ROTATION
    const [type, ...values] = itemLine.split(/,/).filter(x => x != '')
    const [id, copies, bin, x, y, z, w, h, d, rot] = values.map(x => Number.parseInt(x, 10)) as [number, number, number, number, number, number, number, number, number, number]
    if (type === 'ITEM') {
      items.push({ id, x, y, z, w, h, d, rot }) // already rotated :)
    }
  }

  return items
}
type Item = { w: number, h: number, d: number }
type Box = { w: number, h: number, d: number }
type ReadItem = { id: number, x: number, y: number, z: number, w: number, h: number, d: number, rot?: number }
const TIME_LIMIT_SECONDS = 10
const run = async ({ items: iItems, W }: { items: (Item)[], W: Box}) => {

  const data: [string, ...string[]] = [[W.w, W.h, W.d].join(' ')]
  iItems.forEach(({ w, h, d }, i) => {
    data.push(`${i}. ${[w, h, d, 1].join(' ')}`)
  })

  const tmpDir = 'tmp'

  const eabfitPrefix = 'eabfit_sample'
  await fsp.writeFile(path.join(tmpDir, `${eabfitPrefix}.txt`), data.join('\n'))

  const packingSolverPrefix = 'packingsolver_box_sample'
  await writePackingSolverFiles(data, path.join(tmpDir, packingSolverPrefix))

  const [{ stdout: a }, { stdout: b }] = await Promise.all([
    execp(`cd ${tmpDir} && ../eabfit/a.out ${eabfitPrefix} ${TIME_LIMIT_SECONDS}|grep "PALLET VOLUME USED"`),
    execp(
      `cd ${tmpDir} && ../packingsolver/install/bin/packingsolver_box \
  --verbosity-level 1 \
  --items ${packingSolverPrefix} \
  --objective knapsack \
  --certificate ${packingSolverPrefix}_solution_box.csv \
  --output ${packingSolverPrefix}_output.json \
  --time-limit ${TIME_LIMIT_SECONDS}`.replace(/\s+/g, ' ')
    )
  ])

  const matchA = Number.parseFloat(a.trim().replace(/[^0-9.]/g, ''))
  const matchB = Number.parseFloat(String(b.match(/Volume load:.*?(\d+(\.\d+)?)/)![1])) * 100
  if (Number.isNaN(matchA)) {
    throw new Error('failed to match volume for eabit')
  }
  if (Number.isNaN(matchB)) {
    throw new Error('failed to match volume for packingsolver')
  }
  let items: ReadItem[] = []
  console.info(`(eabfit|packing) = (${matchA}|${matchB})%`)
  if (matchA > matchB) {
    items = await readEabfitItems(path.join(tmpDir, `${eabfitPrefix}`))
  } else {
    items = await readPackingsolverItems(path.join(tmpDir, `${packingSolverPrefix}_solution_box.csv`))
  }

  await fsp.writeFile(
    'visu/threedata.js',
    `
export const C = ${JSON.stringify(W)}
export const items = ${JSON.stringify(
      items.map(({ id, x, y, z, w, h, d }) => {
        return { i: id, X: x, Y: y, Z: z, w, h, d }
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
  return run(json)
}

main(process.argv[2])