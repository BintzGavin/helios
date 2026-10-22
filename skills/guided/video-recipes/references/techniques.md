# Techniques and gotchas

Failure modes that come up again and again in code-made videos, with fixes that keep every frame a pure function of `t`.

## Contents

- [Springs and cursors](#springs-and-cursors)
- [Morphs, floods and transitions](#morphs-floods-and-transitions)
- [Text](#text)
- [Loops](#loops)
- [CSS, DOM and 3D](#css-dom-and-3d)
- [Motion blur and counters](#motion-blur-and-counters)
- [Footage, images and masks](#footage-images-and-masks)
- [Texture and glitch](#texture-and-glitch)
- [Glass and goo](#glass-and-goo)
- [Simulations](#simulations)
- [Automatic checks](#automatic-checks)

## Springs and cursors

**A value with several targets is a sum of springs.** Each change of target starts one closed-form spring at its own time. Summing them keeps the value a pure function of `t`:

```js
// Underdamped step response: 0 → 1 with overshoot. f = frequency (Hz), z = damping ratio (0..1).
const springStep = (t, f = 2.2, z = .45) => {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f, a = z * w, b = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-a * t) * (Math.cos(b * t) + (a / b) * Math.sin(b * t));
};
// Critically damped: no overshoot. w ≈ 12–40.
const springCrit = (t, w = 18) => t <= 0 ? 0 : 1 - (1 + w * t) * Math.exp(-w * t);
// changes = [[t0, value0], [t1, value1], ...]; the first entry is the starting value.
const sprung = (t, changes, step = springStep) =>
  changes.reduce((v, [tc, val], i) => i === 0 ? val : v + (val - changes[i - 1][1]) * step(t - tc), 0);
```

**Two edges, two springs.** A tab indicator or toggle knob whose left and right edges ride springs of different stiffness stretches toward where it's going, which reads as physical.

**Drags.** While held, the value comes from the cursor position. On release, it springs back from wherever it was at release time: `released + (rest - released) * springStep(t - tRelease)`.

**Cursor paths.** Aim the cursor at where the target *will be* when the cursor arrives, ease in and out, and cap its speed (around 65 px per frame at 1080p). A click is a 0.1 s dip in scale plus a ripple.

## Morphs, floods and transitions

- **Floods** (a circle that grows to fill the frame) must overscale past the farthest corner and take about 0.3 s. Faster, half the screen changes in one frame. Once full, swap the giant circle for a plain full-frame rectangle.
- **Ease a soft start.** A fast ease-out flood reads as a jump cut. A flood still retreating when the next scene starts reads as a hard cut.
- **Iris by area, not radius.** `r = R * Math.sqrt(ease(p))` closes at an even visual rate.
- **Don't fly the camera into an off-centre dot.** It swings and spikes. Zoom about the dot (keep it fixed on screen), or open the dot as a mask.
- **Morph inside the camera of the scene you're leaving.** Changing transforms mid-morph makes it jump.
- **Handoffs.** A transition reads as seamless only when the last frame of one scene equals the first frame of the next. Draw the outgoing scene under the transition. Scenes that show the same object share one zoom function.
- **Never crossfade into the accent.** Move an accent element between states instead of fading black or another colour into it.
- **Morphing between unrelated shapes or words:** don't interpolate arbitrary path points. Resample both by arc length, align start points, or route through a circle; for words, use occlusion or matched structural edges of the real glyph paths.
- **Paths.** Sample curves by arc length for even spacing. Keep the camera transform separate from glyph orientation. Blend position *and* tangent when an object leaves a path.

## Text

- Text inside a morphing container needs its own mask and its own enter and exit times, or old and new text overlap.
- Outgoing text leaves before incoming text takes the space.
- Text being read never moves decoratively until its reading hold ends.
- Measure element positions at runtime for match cuts (`getBoundingClientRect()` inside `renderAt`, or `ctx.measureText`), so a carried object lands on identical pixels on both sides of a cut.
- **Cues for `verify --cues`.** Matching ignores case and punctuation, so `time.` matches `time` even with the full stop drawn apart. DOM letters count as one word only when they sit side by side on one line; a word drawn as a rotated group of letter spans, letters flying in, or a canvas word drawn in two passes needs `window.heliosDrawnText?.add(word)` with the whole word, once per frame (it's a set, so a second add is harmless).
- Load fonts in `ready` with the actual text as the sample: `document.fonts.load('800 120px "Font"', allTheTextInThePage)`. That forces unicode-range subsets (CJK, accents) to load.

## Loops

- The last frame equals the first, including the cursor's position *and* velocity.
- Render `[0, duration)`: the frame at `t = duration` is the first frame again and must not appear twice.
- Wrap time with `t - D * Math.floor(t / D)`.
- A pattern that rotates one notch per beat stutters. Rotate it continuously at a speed chosen so it lands on an identical pattern at the loop point.
- Reset hidden elements while something covers them, before the loop point.

## CSS, DOM and 3D

- Opacity or `filter` on a `transform-style: preserve-3d` element flattens it, and both faces show. Fade a wrapper instead.
- `will-change` blurs text that the camera scales, and makes frames depend on history. Remove it.
- `backdrop-filter: url(#svgFilter)` misreads displacement maps in Chromium. Render a clone of the scene behind each glass element instead.
- A child with `visibility: visible` shows through a hidden parent. Use `inherit`.
- Labels in a 3D scene: HTML positioned from the projected 3D point every frame, never text rendered inside the 3D scene.
- WebGL: compile shaders and render one throwaway frame in `ready` so the first real frame isn't slower or different.

## Motion blur and counters

- In-page motion blur averages several sub-frame renders (see the motion-styles skill's [time-tricks reference](../../../design/motion-styles/references/time-tricks.md)). Four sub-frames ghost on fast whips; use eight there.
- Counters, digits and readable text read the frame's own time, not the sub-frame's, or they smear. Blur only the trailing geometry.
- In a shot that has a counter, a counter that freezes mid-shot looks like a broken render: it runs on the global clock and keeps moving through cutaways. This doesn't apply inside deliberate stillness (kinetic type's holds where nothing moves).
- A helper that sets `globalAlpha` or a transform must restore it, or the next element inherits it.
- Batching ellipses or arcs into one `Path2D` (or one `beginPath`) needs a `moveTo(x + rx, y)` before each `ellipse`, or the subpaths join into streaks.

## Footage, images and masks

- Seeking `<video>` per frame is fragile. Extract the clip to an image sequence (`ffmpeg -i clip.mp4 -vf fps=30 frames/%04d.jpg`), pick the image for `Math.round(t * 30)`, and `await img.decode()` before drawing. Or re-encode all-intra (`-g 1`) and await the `seeked` event.
- A PNG mask without alpha fills its whole box.
- Extend masks past the photo's border, or cut-out limbs show a straight edge.
- Bake sprites and static artwork into offscreen canvases in `ready`.

## Texture and glitch

- Grain changes every frame from a seed (`Math.floor(t * fps)`), never from `Math.random()`. Keep it subtle; fresh full-frame noise makes files huge.
- Chromatic fringes use edge-clamped channel shifts.
- Glitches last 1–2 frames, happen only on a real cut, and come with a sound. Anything readable stays clean for at least 8 frames.
- Avoid the "AI video" tells unless you mean them: decorative corner labels, frame borders and fake HUD chrome with no meaning.

## Glass and goo

- **Glass.** The full version is an SVG displacement map through three `feDisplacementMap`s at slightly different scales for chromatic edges. The cheap version is a pre-blurred copy of the scene clipped to the shape, plus a tint and a 1 px rim highlight.
- **Goo** (blobs that merge and split): blur the shapes, threshold the alpha (`feColorMatrix` with a steep alpha ramp), then draw the crisp source on top.
- **Wordmark squeeze:** drive a variable font's width axis so letters stay touching as the word compresses.

## Simulations

- Write motion in closed form where possible (a parabola for a throw, a damped cosine for a settle).
- Otherwise bake the simulation into an array in `ready` with a fixed timestep and a seeded RNG, then read it by index: `state = sim[Math.min(sim.length - 1, Math.round(t * SIM_HZ))]`.
- Particles: position from `seed + age`, never stepped. `age = t - birth(i)`, `x = x0(i) + vx(i) * age`, `y = y0(i) + vy(i) * age + g * age * age / 2`.
- Don't fake a computation: if a mechanism adds numbers, read the answer from its state.

## Automatic checks

Beyond `helios verify` and `helios check`, these are worth a quick script over a rendered sheet or the MP4:

- **Single-frame pops:** a frame whose difference from its neighbours spikes to 3× theirs.
- **Frozen stretches:** runs of identical frames longer than your budget.
- **Loop seam:** frame 0 and frame N must be identical.

```bash
ffmpeg -i video.mp4 -vf "select='gt(scene,0.35)',showinfo" -f null - 2>&1 | grep pts_time   # big jumps
ffmpeg -i video.mp4 -vf "freezedetect=n=0.001:d=0.6" -f null - 2>&1 | grep freeze          # still stretches
```

`freezedetect` at `n=0.001` also flags dark scenes where only a cursor or a small counter moves. Treat its output as a hint: lower `n` (e.g. `0.0002`, so small changes count as motion) or check each flagged span by eye in a `sheet --strip`.

**Flash traps** (`helios check`): a zoom or pull-out across dense high-contrast texture (tiles, grains, magnified halftone) fails at ~7.5 flashes/s however slowly it moves, and a big numeral that slides out and back in on every beat gives 4 flashes/s at 120 BPM. Lower the texture's contrast during fast camera moves, cut between fixed zoom levels, fill a wall after the move, and swap digits with a static wipe. See the motion-styles [finishing reference](../../../design/motion-styles/references/finishing.md).
