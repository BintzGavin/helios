# Swiss Grid

The International Typographic Style set in motion: one modular grid, one neo-grotesque, one signal colour, and every element snapping into place on the beat like a press stroke. **Not:** a "minimal" keynote slide with fades, nor kinetic lyric type where words fly, spin and bounce.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Brand systems and identities, event and exhibition announcements, rules / principles / "how it works" lists, a spec sheet with one standout feature | Canvas 2D + grid-snapped rects and clip-revealed text on a beat clock | Medium | one OFL grotesque (Archivo, Inter, Schibsted Grotesk, Instrument Sans) |

Demo: [swiss-grid.html](swiss-grid.html) — `npx -y @helios-project/cli@latest render swiss-grid.html -o swiss-grid.mp4 --duration 8 --fps 24 --mode canvas`

## Look
- **Palette:** page `#EAE9E5` (ground), paper `#FFFFFF` (the artifact), ink `#111111` (type, bars, rules), greys `#CFCDC7` (secondary bars) / `#D9D7D2` (grid guides) / `#8A8882` (lead-ins), signal `#E30613`.
  - Rules: paper, ink, a few greys and exactly **one** saturated hue. Only one element carries it. That element is the protagonist, and the only thing allowed to be inexact or off-grid. Black type may overprint the signal colour. No gradients, no tints of the signal, no second accent, ever.
  - Alternatives: orange `#FF5A00` on `#F2F0EA` / `#141414`; ultramarine `#1F3FFF` on `#E9ECEF` / `#0B0B0B`.
- **Type:** one family for the whole film, several weights (demo: Archivo 500 / 700 / 800).
  - Sizes: a giant numeral at ~0.55 H (600 px) as the chapter card, statements at ~0.07 H (76 px), the artifact headline sized to fill its paper width (~0.25 H), technical notes at 19 px. The jump from 600 px to 19 px is the point.
  - Tracking −2 to −3 % at ≥ 90 px, 0 below. Lowercase headlines are fine.
  - **Flush left, ragged right, every baseline on the 24 px grid.** Giant numerals sit optically flush: add the glyph's `actualBoundingBoxLeft`.
  - Captions belong to the layout: a small grey lead-in ("rule 3") above a bold statement at a column start, or a caption row of notes under a 1 px rule. Never a subtitle bar.
- **Materials & texture:** flat printed paper. Rects and text only, guides in two light greys, no shadow, no grain, no glow. A secondary voice is light grey bars under black ones, which gives depth without a second colour.
  - Frame grid: 1920 × 1080, 12 columns of 122 px, 96 px side margins, 24 px gutters, 24 px baseline.
  - Treat the frame as a spread: the left page holds the programme (numeral, rule, notes), the right page the artifact with its own grid.
  - Derive the artifact grid from the content and choose fat modules. Many thin columns read as a bar chart.

## Motion
- **Two curves only.** The precise ease `cubic-bezier(.7,0,.2,1)` for every snap; linear for lines being drawn, playheads and the exception. No overshoot, spring, bounce or fade.
- **Durations are note values.** At 120 BPM, a beat is 0.5 s, 1/8 is 0.25 s and 1/16 is 0.125 s. A snap **starts one note value early and lands on the beat grid** (a beat, or one of its 1/8 and 1/16 subdivisions): `snap(t, tArrive, d)`.
- **Entrances are wipes and clip-reveals.** A word rises out of a clip rect from below its baseline in a 1/16 and leaves upward in a 1/8. Bars grow along their length. Paper wipes in. A giant numeral climbs in 4 eased steps, "one module at a time".
- **Deletions are knife cuts.** A 2 px line crosses the element in a 1/16 (linear), then the element collapses to its midline in a 1/8.
- **Ripples are ordered by distance** from their cause, two units per 1/16. After any change, the rest re-flow nearest first.
- Smooth 24 fps on ones. There's no stepping: this is digital precision, not handmade.
- Camera, if any: a 2D matrix moved only with the precise ease, only on beats. Use a hard pan by one column or page, a 90° rotate-and-stop, or a pull-out to a wall of artifacts. Never a dissolve, a drift or a handheld wobble.

## Signature checklist
- [ ] Every left edge sits on one of the 12 column starts (96 + n·146 px) and every baseline on a multiple of 24 px.
- [ ] Exactly one element uses the signal colour, and it is ≥ 1 module large when it matters.
- [ ] Every snap ends on the beat grid, subdivisions included (a multiple of 0.125 s at 120 BPM: the demo's knife collapse lands at 3.875 s, ripples step by 1/16) and lasts one note value (0.125 / 0.25 s). No eased move ends off the grid.
- [ ] No frame shows a partially transparent element: entrances are clipped, not faded.
- [ ] Scale contrast ≥ 25:1 between the largest and smallest type on screen at the peak (demo: 600 px numeral vs 19 px notes). A caption or end frame can be calmer.
- [ ] At least one knife cut (line in 1/16, collapse in 1/8) and one ripple ordered by distance.
- [ ] Only the exception moves linearly and unsnapped. Its readout changes from integer "on grid" values to non-integer "off grid" values.

## Native moves
- **The exception.** Everything obeys the grid, so the one element that doesn't becomes a character. It moves linearly, unsnapped, pauses one 1/8 mid-flight (a glance back), grows, and lands off-grid, bleeding past the paper edge. The system then re-flows around it, nearest first. Put this at the emotional peak (demo: 4.75–6.25 s). *Fits:* an outlier in the data; the one feature that breaks the category; a founder who didn't follow the rules.
- **Programme.** Rules applied one by one to one artifact (rule 1 → grid, rule 2 → rhythm, rule 3 → exception), each rule a beat-locked change on the right page. *Fits:* a brand identity's principles; a recipe's steps; a design system's tokens.
- **Knife cut + re-flow.** An element is deleted by a line, and its neighbours slide into the gap one 1/16 apart. *Fits:* budget cuts; removing a feature; editing a text down.

## Core technique
```js
// the one ease, and snaps that land on the beat
const E = bezier(0.7, 0, 0.2, 1);
const lin  = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const snap = (t, tArrive, d = 0.25) => E(lin(t, tArrive - d, tArrive));
const steps = (t, a, b, n) => { const p = lin(t, a, b) * n, i = Math.floor(p);
  return i >= n ? 1 : (i + E(p - i)) / n; };                  // numeral climbs n modules

// clip-reveal: the word rises from below its baseline inside a clip rect
function clipWord(s, x, y, size, p, q = 0) {
  const w = ctx.measureText(s).width;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 4, y - size, w + 8, size * 1.28); ctx.clip();
  ctx.fillText(s, x, y + (1 - p) * size * 1.05 - q * size * 1.3);
  ctx.restore(); return w;
}
// ripple ordered by distance: rank by distance from the cause, two per 1/16
BARS.sort((a, b) => a.d - b.d).forEach((b, k) => b.arrive = 1.5 + Math.floor(k / 2) * 0.125);
// knife: line crosses in a 1/16, then the bar collapses to its midline in a 1/8
const col = snap(t, T_KNIFE + 0.125 + 0.25, 0.25); y += h / 2 * col; h *= 1 - col;
```
Every animated value comes from `snap` on an arrival time on the beat grid. The style's rigour is a schedule, not a feel. The exception is the only thing driven by `lin`. See `exState()` in the demo for the paused linear flight and the readout.

## Pitfalls
- Too many thin modules make the layout look like a bar chart → fewer, wider modules. The demo uses a 6 × 6 artifact grid with bars half a module tall.
- Fading things in "to be smooth" → clip-reveal or wipe. A fade instantly reads as a slide deck.
- Merged bars show hairline seams, especially when rotated or scaled → round to whole pixels and overdraw +1 px.
- Canvas `letterSpacing` changes `measureText` → set the font and tracking *before* measuring, and reset tracking to 0 for small sizes.
- Onsets between frames flicker or land a frame late → put arrivals on whole frames: at 24 fps, multiples of 0.125 s are exact.
- Animating labels while something rotates reads as noise → rotate, hold a beat, then reveal labels.
- Fine 1 px guides shimmer in the H.264 encode when they move → keep guides static, whole-pixel and light grey, and animate only their length.
- Flashing (`helios check`): a giant numeral that slides out and back in on every beat flips each pixel twice per beat, 4 flashes/s at 120 BPM → swap digits with a static clip-wipe. A pull-out across a wall of high-contrast artifacts fails at ~7.5 flashes/s however slowly it moves → lower the wall's contrast while the camera moves and restore it as the move settles, or keep the wall empty during the move and fill it ring by ring after.
- Determinism: fonts loaded in `ready` and the headline size measured there. `renderAt` resets the transform, alpha and composite mode every frame.

## Check on stills
- `still --at 7.8`: does every left edge line up with a grid guide? Is there exactly one red thing, and is the numeral optically flush with the text below it?
- `sheet --strip 4.5:6.4 --fps 8`: the exception moves at constant speed with a visible pause, while nothing else moves until it lands. Then the bars re-flow one by one.
- `sheet --strip 3.4:4.3 --fps 24 --crop 960,80,960,600`: knife line, then collapse to the midline, then the neighbour slides in. No fade in any frame.
- On any still, the type-size ratio is extreme and the white space reads as deliberate, not empty.

Source: adapted from lemo-opuscar — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/swiss-motion (MIT, LemoLab). Written in our own words; no assets copied.
