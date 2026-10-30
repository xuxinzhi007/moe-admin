/**
 * Sprint D: cut core component CSS out of legacy/moe-admin-theme.css
 * Run: node scripts/extract-legacy-css.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const styles = path.join(__dirname, '..', 'src', 'styles')
const legacyPath = path.join(styles, 'legacy', 'moe-admin-theme.css')

const lines = fs.readFileSync(legacyPath, 'utf8').split(/\r?\n/)

/** 1-based inclusive ranges → relative file under styles/ */
const cuts = [
  { start: 1, end: 28, file: 'base/reset.css', banner: '/* extracted from legacy · Sprint D */\n' },
  { start: 1149, end: 1198, file: 'components/buttons.css', banner: '/* buttons · extracted from legacy · Sprint D */\n' },
  { start: 1200, end: 1308, file: 'components/panels.css', banner: '/* panels · extracted from legacy · Sprint D */\n' },
  { start: 1310, end: 1400, file: 'components/tags.css', banner: '/* tags · extracted from legacy · Sprint D */\n' },
  {
    start: 1778,
    end: 1994,
    file: 'components/drawers.css',
    banner: '/* drawers + form-field · extracted from legacy · Sprint D */\n',
  },
]

for (const cut of cuts) {
  const slice = lines.slice(cut.start - 1, cut.end)
  const outPath = path.join(styles, cut.file)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, cut.banner + slice.join('\n') + '\n', 'utf8')
  console.log(`wrote ${cut.file} (${slice.length} lines)`)
}

// Remove from high to low so indexes stay valid
const sorted = [...cuts].sort((a, b) => b.start - a.start)
let next = lines
for (const cut of sorted) {
  next = [...next.slice(0, cut.start - 1), ...next.slice(cut.end)]
  console.log(`removed legacy L${cut.start}-${cut.end}`)
}

const header =
  '/* legacy monolith — Sprint D 已抽出 buttons/panels/tags/drawers/reset；剩余待搬 */\n\n'
fs.writeFileSync(legacyPath, header + next.join('\n').replace(/^\n+/, ''), 'utf8')
console.log(`legacy now ${next.length} lines`)
