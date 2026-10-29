// Galley specimen. Replace these chapters with your own.
// PDF:   mise run pdf
// HTML:  mise run html
// Live:  mise run dev

#import "template.typ": manual, code-roots

#show: manual.with(
  kicker: "Galley",
  title: "Specimen",
  deck: [Typst, set as a page you can read, hover, and follow into the source.],
  author: "Your name",
  description: "A Typst specimen: live page, equation inspector, and source links.",
)

#code-roots((".",), repo: "https://github.com/mate-h/galley")

#include "chapters/page.typ"
#include "chapters/equations.typ"
#include "chapters/sources.typ"
#include "chapters/figures.typ"
