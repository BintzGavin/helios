# Era timeline

Centuries pass in one drawn medium. A big year counter rolls, each era's drawing un-draws and redraws itself as the next, and one recurring motif shows how the same thing looked in every age.

| Typical length | Format | Best styles | Demo |
|---|---|---|---|
| 30–90 s (6–10 eras) | 16:9; 1:1 works with the counter on top | `watercolor-ink`, `one-line`, `woodcut` | [era-timeline.html](era-timeline.html) |

## Structure

| Beat | Share | What happens |
|---|---|---|
| Establish | first era, fully drawn at frame 1 | The oldest era is already on paper, with the year, the timeline and the motif, so frame 1 is a complete page. |
| Era × N | equal slots, 3–8 s each | Hold (the line boils, the wash breathes) → transition 1.2–2 s: the old drawing un-draws (tool first, motif last) while the new one starts drawing (motif first). The year rolls through the whole transition. |
| Turn | the era where the motif changes most | The point where the medium itself flips (hand → machine, ink → pixels). Give it the longest hold. |
| Recap / end card | last 2–4 s | The motif from every era redrawn small, side by side above its date on the timeline. No headline needed. |

Minimal text: years, "c." and one footnote ("c. = approximate"). The drawings carry the story, so it reads in any language.

## Look

- **Paper and ink.** Warm paper (`#f2e9d6`) with static seeded speckle and a vignette, ink `#2a2520`, one flat watercolour wash per era offset by a few pixels from its outline, and one accent for the "you are here" marker (`#c0492f`).
- **The year counter is the headline:** about 200 px of a handwritten face (Caveat 700), digits in fixed slots so the roll doesn't jitter. Small "c." before it, era suffix (BCE/CE) after it, and an underline drawn with the same boiling line.
- **Recurring motif in a fixed spot.** In the demo it is a small sun at the same screen position in every era: pressed wedges, ink rays, a printed solid disc, a typed asterisk, pixels. The eye compares eras by comparing it.
- **Timeline along the bottom** with equally spaced chapter ticks (not proportional to years: eras differ by millennia) and dated labels that darken as they are reached.
- Pairs with `watercolor-ink`, `one-line`, `woodcut`; for a printed feel, `risograph` with one plate per era.

## Technique

**One chapter function drives everything.** `c(t)` = the sum of one eased ramp per transition. The year is `lerp(year[i], year[i+1], frac(c))`, the timeline marker sits at `c / (N−1)`, and the drawing state comes from the same transition windows. Picture, counter and marker can never disagree. The year rolls fast through the middle of the gap and settles sharp.

**Boiling ink.** Every shape is a polyline resampled by arc length (even 5 px spacing). Each point is pushed along its normal by a smooth offset whose phase is a seeded random of `floor(t·12)`, so the line re-draws on twos and holds in between. Stroke it twice: a firm line plus a thinner, fainter one with a different phase. Draw-on is just "how many resampled points to draw", spent across strokes in order.

```js
const boil = Math.floor(t * 12 + 1e-4);                         // 12 drawings per second = on twos at 24 fps
function inkLine(pts, n, seed, boil, w) {                       // pts already resampled by arc length
  n = Math.min(n, pts.length); if (n < 2) return;
  for (let pass = 0; pass < 2; pass++) {
    const ph1 = R(seed * 7.1 + boil * 3.7 + pass * 11) * 6.28, ph2 = R(seed * 3.3 + boil * 1.9 + pass * 5) * 6.28;
    const A = pass ? 2.4 : 1.5; ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      const o = A * (0.7 * Math.sin(k * 0.23 + ph1) + 0.6 * Math.sin(k * 0.071 + ph2));
      ctx.lineTo(pts[k][0] - dy / L * o, pts[k][1] + dx / L * o);   // offset along the normal
    }
    ctx.globalAlpha = pass ? 0.45 : 0.92; ctx.lineWidth = pass ? w * 0.5 : w; ctx.stroke();
  }
}
let budget = p * era.total;                                     // draw-on: spend points across strokes in order
era.lines.forEach((pts, k) => { inkLine(pts, Math.floor(budget), k + 1, boil, 4.5); budget -= pts.length; });
```

The transition overlaps the two eras: the old one un-draws over 0.5 s while the new one begins at 0.3 s. List strokes motif-first, so the motif is the last thing to leave and the first to return. Washes bloom in after ~35 % of the outline is down. See `drawState()` and `drawEra()` in the demo. For a page turn or sand wipe instead, keep the same `c(t)` and replace only the transition drawing.

## Gotchas

- **Line boils every frame.** At 24–30 fps it buzzes. Step the phase at 12/s (`floor(t·12)`), and keep the paper texture static.
- **Uneven wobble on long and short segments.** Wobble per point only works on arc-length-resampled paths. Raw path points give lumpy corners and dead straight runs.
- **Blank page mid-transition.** Sequential un-draw then draw leaves an empty frame. Overlap them by ~0.2 s, and keep the motif until last.
- **The year roll and the picture drift apart.** Both read `c(t)`. Never tween the counter on its own timer.
- **Proportional timeline.** Real year spacing crushes the recent eras into a corner. Space chapters evenly and print the dates.
- **Year zero and BCE.** There is no year 0. Show 1 CE when the rounded value hits 0, switch the suffix at the sign change, and use fixed digit slots so 3200 → 600 doesn't jump sideways.
- **Unsafe facts.** Pick broad, well-established dates and prefix them with "c."; say what "c." means once. Or invent a civilisation and say so. Never name real people as the "inventor" unless the brief demands it and the fact is checked.
- **Text that only works in one language.** Let the drawings and numbers carry it. One footnote at most.

## Stills to check

- **t = 0:** the first era complete, the counter at the first year, the marker on tick 1.
- **The middle of each transition** (`sheet --strip` across it at 8–12 fps): the old era partly rewound, the new motif already down, the year mid-roll, no empty frame.
- **Each hold:** the motif in the same screen spot, the wash inside its outline, no overlap with the counter or timeline.
- **Two frames 1/24 s apart in a hold:** identical (boil steps at 12/s). Then two frames 1/12 s apart: different.
- **Last frame:** the recap row, all dates readable, the marker on the last tick.

## Example brief

```
INPUTS      Subject (default: writing tools), 5–8 eras with years, motif, accent.
CONCEPT     "Five thousand years of writing the same sun."
            Central rule: one boiling ink line redraws itself era by era.
            Hero object: the little sun, same spot, a new medium each era.
LOCKED COPY Years only: c. 3200 BCE (clay tablet), c. 600 CE (quill), c. 1450 CE (movable-type press),
            c. 1870 CE (typewriter), c. 1980 CE (laptop); footnote "c. = approximate". Facts file lists them.
LOOK        1920×1080, 24 fps, 16 s. Paper #f2e9d6, ink #2a2520, marker #c0492f, one wash per era.
            Caveat 700 at 200 px for the year, 500 for labels. Camera locked; a slight lift for the end card.
MOTION      inOut cubic for c(t); draw-on ease-out; line boils at 12/s; washes bloom after the outline.
BANNED      Cross-dissolves, photo textures, sepia filters, named inventors, captions describing the picture.
STRUCTURE   0–1.6 s era 1 held; 4 × (1.5 s transition + 1.6 s hold); 14.0–16 s recap row of suns.
            Signature moments: wedges becoming ink rays, the printed solid disc, the sun as pixels.
BUILD       Pure function of t; arc-length resampling in ready; seeded wobble from floor(t·12).
GATES       Stills at 0, 2.4, 4, 7, 10, 13, 15.9; strip 1.6–3.2 at 8 fps; verify --duration 16.
```
