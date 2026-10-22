# Ukiyo-e

A woodblock print brought to life: flat colour blocks printed slightly off a black key line, hand-wiped bokashi skies, paper you can feel, and a camera that slides over the print like an unrolling handscroll. **Not:** a flat vector landscape with a paper overlay, an ink-wash painting with bleeding colour, or anime cel shading; and never a recreation of a famous print.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Journeys and sequences of steps, places and seasons, calm brand or travel stories, poems and quotes | Canvas 2D: one cached offscreen canvas per colour block + key block, composited with fixed registration offsets | Medium–Hard | two Google Fonts (Shippori Mincho, Yuji Syuku) |

Demo: [ukiyo-e.html](ukiyo-e.html) — `npx -y @helios-project/cli@latest render ukiyo-e.html -o ukiyo-e.mp4 --duration 8 --fps 24 --mode canvas`

## Look
- **Palette:** a pigment set, not a colour wheel. Paper `#eee2c6` (the only white: foam, mist, blank sky) · sumi `#231f1c` (key line) · Prussian blue `#1d3a66` (bokashi in sky and sea, the dominant family) · pale blue `#8db0c6` · grey-blue `#4d6f98` (far mountain) · greens `#8aa152` / `#50703c` / pine `#3e5a3a` · ochre `#cf9f4a` (path, hats) · wood `#8a6a48` · beni red `#b8412f` (**rare**: the sun, one garment, seals). **Rules:** 6–9 flat hues, each from its own block; no gradients except bokashi; no light and shade on forms; far layers pale with a grey key line or none, near layers saturated with a dark key line. Alternative set: persimmon `#d9773a`, ochre, grey-green `#8a9a7a`, deep brown `#4a3426`, one blue, for an autumn print.
- **Type:** titles live **on the print** as cartouches and seals, never as floating type. View cartouche: a vertical cream slip with a thick + thin ink border, a pale beni tab with the series title, the view title below in a brush face (Yuji Syuku, ~5 % of frame height), a red seal beside it. Subtitles: a horizontal cream cartouche near the bottom with a small seal at its left, Shippori Mincho 500 at ~3.5 %.
- **Materials & texture:** washi with long fibres; every colour block carries woodgrain (iso-lines of a warped noise field, `source-atop`), baren rubbing (blurred arcs lifted out with `destination-out`) and goma-zuri specks (`destination-out`); the key block gets specks only; light fibres over the finished sheet let paper show through ink. A thick + thin ink border frames the sheet.

## Motion
- **Prints are still.** Most of the frame does not move; each view has one or two small actions (a boat rocking, a traveller walking, swells).
- **Figures and nature step at 8 fps** (`Math.floor(t * 8 + 1e-4) / 8`); water at 12 fps; **the camera moves on ones** (a stepped camera judders).
- **Printing reveal:** key line first, then each colour block over ~0.35 s behind a diagonal baren sweep with a noisy edge, sliding 5–6 px into its registration as it lands.
- **Handscroll camera:** slides right → left across a sheet wider than the frame (demo: 960 px over 3.6 s, smoothstep), then holds. Shorter slides read as urgency.
- Cartouches drop in (fade + ~24 px slide, 0.45 s); subtitles print in with the sweep mask and fade out over 0.3 s; the seal **stamps 1.35 → 1 in 0.2 s**.
- Allowed transitions: scroll slides, printing reveals, a wash back to paper, a cut to a blank sheet. No dissolves, no 3D moves inside a print.

## Signature checklist
- Each colour block offset 1.5–2.5 px from the key line, each in its own direction, fixed for the whole film.
- Woodgrain and baren unevenness visible inside large colour areas (sky, sea, hills) at 100 %.
- Bokashi edges wander ±20–30 px per column; zero vertical seams.
- Paper is the only white: foam, mist bands and blank sky are unprinted.
- Figures change pose only every 3 frames at 24 fps (8 fps); the camera moves every frame.
- Seal scale 1.35 → 1.0 within 0.2 s, ~93 % opacity, multiplied.
- Red appears in ≤ 3 places.

## Native moves
- **Printing, block by block.** The image assembles as a print would: key line, then each colour landing slightly off and settling. Ideal as the hook. *Fits:* a building going up; an idea taking shape; a product being "made".
- **The handscroll.** Scenes don't cut; the camera slides and the next view arrives from the left, ending on a composed view where the cartouche and seal land: the emotional full stop. *Fits:* a supply chain; stages of a pilgrimage; the steps of a recipe.
- **Alternate impressions.** The same key block reprinted with different colour blocks (day → night, spring → winter). *Fits:* before and after; a city lit at night; two seasons of one shop.

## Core technique
```js
// Build once: one offscreen canvas per colour group, in world (scroll) coordinates.
B.blue = mk(); bokashi(B.blue.getContext('2d'), 0, WW, 44, 340, PAL.prus, .92, 0, 3); /* + sea, mountain */
function inkify(c, grain, baren, speck = .45) {          // make a flat block look printed
  const x = c.getContext('2d'); x.save();
  x.globalCompositeOperation = 'source-atop'; x.globalAlpha = grain; x.drawImage(TX.grain, 0, 0, WW, H);
  x.globalCompositeOperation = 'destination-out';
  x.globalAlpha = baren; x.drawImage(TX.baren, 0, 0);     // uneven pressure
  x.globalAlpha = speck; x.drawImage(TX.speck, 0, 0, WW, H);   // goma-zuri specks
  x.restore();
}
// bokashi: per pixel, the gradient's top edge wanders with low-frequency noise per column
//   off = (vnoise(X * .006 + seed) - .5) * 2 * rough;  u = clamp((Y - (y0 + off)) / (y1 - y0));
// Per frame: composite blocks with fixed registration, key line on top, then stepped figures.
for (const [id, reg] of [['blue', [2, -1.5]], ['green', [-1.8, 2]], ['red', [1.5, 2]], ['key', [0, 0]]])
  ctx.drawImage(B[id], -cam + reg[0], reg[1]);
```
All expensive work (bokashi, grain, baren, specks, block shapes) happens once in `ready`; a frame is just a handful of `drawImage` calls at the camera offset plus small dynamic figures. Registration is the offset you pass to `drawImage`. See `buildBlocks()`, `sweepClip()` and `viewCartouche()` in the demo.

## Pitfalls
- Bokashi from stacked `fillRect` strips leaves vertical seams → build it per pixel with a noisy edge.
- Too much speckle or fibre makes dark areas look like sandpaper → specks ~0.3–0.45, fibres ~0.09.
- Pine clusters drawn as half-discs look like parasols → flat pads with a scalloped needle top and fan strokes.
- Perspective grids look digital → depth by stacking flat horizontal layers and mist bands.
- Colour blocks spilling over the sheet border → clip colour blocks to the image area; let the key block draw the border.
- Mist bands drawn over figures hide them → place mist where no figure passes, or draw figures after the mist.
- Large world-size canvases cost memory → keep the scroll ~1.5× the frame width and build every block in `ready`, never lazily inside `renderAt`.
- A seal drawn with `multiply` vanishes on dark ground → use `source-over` there.

## Check on stills
- `sheet --crop` on a key line over a colour block: a 1.5–2.5 px sliver where colour and line don't meet.
- `sheet --strip` across the scroll: camera moves every frame, boat and traveller only every third frame.
- Early stills (0.1–1.2 s) show the print assembling: key line alone, then colours landing.
- Final hold: cartouche, seal and one small moving thing; red only in the sun, the seal and one figure.

Source: adapted from lemo-opuscar (ukiyoe) — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/ukiyoe (MIT, LemoLab). Written in our own words; no assets copied; the landscape, boat and mountain are original subject matter.
