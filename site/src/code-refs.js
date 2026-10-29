// Path-like code becomes a link. In `vite dev` the link opens the file in
// Cursor. On a published site it points at the file on GitHub.

const EXT = 'py|rs|js|mjs|ts|tsx|typ|json|tif|tiff|bin|gpkg|csv|wgsl|toml|md|txt|glb|npy|laz|hipnc'
const ZW = '\\u200b'
const SEG = `${ZW}?[\\w.-]+`
const PATH_RE = new RegExp(
  `(?<![\\w./-])(?:~/${SEG}(?:/${SEG})*|/(?:${SEG}/)+${SEG}?|${SEG}\\.(?:${EXT}))/?(?![\\w.-])`,
  'gu',
)
const CODE_EXT = new RegExp(`\\.(?:${EXT})$`)

function hrefFor(value) {
  if (value.startsWith('https://') || value.startsWith('http://')) return value
  return `/__open?path=${encodeURIComponent(value)}`
}

function linkAround(node, value) {
  const anchor = document.createElement('a')
  anchor.className = 'code-ref'
  anchor.href = hrefFor(value)
  anchor.title = value
  if (anchor.href.startsWith('http')) anchor.target = '_blank'
  node.replaceWith(anchor)
  anchor.append(node)
}

function plainPathLink(text, value) {
  const anchor = document.createElement('a')
  anchor.className = 'code-ref'
  anchor.href = hrefFor(value)
  anchor.title = value
  if (anchor.href.startsWith('http')) anchor.target = '_blank'
  const code = document.createElement('code')
  code.textContent = text
  anchor.append(code)
  return anchor
}

function collect(root) {
  const names = new Set()
  const codes = []
  for (const code of root.querySelectorAll('code')) {
    if (code.closest('pre, a')) continue
    const text = code.textContent.replaceAll('\u200b', '').trim()
    if (!text || /\s/.test(text) || text.length > 300) continue
    if (!text.includes('/') && !text.startsWith('~') && !CODE_EXT.test(text)) continue
    names.add(code.textContent)
    codes.push(code)
  }
  const texts = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const parent = node.parentElement
    if (parent && !parent.closest('pre, code, script, style, a')) {
      PATH_RE.lastIndex = 0
      const value = node.nodeValue ?? ''
      let matched = false
      for (const match of value.matchAll(PATH_RE)) {
        names.add(match[0])
        matched = true
      }
      if (matched) texts.push(node)
    }
    node = walker.nextNode()
  }
  return { names, codes, texts }
}

function published(names) {
  const node = document.getElementById('code-ref-index')
  let index = {}
  try {
    index = JSON.parse(node?.textContent || '{}')
  } catch {
    index = {}
  }
  const found = {}
  for (const name of names) {
    const key = name.replaceAll('\u200b', '').trim().replace(/\/$/, '')
    if (index[key]) found[name] = index[key]
  }
  return found
}

async function resolveNames(names) {
  if (import.meta.env.DEV) {
    try {
      const response = await fetch('/__refs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([...names]),
      })
      if (response.ok) return await response.json()
    } catch {
      // The published index still covers files in this repo.
    }
  }
  return published(names)
}

export async function linkCodeRefs(root = document) {
  const { names, codes, texts } = collect(root)
  if (!names.size) return
  const found = await resolveNames(names)
  for (const code of codes) {
    const file = found[code.textContent]
    if (file && code.isConnected) linkAround(code, file)
  }
  for (const node of texts) {
    if (!node.isConnected) continue
    const value = node.nodeValue ?? ''
    PATH_RE.lastIndex = 0
    const hits = [...value.matchAll(PATH_RE)].filter((match) => found[match[0]])
    if (!hits.length) continue
    const frag = document.createDocumentFragment()
    let cursor = 0
    for (const match of hits) {
      const start = match.index ?? 0
      if (start > cursor) frag.append(value.slice(cursor, start))
      frag.append(plainPathLink(match[0], found[match[0]]))
      cursor = start + match[0].length
    }
    if (cursor < value.length) frag.append(value.slice(cursor))
    node.replaceWith(frag)
  }
}

function onClick(event) {
  const anchor = event.target.closest('a.code-ref')
  if (!anchor || !anchor.href.includes('/__open')) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  fetch(anchor.href)
}

document.addEventListener('click', onClick)
if (import.meta.hot) {
  import.meta.hot.dispose(() => document.removeEventListener('click', onClick))
}
