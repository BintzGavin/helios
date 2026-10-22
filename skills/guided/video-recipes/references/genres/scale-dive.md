# Scale dive

One continuous zoom that keeps finding a smaller world inside a small detail of the last one: a desk, the board on it, a chip on the board, the transistors on the chip, the atoms in the silicon.

| Typical length | Format | Best styles | Demo |
|---|---|---|---|
| 20–45 s (5–7 levels) | 16:9, or a 1:1 loop that zooms back out | `blueprint`, `isometric`, `swiss-grid` | [scale-dive.html](scale-dive.html) |

## Structure

Every level gets the same slot: a short reading hold, then one eased zoom into the next level. Each level should cost the same screen time however big its scale jump is (×10 or ×5000).

| Beat | Share | What happens |
|---|---|---|
| Establish | first 1–1.5 s | Level 1 is a finished, familiar picture with the HUD already up. The target detail is visible but not pointed at. |
| Level slot × N | equal, ~3–4 s each | Hold about 1.1 s (the label is read, the zoom keeps creeping), then a 2.2–2.6 s eased zoom. The label hands over at the midpoint of the zoom. |
| Hero level | the last or the strangest | The smallest (or largest) level, where the viewer's intuition breaks: atoms, a galaxy cluster, a single cell. |
| Payoff hold | 2–3 s | One measured fact appears on the final level (a bond length, a distance), with the HUD at its extreme. |
| Optional return | 30–40 % of total | Zoom back out through the same levels, faster, landing on frame 1 for a loop. |

The hook is the first time a familiar object turns out to hold a whole second world. Get to it within 4 s.

## Look

- **Each level has its own palette and material.** Wood, then PCB green, then die violet, then layout colours, then a lattice. The colour change is how the viewer knows they have changed worlds. Next to each other the colours should differ in hue, not only in lightness.
- **HUD that never moves:** level counter + name + one-line note (top left), a power-of-ten ladder with a marker and a dot per level (bottom), and field-of-view readout, exponent and scale bar (bottom right). Mono tabular digits for numbers, a grotesque for names. Translucent dark panels so the HUD reads over every level.
- **Scale bar = a 1-2-5 value** whose bar is 100–300 px long; its length jumps as the value steps, the same way a map's scale bar does. It is the honest ruler; the field-of-view number is the fast-moving one.
- Pairs with `blueprint` (line levels on a grid), `isometric` (stacked worlds), `swiss-grid` (flat levels, strict HUD).

## Technique

Three ideas carry it. **(1) z is a level index, and the camera works in log space.** `z(t)` runs from 0 to N−1, with one `inOut` ease per level slot plus a small linear creep so holds never freeze. Inside level `i` with fraction `f`, the visible width is `k = s^f` (s = child width / parent width), so every level gets equal time whatever its ratio. **(2) Zoom about the fixed point.** If the child's centre `b` is off-centre, lerping the camera centre while scaling exponentially makes it swing. Scale about `p = b / (1 − s)` instead: it stays put on screen, and the child lands exactly in frame at f = 1. **(3) Every level is drawn in its own units, relative to the current one.** Transforms are composed from level `i` downward only, so numbers never get large. A child is drawn clipped to the parent feature it lives inside, and a level is dropped once its child covers the frame.

```js
const z = zoomZ(t), i = Math.min(N - 1, Math.floor(z + 1e-9)), f = z - i, Li = L[i];
const k = Math.exp(f * Math.log(Li.s));                 // visible fraction of level i, log-linear in f
const px = Li.b[0] / (1 - Li.s), py = Li.b[1] / (1 - Li.s);   // fixed point of the zoom
let S = W / k, ox = W / 2 - px * (1 - k) * S, oy = H / 2 - py * (1 - k) * S;
for (let j = i; j < N && j <= i + 2; j++) {
  const Lj = L[j], cS = S * Lj.s, cox = ox + Lj.b[0] * S, coy = oy + Lj.b[1] * S;
  if (j > i && Lj.reg[2] * S < 2) break;                // too small to matter
  if (!(j + 1 < N && covers(cox, coy, cS, L[j + 1].reg))) {   // child fills frame → skip this level
    ctx.save(); ctx.setTransform(S, 0, 0, S, ox, oy);
    if (j > i) { const r = Lj.reg; ctx.beginPath(); ctx.rect(...r); ctx.clip(); }
    Lj.draw(ctx, S, [-ox / S, -oy / S, W / S, H / S], t);   // view rect in level units, for culling
    ctx.restore();
  }
  S = cS; ox = cox; oy = coy;                             // child j+1: x_j = b_j + s_j · x_{j+1}
}
```

Inside each `draw`, size things in physical units so they grow as you zoom in. Fade every element in by its size on screen (`lod(size, S)` = smoothstep from ~1 px to 4 px). Cull to the view rect, and replace dense repeated detail with its **average colour** until it is a few pixels tall (see `cells()` in the demo). Two levels that touch share one source of geometry. In the demo the bond wires are one list in board units, drawn by the board and mapped into die units by the die, so they meet exactly.

## Gotchas

- **Zooming into an off-centre target swings.** Interpolating the centre linearly while the scale is exponential makes it arc and spike. Zoom about `p = b/(1−s)`, or open the child as a growing mask centred on it. Don't add a separate pan.
- **Linear zoom speed** hurries the big levels and makes the small ones crawl. Ease `f`, not the scale. A ×5000 level and a ×10 level take the same time.
- **Float blow-up.** One world coordinate system from metres to nanometres jitters and then disappears. Each level has its own units, transforms start from the current level, and parents are dropped (not just covered) once the child fills the frame.
- **Seams at the child's edge.** The child must live inside a feature of the parent that has one plain colour (a board, a die, a diffusion strip). Its region must hold the whole frame at f = 1 with margin, and its background colour must equal the parent feature's colour. A textured world (sand, foliage, fabric) has no plain feature: give the two touching levels one shared geometry list, and make materials a function of screen scale, so both levels draw the same thing at the seam.
- **Precision in shared geometry.** When one level draws another's geometry, sum the offsets and scales in JS doubles and set one `setTransform`; nested `translate`/`scale` calls compose in the canvas's single-precision matrix and drift at deep zoom.
- **Camera roll breaks coverage and culling.** With a rotated camera, map the frame's four corners back into level units (inverse rotation) for `covers()` and the view rect; an axis-aligned rect misses the corners.
- **Flash check fails on dense texture.** A zoom across high-contrast repeating texture (a wall of tiles, sand grains) fails `helios check` at ~7.5 flashes/s however slowly it moves. Lower the texture's contrast while the zoom is fast and restore it as the level settles.
- **Sub-pixel detail shimmers** (thin rows, stripes, lattices moiré). Draw the pattern's average colour until its period is ~3–10 px, then fade the real structure in on top.
- **Dead stretch on big ratios.** Between ×100 and ×5000 the parent can be one flat colour for a second. Add sparse octave stipple (dots at 10ⁿ cell sizes that fade in and out by screen size), or pick a target near an edge so structure stays in view.
- **Wrong scale facts.** Keep a facts list: level widths, the one measured value (the demo uses Si–Si bond ≈ 0.235 nm), and mark schematic levels as schematic.
- **Label pops.** Cross-slide old and new labels around the zoom midpoint inside a clipped panel. Never leave an empty panel.

## Stills to check

- **t ≈ 0.3 s:** a finished establishing frame. HUD up, target visible but not centred.
- **The midpoint of each zoom:** the child is about 30–50 % of the frame. No seam at its region edge, no shimmering stripes, the label mid-handover.
- **Just before and after each level switch** (`sheet --strip` across f = 1, 30 fps): pixel-identical neighbours, no pop when the parent is dropped.
- **The deepest level's arrival:** the lattice or final world appears from texture, not from flat colour.
- **Final hold:** the measured callout is legible and doesn't overlap the HUD, and the scale bar's label is correct.

## Example brief

```
INPUTS      Starting object (default: a workbench), 5 levels, final fact, accent (default #ffd36b).
CONCEPT     "Everything on this desk is made of smaller worlds."
            Central rule: the camera never cuts; every level opens out of a detail of the last.
            Hero object: the field-of-view readout, which never stops changing.
LOCKED COPY Level names: Workbench / Circuit board / Chip die / Transistors / Silicon atoms.
            Notes: one line each. Final: "Si–Si bond ≈ 0.235 nm". Facts file: level widths
            1 m, 10 cm, 1 cm, 10 µm, 2 nm; bond length 0.235 nm; lattice marked "2-D schematic".
LOOK        1920×1080, 30 fps, 17 s. One material palette per level; HUD white on rgba(10,12,18,.62),
            accent #ffd36b. Space Grotesk 700 for names, JetBrains Mono 500/700 for numbers.
            Camera: zoom only, about the fixed point; no pans, no roll.
MOTION      inOut cubic per level slot + 6 % linear creep; labels cross-slide 170 px.
BANNED      Cuts, crossfades between levels, lens flares, shake, glowing particles, fake data readouts.
STRUCTURE   0–1.3 s establish; then 4 × (1.1 s hold + 2.4 s zoom); 14.2–17 s atoms + callout.
            Signature moments: the decapped chip window, the rows resolving out of teal, atoms out of grain.
BUILD       Pure function of t; per-level units; level dropped when child covers frame; LOD fades;
            fonts loaded in ready.
GATES       Stills at 0.3, each zoom midpoint, 16.5; strips across each level switch; verify --duration 17.
```
