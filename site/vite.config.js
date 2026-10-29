import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { attachCodeRefs, publishIndex } from './code-refs-server.js'

const siteRoot = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(siteRoot, '..')
const entry = path.join(repoRoot, 'main.typ')
const htmlOut = path.join(repoRoot, 'build/manual.html')

// Painted before the stylesheet module loads. Matches --paper in manual.css.
const themePlate =
  '<style id="theme-plate">html{color-scheme:light dark;background:#f4f6f8}@media (prefers-color-scheme:dark){html{background:#050607}}</style>'

function dress(html) {
  let page = html.includes('id="theme-plate"')
    ? html
    : html.replace('<head>', `<head>${themePlate}`)
  // The index JSON contains paths like site/src/main.js, so the marker has to be the tag.
  const script = '<script type="module" src="/src/main.js"></script>'
  if (!page.includes('src="/src/main.js"')) page = page.replace('</body>', `${script}</body>`)
  const index = JSON.stringify(publishIndex(page, repoRoot)).replaceAll('<', '\\u003c')
  const map = `<script type="application/json" id="code-ref-index">${index}</script>`
  if (!page.includes('id="code-ref-index"')) page = page.replace('</head>', `${map}</head>`)
  return page
}

function compileManual() {
  fs.mkdirSync(path.dirname(htmlOut), { recursive: true })
  return new Promise((resolve) => {
    const child = spawn(
      'typst',
      ['compile', '--features', 'html', '--format', 'html', entry, htmlOut],
      { cwd: repoRoot },
    )
    let stderr = ''
    let stdout = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.on('error', (error) => {
      resolve({ ok: false, message: error.message })
    })
    child.on('close', (status) => {
      if (status !== 0) {
        resolve({
          ok: false,
          message: (stderr || stdout || 'typst compile failed').trim(),
        })
        return
      }
      resolve({ ok: true, html: dress(fs.readFileSync(htmlOut, 'utf8')) })
    })
  })
}

function failurePage(message) {
  const escaped = String(message ?? 'typst compile failed')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Galley compile failed</title>
  ${themePlate}
</head>
<body>
  <h1>Typst compile failed</h1>
  <pre>${escaped}</pre>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`
}

function typstManual() {
  let cached = null
  let busy = false
  let again = false

  async function publish(server) {
    if (busy) {
      again = true
      return
    }
    busy = true
    let changed = false
    try {
      do {
        again = false
        const previous = cached
        const compiled = await compileManual()
        cached = compiled.ok ? compiled.html : failurePage(compiled.message)
        changed = cached !== previous
      } while (again)
    } finally {
      busy = false
    }
    if (changed) server.ws.send({ type: 'custom', event: 'typst-update' })
    if (again) publish(server)
  }

  return {
    name: 'galley',
    transformIndexHtml: {
      order: 'pre',
      async handler() {
        if (!cached) {
          const compiled = await compileManual()
          cached = compiled.ok ? compiled.html : failurePage(compiled.message)
        }
        return cached
      },
    },
    configureServer(server) {
      const sources = [
        path.join(repoRoot, 'main.typ'),
        path.join(repoRoot, 'template.typ'),
        path.join(repoRoot, 'chapters'),
      ]
      for (const source of sources) server.watcher.add(source)
      attachCodeRefs(server, repoRoot, () => cached)
      const reload = (file) => {
        if (!file.endsWith('.typ')) return
        publish(server)
      }
      server.watcher.on('change', reload)
      server.watcher.on('add', reload)
    },
  }
}

export default defineConfig({
  root: siteRoot,
  plugins: [typstManual()],
  server: {
    port: 5190,
    strictPort: true,
    fs: { allow: [repoRoot] },
  },
  preview: { port: 5190, strictPort: true },
  build: {
    outDir: path.join(siteRoot, 'dist'),
    emptyOutDir: true,
  },
})
