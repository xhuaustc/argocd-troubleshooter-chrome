import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')
const svg = readFileSync(resolve(publicDir, 'icon.svg'))

for (const size of [16, 32, 48, 128]) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(resolve(publicDir, `icon-${size}.png`))
  console.log(`Generated icon-${size}.png`)
}
