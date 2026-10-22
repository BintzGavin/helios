# Isometric Miniature

A pastel miniature world seen from a true isometric camera: no vanishing point, every tile the same size, and the world builds itself piece by piece while the camera only ever slides. **Not:** a perspective 3D scene with a tilted camera, or a flat 2:1 pixel-art map. Here the lighting is soft, the parts have rounded edges, and things *grow*.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| system and architecture explainers, app-feature tours, smart-city or campus stories, "how it all connects" data flows | three.js `OrthographicCamera` looking down (1,1,1) + spring-driven growth (Canvas 2D iso projection works for flat-shaded versions) | Medium–Hard | three.js from a pinned CDN (`three@0.160.0` via import map), one font |

Demo: [isometric.html](isometric.html) — `npx -y @helios-project/cli@latest render isometric.html -o isometric.mp4 --duration 9`. A 9×9 island flips in as a wave from its centre. Eight buildings grow in three parts, trees pop and cars loop. Then a central tower shoots up, its windows light in a sweep and cyan data links and rings fire. The camera slides and pulls back to a "HALCYON GRID" title lying on the ground plane. `verify` passes with and without `--gpu`.

## Look
- **Palette:** void gradient `#F1EEFC → #CFC6F3`; tiles lavender-white `#EEEAFB`; island slab `#B7AAEE` / `#A497E6`; pastels mint `#BDEBD4`, peach `#FFD6C4`, sky `#C9E3F8` and butter `#FFEFB0`; **indigo ink** `#3B3A8C` for type, the tower cap and cars; **one data cyan** `#2ED3EA`.
  - Rules: pastels are the *materials* (walls, parks, water, plaza). Indigo is the only dark, used for type and a few anchors. Cyan is reserved for data: links, pulses, rings, the beam and the title underline.
  - Never use saturated primaries or pure black, and never put cyan on a building surface.
  - Alternative "night" palette: void `#1E1B4B`, tiles `#3A3577`, lit windows `#FFE08A`, data cyan unchanged.
- **Type:** a geometric grotesk (Space Grotesk 700 for the title, 500 with +18 px tracking for the subline). The title is **set on the iso ground plane** as a texture, so it shares the world's skew instead of floating as a flat overlay. The subline sits at ~40 % of the title size with a short cyan rule. HUD labels, if any, are small, in indigo, attached to objects by short leader lines.
- **Materials & texture:** matte clay. `MeshLambertMaterial` on rounded boxes (`RoundedBoxGeometry`, radius 0.04–0.12), a strong hemisphere light (sky white over a lavender ground) plus one soft directional "sun" with PCF soft shadows, and no specular. Windows are small unlit-material boxes, so they glow without bloom. The whole world sits on a layered, floating slab in an empty pastel void.

## Motion
- **Tiles:** flip 180° about a random horizontal axis into place, 0.32 s each, ease-out-back (s ≈ 2.2) with a 0.5-unit hop, delayed **0.2 s per tile of distance from the centre**. The wave is already moving at frame 0.
- **Buildings grow in three parts:**
  1. The slab drops from +1.4 units in 0.16 s (ease-in).
  2. The walls scale Y from 0 on a damped spring (ζ = 0.61, ω = 14.8 rad/s, which gives **~9 % overshoot peaking ~8 frames in**), pivoting at the base.
  3. The roof cap lands **0.08–0.1 s (2–3 frames) later**, riding the wall top and dropping its last 0.7 units with ease-out-back.
- Neighbours start 0.3 s apart. Trees and props pop on a looser spring (ζ 0.45, ω 22).
- **Life:** cars loop the ring road at constant speed, turbine blades spin, data pulses ride their arcs. All of it is `f(t)` with `% 1`.
- **Camera:** parallel slides along screen-right `(1,0,−1)` and the ground's "down" axis `(1,0,1)`, plus orthographic zoom (`camera.zoom`) for push-ins and pull-backs, all eased in-out cubic over 1.5–6 s. **Never rotate the camera, and never switch to perspective.**
- **Parallax:** fake it in ortho by offsetting layers against the slide. Near clouds move ~1.35× the island and far islets ~0.6×.
- Transitions: build-on and pull-back only. No cuts inside the world.

## Signature checklist
1. Projection is **true isometric**: the camera sits on the (1,1,1) diagonal (35.26° elevation, 45° azimuth) with an orthographic lens, so parallel edges stay parallel and no camera rotation ever appears.
2. Tiles enter as **a wave from the centre**, with each tile delayed by its distance and visibly flipping or hopping.
3. Every building grows in **3 parts: slab, then walls scaleY with ~9 % overshoot, then roof 2–3 frames later**.
4. Palette: **4–5 pastels + one indigo ink + one data cyan**. The cyan appears only on data elements.
5. Soft shadows and rounded edges throughout. No hard black outlines and no specular highlights.
6. Camera moves are **slides and ortho zooms only**, with ≥ 2 parallax layers moving at different rates.
7. The title or labels lie **on the iso plane**, not as a screen-flat overlay.

## Native moves
- **Build-on from nothing.** An empty slab becomes a city tile by tile and floor by floor, so the build order *is* the explanation. *Fits:* onboarding a system; a product's components; a company growing.
- **The hero growth (peak).** The tallest element shoots up on the spring overshoot while every window lights in a sweep, data links snap on, and rings and a beam fire up its axis (here at 5.35–6.3 s of 9). *Fits:* "and this is the core"; launch of the main service; a metric crossing a line.
- **Pull-back to the floating island.** A slow ortho zoom-out reveals the whole miniature in its void, with the title lying on the ground beside it. *Fits:* the end card; "everything at once"; a map of the ecosystem.

## Core technique
```js
// true isometric: ortho camera on the (1,1,1) diagonal; slides translate target AND camera together
const camera = new THREE.OrthographicCamera(-FR * W / H, FR * W / H, FR, -FR, 1, 200);
const ISO = new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(40);
const RIGHT = new THREE.Vector3(1, 0, -1).normalize();          // screen-right on the ground plane
function setCamera(t) {
  const target = RIGHT.clone().multiplyScalar(slide(t));         // parallel slide, never a rotation
  camera.position.copy(target).add(ISO); camera.lookAt(target);
  camera.zoom = zoom(t); camera.updateProjectionMatrix();         // push / pull = ortho zoom
}
// damped spring 0→1 (ζ .61, ω 14.8 ≈ 9 % overshoot); walls are translated so their base is at y=0
function spring(tau, w = 14.8, z = .61) { if (tau <= 0) return 0; const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * tau) * (Math.cos(wd * tau) + z * w / wd * Math.sin(wd * tau)); }
const tau = t - b.t0, s = spring(tau - .12);
b.slab.position.y = .05 + 1.4 * (1 - clamp(tau / .16) ** 2);   // 1. slab drops
b.walls.scale.y = Math.max(.001, s * b.hgt);                     // 2. walls grow, overshoot
b.roof.position.y = .1 + s * b.hgt + .7 * (1 - outBack(clamp((tau - .2) / .12)));  // 3. roof lands ~3 frames later
renderer.render(scene, camera);                                  // every property set from t, then one draw
```
Build every mesh at load. In `renderAt`, set every transform, visibility and colour from `t`, then render once. The renderer uses `preserveDrawingBuffer: true` and `setPixelRatio(1)`. Growth is never tweened: the springs are closed-form functions of time since each part's start, so any frame can be rendered alone. See `setCamera`, the tile loop and the building loop in the demo.

**Advanced: accumulation renderer.** For a premium finish, render each output frame as N (8–32) sub-renders and average them in a float target. Each sub-render takes a sub-pixel camera jitter (anti-aliasing), a jittered sun direction (soft area shadows), a sub-frame time `t + k/(N·fps)·shutter` (true motion blur) and a rotated SSAO kernel (ambient occlusion). It costs N× the render time, but it's what makes clay-render isometrics look like an offline renderer. Keep every jitter seeded by the sub-sample index so `verify` still passes.

## Pitfalls
- Using a `PerspectiveCamera` "far away" or rotating the camera for drama → the iso grid breaks. Stay orthographic, and move only by translating the target and camera together.
- Scaling a wall mesh whose origin is at its centre → it grows from the middle. Translate the geometry so the base is at y = 0 (`geometry.translate(0, h/2, 0)`), and counter-scale children such as windows.
- Tweening with GSAP and reading the state back, or using `clock.getDelta()` → frames depend on history. Use closed-form springs of `t − t0` and set everything every frame.
- Leaving objects at scale 0 → some drivers warn or produce NaN normals. Clamp to 0.001 and toggle `visible`.
- WebGL in headless capture: create the renderer with `preserveDrawingBuffer: true` and fixed `setPixelRatio(1)`, and render inside `renderAt`. If plain `verify` misbehaves on your machine, run it with `--gpu`. This demo passes both.
- Shadows too dark or grey on pastel → raise the hemisphere light (≈ 2.4) and lower the sun (≈ 1.6), and tint the hemisphere ground colour lavender so the shade stays in palette.
- Thin 1-px details (turbine blades, data tubes) shimmer in H.264 → keep them ≥ 2 px on screen at the final zoom, or render with `--preset medium`.

## Check on stills
- `still --at 0,0.75`: the tile wave is visibly radiating from the centre, with tiles mid-flip at frame 0.
- `sheet --strip <b.t0>:<b.t0+0.6> --fps 30` on one building: slab first, walls overshooting ~9 % around frame 8, roof arriving 2–3 frames after the walls start.
- Compare two stills from a camera move: grid lines keep the same angles (no rotation) and clouds shift more than the island.
- Final hold: the title reads on the ground plane, cyan appears only on data elements, and cars, pulses and the turbine still move.

Source: adapted from mg-styles-15 — https://github.com/Vincentwei1021/mg-styles-15/tree/main/demos/03-isometric (MIT, Vincentwei1021). Written in our own words; no assets copied.
