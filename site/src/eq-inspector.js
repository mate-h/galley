// Click an equation to open the inspector. Hovering a symbol fades the rest
// of that equation. Labels come from #gloss(...) on the Typst equation.

const RELATIONS = new Set(["=", "≈", "≠", "≤", "≥", "<", ">", "∈", "∉"])
const SKIP = new Set(["∂", "∇", "∑", "∏", "∫", "∞"])
const UNITS = new Set(["km", "m", "s", "cm", "px", "ms", "mm", "m/s", "m/px", "km/h"])
const GREEK = [..."αβγδεζηθικλμνξοπρςστυφχψω∂ϵϑϰϕϱϖ"]

function normalize(value) {
  let out = ""
  for (const ch of value) {
    const c = ch.codePointAt(0)
    if (c === 0x210e) {
      out += "h"
      continue
    }
    out += foldLatin(c) || foldGreek(c) || ch
  }
  return out.replace(/\s+/g, "").replaceAll("ϕ", "φ")
}

function foldLatin(c) {
  const ranges = [
    [0x1d400, 0x1d419, 0x41],
    [0x1d41a, 0x1d433, 0x61],
    [0x1d434, 0x1d44d, 0x41],
    [0x1d44e, 0x1d467, 0x61],
    [0x1d468, 0x1d481, 0x41],
    [0x1d482, 0x1d49b, 0x61],
  ]
  for (const [start, end, base] of ranges) {
    if (c >= start && c <= end) return String.fromCharCode(base + (c - start))
  }
  return ""
}

function foldGreek(c) {
  const starts = [0x1d6c2, 0x1d6fc, 0x1d736]
  for (const start of starts) {
    const index = c - start
    if (index >= 0 && index < GREEK.length) return GREEK[index]
  }
  return ""
}

function plain(el) {
  return el ? normalize(el.textContent) : ""
}

function stripPrime(value) {
  return value.replace(/[′'″]/g, "")
}

function owned(el) {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (!node.dataset?.sym) continue
    if (node.localName === "msqrt") continue
    if (node.localName === "msubsup" && node.children[2]?.contains(el)) continue
    return true
  }
  return false
}

function nextMath(el) {
  let node = el.nextElementSibling
  while (node?.localName === "mspace") node = node.nextElementSibling
  return node
}

function singleIdent(el) {
  if (!el || owned(el)) return null
  if (el.localName === "mi") return el
  if (el.childElementCount === 1 && el.children[0].localName === "mi") return el.children[0]
  return null
}

// Δt is two identifiers. Δx/√… puts x in the numerator, so the pair crosses the fraction.
function deltaPair(name, nxt) {
  if (name !== "Δ" || !nxt) return null
  const ident = nxt.localName === "mfrac" ? singleIdent(nxt.children[0]) : singleIdent(nxt)
  if (!ident || ident.dataset.sym) return null
  const letter = plain(ident)
  if (!/^[A-Za-z]$/.test(letter)) return null
  return { key: `Δ${letter}`, ident }
}

function annotate(root) {
  const scripts = [...root.querySelectorAll("msub, msubsup")].reverse()
  for (const el of scripts) {
    if (owned(el)) continue
    const key = `${plain(el.children[0])}_${stripPrime(plain(el.children[1]))}`
    el.children[0].dataset.sym = key
    el.children[1].dataset.sym = key
    const sup = el.localName === "msubsup" ? el.children[2] : null
    if (sup) annotate(sup)
  }
  for (const el of root.querySelectorAll("msqrt")) {
    if (!el.dataset.sym) el.dataset.sym = "sqrt"
  }
  const idents = root.matches?.("mi, mtext, mo")
    ? [root, ...root.querySelectorAll("mi, mtext, mo")]
    : [...root.querySelectorAll("mi, mtext, mo")]
  for (const el of idents) {
    if (owned(el) || el.dataset.sym) continue
    if (el.localName === "mo") {
      const name = plain(el)
      if (name === "∇" || /^[A-Za-z]{2,}$/.test(name)) el.dataset.sym = name
      continue
    }
    if (el.localName === "mtext") {
      const name = plain(el)
      if (!name || UNITS.has(name)) continue
      if (/^[A-Za-z][A-Za-z0-9]+$/.test(name)) el.dataset.sym = name
      continue
    }
    const name = plain(el)
    if (!name || SKIP.has(name) || !/\p{L}/u.test(name)) continue
    const nxt = nextMath(el)
    const paired = deltaPair(name, nxt)
    if (paired) {
      el.dataset.sym = paired.key
      paired.ident.dataset.sym = paired.key
      continue
    }
    el.dataset.sym = name
  }
}

function symbolAt(event) {
  const math = event.target.closest(".eq-inspector math")
  if (!math) return null
  const x = event.clientX
  const y = event.clientY
  let best = null
  let bestScore = Infinity
  for (const el of math.querySelectorAll("[data-sym]")) {
    const box = el.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) continue
    const dx = x < box.left ? box.left - x : x > box.right ? x - box.right : 0
    const dy = y < box.top ? box.top - y : y > box.bottom ? y - box.bottom : 0
    const dist = Math.hypot(dx, dy)
    if (dist > 10) continue
    const score = dist * 48 + Math.sqrt(box.width * box.height)
    if (score < bestScore) {
      best = el
      bestScore = score
    }
  }
  return best
}

function isEquation(math) {
  if (math.closest(".eq-gloss")) return true
  if (math.getAttribute("display") === "block") return true
  if (math.querySelector("mfrac")) return true
  return [...math.querySelectorAll("mo")].some((mo) => RELATIONS.has(mo.textContent.trim()))
}

let panel
let labelEl
let anchor
let labels = {}

function glossFor(math) {
  const raw = math.closest(".eq-gloss")?.dataset.gloss
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function ensurePanel() {
  if (panel) return
  panel = document.createElement("div")
  panel.className = "eq-inspector"
  panel.hidden = true
  panel.setAttribute("role", "dialog")
  panel.setAttribute("aria-label", "Equation inspector")
  panel.innerHTML = `
    <div class="eq-inspector-bar">
      <span>Equation</span>
      <button type="button" aria-label="Close">×</button>
    </div>
    <div class="eq-stage"></div>
    <p class="eq-label" data-state="idle"></p>
  `
  labelEl = panel.querySelector(".eq-label")
  panel.querySelector("button").addEventListener("click", close)
  panel.addEventListener("pointermove", (event) => {
    const atom = symbolAt(event)
    if (atom) show(atom.dataset.sym)
  })
  panel.addEventListener("pointerleave", idle)
  panel.addEventListener("click", (event) => event.stopPropagation())
  document.body.append(panel)
}

function show(key) {
  const math = panel.querySelector("math")
  math.classList.add("is-dimmed")
  for (const el of math.querySelectorAll("[data-sym]")) {
    el.classList.toggle("is-hot", el.dataset.sym === key)
  }
  const label = labels[key]
  labelEl.textContent = label ?? ""
  labelEl.dataset.state = label ? "label" : "hot"
}

function idle() {
  panel.querySelector("math")?.classList.remove("is-dimmed")
  for (const el of panel.querySelectorAll(".is-hot")) el.classList.remove("is-hot")
  labelEl.textContent = ""
  labelEl.dataset.state = "idle"
}

function place() {
  if (!anchor || panel.hidden) return
  const wide = anchor.getAttribute("display") === "block"
  const host = wide ? anchor : anchor.closest("p, li, td, th") || anchor
  const box = host.getBoundingClientRect()
  const r = anchor.getBoundingClientRect()
  const width = Math.min(Math.max(box.width, 220), window.innerWidth - 24)
  let left = Math.min(Math.max(12, box.left), window.innerWidth - width - 12)
  panel.style.width = `${width}px`
  panel.style.left = `${window.scrollX + left}px`
  panel.style.top = `${window.scrollY + r.bottom + 8}px`
  const height = panel.offsetHeight
  if (r.bottom + 8 + height > window.innerHeight && r.top > height + 16) {
    panel.style.top = `${window.scrollY + r.top - height - 8}px`
  }
}

function open(math) {
  ensurePanel()
  if (anchor) anchor.classList.remove("eq-open")
  anchor = math
  labels = glossFor(math)
  math.classList.add("eq-open")
  const stage = panel.querySelector(".eq-stage")
  stage.replaceChildren()
  const clone = math.cloneNode(true)
  clone.classList.remove("eq-inspectable", "eq-open")
  clone.setAttribute("display", "block")
  annotate(clone)
  stage.append(clone)
  idle()
  panel.hidden = false
  place()
}

function close() {
  if (!panel) return
  panel.hidden = true
  anchor?.classList.remove("eq-open")
  anchor = null
  labels = {}
}

function toggle(math) {
  if (anchor === math && panel && !panel.hidden) close()
  else open(math)
}

export function remount() {
  panel?.remove()
  panel = null
  labelEl = null
  anchor = null
  labels = {}
  for (const math of document.querySelectorAll("math")) {
    if (isEquation(math)) math.classList.add("eq-inspectable")
  }
}

document.addEventListener("click", (event) => {
  const math = event.target.closest("math.eq-inspectable")
  if (math) {
    toggle(math)
    return
  }
  if (panel && !panel.hidden && !panel.contains(event.target)) close()
})

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") close()
})

window.addEventListener("scroll", place, true)
window.addEventListener("resize", place)
