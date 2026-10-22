# Process / recipe

An empty glass, plate or box becomes the finished thing one step at a time, while a counter, live measurements and a checklist keep exact pace with the picture.

| Typical length | Format | Best styles | Demo |
|---|---|---|---|
| 20–60 s (3–8 steps) | 16:9 (hero left, panel right) or 9:16 (hero top, panel bottom) | `sticker-explainer`, `swiss-grid`, `isometric` | [process-recipe.html](process-recipe.html) |

## Structure

| Beat | Time | What happens |
|---|---|---|
| Establish | 0–1 s | The empty vessel (glass, board, box) and the full checklist, all unchecked. Frame 1 already shows how far there is to go. |
| Step × N | 4–6 s each | Counter rolls `n / N` and the step name lands (0–0.5 s). The tool or ingredient enters (0.2–0.9 s), acts (one eased flow, 1.5–2 s), leaves (≈3–3.6 s). The measurement settles exactly on its target and holds ≥ 0.8 s before the checkbox ticks. |
| Hero step | the one that changes the picture most | Usually the largest quantity (the water, the top bun, the final panel). Give it the widest stream or the biggest motion, not more time. |
| Finish | last 2–3 s | The panel swaps to an end card: the dish name, a total read from the same function, a garnish or final part landing, and a short punchline (an instruction, not a slogan). |

The viewer should be able to stop on any frame and read where they are: which step, how much, what's left.

## Look

- **Hero object large and centred in its half.** It is the progress bar. Its fill level, height or assembly state tells the whole story without the panel.
- **Panel with a strict order:** recipe name (small caps, accent), `STEP n / N` in mono, the step name in a display serif, a huge mono measurement with its unit, a secondary unit and the target ("1.5 oz · of 45 ml"), a thin step progress bar, the checklist, and a running total at the bottom.
- **Palette:** warm ground (cream `#f6efe2`), ink `#1f2a2e`, one accent for progress (`#f2c53d`), one for "done" (`#2b6f6b`). Ingredient colours come from the ingredients and mix in the vessel.
- Tabular mono digits for every number, so counters don't jitter sideways.

## Technique

**One cumulative-quantity function drives everything.** Each step's amount is an eased flow, and the total is their sum. The fill height is that total pushed through the vessel's geometry: a tapered glass minus what the ice displaces, precomputed as a volume-by-height table and inverted per frame. The step counter, the oz conversion, the jug's remaining level and the running total all read the same `vol(s, t)`. The stream width is its derivative. Nothing is animated separately, so nothing can disagree.

```js
const vol  = (s, t) => STEPS[s].ml * inOut(span(t, st(s) + POUR, PDUR));          // eased flow
const rate = (s, t) => STEPS[s].ml * inOutD((t - st(s) - POUR) / PDUR) / PDUR;   // ml/s → stream width
const V    = t => STEPS.reduce((a, _, s) => a + vol(s, t), 0);                   // THE function
// in ready: free volume below each pixel height, glass cross-section minus ice
for (let h = 1; h <= GB - GT; h++) {
  const y = GB - h + 0.5, area = Math.PI * (rAt(y) * CM) ** 2;
  const ice = ICE.filter(([, cy]) => Math.abs(y - cy) < CUBE / 2).length * (CUBE * CM) ** 2;
  avail[h] = avail[h - 1] + (area - ice) * CM;                                   // cm³ = ml
}
const ly = levelY(V(t));          // binary-search avail[] → liquid surface y
const shown = Math.round(vol(s, t)), oz = (vol(s, t) / 29.5735).toFixed(1);
```

The stream is closed-form too. Its head falls from the spout with `½·g·τ²` after the flow starts, and its tail falls the same way after the flow stops, so it detaches cleanly. Its width is `3 + k·rate`. Ripples at the impact point are `(t·f + k/3) % 1` rings, faded by the rate. The liquid colour is the volume-weighted mix of everything poured so far. For assembly (a sandwich, flat-pack), the same pattern holds: cumulative height or parts placed is the function, and every layer's position comes from it. See `scene()` and `panel()` in the demo.

## Gotchas

- **Counter and picture disagree** (number says 45, glass is still rising). Both must read one function. Never tween the label separately.
- **Linear fill in a tapered vessel looks wrong.** Equal volume is not equal height. Invert the real profile, and subtract ice or other solids.
- **Numbers that don't land.** Eased flows reach exactly the target. Round only for display, and hold the settled value ≥ 0.8 s before ticking the box.
- **Checklist ticks before the step reads as done.** Tick after the tool has left, then draw the check stroke over ~0.35 s.
- **The stream starts or stops instantly.** Use a falling head and tail, and a width from the flow rate (thin at both ends).
- **The tool covers the panel.** Bring tools in from above or from the hero side, and pour about the spout (rotate about the pivot that stays over the vessel).
- **Wrong quantities or conversions.** Keep the recipe in a facts block (demo: classic 1 : 1 : 4 lemonade, 45 / 45 / 180 ml over 5 cubes; 1 oz = 29.57 ml). If the dish is invented, say so on screen.
- **A process longer than the film** (dough rising, paint drying, a 20-minute steep) → use an honest compressed clock: show the real elapsed time and the speed-up ("40 min · ×600"), and keep the quantity function in real time so the numbers stay true.
- **An opaque vessel hides the story** (a pot, a mixer, an oven) → cut it away: a section view or a cutaway window that shows the level, from the first step.
- **Weighing steps** → a "tare" pattern: the scale reads the vessel, zeroes with a click, then counts up only what is added. The tare value comes from the same function as everything else.
- **Floating garnish.** Draw the submerged part of a straw or spoon under the liquid (tinted) and the part above the surface on top.

## Stills to check

- **t = 0:** empty vessel, full unchecked list, counter on step 1. A complete poster.
- **The middle of each pour:** the stream joins spout to surface, no gap and nothing outside the rim, and the counter matches the level.
- **Just after each step settles:** the exact target value, check drawn, next step not yet announced.
- **The hero step's peak flow:** widest stream, ripples, and the jug's level dropping.
- **Last frame:** end card, garnish resting on the rim, the total equals the sum of the facts.

## Example brief

```
INPUTS      Dish (default: classic lemonade), steps with quantities, units (ml + oz), accent.
CONCEPT     "Four pours make a glass of lemonade."
            Central rule: one volume function drives the picture and every number.
            Hero object: the glass, whose level is the progress bar.
LOCKED COPY "CLASSIC LEMONADE · 1 : 1 : 4"; steps: Ice (5 cubes), Lemon juice (45 ml),
            Simple syrup (45 ml), Cold water (180 ml); end: "Lemonade." / "270 ml · 4 steps · 1 glass" /
            "Stir once." / "Taste before more sugar." Facts: 1 oz = 29.5735 ml; quantities as listed.
LOOK        1920×1080, 30 fps, 18.5 s. Cream #f6efe2, ink #1f2a2e, lemon #f2c53d, done #2b6f6b.
            Fraunces 800 for names, Inter 500/700 for the list, IBM Plex Mono 500/600 for numbers.
            Camera locked; hero left, panel right.
MOTION      Cubic inOut flows; tools ease in from above in 0.7 s; step digit rolls 0.45 s then sits sharp.
BANNED      Splash particles, sparkle on ice, counters that overshoot, cuts between steps, emoji.
STRUCTURE   0–1 s establish; 4 × 3.7 s steps (enter 0.2, tilt 0.9, pour 1.25–2.95, leave 3.05);
            15.8–18.5 s end card + garnish. Signature moments: ice drop, the widest water stream,
            the straw sliding into the finished glass.
BUILD       Pure function of t; volume table in ready; stream and ripples closed form.
GATES       Stills at 0, 6.4, 10.2, 14.0, 18.2; strip 13.2–14.8 (hero pour); verify --duration 18.5.
```
