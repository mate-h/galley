#import "../template.typ": framed, swatch
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge

= Figures <figures>

Typst draws the figure. The HTML export inlines it as SVG. Fills and strokes are baked into the file, so the dark theme recolors this specimen's palette in `site/manual.css`. Use the same hexes, or change the selectors when you change the palette.

#let source = rgb("#d6e8f6")
#let page = rgb("#d7f0e3")
#let print = rgb("#f8e6c4")
#let edit = rgb("#e4d7f2")
#let ink = rgb("#16324f")

#figure(
  framed(align(center)[
    #diagram(
      spacing: (16mm, 14mm),
      node-shape: rect,
      node-stroke: 0.6pt + ink,
      node-corner-radius: 2pt,
      node-inset: 7pt,
      edge-stroke: 0.7pt + ink,
      label-size: 8pt,

      node((0, 0), [Typst], name: <source>, fill: source),
      node((1, 0), [Page], name: <page>, fill: page),
      node((0, 1), [PDF], name: <print>, fill: print),
      node((1, 1), [Editor], name: <edit>, fill: edit),

      edge(<source>, <page>, "->"),
      edge(<source>, <print>, "->"),
      edge(<page>, <edit>, "->"),
      edge(
        <edit>,
        <source>,
        "->",
        bend: 30deg,
        stroke: (paint: rgb("#8a5a12"), thickness: 0.7pt, dash: "dashed"),
        [save],
      ),
    )
    #v(8pt)
    #set text(size: 8pt)
    #swatch("#d6e8f6") Source
    #h(8pt)
    #swatch("#d7f0e3") Page
    #h(8pt)
    #swatch("#f8e6c4") PDF
    #h(8pt)
    #swatch("#e4d7f2") Editor
  ]),
  caption: [One Typst source feeds the live page and the PDF. Saving a source file swaps the page in place. The dashed arrow is the edit coming back.],
)

#swatch("#10b981") A swatch sits in the line, #swatch("#f59e0b") in either theme, #swatch("#6366f1") without a figure around it.
