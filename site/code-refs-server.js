import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

const SKIP = new Set([
  'node_modules',
  '.git',
  'target',
  'dist',
  'build',
  '.venv',
  '__pycache__',
  '.cache',
  '.vercel',
])

let index = null
let indexKey = ''

function unescapeAttr(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#34;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
}

function rootsTag(html) {
  return html?.match(/<div\b[^>]*\bid="code-roots"[^>]*>/i)?.[0] ?? ''
}

function expand(root, repoRoot) {
  if (root === '~') return os.homedir()
  if (root.startsWith('~/')) return path.join(os.homedir(), root.slice(2))
  if (path.isAbsolute(root)) return root
  return path.resolve(repoRoot, root)
}

export function rootsFromHtml(html, repoRoot) {
  const attr = rootsTag(html).match(/\bdata-roots="([^"]*)"/)
  if (!attr) return []
  try {
    const parsed = JSON.parse(unescapeAttr(attr[1]))
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === 'string').map((item) => expand(item, repoRoot))
      : []
  } catch {
    return []
  }
}

export function repoFromHtml(html) {
  const attr = rootsTag(html).match(/\bdata-repo="([^"]*)"/)
  return attr ? unescapeAttr(attr[1]).replace(/\/$/, '') : ''
}

export function publishIndex(html, repoRoot) {
  const remote = repoFromHtml(html)
  if (!remote) return {}
  const home = fs.realpathSync(repoRoot)
  const map = {}
  const bases = new Map()
  const visit = (dir) => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      if (SKIP.has(ent.name) || ent.name.startsWith('.')) continue
      const full = path.join(dir, ent.name)
      if (ent.isDirectory()) visit(full)
      else if (ent.isFile()) {
        const real = fs.realpathSync(full)
        if (real !== home && !real.startsWith(home + path.sep)) continue
        const rel = path.relative(home, real).split(path.sep).join('/')
        const url = `${remote}/blob/main/${rel}`
        map[rel] = url
        const list = bases.get(ent.name) ?? []
        list.push(url)
        bases.set(ent.name, list)
      }
    }
  }
  for (const root of rootsFromHtml(html, repoRoot)) {
    if (exists(root)) visit(fs.realpathSync(root))
  }
  for (const [name, urls] of bases) {
    if (urls.length === 1) map[name] = urls[0]
  }
  return map
}

function allowed(file, roots) {
  let real
  try {
    real = fs.realpathSync(file)
  } catch {
    return null
  }
  const ok = roots.some((root) => {
    if (!exists(root)) return false
    const base = fs.realpathSync(root)
    return real === base || real.startsWith(base + path.sep)
  })
  return ok ? real : null
}

function exists(file) {
  try {
    fs.accessSync(file)
    return true
  } catch {
    return false
  }
}

function walk(dir, into, budget) {
  if (budget.count >= budget.max) return
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const ent of entries) {
    if (budget.count >= budget.max) return
    if (SKIP.has(ent.name) || ent.name.startsWith('.')) continue
    const full = path.join(dir, ent.name)
    if (!ent.isDirectory() && !ent.isFile()) continue
    budget.count += 1
    const list = into.get(ent.name) ?? []
    list.push(full)
    into.set(ent.name, list)
    if (ent.isDirectory()) walk(full, into, budget)
  }
}

function fileIndex(repoRoot, roots) {
  const key = [repoRoot, ...roots].join('\0')
  if (index && indexKey === key) return index
  index = new Map()
  indexKey = key
  const seen = new Set()
  for (const dir of [repoRoot, ...roots]) {
    if (!exists(dir)) continue
    const real = fs.realpathSync(dir)
    if (seen.has(real)) continue
    seen.add(real)
    walk(real, index, { count: 0, max: 20000 })
  }
  return index
}

function rank(file, repoRoot, roots) {
  if (file === repoRoot || file.startsWith(repoRoot + path.sep)) return 0
  const at = roots.findIndex((root) => file === root || file.startsWith(root + path.sep))
  return at === -1 ? roots.length + 1 : at + 1
}

function best(paths, repoRoot, roots) {
  const ranked = paths
    .map((file) => ({
      file,
      rank: rank(file, repoRoot, roots),
      depth: file.split(path.sep).length,
    }))
    .sort((a, b) => a.rank - b.rank || a.depth - b.depth || a.file.length - b.file.length)
  if (!ranked.length) return null
  const top = ranked[0]
  const ties = ranked.filter((item) => item.rank === top.rank && item.depth === top.depth)
  return ties.length === 1 ? top.file : null
}

function fromBasename(name, repoRoot, roots) {
  const indexed = fileIndex(repoRoot, roots).get(name) ?? []
  const indexedHit = best(indexed, repoRoot, roots)
  if (indexedHit) return indexedHit
  const found = spawnSync('mdfind', ['-name', name], { encoding: 'utf8' })
  if (found.status !== 0) return null
  const hits = found.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line === name || line.endsWith(path.sep + name))
  return best(hits, repoRoot, roots)
}

export function resolveRef(raw, repoRoot, roots) {
  const text = String(raw).replaceAll('\u200b', '').trim().replace(/\/$/, '')
  if (!text || text.length > 300 || /\s/.test(text)) return null
  let file = null
  if (text.startsWith('~/')) file = path.join(os.homedir(), text.slice(2))
  else if (path.isAbsolute(text)) file = text
  else if (text.includes('/')) {
    file = [repoRoot, ...roots].map((root) => path.join(root, text)).find((candidate) => exists(candidate))
  } else {
    file = fromBasename(text, repoRoot, roots)
  }
  if (!file || !exists(file)) return null
  return allowed(file, roots)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 200_000) {
        reject(new Error('body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

export function attachCodeRefs(server, repoRoot, getHtml) {
  const rootsFor = () => rootsFromHtml(getHtml(), repoRoot)
  server.middlewares.use(async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local')
    if (url.pathname === '/__refs' && req.method === 'POST') {
      try {
        const names = JSON.parse(await readBody(req))
        const roots = rootsFor()
        const out = {}
        if (Array.isArray(names)) {
          for (const name of names.slice(0, 500)) {
            if (typeof name !== 'string') continue
            const hit = resolveRef(name, repoRoot, roots)
            if (hit) out[name] = hit
          }
        }
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(out))
      } catch {
        res.statusCode = 400
        res.end('{}')
      }
      return
    }
    if (url.pathname === '/__open') {
      const file = allowed(url.searchParams.get('path') ?? '', rootsFor())
      if (!file) {
        res.statusCode = 404
        res.end('Not found')
        return
      }
      spawn('open', ['-a', 'Cursor', file], { detached: true, stdio: 'ignore' }).unref()
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(
        '<!DOCTYPE html><meta charset="utf-8"><title>Opened</title><p>Opened in Cursor.</p><script>history.back()</script>',
      )
      return
    }
    next()
  })
}
