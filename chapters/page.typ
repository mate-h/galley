#import "../template.typ": tier

= The page <page>

A galley is the proof you pull while the type is still being set. This repository is that proof for a Typst document: one source, three readings.

#tier("Output", "PDF")[
  `mise run pdf` writes `build/specimen.pdf`. The same `manual()` show rule sets the title page, the contents, and the running header. Nothing that exists only for the browser is printed: symbol labels and the source-root list stay in the HTML.
]

#tier("Output", "One HTML file")[
  `mise run html` writes `build/manual.html`. Typst's HTML export is still experimental. Galley wraps that file with a stylesheet, an equation inspector, and source links, then serves it.
]

#tier("Output", "Live page")[
  `mise run dev` serves the page and swaps in a new document when a `.typ` file changes. The theme stays on screen while Typst compiles. The page follows the system light and dark appearance.
]

The typeface is New York when it is installed, and Palatino or Georgia otherwise. Optical size follows the font size. Body text is 16px on a measure of about seventy characters.

Headings in the contents keep their numbers, and the number is not underlined. A chapter title should not open with a digit, or it collides with the heading number.
