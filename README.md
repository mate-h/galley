# Galley

A galley is the proof you pull while the type is still being set. This is a template for that proof: a Typst document becomes a page you can read in the browser, with the PDF and a single HTML file from the same source.

[Use this template](https://github.com/mate-h/galley/generate) to start a manual. The specimen is deployed at the URL in the repository homepage.

## What the page does

- The page follows the system light and dark appearance. New York is used when it is installed; otherwise the text is Palatino or Georgia.
- Click a formula. The rest of it fades, and a symbol shows the short label declared beside that equation. The same letter can mean different things in different formulas.
- A path that names a real file becomes a link. While the dev server is running it opens in Cursor. On the published site it links to the file on GitHub.
- Saving a `.typ` file recompiles in the background and swaps the document in place, so the theme does not flash white.
- Diagrams Typst draws are inline SVG. The specimen's fills are recolored in dark mode.

Symbol labels and the list of source directories are omitted from the PDF.

## Run it

Typst 0.15 and Node 22 are required. With [mise](https://mise.jdx.dev):

```sh
mise run dev     # http://127.0.0.1:5190
mise run pdf     # build/specimen.pdf
mise run html    # build/manual.html
mise run build   # site/dist
```

Without mise, install Typst, then:

```sh
npm install --prefix site
npm run dev --prefix site
typst compile main.typ build/specimen.pdf
typst compile --features html --format html main.typ build/manual.html
```

Typst's HTML export is experimental. The page is built on that export.

## Make it your manual

1. Change the title in `main.typ`.
2. Replace the chapters under `chapters/`. A chapter title should not start with a digit, or it collides with the heading number.
3. Point `#code-roots` at the directories a reader may open, and set `repo` to your GitHub repository. Files outside the repository still open locally. They are not linked on the published site.

```typst
#code-roots(
  (".", "~/notes"),
  repo: "https://github.com/you/your-manual",
)
```

Label a formula where it is set. The wrapper is invisible in the PDF.

```typst
#gloss((g: "grade", s: "station"))[
  $ g(s) = (Z_1 - Z_0) / L_"vc" $
]
```

Quote a key when it is not a Typst identifier: `"κ"`, `"Δt"`.

## Other outputs

The source of every output is `main.typ`.

| Command | Result |
| --- | --- |
| `mise run pdf` | A paginated PDF |
| `mise run html` | One HTML file, without the live shell |
| `mise run dev` | The live page |
| `mise run build` | The static site in `site/dist` |

Another reading of the same source is another command that runs `typst compile`. The live page is the Vite shell around the HTML export: `site/vite.config.js` compiles on request, and swaps the document when a `.typ` file changes.

## Deploy

The included `vercel.json` installs Typst 0.15 on the build machine and publishes `site/dist`.

```sh
vercel --prod
```

After you create a repository from this template, change the `repo:` argument of `#code-roots` so source links point at your tree.

## Layout

```
main.typ            document
template.typ        manual, gloss, code-roots, tiers, tables
chapters/           specimen chapters
examples/hello.py   a file the specimen links to
site/               Vite page, inspector, and source links
```

## License

[MIT](LICENSE)
