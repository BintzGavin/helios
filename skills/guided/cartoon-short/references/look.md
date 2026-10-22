# The ink-and-paint look

The look has seven layers, all deterministic, plus a camera (section 8). [starter.html](../starter.html) implements the first six in Canvas 2D with no libraries.

## 1. Boil: one seed per element per drawing

```js
const BOIL = 12;                       // drawings per second
let BN = 0;                            // set at the top of renderAt: BN = Math.floor(t * BOIL + 1e-4)
function rng(key) {                    // a fresh stream from (stable key, boil drawing)
  let h = 2166136261;
  for (const ch of key + '|' + BN) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = (h + 0x6D2B79F5) | 0; let x = Math.imul(h ^ (h >>> 15), 1 | h);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
```

- Call `rng(key)` once per element: each background layer, prop, character part and effect. The key must be stable across frames and unique within the frame (`'tuft' + i`, `charKey + 'armL'`).
- A shared stream fails because a moving element consumes a different amount of randomness each frame, and everything drawn after it re-boils every frame.
- Things that must never move (positions, heights, layouts) use `hash(i)`, which doesn't depend on `BN`.
- Render at `--fps 24`. At 30 fps, either boil at 15 or accept uneven holds.

## 2. Wobbly shapes

Build shapes from a few points (corners plus edge midpoints, or 10–18 points around an ellipse), nudge each point by `(r() * 2 - 1) * j`, and draw a smooth closed curve through the midpoints with `quadraticCurveTo`. Scale `j` with the character: about `u * .07`.

Never use bare `fillRect` / `arc` for anything that should look drawn. Perfect geometry reads as 2000s Flash.

## 3. Ink line

- One continuous stroke per shape, `lineJoin = lineCap = 'round'`, in a dark ink like `#2b2233`.
- A second, thinner, fainter pass re-wobbled from the first gives a dry-brush edge.
- Weight scales with the unit: `sw = clamp(u / 7, 1.5, 7)`. Parts at `sw * .8`, interior lines (mouths, lids) at `sw * .5`.
- For a tapered brush line on open strokes, draw the path as a filled ribbon whose half-width follows `w * sin(π · s)` along normalized arc length `s`, with ±20 % noise per segment.

## 4. Paint recipe for solid shapes

In this order, each from the same element seed:

1. **Flat fill**, wobbled a little more than the ink so it sits slightly off the line (misregistration).
2. **Light pool**: a soft ellipse of the lighter colour, top-left, clipped to the shape, about 45 % opacity.
3. **Dark settle**: a band of the darker colour along the bottom fifth, clipped, about 40 % opacity.
4. **Ink** last.

Backgrounds get soft fills with no outline or a thin one. Far layers are paler, bluer and less saturated.

## 5. Paper and grain

Generate both once in `ready`, from a seeded LCG, never per frame:

- **Paper:** base `#f3ebdc`, about 60 faint radial stains and ~1400 short curved fibre strokes at 8 % opacity.
- **Grain:** per-pixel noise of a few levels plus a gentle vignette, multiplied over the finished frame with `globalCompositeOperation = 'multiply'`.

Static grain keeps file sizes sane. For grain that lives, build 3–4 grain canvases and pick one with `Math.floor(t * 12) % 4`.

## 6. Light is additive

Paint mixes like pigment. A yellow glow painted over blue turns green. Draw lamps, sparks and magic with a radial gradient under `globalCompositeOperation = 'lighter'` (or `'screen'`), beneath the grain pass.

## 7. Smears and transitions

- **Smear frames** for very fast moves: on the in-between frames, stretch the character along the motion (`scale(1 + smear, 1 - smear * .4)`) and draw 3–5 dry streaks behind it. Never more than 2–3 frames.
- **Iris:** fill the frame with ink except a circle, with `ctx.arc(..., true)` inside a full-frame `rect` and `fill('evenodd')`. Centre it on the character's screen position. Ease the radius in with `easeIn` so it closes fast at the end.
- **Shaped iris** (star, heart, keyhole, leaf): the same trick with a path, so the shape must join the rect's path. The starter's `smooth(P, closed, begin)` takes `begin = false` for that:

  ```js
  function shapedIris(P, cx, cy, s) {          // P: shape points around 0,0, wobbled by a fixed ±3 px, not scaled by s
    ctx.save(); ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.rect(-50, -50, W + 100, H + 100);
    if (s > .01) smooth(P.map(([x, y]) => [cx + x * s, cy + y * s]), true, false);
    ctx.fill('evenodd'); ctx.restore();
  }
  ```

  Wobble that grows with the shape turns it into a blob. Open it until the shape's inscribed circle clears the farthest frame corner: a narrow shape (a leaf) needs several times a circle's scale. Close to the face, hold ~0.4 s, then close.
- **Brush wipe:** a few thick wobbly strokes sweeping across, staggered by 0.05 s, covering the frame by the seam; the next shot starts under the second half of the same wipe.
- **Whip pan:** 4–6 frames of horizontal smear streaks at the seam, with motion continuing in the same direction in the next shot.
- **Match cut:** same shape or motion on both sides of the cut, landing on the same pixels.

## 8. Camera, parallax and screen positions

One camera per shot, set from `t`. Layers draw in world space; far layers get `par < 1`, so they pan and zoom less:

```js
let cam = { x: W / 2, y: H / 2, z: 1 };                           // set at the top of each shot
function layer(par, draw) {
  const z = 1 + (cam.z - 1) * par;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z);
  ctx.translate(-W / 2 - (cam.x - W / 2) * par, -H / 2 - (cam.y - H / 2) * par);
  draw(z); ctx.restore();
}
const toScreen = (x, y) => [(x - cam.x) * cam.z + W / 2, (y - cam.y) * cam.z + H / 2];   // for par = 1
```

- Centre an iris, emote or reticle on `toScreen(charX, groundY - 6 * u)` so it stays on a moving character.
- Ink weight is in world units, so a push-in thickens it. Inside a zoomed layer, draw with `w / Math.sqrt(z)` (or `w / z` to hold it constant on screen).

## Palette rules

- No pure black (`#000`) or white (`#fff`). Ink `#2b2233`, cream `#fff5e2`.
- 4–6 soft colours plus the character's colours, chosen so the character always separates from the background.
- A colour arc across the video (cold night → warm dawn as the mood lifts) carried by the background, not by recolouring the character.

## Optional: real brush simulation

[p5.brush](https://github.com/acamposuribe/p5.brush) gives true watercolour bleed and pigment texture. It is slow without a GPU (seconds per frame) and its WebGL output may vary between machines, so use it only if the render machine has a GPU, seed every call, and run `helios verify` on it. The Canvas 2D recipe above is the default.
