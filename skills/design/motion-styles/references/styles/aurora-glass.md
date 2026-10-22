# Aurora Glass

Slow pools of violet, blue and cyan light drifting in near-black space, seen through frosted glass cards that rise into place. **Not:** a rainbow mesh gradient wallpaper, nor glassmorphism cards on a flat purple fill.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| AI and tech launches, calm product UI, wellness and focus apps, premium feature reveals | WebGL2 Gaussian-blob shader + DOM cards with `backdrop-filter` (dom mode) | Medium | an OFL UI sans (Inter, Manrope) |

Demo: [aurora-glass.html](aurora-glass.html) — `npx -y @helios-project/cli@latest render aurora-glass.html -o aurora-glass.mp4 --duration 8` (default dom mode, so the cards are captured as the browser composites them)

## Look
- **Palette:** base `#04050E` (near-black blue, the valleys), lights violet `#7B3FF2`, blue `#2F5BFF`, cyan `#1FC8E8`, magenta `#C23FE0`, indigo `#3B2FB8`, periwinkle `#5C6CFF`. UI white at 94 % (titles) and 60 % (secondary), accent gradient `#7B5CFF → #4FD8F0` for active controls only.
  - Rules: **adjacent hues only**, a 120° slice of the wheel from magenta through violet and blue to cyan. Never warm colours, never green, never white light. Pools must leave dark valleys: at least ~30 % of the frame stays close to the base. Overlaps blend hue, they don't add up to white.
  - Alternative slice: teal `#14B8A6`, cyan `#22D3EE`, blue `#3B82F6`, deep `#1E3A8A` on `#03070D`.
- **Type:** one UI sans, 400/500/600 (demo: Inter). Headline 60 px (≈ 0.055 H) at −1.5 px tracking, body 26 px at 1.5 line height, labels 19–22 px. All type lives *on* cards, white, left-aligned; no type floats on the light.
- **Materials & texture:** light and glass. Light = soft Gaussian fields with ~3.5 % noise. Glass = `backdrop-filter: blur(38px) saturate(150%)`, a faint top-left-to-bottom-right white gradient (16 % → 5 %), a 1 px white border at 22 %, a 1 px inner top highlight, a long soft shadow, radius 30 px.

## Motion
- **The light moves slowly, always.** Each blob drifts on a closed loop (figure-eight: `x = sin(a)`, `y = sin(2a + φ)`) with a period of **20–40 s**. In an 8 s film a blob covers a third of its loop; nothing in the background ever eases in or out.
- **One curve:** sine in-out (`0.5 − 0.5·cos(πu)`), for everything in the foreground.
- **Cards rise 8 px while fading in** over ~1.1 s, staggered 0.4 s. Once in, they float ±2 px on a 6.5 s sine, each out of phase.
- Controls move like the UI they are: a toggle slides in 0.6 s, a slider eases over 2.2 s, numbers update by rounding a value derived from `t`.
- **Hero beat:** the light swells (+25 % gain, a Gaussian bump ~1 s wide), a specular sheen crosses the glass once, an orb glows.
- Banned: bounces, overshoot, fast cuts, camera shake, particles bursting. Smooth 30 fps.

## Signature checklist
- [ ] Every blob drifts at ≤ ~60 px/s on a 20–40 s loop; between stills 2 s apart the field shifts gently, never jumps or settles to a stop.
- [ ] Hues stay within magenta–violet–blue–cyan; no muddy grey where pools overlap.
- [ ] No visible banding in the dark gradients (check a crop at 100 %: fine noise, no contour steps).
- [ ] Cards travel exactly ~8 px on entrance, with opacity, on a sine curve; nothing scales.
- [ ] Glass visibly blurs what's behind it (a pool edge behind a card is soft, the same edge outside it is softer still but continuous).
- [ ] The frame keeps dark corners and valleys (vignette plus coverage curve).
- [ ] The end hold drifts: light still moving, cards floating ±2 px.

## Native moves
- **The light answers.** On the key action (a toggle on, a "done"), the whole field brightens and a sheen passes across the glass, as if the UI and the room share one light. The demo's peak at 5.0–5.6 s. *Fits:* an AI finishing a task; a mode switching on; a confirmation that matters.
- **Glass over glass.** A smaller card overlaps a larger one; the blur doubles where they stack, giving depth with no 3D. *Fits:* a notification over an app; settings over content; a summary over detail.
- **Rising out of the dark.** The film opens with the light already moving at 30 % and rising, and the cards surface from it one by one. *Fits:* "good evening" moments; calm onboarding; a product that stays out of the way.

## Core technique
```glsl
uniform vec2 uB[6]; uniform vec3 uC[6]; uniform float uR[6]; uniform float uGain, uSeed; out vec4 o;
void main(){
  vec2 p = vec2(gl_FragCoord.x, 1080. - gl_FragCoord.y);
  vec3 acc = vec3(0.); float ws = 0.;
  for (int i = 0; i < 6; i++){ vec2 d = (p - uB[i]) / uR[i]; float g = exp(-dot(d, d)); acc += uC[i] * g; ws += g; }
  vec3 hue = acc / max(ws, 1e-4);                    // normalised mix: overlaps blend hue, never sum to mud/white
  float cov = pow(1. - exp(-ws * 1.2), 1.5);          // light amount, with deep valleys between pools
  vec2 q = p / vec2(1920., 1080.) - .5;
  vec3 col = mix(vec3(.016, .02, .055), hue, cov * .95) * uGain * (1. - 1.2 * dot(q, q));
  col += (hash(p + uSeed) - .5) * .035;              // ~3.5 % noise against banding
  o = vec4(col, 1.);
}
```
```js
// JS, each frame: blob centres on closed figure-eight loops, periods 20–40 s
gl.uniform2fv(uB, BLOBS.flatMap(b => { const a = 2 * Math.PI * t / b.P + b.ph; return [b.x + b.ax * Math.sin(a), b.y + b.ay * Math.sin(2 * a + .6)]; }));
```
Dividing the colour sum by the weight sum separates *which hue* from *how much light*, so two pools overlap as a clean blend instead of a grey or blown-out patch; the coverage curve then decides brightness and keeps the valleys dark. Create the context with `preserveDrawingBuffer: true`, compile at load, set every uniform from `t` and draw inside `renderAt`.

**Other route (no WebGL):** a Canvas 2D page of 5–6 large radial gradients (each `createRadialGradient` with 3–4 stops fading to transparent, drawn with `globalCompositeOperation = 'screen'` at 40–60 % alpha), a static seeded grain tile on top, and the same DOM `backdrop-filter` cards. It's simpler and runs anywhere, but overlaps brighten toward white and the gradients band more, so keep alphas low and the grain on.

## Pitfalls
- Additive blob mixing turns overlaps white or grey-brown → normalise by the weight sum, then apply coverage.
- Light everywhere looks like a wallpaper → smaller radii, a coverage power > 1 and a vignette, so a third of the frame stays dark.
- Banding in 8-bit dark gradients, made worse by the encoder → add 3–4 % noise in the shader (seeded by the frame, so it's deterministic) and render the final with `--preset medium`.
- Blobs that ease in and out look like a screensaver → closed loops with long periods; never key them.
- `backdrop-filter` needs the default dom mode; `--mode canvas` captures only the canvas and the cards vanish.
- Blank or stale WebGL frames → `preserveDrawingBuffer: true` and draw inside `renderAt`, not once at load.
- Text placed directly on the light loses contrast as pools drift behind it → all type on glass.
- Determinism: no CSS transitions or `will-change` on the cards; set opacity and transform from `t` every frame.

## Check on stills
- `sheet --at 0,1.5,5.3,7.9`: light already visible on frame 0; dark valleys and corners in every frame.
- `sheet --strip 4.9:5.9 --fps 10`: toggle slides, light swells, sheen crosses the cards, nothing bounces.
- `sheet --at 7.9 --crop 1000,500,800,500`: fine noise in the gradient, soft blur behind the card, crisp white type.
- `sheet --every 2 --duration 8`: blob positions shift gradually between stills; no sudden jumps.

Source: adapted from mg-styles-15 — https://github.com/Vincentwei1021/mg-styles-15/tree/main/demos/12-aurora-glass (MIT, Vincentwei1021). Written in our own words; no assets copied.
