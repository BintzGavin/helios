# Pixel sprite loop

A small pixel-art character acts out a short loop (idle, charge, cast, recover) in a tiny fixed-resolution scene: it moves in crisp stepped poses and lights its surroundings with particles, rim light and a little screen shake on impact.

| Typical length | Format | Best styles | Demo |
|---|---|---|---|
| 4–12 s per loop (one or two cycles) | 16:9 (160×90 × 12), or 1:1 (128×128 × 8) | `pixel-art` | [pixel-sprite.html](pixel-sprite.html) (1920×1080, 12 s = 2 × 6 s cycles) |

This recipe is about the sprite-loop genre: the state machine, the pose stepping, particles and impact. For the look itself (palette building, LUT lighting, dithering, parallax), read the style card [`pixel-art`](../../../../design/motion-styles/references/styles/pixel-art.md) and its demo. This page doesn't repeat them.

## Structure

One cycle is a looped state machine, and every state is a fraction of the cycle phase. The demo uses a 6 s cycle:

| State | Phase | Share | What reads |
|---|---|---|---|
| IDLE | 0–0.30 | ~30 % | 1 px breathing bob at 2 steps/s, a slow cloak flutter, a dim crystal. Establishes the character and the target. |
| CHARGE | 0.30–0.62 | ~32 % | Staff raised in 3 quantized steps, a crouch, motes spiralling into the crystal, a light pool growing, a rim light switching on, a meter filling. This is the anticipation, and the longest active state. |
| CAST | 0.62–0.70 | ~8 % | A snap pose (lean forward 1 px, staff aimed). The bolt travels in 0.36 s, then impact: sparks, a ring, 1–2 px shake, the target lights. |
| RECOVER | 0.70–1.0 | ~30 % | Poses step back to idle, the glow decays, the target's flame dies down by the end of the cycle, so the next IDLE starts clean. |

The hook is the first charge (within 2 s). The hero moment is the impact frame. Two cycles seeded differently (particles vary, poses don't) make a 12 s loop that doesn't feel like it repeats.

## Look

- **A fixed logical resolution, scaled by an integer.** 160×90 × 12 = 1920×1080; 128×72 × 15 also works, and so does 320×180 × 6 for bigger scenes. Draw into a small buffer, then `drawImage` it up with `imageSmoothingEnabled = false` (and CSS `image-rendering: pixelated` on the canvas). No fractional scale, no rotation or zoom of the final image.
- **A fixed palette of 16–24 colours, drawn as indices.** Every pixel in the buffer is an index into one `PAL` array. Ramps are lists of indices (`MAGIC = [23, 22, 21, 20]`, `FIRE = [19, 16, 15]`), so particles and light step through palette entries instead of blending.
- **Sprite size:** the hero is 14×22 logical px (≈ 170×260 screen px), with a dark outline, 2–3 tones per material and one accent (the gold trim). The target is a similar size, at the other side of the frame.
- **What stays on screen:** the character, the target, the ground line, and a tiny HUD (state name in a 3×5 pixel font, a charge meter). The HUD shows the state machine to the viewer, and it is optional.

## Technique

**Everything is a pure function of phase, on a stepped clock.** Replace any fixed-timestep simulation (`pos += vel` every tick) with closed-form functions of `t`. The stepped clock `tq = floor(t · 10 + 1e-6) / 10` gives the 8–12 fps feel to everything that *acts* (poses, particles, shake), even though the render runs at 30 fps.

```js
const tq = Math.floor(t * FPS_FEEL + 1e-6) / FPS_FEEL;         // 10 fps feel
function machine(t) {                                           // state = pure function of phase
  const c = Math.floor(t / CYC), lt = t - c * CYC, ph = lt / CYC;
  let i = 0; while (i + 1 < STATES.length && ph >= STATES[i + 1][1]) i++;
  const a = STATES[i][1] * CYC, b = (STATES[i + 1]?.[1] ?? 1) * CYC;
  return { c, lt, name: STATES[i][0], u: (lt - a) / (b - a) };  // u: 0→1 inside the state
}
const q = (v, steps) => Math.round(v * steps) / steps;          // ease first, then quantize
const raise = q(inOut(m.u / 0.4), 3);                           // staff lifts in 3 visible steps
const ang = Math.round(angle / (Math.PI / 16)) * (Math.PI / 16); // staff angle snaps to 11.25°
// particles: seed + age, colour steps through palette indices by age
const age = lt - (CHARGE0 + i * 0.09), u = age / life;
put(tip[0] + Math.cos(a0 + u * 3) * r0 * (1 - u), tip[1] + Math.sin(a0 + u * 3) * r0 * (1 - u),
    MAGIC[Math.min(3, Math.floor(u * 4))]);
// sparks: ballistic in closed form, clamped to the ground row
const y = Math.min(GROUND - 1, y0 + vy * age + 0.5 * g * age * age);
```

- **Procedural sprite from string art.** One string per row, one character per palette index (`'.'` = transparent). Variant rows (the second cloak frame) swap in by a stepped counter. Moving parts (staff, arm) are Bresenham lines between integer points, so they stay one pixel wide at every angle.
- **Integer snapping everywhere.** `put(x, y)` rounds once, at the end. Positions may be computed as floats, but never drawn as floats. Don't anti-alias, and don't use `arc()` on the buffer.
- **1 px rim light from the magic source.** Render the sprite into its own layer, then for each opaque pixel whose neighbour *toward the source* (direction rounded to one of 8) is transparent, recolour it with the magic index. Do this against a copy of the layer, so the rim doesn't grow into itself. Switch it on with the source's glow, and use a brighter index at the cast. See `mage()` in the demo.
- **1–2 px screen shake on impact**, from a short table stepped at the 10 fps clock. Render the buffer with a 2 px margin and shift the *source* rectangle, so no edge ever shows.
- **Seeding by cycle.** `seed = cycleIndex * 101` varies sparks and motes between cycles. The whole video still loops, because the cycle count divides T, and every ambient period (twinkle, fireflies) divides it too.

## Gotchas

- **Mushy, blurred pixels** → integer scale only, `imageSmoothingEnabled = false` set every frame (it resets when the canvas is resized), and draw the whole buffer with one `drawImage`. Never `ctx.scale` the vector drawing.
- **Smooth tweening looks wrong in pixel art**: positions glide sub-pixel and shimmer → ease a pose *parameter*, quantize it to a few steps, evaluate it on the stepped clock, and round coordinates once.
- **Fixed-timestep sim** (`x += vx` per frame) breaks out-of-order rendering and changes with fps → closed-form ballistics, seed + age particles, and a phase-based state machine. If something really needs a simulation, bake it into an array in `ready` and index it with `tq`.
- **Colours creep outside the palette** (alpha blending, `lighter`, shadows) → write indices, light by index LUTs (see the `pixel-art` card), and convert to RGB only in the final `putImageData`.
- **Shake reveals the canvas edge or moves the HUD by half pixels** → margin buffer plus an integer source offset, at 1–2 logical px, for ≤ 0.4 s, and only on an impact.
- **The loop seam pops** because the target is still glowing at the wrap → every effect started in a cycle decays to zero before the cycle ends (the flame's `lit` reaches 0 at phase 1).
- **Flicker above 3 Hz** from twinkles or a strobing flash → twinkle by stepping through 2–3 indices at ≤ 2 steps/s on small areas only; the impact ring lasts 3 stepped frames and covers a tiny area.
- **A rim light that outlines the whole sprite** → light only the side facing the source (the neighbour test), and only while the source is bright.

## Stills to check

- **Idle** (0.5 s): the sprite reads at a glance, the outline is clean, and the palette is all on-index (`sheet --crop` at 100 %).
- **Mid-charge** (3.0 s): motes converge, the rim light sits only on the side facing the crystal, the staff is at a quantized angle.
- **Impact strip** (`sheet --strip 4.0:4.5 --fps 10`): one frame of ring, sparks fanning out, the frame offset 1–2 px for 3–4 steps, then steady.
- **Recover → idle** (5.5–6.2 s): poses step back, the glow and flame are at zero by the wrap, and the second cycle's sparks differ from the first's.
- **t = 0 vs t = 12 − 1/30:** consecutive-looking frames.

## Example brief

```
INPUTS      Character (default: a robed mage), action (cast at a target), logical size, cycle length.
CONCEPT     "A tiny wizard practises the same spell, and it lands every time."
            Central rule: everything acts on a 10 fps clock, on an integer grid, in 24 colours.
            Hero object: the staff crystal; it charges, casts, and lights everything it faces.
LOCKED COPY HUD only: IDLE / CHARGE / CAST / RECOVER (3×5 pixel font). No other text.
LOOK        160×90 × 12 → 1920×1080, 30 fps render, 10 fps acting, 12 s (2 × 6 s cycles).
            24-index palette: night sky bands, violet hills, ink trees, blue robe, gold trim,
            cyan magic ramp 23→20, fire ramp 19→16→15. Pixel look per the pixel-art style card.
MOTION      Pose params eased then quantized (staff 3 steps, angles 11.25°); 1 px bob; snap cast pose.
BANNED      Sub-pixel motion, smoothing, alpha blending outside the palette, camera zoom,
            shake without impact, strobing above 3 Hz.
STRUCTURE   IDLE 0–1.8 / CHARGE 1.8–3.72 / CAST 3.72–4.2 (impact 4.08) / RECOVER 4.2–6; repeat seeded.
BUILD       Index buffer + margin; string-art sprite into its own layer; Bresenham staff; rim pass;
            seed + age particles; closed-form sparks; shake as a source offset; one putImageData
            + one integer drawImage per frame.
GATES       Stills at 0.5, 3.0, 4.1, 5.5; strip 4.0–4.5 at 10 fps; verify --duration 12.
```
