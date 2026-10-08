# Made of Motion

A Helios port of **made-of-motion**, the 489-frame, 1440×1080 promo film from the fframes
repository ([dmtrKovalenko/fframes#193](https://github.com/dmtrKovalenko/fframes/pull/193),
MIT). It contains a handwritten opening, an electric star, thermal footage, a carousel of pixel
objects, 34,272 rotoscoped ink contours and a flying wordmark. There are two pages:

- **`composition.html`** reproduces the fframes film frame for frame. Rendered through Helios, it
  matches fframes' own output to the byte on nearly every frame (see [Fidelity](#fidelity)).
- **`enhanced.html`** draws the same frames, then grades them with extra shader passes:
  bloom with film halation, god rays from the star, refraction shockwaves at the ring
  collisions, heat haze on the thermal shots, light leaks on hard cuts, soft contact shadows
  under the pixel objects, lens chromatic aberration, gate weave and luma-aware grain.

> This example reproduces another engine's film exactly, so it is a fidelity reference. It
> is not a template for how a Helios video should look or be organized.

Both pages follow the Helios page contract: `window.renderAt(t)` draws the frame at `t`
seconds and depends on nothing else.

## Run it

The film's media (fonts, the pixel-object atlas, the hand heat field, the ink archives, the
portrait footage and the soundtrack) stay in the fframes repository. Fetch them, pinned to the
commit that merged #193 and checked against their SHA-256 hashes:

```bash
cd examples/made-of-motion
node scripts/fetch-assets.mjs            # or: --from <fframes checkout>/examples/made-of-motion
```

This writes `assets/` (about 76 MB) and decodes the portrait footage into lossless PNG frames
with ffmpeg. Then render:

```bash
helios render composition.html -o made-of-motion.mp4 \
  --width 1440 --height 1080 --fps 24 --duration 20.375 \
  --audio assets/soundtrack.m4a --preset slow --quality 16

helios render enhanced.html -o made-of-motion-enhanced.mp4 \
  --width 1440 --height 1080 --fps 24 --duration 20.375 \
  --audio assets/soundtrack.m4a --preset slow --quality 16
```

To preview a page, serve this folder over HTTP and call `renderAt(t)`, or use `helios still`
and `helios sheet`. A `file://` URL won't work.

## How it is built

| File | Port of (fframes) | What it does |
| --- | --- | --- |
| `src/film.js` | `lib.rs` | The 18 shots, the studio layers and the per-frame layer order |
| `src/anim.js` | `animation/*.rs` | `timeline!`, cubic-bezier and spring easings, in f32 |
| `src/objects.js`, `src/hero.js` | `objects.rs`, `hero.rs` | Camera-space choreography, ring excursions, impacts, feature cards |
| `src/flight.js`, `src/opening.js` | `flight.rs`, `opening.rs` | The letter flights and the opening typography |
| `src/ink.js` | `vector_ink.rs`, `ink.rs` | Rotoscoped ink per frame, dust, collision flares |
| `src/shaders.js`, `src/gl.js` | `shaders/*.sksl`, Skia | The eight shaders in GLSL, run on WebGL2 and composited onto the 2D canvas |
| `src/text.js` | usvgr text layout | HarfBuzz (WASM) shaping and glyph outlines, filled as paths |
| `src/libm.js` | glibc, Rust `libm` | `sinf`/`cosf`/`expf` as the Rust film computes them |
| `src/enhance.js` | none (new) | The enhanced grade |

fframes renders SVG trees with Skia, and Chrome's 2D canvas is also Skia, so the vector work
(ink contours, glyph outlines, rectangles, strokes) matches once the geometry is the same.
Getting byte-identical frames needed the rest to follow fframes exactly:

- **Text is drawn as outlines.** usvgr shapes each `<text>` with rustybuzz and fills the glyph
  paths, so the port shapes with HarfBuzz and follows usvgr's cluster, letter-spacing and
  anchor rules, rounding at the same steps.
- **Shaders use Skia's math, not GLSL's.** fframes runs its SkSL on Skia's CPU raster
  pipeline. There, `sin`, `exp` and `pow` are polynomial or bit-trick approximations, a
  multiply-add rounds twice, and SkSL rewrites `x / literal` as `x * (1 / f32(literal))`. The
  procedural grain is `fract(sin(huge) * 43758.5453)`, which turns any last-bit difference into
  a different pixel, so `shaders.js` reproduces those routines operation for operation. A zero
  uniform stops the GLSL compiler from constant-folding, re-associating or simplifying
  (`1 - (1 - x)` to `x`) anything Skia evaluates at run time. One example: Skia reads a
  negative float's bits as a signed integer in `log2`, so `pow(-x, 2.)` is `0`, and the star's
  background depends on that.
- **Layers blend the way Skia's 8888 blitter does.** Translucent shader layers (print grain,
  collision flares, object edges) read the canvas under them and do src-over in the shader,
  rounded half to even, so they round once, like Skia.
- **Images reach the shaders as fframes prepares them.** usvgr premultiplies with
  `(c * (a / 255) + 0.5) as u8`; the footage frames decoded by ffmpeg match fframes' decoder
  bit for bit.
- **Geometry is f32 with fframes' libm.** The choreography rounds to f32 at every step, like
  the Rust code. `sinf`/`cosf` follow glibc's FMA variant (rounding `Math.sin` to f32 disagrees
  with it on about 1% of inputs), and the spring easing uses the Rust `libm` crate's
  `expf`/`sinf`/`cosf`. One flipped bit in a rotation vector would move a pixel-art texel edge.
  Where fframes formats numbers into an SVG attribute (the flying letters'
  `translate(x y) rotate(a) scale(s)`), the port prints them the way Rust does and composes the
  matrix in f64 from the printed values, as usvgr parses them.
- **Layers sit where Skia puts them.** A group with opacity or a filter is a Skia `saveLayer`,
  and the layer's pixels start at the rounded-out corner of its bounds. Where that shifts
  anti-aliasing (the wordmark fading in), the port passes the same bounds. Blurred groups follow
  fframes' filter path: rasterize, run the SVG filter graph (into linear light, blur cropped to
  the filter region, back to sRGB) into an 8-bit image, then draw it with the group's opacity.
  Chrome builds that graph from an SVG `<filter>` with the same Skia code.
- **Undithered gradients are computed, not drawn.** Chrome dithers every canvas gradient, and
  Skia draws fframes' undithered one on its 8-bit pipeline, so the port computes that glow's
  pixels with the same integer arithmetic, using Chrome's coverage for the ellipse's edge.

## Fidelity

The reference is fframes itself at commit `81dd937`, rendered with Skia's CPU backend
(`SkiaCpuCtx`) because this machine has no GPU. In the fframes checkout, replace the
Metal/Vulkan context in `examples/made-of-motion/src/main.rs` with:

```rust
let gpu = fframes_skia_renderer::SkiaCpuCtx::new(MadeOfMotion::WIDTH, MadeOfMotion::HEIGHT);
let backend = SkiaFFramesRenderer::new_cpu(&gpu, SkiaPipelineConfig::default())?;
```

Then render every frame from both and compare:

```bash
cargo run --release -p made-of-motion -- frame $(seq -s, 0 488) -o /tmp/fframes-frames
helios still composition.html --width 1440 --height 1080 -o /tmp/helios-frames \
  --at $(node -e "console.log(Array.from({ length: 489 }, (_, n) => n / 24).join(','))")
python3 scripts/compare.py /tmp/fframes-frames /tmp/helios-frames
```

FIDELITY_RESULTS

## Credits

The film, its design, measurements, shaders, ink archives and media are from the fframes
example by Dmitriy Kovalenko (MIT). The film adapts a
[reference film](https://x.com/jordanarchivess/status/2107536262894915762) by its own
account; its soundtrack and portrait footage come from there and are fetched from fframes,
not redistributed here. HarfBuzz is vendored as harfbuzzjs 1.6.3 (MIT) in
`vendor/harfbuzzjs`.
