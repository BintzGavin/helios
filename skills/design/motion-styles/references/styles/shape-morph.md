# Shape Morph

One flat silhouette that keeps becoming the next thing, one transformation per beat, while colour fields bloom out of it behind. **Not:** a cross-fade between icons, nor a "liquid" blob that wobbles without ever meaning anything.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Brand stories told in symbols, logo reveals, loops, "from A to B" narratives | Canvas 2D + arc-length resampled polygons, aligned and interpolated | Medium | a geometric OFL face (Space Grotesk, Outfit) + optional mono for labels |

Demo: [shape-morph.html](shape-morph.html) — `npx -y @helios-project/cli@latest render shape-morph.html -o shape-morph.mp4 --duration 8 --mode canvas`

## Look
- **Palette:** paper `#F3EDE2` (default field), ink `#1B1A22` (dark field, type, the final dot), saffron `#F7B32B`, tomato `#EF4B2D`, cobalt `#2A45D8`.
  - Rules: three saturated hues plus paper and ink. The hero is always one solid colour; the field behind it is always a *different* one with strong value contrast (saffron star on ink, tomato heart on saffron). Every in-between colour of a morph is mixed in **OKLab**, so cobalt → tomato passes through a clean violet instead of a grey-brown.
  - No outlines, no inner detail, no gradients on the hero. A shape must read from its silhouette alone.
  - Alternative: bone `#EFE9DD`, charcoal `#202020`, mint `#3DDC97`, coral `#FF6F59`, violet `#6A4CFF`.
- **Type:** the wordmark arrives only at the end: Space Grotesk 700 at ~0.19 H (210 px), −6 px tracking, rising out of a baseline mask. The hero finishes as its full stop. Chapter labels in DM Mono 500 at 28 px, +4 px tracking, bottom-left, in whichever of paper/ink reads on the field below them.
- **Materials & texture:** flat printed shapes on paper with a faint static grain (multiply, 7 %). The grain is a seeded tile built in `ready`.

## Motion
- **One morph per beat**, 0.6 s each, on the curve `cubic-bezier(.7, 0, .3, 1)` (slow out, fast middle, slow in). Hold each shape ~0.3 s so it reads.
- **Complex pairs go via a circle.** Star → heart would tangle; split the morph at its midpoint into star → circle → heart, each half eased with the same curve.
- **Squash 10–15 %.** Stretch on one axis through the middle of the morph (`q = 0.12 · sin(πu)`), then a damped squash on arrival (−13 %). The hero peak gets two heartbeat squashes.
- **Colour-field wipes:** a circle of the next field colour blooms from the hero's centre with expo-out `cubic-bezier(.16, 1, .3, 1)` over 0.6 s, behind the hero. Banned: fades, slides, cuts.
- Fast travel gets an **analytic smear**: a disc moving fast is drawn as a capsule from its shutter-open to shutter-close position with alpha ramps at each end.
- Camera: locked. The morph is the motion. Smooth 30 fps.

## Signature checklist
- [ ] Every shape transition is a continuous outline (no frame shows two overlapping shapes or a cross-fade).
- [ ] Mid-morph outlines never self-intersect or twist; points travel the short way (check the 50 % frame).
- [ ] Each morph lasts ≈ 0.6 s and starts on a beat; at most one morph is in flight at a time.
- [ ] Squash on arrival is visible and ≤ 15 %.
- [ ] Mid-morph colours are clean (no grey-brown); the field always contrasts with the hero.
- [ ] Field changes are circles blooming from the hero, not fades.
- [ ] The fast entry and the final flight show a capsule smear, not a sharp disc.

## Native moves
- **Via the circle.** A complicated A → B passes through the most neutral shape there is, which reads like a breath between ideas. *Fits:* a rebrand (old mark → circle → new mark); a pivot; "everything starts from one point".
- **Shape and field swap meaning.** The colour that was the hero becomes the field (saffron star, then a saffron field behind the tomato heart). The demo's peak (4.4–5.1 s): the field blooms saffron and the heart beats twice. *Fits:* a product becoming the platform; a feeling taking over a scene; a brand colour claiming the frame.
- **The hero becomes punctuation.** The final shape shrinks to a dot and flies into the wordmark as its full stop, smeared in flight, landing with a ring. *Fits:* end cards; a manifesto's last line; a product name.

## Core technique
```js
// sample every outline to N points by arc length (SVGPathElement does the maths)
function sample(d) { const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d);
  const L = p.getTotalLength(); return Array.from({ length: N }, (_, i) => { const q = p.getPointAtLength(L * i / N); return [q.x, q.y]; }); }
const area = P => P.reduce((a, p, i) => { const q = P[(i + 1) % P.length]; return a + p[0]*q[1] - q[0]*p[1]; }, 0) / 2;
const orient = P => area(P) < 0 ? P.slice().reverse() : P;      // same winding for every shape
function bestShift(A, B) {                                        // rotate B's start index to minimise travel
  let best = Infinity, bs = 0;
  for (let s = 0; s < N; s++) { let e = 0;
    for (let i = 0; i < N; i += 2) { const b = B[(i + s) % N]; e += (A[i][0]-b[0])**2 + (A[i][1]-b[1])**2; if (e >= best) break; }
    if (e < best) { best = e; bs = s; } }
  return B.map((_, i) => B[(i + bs) % N]);
}
// in ready: S[k] = bestShift(S[k-1], orient(sample(d_k)))   (chain them in story order)
// in renderAt: pts = lerpP(S[k], S[k+1], EM(u)); fill = mixOK(col[k], col[k+1], EM(u));
```
Equal point counts make interpolation possible; arc-length spacing keeps points evenly spread so corners don't bunch; a shared winding plus the best start index stops the outline from flipping inside out or spinning. Build all of it in `ready`. `renderAt` only lerps. See `hero()` for the via-circle split and `smearDisc()` for the capsule.

## Pitfalls
- Shapes sampled by parameter instead of arc length bunch points at curves → always resample by length (N = 200–260).
- Opposite windings make the shape turn inside out mid-morph → orient all shapes by signed area.
- A star or heart morphed straight into a very different outline knots up → go via a circle and split the timing.
- RGB colour lerp goes muddy (blue → red = grey-violet sludge) → mix in OKLab.
- `ctx.arc(..., 0, 7, true)` (anticlockwise with an end past 2π) draws a partial circle → use exactly `2 * Math.PI` when you need a counter-clockwise ring.
- Sampling outlines with `getPointAtLength` inside `renderAt` is slow and non-deterministic across workers → sample once in `ready`.
- Big field wipes are full-frame colour changes → max ~2 per second, and avoid paper ↔ ink swaps on consecutive beats.
- Static grain is fine; animated grain makes the flat fields expensive to encode. Keep it at ≤ 8 % and static.

## Check on stills
- `sheet --strip 3.6:4.6 --fps 10`: star → circle → heart with no twist; the circle frame is round.
- `still --at 2.1`: the mid-morph colour is a clean violet, not grey.
- `still --at 0.1` and `--at 6.15`: capsule smears with soft ends on the fast moves.
- `still --at 7.9`: "Tidepool." with the hero as its full stop; the ink dot matches the type's weight.

Source: adapted from mg-styles-15 — https://github.com/Vincentwei1021/mg-styles-15/tree/main/demos/08-morph (MIT, Vincentwei1021). Written in our own words; no assets copied.
