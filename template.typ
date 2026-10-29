// Galley document style. The live page, the PDF, and the single HTML file
// all read this. Edit `manual.with(...)` in main.typ to retitle a document.

#let ink = rgb("#16324f")
#let ink-soft = rgb("#1a4468")
#let muted = rgb("#5c6b78")
#let rule = rgb("#c5d0d8")
#let hairline = rgb("#d8e0e6")
#let wash = rgb("#f7fafc")
#let header-fill = rgb("#e7eef4")
#let stripe = rgb("#f6f8fa")

#let galley-meta = state("galley-meta", (
  kicker: "Galley",
  title: "Specimen",
  author: "Galley",
))

#let page-header = context {
  let meta = galley-meta.get()
  set text(font: "Libertinus Serif", size: 8pt, fill: muted)
  smallcaps[#meta.kicker]
  h(1fr)
  smallcaps[#meta.title]
  v(3pt)
  line(length: 100%, stroke: 0.45pt + rule)
}

#let page-footer = context {
  let meta = galley-meta.get()
  set text(font: "Libertinus Serif", size: 8pt, fill: muted)
  line(length: 100%, stroke: 0.45pt + rule)
  v(5pt)
  [#meta.author]
  h(1fr)
  counter(page).display("1")
}

// Monospaced text that may break after a slash. Raw spans do not wrap.
#let mono(value) = text(
  font: "DejaVu Sans Mono",
  size: 0.88em,
  [#value.replace("/", "/\u{200B}")],
)

// Directories a code reference may open. Invisible in the PDF.
// `repo` is the GitHub tree used by the published page.
// #code-roots((".",), repo: "https://github.com/mate-h/galley")
#let code-roots(paths, repo: none) = context {
  if target() == "html" {
    let attrs = (
      id: "code-roots",
      hidden: "hidden",
      "data-roots": json.encode(paths, pretty: false),
    )
    if repo != none {
      attrs.insert("data-repo", repo)
    }
    html.elem("div", attrs: attrs)
  }
}

// Symbol labels for the HTML equation inspector. Invisible in the PDF.
// The same letter can mean different things in different equations.
// #gloss((g: "gravity", "Δt": "time step"))[$ ... $]
#let gloss(terms, body) = context {
  if target() != "html" {
    body
  } else {
    html.elem(
      "span",
      attrs: (class: "eq-gloss", "data-gloss": json.encode(terms, pretty: false)),
      body,
    )
  }
}

#let swatch(hex) = context {
  if target() == "html" {
    html.elem("span", attrs: (class: "swatch", style: "background:" + hex))
  } else {
    box(
      width: 0.72em,
      height: 0.72em,
      fill: rgb(hex),
      stroke: 0.4pt + rgb("#9aa7b2"),
      baseline: 0.12em,
      radius: 1pt,
    )
  }
}

// Figures that must keep their layout become inline SVG in the HTML export.
#let framed(body) = context {
  if target() == "html" { html.frame(body) } else { body }
}

#let tier(kicker, title, body) = context {
  if target() == "html" {
    html.elem("section", attrs: (class: "tier"))[
      #html.elem("p", attrs: (class: "kicker"))[#upper(kicker)]
      #html.elem("p", attrs: (class: "tier-title"))[#title]
      #body
    ]
  } else {
    block(
      width: 100%,
      inset: (x: 12pt, y: 8pt),
      above: 0.55em,
      below: 0.45em,
      fill: wash,
      stroke: (
        left: 2.6pt + ink,
        top: 0.4pt + hairline,
        right: 0.4pt + hairline,
        bottom: 0.4pt + hairline,
      ),
      breakable: false,
    )[
      #text(size: 7.5pt, weight: "bold", fill: ink, tracking: 0.5pt)[#upper(kicker)]
      #v(2pt)
      #text(size: 10.5pt, weight: "bold", fill: ink)[#title]
      #v(3pt)
      #set text(size: 9pt)
      #set list(spacing: 0.28em)
      #body
    ]
  }
}

#let schema(columns: auto, align: left + horizon, ..cells) = context {
  set text(size: 8pt)
  set par(justify: false, leading: 0.42em)
  show table.cell.where(y: 0): set text(weight: "bold")
  let tbl = table(
    columns: columns,
    align: align,
    stroke: (_, y) => (
      left: none,
      right: none,
      top: if y == 0 { 0.7pt + ink } else { none },
      bottom: if y == 0 { 0.55pt + ink } else { 0.3pt + hairline },
    ),
    inset: (x: 4.5pt, y: 3.5pt),
    fill: (_, y) => if y == 0 { header-fill } else if calc.odd(y) { stripe },
    ..cells,
  )
  if target() == "html" {
    html.elem("div", attrs: (class: "table-scroll"), tbl)
  } else {
    tbl
  }
}

#let shared(body, title: "Specimen", author: "Galley", description: "") = {
  set document(title: title, author: author, description: description)
  set text(font: "Libertinus Serif", size: 10.5pt, lang: "en", hyphenate: false)
  set par(justify: true, leading: 0.62em, spacing: 0.72em)
  set list(spacing: 0.38em, indent: 0.7em, body-indent: 0.35em)
  set enum(spacing: 0.42em, indent: 0.7em, body-indent: 0.4em)
  set figure(gap: 0.75em)
  set math.equation(numbering: "(1)")
  show link: set text(fill: rgb("#1a5f9e"))
  show figure.caption: set text(size: 8.5pt, fill: rgb("#3d5568"))
  show raw: set text(font: "DejaVu Sans Mono")
  show raw.where(block: false): set text(size: 0.9em)
  show raw.where(block: true): it => {
    set text(size: 7.5pt)
    set par(justify: false)
    block(
      width: 100%,
      fill: rgb("#f4f7f8"),
      stroke: 0.5pt + hairline,
      inset: (x: 10pt, y: 8pt),
      radius: 2pt,
      breakable: true,
      above: 0.65em,
      below: 0.75em,
      it,
    )
  }
  show heading.where(level: 1): set text(fill: ink, size: 16pt)
  show heading.where(level: 2): set text(fill: ink-soft, size: 12.5pt)
  show heading.where(level: 3): set text(fill: rgb("#24557a"), size: 11pt)
  body
}

#let manual(
  body,
  kicker: "Galley",
  title: "Specimen",
  deck: [Typst, set as a page you can read.],
  author: "Galley",
  description: "A Typst document set as a live page.",
) = context {
  galley-meta.update((kicker: kicker, title: title, author: author))
  if target() == "html" {
    set heading(numbering: "1.1")
    // The HTML outline inserts a space between the number and the title.
    // The contents margin supplies that gap, so the title text stays flush.
    show outline.entry: it => link(
      it.element.location(),
      html.elem("span", attrs: (class: "prefix"), it.prefix()) + it.body(),
    )
    shared(title: title, author: author, description: description)[
      #html.elem("header", attrs: (class: "mast"))[
        #html.elem("p", attrs: (class: "kicker"))[#kicker]
        #html.elem("h1")[#title]
        #html.elem("p", attrs: (class: "deck"))[#deck]
        #html.elem("p", attrs: (class: "byline"))[#author]
      ]
      #outline(title: [Contents], depth: 2, indent: auto)
      #body
    ]
  } else {
    show heading.where(level: 1): it => {
      pagebreak(weak: true)
      v(0.1em)
      it
      v(0.12em)
      line(length: 100%, stroke: 0.8pt + ink)
      v(0.5em)
    }
    set page(
      paper: "us-letter",
      margin: (x: 2.1cm, y: 2.1cm),
      numbering: none,
      header: none,
      footer: none,
    )
    shared(title: title, author: author, description: description)[
      #v(1fr)
      #align(center)[
        #block(width: 2.4cm, height: 3pt, fill: ink)
        #v(16pt)
        #text(size: 11pt, fill: ink-soft, tracking: 1.8pt)[#smallcaps[#kicker]]
        #v(10pt)
        #text(size: 28pt, weight: "bold", fill: ink)[#title]
        #v(12pt)
        #text(size: 12pt, fill: rgb("#3d5568"))[#deck]
        #v(20pt)
        #text(size: 10.5pt)[#author]
      ]
      #v(1.6fr)
      #pagebreak()
      #outline(title: [Contents], depth: 2, indent: auto)
      #pagebreak()
      #set heading(numbering: "1.1")
      #set page(
        paper: "us-letter",
        margin: (top: 2.2cm, bottom: 1.95cm, inside: 1.95cm, outside: 1.7cm),
        numbering: "1",
        header: page-header,
        header-ascent: 0.75em,
        footer: page-footer,
        footer-descent: 0.7em,
      )
      #counter(page).update(1)
      #body
    ]
  }
}
