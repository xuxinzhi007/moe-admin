/**
 * Sprint E: extract page/domain CSS from legacy.
 * Run once: node scripts/extract-legacy-css-sprint-e.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const styles = path.join(__dirname, '..', 'src', 'styles')
const legacyPath = path.join(styles, 'legacy', 'moe-admin-theme.css')

const lines = fs.readFileSync(legacyPath, 'utf8').split(/\r?\n/)
const total = lines.length

const cuts = [
  {
    start: 441,
    end: 1068,
    file: 'feature/brain.css',
    banner: '/* brain + inference + memory · Sprint E from legacy */\n',
  },
  {
    start: 1828,
    end: 1879,
    file: 'pages/landing-feedback.css',
    banner: '/* landing feedback · Sprint E from legacy */\n',
  },
  {
    start: 2201,
    end: 2427,
    file: 'feature/data-domain-map.css',
    banner: '/* data galaxy map · Sprint E from legacy */\n',
    append: `
@media (max-width: 900px) {
  .data-map-bento {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 560px) {
  .data-map-bento {
    grid-template-columns: 1fr;
  }
}
`,
  },
  {
    start: 2634,
    end: 2756,
    file: 'pages/login.css',
    banner: '/* login shell · Sprint E from legacy（hero 细节见 soft-particles.css） */\n',
  },
  {
    start: 4070,
    end: total,
    file: 'pages/analytics.css',
    banner: '/* analytics / chat-logs / tags · Sprint E from legacy */\n',
  },
]

for (const cut of cuts) {
  const end = Math.min(cut.end, total)
  const slice = lines.slice(cut.start - 1, end)
  const outPath = path.join(styles, cut.file)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, cut.banner + slice.join('\n') + (cut.append || '') + '\n', 'utf8')
  console.log(`wrote ${cut.file} (${slice.length} lines)`)
}

const remove = cuts.map((c) => ({ start: c.start, end: Math.min(c.end, total) }))
remove.sort((a, b) => b.start - a.start)
let next = lines
for (const { start, end } of remove) {
  next = [...next.slice(0, start - 1), ...next.slice(end)]
  console.log(`removed legacy L${start}-${end}`)
}

let text = next.join('\n')
text = text.replace(
  /\n\s*\.data-map-bento \{\n\s*grid-template-columns: 1fr 1fr;\n\s*\}\n/g,
  '\n',
)
text = text.replace(
  /\n\s*\.data-map-bento \{\n\s*grid-template-columns: 1fr;\n\s*\}\n/g,
  '\n',
)

const header =
  '/* legacy monolith — Sprint D/E: reset/buttons/panels/tags/drawers + brain/login/landing/analytics/data-map 已抽出 */\n\n'
fs.writeFileSync(legacyPath, header + text.replace(/^\n+/, ''), 'utf8')
console.log(`legacy now ${text.split(/\n/).length} lines`)
