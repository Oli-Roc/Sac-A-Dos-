// simpler to parse js
import fsp from 'node:fs/promises'
import { exec } from 'child_process'
import util from 'util'
const execp = util.promisify(exec)

const values = [360, 83, 59,  130, 431, 67, 230, 52,  93,  125, 670, 892, 600,
      38,  48, 147, 78,  256, 63, 17,  120, 164, 432, 35,  92,  110,
      22,  42, 50,  323, 514, 28, 87,  73,  78,  15,  26,  78,  210,
      36,  85, 189, 274, 43,  33, 10,  19,  389, 276, 312]
const weights = [[7,  0,  30, 22, 80, 94, 11, 81, 70, 64, 59, 18, 0,  36, 3,  8,  15,
       42, 9,  0,  42, 47, 52, 32, 26, 48, 55, 6,  29, 84, 2,  4,  18, 56,
       7,  29, 93, 44, 71, 3,  86, 66, 31, 65, 0,  79, 20, 65, 52, 13],
       [7,  0,  30, 22, 80, 94, 11, 81, 70, 64, 59, 18, 0,  36, 3,  8,  15,
       42, 9,  0,  42, 47, 52, 32, 26, 48, 55, 6,  29, 84, 2,  4,  18, 56,
       7,  29, 93, 44, 71, 3,  86, 66, 31, 65, 0,  79, 20, 65, 52, 13].reverse()]
const capacities = [850, 700]

await fsp.writeFile('mcknapsack/build/input.txt', `${values.length} ${weights.length} ${weights[0].length} ${capacities.length} ${values.join(' ')} ${weights.map(row => row.join(' ')).join(' ')} ${capacities.join(' ')}`)
const { stdout } = await execp(`make run`)
const items = await fsp.readFile('mcknapsack/build/output.txt', 'utf8')

const pickedItems = []
const totalWeights = Array.from(weights, () => 0)
const pickedWeights = Array.from(weights, () => [])

items.split(' ').forEach((it, i) => {
  if (it === '1') {
    pickedItems.push(values[i])
    weights.forEach((row, weightIdx) => {
      const w = row[i]
      totalWeights[weightIdx] += w
      pickedWeights[weightIdx].push(w)
    })
  }
})

console.log(JSON.stringify({ pickedItems, totalWeights, pickedWeights }, null, 2))