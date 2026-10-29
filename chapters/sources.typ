#import "../template.typ": gloss, mono, schema

= Source links <sources>

A path written in code, or a bare path set with `mono`, becomes a link when it names a file under a directory this document declares.

#mono("examples/hello.py") is the specimen script. The page server is `site/vite.config.js`. While `mise run dev` is running, a click opens that file in Cursor. On the published site the same words link to the file on GitHub.

The declaration is one call, usually next to the rest of the front matter:

```typst
#code-roots((".",), repo: "https://github.com/mate-h/galley")
```

`"."` is this repository. A path such as `~/git/notes` is allowed too, and only the local server can open it. The published page links files that live inside the repository. When a name occurs once, the basename is enough: `hello.py`.

#schema(
  columns: (1fr, 2fr),
  table.header([Written as], [Opens]),
  [`examples/hello.py`], [the specimen script],
  [`site/vite.config.js`], [the Vite plugin that compiles Typst],
  [`hello.py`], [the same script, by basename],
  [#mono("~/git/notes")], [only on your machine, and only if that directory is listed],
)

An inline mark that is not a file stays plain. #gloss((g: "grade"))[$g$] here is grade, and `CFL` in the time-step formula is a symbol, not a path.
