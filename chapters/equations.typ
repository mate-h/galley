#import "../template.typ": gloss

= Equations <equations>

Click a formula. The rest of it fades, and a symbol that has a label shows only that label. Labels belong to the equation, so the same letter can mean two things.

A clothoid, with station $s$:

#gloss((
  "κ": "curvature",
  "κ_0": "start curvature",
  "κ_1": "end curvature",
  L: "length",
  s: "station",
  s_0: "start station",
))[
  $ kappa(s) = kappa_0 + (kappa_1 - kappa_0) / L (s - s_0) $
]

A time step, where $g$ is gravity:

#gloss((
  "Δt": "time step",
  CFL: "Courant number",
  "Δx": "cell size",
  g: "gravity",
  h: "depth",
  sqrt: "square root",
))[
  $ Delta t <= "CFL" dot.c Delta x / sqrt(g h) $
]

A grade, where $g$ is not gravity:

#gloss((
  g: "grade",
  s: "station",
  Z_0: "start elevation",
  Z_1: "end elevation",
  L_vc: "curve length",
))[
  $ g(s) = (Z_1 - Z_0) / L_"vc" $
]

`#gloss` takes a dictionary of symbol keys and short labels, then the math. Greek letters and $Delta$ need quotes in the key (`"κ"`, `"Δt"`). Plain names such as `h` do not. On a PDF the wrapper disappears and only the formula is set.

```typst
#gloss((g: "grade", s: "station"))[
  $ g(s) = (Z_1 - Z_0) / L_"vc" $
]
```
