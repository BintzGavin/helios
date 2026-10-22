# Art Deco

A 1930s poster that moves: engraved gold keylines on warm lacquer black, symmetric ornament (sunbursts, ziggurat setbacks, chevrons) that unfolds from one centre axis, and light that arrives bulb by countable bulb. **Not:** a gold-foil slideshow with a glitter overlay, nor Art Nouveau curves and flowers.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Galas, openings and launches, award nights, hospitality and luxury brands, countdowns, title cards with a "grand reveal" | Canvas 2D: banded metal gradient strokes drawn on by arc length, mirrored about the axis, plus radial-glow bulbs | Medium | OFL display fonts (Limelight, Poiret One, Josefin Sans; Italiana for numerals) |

Demo: [art-deco.html](art-deco.html) — `npx -y @helios-project/cli@latest render art-deco.html -o art-deco.mp4 --duration 8 --fps 24 --mode canvas`

## Look
- **Palette:**
  - Ground: warm lacquer black `#0d0b09`, lifted to `#221a10` toward the centre with a radial gradient. Never neutral grey-black, never dead `#000`.
  - Gold is a **banded metal gradient**, never a flat colour: shadow `#6f5220` → base `#c9a24b` → light `#f3d98b` → hot `#fff4d2` → light → base → shadow.
  - Ivory `#f2e8d5` for paper, type and light. Bulbs are warm white `#fff8e2` with a `rgba(255,214,130)` halo.
  - **One jewel accent** (demo: emerald `#1d8a6b` / `#0b3d30` / `#7fe0bf`). It is the only saturated area on screen and marks the protagonist or the one object. Everything else stays gold, ivory and black.
  - Alternatives: burgundy `#8e1b2e` jewel with pale gold; sapphire `#1f4fa0` with rose gold.
- **Type:**
  - Titles: Limelight at ~0.11 H, a banded gold fill with a dark engraved rim and a hairline highlight, set on a stepped lacquer bar with double keylines.
  - Subtitles: Poiret One at ~0.04 H, ivory, +9 px tracking.
  - Small caps: Josefin Sans 600 at 22 px, +6 px tracking.
  - Use Roman numerals and "EST." lines for period voice.
  - Captions or subtitles go on a stepped lacquer card with a double gold keyline, unfolding from the centre like every other title.
- **Materials & texture:** gold line and metal, lacquer, glass bulbs.
  - The signature stroke is the **engraved keyline**: a dark underline 1.6 px wider than the line, the gold gradient line, then a 0.28 × width highlight hairline on top.
  - Four line weights (3.2 / 2.4 / 1.6 / 1.2 px).
  - Ornament is structure (frame, background, transition), never stickers.
  - No grain is needed; a vignette comes from the radial ground.

## Motion
- **Everything unfolds from the centre:** a point → a hairline → bars opening symmetrically → text rising inside the bar → wings and sparkles. The axis itself never moves.
- **Gold draw-on by arc length.** The arch engraves from the keystone down both sides at once (mirrored), in 1.2 s. Side rules run outward, chevrons from the middle out.
- **Easing:** firm mechanical ease-in-out (smoothstep) for doors, bars and dials; cubic ease-out for small arrivals. Nothing floats or bounces.
- **Counted light:** one group of bulbs per beat (0.5 s), here floor → keystone in 6 counts.
  - Each bulb ignites with a **1.6× overshoot settling to 1.0 in 0.18 s** (plus a 0.04 s filament ramp).
  - Once all are lit, a gentle chase runs (bright 1.15 / dim 0.72, ~9 bulbs/s).
- **Sheen sweep:** the bright band slides across every gold surface in 0.8 s on the hero hit. Otherwise it breathes ±0.04 around 0.38.
- Light, sheen and draw-on run on ones (24 fps). Characters, if any, step on twos.
- Transitions: symmetric door splits along the seam, arch openings, shape match cuts. Camera: push-ins on a dial or medallion, extreme low-angle tilts, never off-axis drift. No dissolves or generic slides.

## Signature checklist
- [ ] Every composition is mirror-symmetric about x = 960. Flip a still horizontally and it matches (text excepted).
- [ ] Gold strokes show three layers: dark underline (w + 1.6 px), gradient line, highlight (0.28 w).
- [ ] At least one ornament from {sunburst, stepped arch, chevrons, fan} is structural (framing the title), not decoration.
- [ ] Bulbs light in countable groups, one per 0.5 s, each peaking at 1.6× and settling within 0.18 s (5 frames at 24 fps).
- [ ] Exactly one saturated hue (the jewel), covering under 2 % of the frame.
- [ ] One sheen sweep crosses all gold within ≤ 1 s at the hero moment.
- [ ] Ground pixels are warm (R > B), never pure black.

## Native moves
- **Counted light.** A marquee lights group by group on the beat, so the audience counts along. The last count ignites the jewel at the keystone, while the sheen sweeps the gold and the chase begins. This is the demo's peak (5.0–5.8 s). *Fits:* a countdown to a launch; letters of a name lighting up; votes tallied into a winner.
- **Engraved draw-on from the axis.** A point opens into a hairline, then the frame engraves itself symmetrically. *Fits:* unveiling a crest or monogram; a map route; a signature on a contract.
- **The one colour.** A single jewel-toned element in an all-gold world. *Fits:* the one product among competitors; the guest of honour; the new idea in an old firm.

## Core technique
```js
// banded metal: slide `sheen` (0..1) to move the hot band across every gold surface at once
function gold(x0, y0, x1, y1, s) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#6f5220'); g.addColorStop(s - .3, '#c9a24b'); g.addColorStop(s - .08, '#f3d98b');
  g.addColorStop(s, '#fff4d2'); g.addColorStop(s + .1, '#c9a24b'); g.addColorStop(s + .32, '#6f5220'); g.addColorStop(1, '#c9a24b');
  return g;                                    // clamp the offsets to 0..1 in real code
}
// engraved keyline: dark underline, gold line, hairline highlight
function gline(p, w, sheen) {
  path(p);
  ctx.strokeStyle = 'rgba(70,50,18,.9)'; ctx.lineWidth = w + 1.6; ctx.stroke();
  ctx.strokeStyle = gold(0, 0, W, H, sheen); ctx.lineWidth = w; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,246,214,.55)'; ctx.lineWidth = Math.max(.6, w * .28); ctx.stroke();
}
// unfold from the axis: draw the right half by arc length, mirror it
const half = part(ARCH, ease(prog(t, 0.3, 1.5)));
gline(half, 3.2, sheen); gline(half.map(([x, y]) => [2 * 960 - x, y]), 3.2, sheen);
// bulb ignition: 1.6x overshoot settling in 0.18 s
const dt = t - tLit, v = dt < 0.18 ? 1 + 0.6 * (1 - dt / 0.18) : 1;
```
One gradient definition, shared by every gold element and driven by a single `sheen` value, is what makes the metal read as one material under one light. Drawing only half of each ornament and mirroring it guarantees the axis. See `bulb()` (halo radius grows with overshoot) and `stepBar()` in the demo.

## Pitfalls
- Flat `#c9a24b` gold looks like mustard paint → always use the banded gradient, with a shared sheen.
- Black cartoon outlines around gold → use only the engraved dark underline 1.6 px wider than the line.
- Off-axis elements creep in (a label, a sparkle) → draw half and mirror, and place seeded sparkles in pairs.
- Sunburst rays behind small type kill legibility → use a half sunburst above the title bar, and keep a calm lacquer zone under the text.
- A gold point on pure black can trip black-frame detection and looks dead → lift the ground with a warm radial gradient.
- A bulb chase that flashes fast and hard can exceed 3 flashes/s → keep the bulbs small, the chase gentle (dim 0.72, not off), and run `helios check` on the MP4.
- Off bulb sockets visible before the frame is drawn break the unfolding → reveal sockets with the draw-on (the demo compares each bulb's arc-length fraction to the draw progress).
- Determinism: fonts in `ready`. Gradients are rebuilt from `t` each frame. Reset `shadowBlur`/`shadowColor` every frame, because the glow leaks otherwise.

## Check on stills
- `still --at 7.8`, mirrored mentally: arch, bulbs, rules and sparkles are symmetric, and the jewel is the only colour.
- `sheet --strip 2.4:3.2 --fps 24 --crop 300,800,600,250`: a group of bulbs flares bright for ~4 frames and settles, with the next group exactly 12 frames later.
- `sheet --at 5.2,5.4,5.6`: the hot band visibly travels across the title, rays and keylines together.
- `sheet --at 0.1,0.3,0.6,1.0`: point → hairline → arch engraving from the keystone. Nothing appears off-axis first.

Source: adapted from lemo-opuscar — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/art-deco (MIT, LemoLab). Written in our own words; no assets copied.
