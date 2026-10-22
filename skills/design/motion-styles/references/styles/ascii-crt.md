# ASCII CRT Terminal

Every image is real characters on a monospace grid, chosen by measured ink density and glowing in the phosphor of one old monochrome tube. **Not:** a photo pushed through an "ASCII filter", green "code rain", or a sci-fi HUD — glyphs never leave the grid, there are no vector lines, and colour is one phosphor plus at most one second colour used once.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Machine narrators, logs and launch-day stories, data turning into a picture, quiet suspense pieces | Canvas 2D glyph atlas + per-cell density ramp with Bayer dither, then a raw-WebGL monochrome CRT pass | Medium | VT323 (Google Fonts) |

Demo: [ascii-crt.html](ascii-crt.html) — `npx -y @helios-project/cli@latest render ascii-crt.html -o ascii-crt.mp4 --duration 8 --preset medium`

## Look
- **Palette:** the scene canvas holds *energy*, not colour: R = phosphor, G = the second colour. The CRT pass maps phosphor energy along one ramp — dim `#8c2605` → amber `#ffa329` → overexposed `#ffe6b3` — over unlit glass `#060403` (never pure black) and a bezel `#040302`. Second colour: ice blue-white `#b8e0ff`.
- **Colour rules:** one phosphor carries everything; brightness (dim / normal / bold, inverse video) is the only other tool. The second colour belongs to **one** object (the demo's lamp and its beam, plus the LOG line that announces it), switches on at **one** moment on a downbeat, and is never taken back. Alternatives: P1 green `#33ff66` with a warm pink second colour; P4 white `#e8f0ff` with pale gold.
- **Type:** one bitmap-style monospace, **VT323**, cell = 0.4 em × 0.8 em (1 : 2). Grid size is chosen per shot: boot log 80 columns (24 px cells, 0.044 H tall glyphs), picture 192 columns (10 px cells), LOG strip 22 px cells. Titles are typed as filenames or commands.
- **Subtitles:** a reserved **LOG strip** under the picture (from 0.88 H): a dim dashed separator, an inverse-video `LOG` tag, a `>` prompt and the line in uppercase, typed word by word (0.11 s/word), with a block cursor blinking at ≈ 1 Hz. It never zooms with the picture.
- **Materials & texture:** a glyph atlas (fill plus a 2 px stroke for beam spread) tinted into channel atlases; ink coverage measured per glyph to build the density ramp. CRT: horizontal beam smear, two-ring glow, 3 px scanlines that narrow on bright areas, slight barrel curvature, rounded screen mask, faint top-left glass reflection, ~1 % flicker. **No RGB grille** — monochrome tubes have none.

## Motion
- **Three things may move continuously:** the grid scale (the camera), CRT physics (power-on, glow), and particles during a declared transformation. Everything else jumps cell to cell.
- **Typing is performance:** machine output 12 ms/char, even; human typing uneven (22–67 ms/char plus pauses at spaces); dramatic lines at note values of the music.
- **Picture animation steps at 12 fps** (`floor(t*12)/12`) — swell and beam move glyph-by-glyph, not smoothly.
- **Camera = font size:** a push-in is the world grid's cell size growing (10 → 21 px, `easeInOutCubic` over 1.8 s) around a focus point; a pull-out shrinks it. Glyphs are anchored to world cells, so they scale up instead of re-sampling. **Banned:** pans that slide glyphs off-grid, rotations, crossfades between screens.
- **Transitions happen on the screen:** clear screen (with ~0.1 s phosphor afterglow, `exp(-dt/0.1)`), raster reveal row by row (each new row flashes 1.9× and decays over 0.12 s), scroll, power on/off.

## Signature checklist
1. Every mark is a glyph on a grid: cell aspect exactly 1 : 2; no free pixels or lines except the cursor block, the inverse tag and the power-on line.
2. Density ramp of ≥ 15 levels from ` .,:;-~=+*cox%#&@MW` × (0.42, 0.7, 1.0) brightness, near-duplicates (Δ < 0.02) removed.
3. Flat areas show a 4 × 4 Bayer pattern in glyph choice; areas below ≈ 5 % brightness are blank (negative space).
4. One phosphor hue only until the hero beat; then the second colour appears on ≤ 10 % of the cells and stays.
5. LOG strip occupies the bottom ≈ 12 % with an inverse tag; subtitles appear word by word.
6. Scanline period 3 px; barrel bulge ≤ 5 %; rounded corners with a dark bezel; no RGB triads.
7. Power-on: dot → horizontal line → full frame within ≈ 0.45 s.

## Native moves
- **Font size = camera.** Push from the 192-column picture until one object (the lamp) fills a third of the frame — or until one glyph turns out to be made of smaller text. *Fits:* "zoom into the detail that matters"; a name made of names; one entry among thousands.
- **The one colour.** At the peak, the second colour switches on for the emotional object only and the LOG line confirms it. *Fits:* a launch ("SERVICE ONLINE"), a first sign of life in a data log, a signal received.
- **The picture is typed.** A command is entered, the screen clears, and the image prints row by row like output. *Fits:* a report becoming a chart; a map loading; a diagnosis rendering.

## Core technique
```js
// in ready: atlas glyphs, measure ink per glyph (canvas created with willReadFrequently)
const d = atlasCtx.getImageData(0, 0, aw, ah).data;
for (const ch of chars) { let s = 0; const [px, py] = pos[ch];
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) s += d[((py + j) * aw + px + i) * 4 + 3];
  cov[ch] = s / 255 / (GW * GH); }
// ramp: coverage x (dim, normal, bold), sorted, near-duplicates dropped
for (const c of set) for (const a of [.42, .7, 1]) lv.push({ ch: c, a, v: cov[c] / mx * a });
lv.sort((p, q) => p.v - q.v);
// per cell: average the brightness field, add Bayer + hash dither, pick a level
const BAYER = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v => (v + .5) / 16 - .5);
const pick = (L, i, j) => RAMP[clamp(Math.round(L * n + (BAYER[(j & 3) * 4 + (i & 3)] * .5 + (hash(i, j) - .5) * .5) * .9), 0, n)];
// camera = font size: world cell (i, j) drawn at S + (i*CW0 - F) * z with size CW0 * z
glyph(lv.ch, S[0] + (i * CW0 - F[0]) * z, S[1] + (j * CW0 * 2 - F[1]) * z, CW0 * z, lv.a, e > a * .8 ? ICE : AMBER);
```
The picture is an analytic brightness field (`field(x, y, ts)` returns phosphor and second-colour energy), sampled 2 × 2 per world cell, so nothing is read back per frame. The atlas is drawn into the scene canvas with `lighter`; the WebGL pass turns R into phosphor colour and G into the second colour. See `picture()` and the shader in the demo.

## Pitfalls
- Every dark pixel becomes a character (`-+-+` mush in the sky) → threshold at ≈ 5 %, gamma 1.2, keep the sky ≤ 3 % so only stars print.
- Stars or sparse points picked from the ramp come out as random letters (`7`, `J`, `e`) → draw them as explicit `.` / `*` glyphs.
- Subject made of texture reads as a blob → silhouettes with a bright 1-row rim on edges (the headland), a lit side and a shadow side (the tower).
- Inverse video via `destination-out` only changes alpha → paint the block, then draw glyphs from a **black** atlas with `source-over`.
- Cell centre off by half a cell → cells are `cw × 2cw`; centre is `(j + .5) · 2cw`.
- Atlas or coverage built lazily on the first frame → non-deterministic first frame; build it all in `ready`.
- Second colour sneaking into decoration → it has one owner; test by grepping your code for the G channel.
- Fine single-pixel noise all over → big files; keep CRT noise ≤ 1.2 % and let the glyphs carry the texture.

## Check on stills
- `still --at 3` — the whole picture reads as silhouettes (moon, sea, headland, tower) from mostly blank space; flat zones show dither, not stripes.
- `still --at 6` — only the lamp, its beam and the LOG line are blue-white; everything else is amber.
- `sheet --crop 0,940,1000,140 --at 6` — inverse `LOG` tag, prompt, uppercase line, cursor.
- `sheet --strip 1.7:2.6 --fps 12` — rows appear top to bottom with a brief flash on each new row.

Source: adapted from lemo-opuscar — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/ascii-crt (MIT, LemoLab). Written in our own words; no assets copied.
