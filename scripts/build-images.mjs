// 把 public/images 的 PNG/JPG 轉成多寬度 WebP（給 srcset 用）
// 用法：node scripts/build-images.mjs
import { readdir, writeFile } from 'node:fs/promises'
import { join, parse } from 'node:path'
import sharp from 'sharp'

const DIR = new URL('../public/images/', import.meta.url).pathname
const TARGET_WIDTHS = [480, 960, 1440]
const QUALITY = 82

const files = (await readdir(DIR)).filter((f) => /\.(png|jpe?g)$/i.test(f))
const manifest = {}

for (const file of files) {
  const src = join(DIR, file)
  const { name } = parse(file)
  const meta = await sharp(src).metadata()
  // 產出不超過原圖寬度的目標尺寸；原圖比 1440 小時，最大就用原寬
  const widths = [...new Set(
    TARGET_WIDTHS.filter((w) => w < meta.width).concat(Math.min(meta.width, 1920)),
  )].sort((a, b) => a - b)

  manifest[file] = { origWidth: meta.width, widths: [] }
  for (const w of widths) {
    const out = join(DIR, `${name}-w${w}.webp`)
    const info = await sharp(src).resize({ width: w }).webp({ quality: QUALITY }).toFile(out)
    manifest[file].widths.push(w)
    console.log(`${name}-w${w}.webp  ${(info.size / 1024).toFixed(0)}KB`)
  }
}

await writeFile(new URL('../reference/image-widths.json', import.meta.url), JSON.stringify(manifest, null, 1))
console.log('\nmanifest -> reference/image-widths.json')
