# UI morph loop

One interface element is never cut: on every beat a cursor clicks, drags or types, and the same shape becomes a loader, a check, a notification, a player, a slider, tabs, a chart, a search bar and a toast, before coming back to the button it started as.

| Typical length | Format | Best styles | Demo |
|---|---|---|---|
| 14–20 s at 120 BPM | 1:1 loop (1440² or 1080²) | `shape-morph`, `swiss-grid`, `flat-vector` | [ui-morph-loop.html](ui-morph-loop.html) (1080×1080, 16 s = 32 beats) |

## Structure

There are 8–12 states on a beat grid, with **something visible on every beat**: a morph, a click ripple, a progress tick, a bar growing, a typed letter. At 120 BPM a beat is 0.5 s, and 16 s is 32 beats.

| Beats | State | What lands on the beat |
|---|---|---|
| 0–2 | button | idle, then hover grows the shape on b1, click on b2 |
| 2–4 | loader | the shape shrinks to a circle; the spinner turns once per beat |
| 4–6 | check | the colour floods green and the tick draws; click on b6 |
| 6–8 | pill notification | the shape stretches wide; a badge pops on b7 |
| 8–11 | media player | the shape grows tall; play on b9, then a progress tick every beat |
| 11–14 | slider | the cursor drags the knob past the end (rubber band and stretch), releases, and the knob springs home |
| 14–16 | toggle | the shape becomes a short pill; click on b15 slides the knob and floods it green |
| 16–19 | tabs | clicks on b17 and b18; the indicator stretches toward each one |
| 19–23 | chart | one bar per half beat |
| 23–27 | search bar | the shape widens; letters typed on 16ths |
| 27–29 | toast | the shape shrinks to a card with a timer bar |
| 29–32 | button | back to the start; hover on b30, release on b31; the cursor returns to its first position |

The hook is the first morph (b2), half a second after the first hover. The hero state is the one with the most physics (the drag). The end is not a hold: it is frame 0 again.

## Look

- **One shape, one shadow, one camera.** The shape stays centred. The camera zoom keeps each state's long side at about 50 % of the frame (`540 / max(w, h)`, clamped), so a 140 px loader and a 600 px search bar both read. A world-space dot grid moves with the zoom, so the zoom reads as a camera and not as the shape growing.
- **Palette with roles:** warm grey ground `#E8E5DF`, ink shell `#17171C`, paper shell `#FBFAF7`, one accent `#FF5A36` (cursor ripples, the slider fill, the highlighted bar) and one success colour `#22A45D`. The shell's fill changes per state, and it is the only large colour field.
- **Type:** Inter 700/500 inside the shape (30–34 world px, so ~40–55 px on screen), and JetBrains Mono 16 px for a quiet HUD: the title, the state counter, and 32 beat ticks with the current beat lit.
- **The cursor is drawn in screen space**, so it is the same size at every zoom, with a press dip and an accent ripple on every click. It is always on screen.

## Technique

**State table keyed by beat.** Every state's size, radius and fill sits in one array, with in-state changes (hover, toggle on) in a second one. Retiming the film is one edit to a `b:` value. Tracks for w, h, r, R, G, B and zoom are built from the table once, in `ready`.

**Closed-form springs, summed per target.** A value with several targets is the first value plus one spring per change, each starting at its key time. Adding the previous loop's springs (`t + T`) makes value and velocity continuous across the loop point, as long as the last key returns to the first value.

```js
function spring(tau, w0 = 15, z = 0.62) {               // step response 0 → 1
  if (tau <= 0) return 0;
  if (z >= 1) return 1 - Math.exp(-w0 * tau) * (1 + w0 * tau);
  const wd = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w0 * tau) * (Math.cos(wd * tau) + (z * w0 / wd) * Math.sin(wd * tau));
}
function track(keys, t, w0, z) {                         // keys: [[time, value]...], last value == first
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const d = keys[i][1] - keys[i - 1][1];
    if (d) v += d * (spring(t - keys[i][0], w0, z) + spring(t + T - keys[i][0], w0, z));
  }
  return v;
}
// two-spring edges: the leading edge of the tab indicator is stiffer than the trailing one, so it stretches
const edge = (side) => pos[0] + side * 88 + [1, 2].reduce((v, i) =>
  v + (pos[i] - pos[i - 1]) * spring(t - keyT[i], side > 0 ? 24 : 11, side > 0 ? 0.75 : 0.95), 0);
// drag: follow the cursor while held, then spring from the release position to the rest position
const knob = t < tPress ? x0 : t < tRelease ? rubber(cursor(t).x)
           : rest + (rubber(cursor(tRelease).x) - rest) * (1 - spring(t - tRelease, 17, 0.42));
```

**Cursor as a periodic cubic Hermite** through `[beat, x, y, stop]` waypoints. A `stop` waypoint (a click, press or release) has zero tangent, so the cursor arrives at rest; the others use Catmull-Rom tangents, wrapping around the loop. Position *and velocity* at T then equal those at 0.

**Content is a separate layer with its own clock.** Each state draws inside a clip of the current shell. The outgoing content fades and blurs out over 0–120 ms after the change, and the incoming content blurs in over 120–320 ms. Each text label also has its own line mask and rises inside it, so text never stretches with the container. Easing, stagger and loop rules are in [../techniques.md](../techniques.md).

## Gotchas

- **Text squashes or overflows while the container morphs** → never scale content with the shell. Content draws at its own size inside the shell's clip, and every label also has its own mask and entrance timing.
- **Old and new content overlap into mush** → outgoing content leaves first (≤ 120 ms), then the incoming content takes the space. Never crossfade them at the same moment.
- **Loop hitch**: the last frame doesn't match the first, or the cursor changes speed at the wrap → the last state equals the first, every track returns to its first value with the `t + T` springs included, the cursor path is periodic Hermite, and the HUD doesn't colour beats as "past" (it would jump at the wrap). Export `[0, T)`, so frame T is not rendered twice.
- **A morph happens with no cause** → the cursor drives every change. Put a click waypoint (with `stop`) on the beat of each morph, a press/release pair for the drag, and type letters on 16ths.
- **A tiny state is unreadable, or a wide one is cropped** → zoom from the state's own size, clamped (the demo uses 0.85–3), as a softer spring than the shape so the camera trails the morph.
- **Retiming means editing twenty numbers** → keep times in beats in one table; derive seconds with `b * B`.
- **History-dependent frames** from `will-change`, a leftover filter or shadow → reset `filter`, `shadowColor` and the transform at the top of `renderAt`, and use no `will-change`.
- **Rubber band without stretch looks broken** → while the knob is past its end, stretch the shell toward the drag (the demo's `over`), and let both spring back together on release.

## Stills to check

- **t = 0 and t = T − 1/fps:** the same state, the same cursor position, and the same HUD apart from the moving tick.
- **50 ms after each morph** (`sheet --strip 1.0:1.35 --fps 30`): outgoing content blurred and leaving, incoming not yet arrived, shell mid-spring with a small overshoot.
- **Mid-drag** (6.4 s) and **just after release** (6.7 s): the knob is under the cursor, the shell is stretched, then it settles back.
- **Tabs** (8.6–9.2 s strip): the indicator's leading edge clearly ahead of its trailing edge.
- **Every state's settled frame:** the shape is ~50 % of the frame, the text is crisp, and the cursor is inside the frame.

## Example brief

```
INPUTS      The UI states to show (8–12), product accent, BPM (default 120), square size.
CONCEPT     "One shape learns every job in the interface."
            Central rule: one shape, never cut. Hero object: the shell, and the cursor that drives it.
LOCKED COPY Get started → / New message · Mika: running late? / Low Tide · Paper Boats /
            Day Week Stats / Rainfall, mm (illustrative) / rainy day / Saved · to Rainy day · OK.
LOOK        1080×1080, 30 fps, 16 s = 32 beats. Ground #E8E5DF, ink #17171C, paper #FBFAF7,
            accent #FF5A36, success #22A45D. Inter 700/500; JetBrains Mono 16 px HUD.
            Camera: zoom only, keeping each state's long side at ~50 % of the frame.
MOTION      Springs: shape ω 15 ζ 0.62; colour ω 14 critically damped; camera ω 7.
            Content out 0–120 ms, in 120–320 ms, with a blur of up to 6 px; labels rise in their own masks.
BANNED      Cuts, crossfades between states, content scaling with the shell, gradients on UI chrome,
            bounces that never settle, will-change.
STRUCTURE   Beat table above; something lands on every beat; last frame = first frame.
BUILD       State table + extras → tracks in ready; track() with t + T terms; periodic Hermite cursor;
            two-spring tab edges; drag = cursor while held, spring on release; fresh ctx state per frame.
GATES       Stills at 0, 15.967, each morph +50 ms, mid-drag, release; verify --duration 16
            --width 1080 --height 1080; diff frame 0 against frame T − 1/fps.
```
