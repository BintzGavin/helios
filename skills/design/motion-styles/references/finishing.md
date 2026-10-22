# Finishing stack

Finishing is what you put on the picture after it is drawn: grain, dither, vignette, glow, paper, ink, screen and tape. It decides whether a clean vector frame reads as film, print or video. Every piece below is a pure function of `t`: textures are built from a seeded RNG in `ready`, and anything that changes over time is picked from `Math.floor(t * fps)`.

Rules that apply to the whole stack:

- **Finish last, in this order:** scene → glow → paper and ink (or the CRT/film pass) → vignette → grain → dither. Grain and dither go last so nothing smooths them away.
- **Keep type off the finished layer** unless the style says the type lives in the medium (VHS captions get the tape, print titles get the ink). Otherwise draw text on top after the finish so it stays crisp.
- **Encode cost is real.** Noise that changes on every pixel in every frame can't be compressed, so heavy fresh grain can make a file several times larger. Step the grain at 12 fps, keep the amount low, and render the final file with `--preset medium`.
- **Fine detail dies in the encode.** x264 with 4:2:0 chroma keeps colour at half resolution and averages away detail of 1–3 px. Halftone periods, scanline pitch and mask stripes need ≥ 3 px (luma) and ≥ 7 px for coloured dots.
- **Run `helios verify` after adding any pass**, especially WebGL ones (see the skeleton below).

Shared helpers used by the snippets:

```js
const W = 1920, H = 1080;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function mulberry32(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mk = (w, h, opts) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.g = c.getContext('2d', opts); return c; };
```

## 1. Film grain (deterministic, encode-friendly)

Build a few grey noise tiles once, then on each grain frame pick one and shift it by a hashed whole-pixel offset. Overlay at 4–8 % alpha. `GRAIN_FPS = 12` gives a filmic boil and costs far less bitrate than per-frame grain; use `Math.floor(t * FPS)` (every frame) only for a video or digital-noise look.

```js
const GRAIN_FPS = 12, TILE = 256;
let grainPats = [];
function buildGrain(ctx, seed = 7, n = 4) {               // call inside ready, with the context you draw grain on
  const rnd = mulberry32(seed);
  grainPats = Array.from({ length: n }, () => {
    const c = mk(TILE, TILE), img = c.g.createImageData(TILE, TILE), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = 128 + (rnd() + rnd() + rnd() - 1.5) * 120;  // soft bell-shaped values around mid-grey
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    c.g.putImageData(img, 0, 0);
    return ctx.createPattern(c, 'repeat');
  });
}
function grain(ctx, t, amount = 0.07) {
  const f = Math.floor(t * GRAIN_FPS + 1e-4);              // new grain 12×/s
  const ox = Math.floor(hash(f * 2 + 1) * TILE), oy = Math.floor(hash(f * 2 + 2) * TILE);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = amount;
  ctx.fillStyle = grainPats[f % grainPats.length];
  ctx.translate(-ox, -oy); ctx.fillRect(ox, oy, W, H);
  ctx.restore();
}
```

For coarser grain, build the tile at 128 px and draw the pattern scaled ×2. In a shader, the same idea is `h(floor(px / 1.5) + floor(t * 12.) * 17.)`. Grain hides banding a little but is not a fix for it; that is the next step.

## 2. Triangular dither against banding

Slow dark gradients (night skies, vignettes, glows on black) step visibly at 8 bits, and the encoder makes the steps worse. Add ±1/255 of triangular noise (the difference of two uniform randoms) *before* the value is rounded to 8 bits.

- **Shader:** last line before output: `c += (h(P) - h(P + 7.1)) / 255.;`. A static pattern compresses better than one that changes every frame.
- **Canvas 2D:** Chrome rounds gradients to 8 bits while it draws them, so compute big static gradients yourself once in `ready`:

```js
function ditheredGradient(w, h, top, bottom, seed = 3) { // colours as [r,g,b] 0..255
  const c = mk(w, h), img = c.g.createImageData(w, h), d = img.data, rnd = mulberry32(seed);
  for (let y = 0; y < h; y++) {
    const k = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, n = rnd() - rnd();       // triangular noise in (-1, 1) LSB
      for (let ch = 0; ch < 3; ch++) d[i + ch] = top[ch] + (bottom[ch] - top[ch]) * k + n + 0.5;
      d[i + 3] = 255;
    }
  }
  c.g.putImageData(img, 0, 0);
  return c;
}
```

## 3. Vignette

Multiply a tinted radial gradient. A tint that leans toward the shadow colour (warm brown for print, violet for neon) looks better than black. It is a slow gradient, so dither after it.

```js
function vignette(ctx, strength = 0.45, tint = '20,10,30') {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, `rgba(${tint},0)`); g.addColorStop(1, `rgba(${tint},${strength})`);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
```

## 4. Double glow

Real glow has a tight halo and a wide one. Draw only the emitters (neon strokes, lamps, hot type) onto their own layer, blur two copies at half resolution (which is cheaper and softer), screen both over the frame, then draw the sharp core on top.

```js
const glowL = mk(W, H), glowHalf = mk(W / 2, H / 2);
function doubleGlow(ctx, tight = 6, wide = 30, a1 = 1, a2 = 0.8) { // glowL.g already holds this frame's emitters
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (const [r, a] of [[tight, a1], [wide, a2]]) {
    const h = glowHalf.g; h.setTransform(1, 0, 0, 1, 0, 0); h.clearRect(0, 0, W / 2, H / 2);
    h.filter = `blur(${r / 2}px)`; h.drawImage(glowL, 0, 0, W / 2, H / 2); h.filter = 'none';
    ctx.globalAlpha = a; ctx.drawImage(glowHalf, 0, 0, W, H);
  }
  ctx.globalAlpha = 1; ctx.drawImage(glowL, 0, 0);          // the sharp core last
  ctx.restore();
}
```

Clear `glowL` at the start of every frame. For a hotter glow, draw the tight pass twice or use `'lighter'` instead of `'screen'`, which can blow out to white. Keep the core a pale tint of the glow colour (`#ffd0f0` inside a `#ff3fc8` glow), not pure white.

## 5. Paper: multiply and tooth

Paper is a base colour × soft mottling × fibres × per-pixel tooth. Build it once, draw the art, then multiply the paper over everything. Printed ink then takes on the paper's texture.

```js
function makePaper(w, h, seed = 11, base = '#f2ebdd') {
  const c = mk(w, h), g = c.g, rnd = mulberry32(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const m = mk(64, 36), md = m.g.createImageData(64, 36);  // tiny noise, scaled up = soft blotches
  for (let i = 0; i < md.data.length; i += 4) { const v = 236 + rnd() * 19; md.data.set([v, v, v, 255], i); }
  m.g.putImageData(md, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.imageSmoothingQuality = 'high'; g.drawImage(m, 0, 0, w, h);
  g.globalCompositeOperation = 'source-over'; g.lineWidth = 0.7;
  for (let i = 0; i < w * h / 900; i++) {                 // fibres
    const x = rnd() * w, y = rnd() * h, a = rnd() * Math.PI, l = 4 + rnd() * 16;
    g.strokeStyle = `rgba(110,90,60,${0.04 + rnd() * 0.06})`;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const tooth = mk(256, 256), td = tooth.g.createImageData(256, 256);          // per-pixel tooth
  for (let i = 0; i < td.data.length; i += 4) { const v = 235 + rnd() * 20; td.data.set([v, v, v, 255], i); }
  tooth.g.putImageData(td, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = g.createPattern(tooth, 'repeat'); g.fillRect(0, 0, w, h);
  return c;
}
```

Paper belongs to the world, not the lens. If the camera moves over a printed sheet, move the paper with the sheet. For stop-motion "every frame is a new sheet", build 2–3 sheets and pick one by `Math.floor(t * 12) % 3`. Ink that skips on rough paper (dry brush) is a `'destination-out'` pass of sparse specks on the ink layer before you composite it.

## 6. WebGL post pass skeleton

When a pass needs per-pixel maths (CRT, press, film), draw the scene on a hidden 2D canvas and run one fragment shader over it into the visible WebGL canvas. Build once and draw every frame:

```js
function makePost(out, fragSrc) {                           // returns draw(srcCanvas, uniforms)
  const gl = out.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, alpha: false });
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());       // one triangle that covers the screen
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
    [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);             // canvas row 0 -> top of the screen
  const U = {}; const u = (n) => (U[n] ??= gl.getUniformLocation(prog, n));
  return function draw(srcCanvas, uniforms = {}) {         // call once per frame, after drawing the scene
    gl.viewport(0, 0, out.width, out.height);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
    gl.uniform1i(u('uSrc'), 0); gl.uniform2f(u('uRes'), out.width, out.height);
    for (const [k, v] of Object.entries(uniforms)) Array.isArray(v) ? gl[`uniform${v.length}fv`](u(k), v) : gl.uniform1f(u(k), v);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
}
// const scene = mk(W, H, { willReadFrequently: true }), post = makePost(canvasEl, FRAG);  renderAt: draw scene.g, post(scene, {...})
```

**History dependence:** uploading a 2D canvas to WebGL is a readback, and Chrome may move that canvas between GPU and CPU rasterisation. Antialiasing then depends on which frames rendered before. Create the source canvas with `{ willReadFrequently: true }`, set every uniform from `t` on every frame, keep the scene canvas out of the DOM so the page holds one visible canvas, and run `helios verify`.

## 7. Ink plates, misregistration and the press shader

Draw each ink as one colour channel of a 2D "plate" canvas: R = plate 0, G = plate 1, B = plate 2, with 255 meaning solid ink. A plain `source-over` fill writes all three channels, so it **knocks out** what's underneath (`rgb(255,0,255)` = inks 0 and 2 only). `'lighter'` adds to its own channel, so `rgb(0,255,0)` with `'lighter'` **overprints** ink 1 on top. The shader shifts each plate by its own offset, screens it (see 8) and multiplies each ink over the paper.

```js
const PRESS_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc; uniform vec2 uRes;                  // uSrc: R,G,B = density of plates 0,1,2
uniform vec2 uOff0, uOff1, uOff2;                           // per-plate misregistration, px
uniform vec3 uInk0, uInk1, uInk2, uPaper;
uniform float uSheet, uPeriod;                              // uSheet: changes per "print" (12 fps or per shot)
out vec4 o;
float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float plate(int i, vec2 q){                                 // q: canvas px (y down)
  vec4 s = texture(uSrc, vec2(q.x, uRes.y - q.y) / uRes);  // makePost flips Y on upload
  return i == 0 ? s.r : i == 1 ? s.g : s.b;
}
float screen(vec2 q, float ang){                            // halftone spot function, 0..1
  float c = cos(ang), s = sin(ang); vec2 g = mat2(c, s, -s, c) * q / uPeriod;
  return 1. - (cos(6.2831853 * g.x) + cos(6.2831853 * g.y) + 2.) * .25;
}
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec3 col = uPaper * (.965 + .035 * (vn(px * vec2(.9, .25)) * .5 + vn(px * .05) * .5));   // fibre + mottle
  vec2 off[3] = vec2[](uOff0, uOff1, uOff2); vec3 ink[3] = vec3[](uInk0, uInk1, uInk2);
  float ang[3] = float[](.26, 0., 1.31);                    // 15°, 0°, 75° screens
  for (int i = 0; i < 3; i++) {
    vec2 q = px - off[i];
    float d = plate(i, q);
    if (d < .002) continue;
    float spot = screen(q, ang[i]) + (h(floor(q * .9) + uSheet + float(i) * 3.1) - .5) * .12;
    float cov = max(smoothstep(spot - .07, spot + .07, d), smoothstep(.9, 1., d) * .96);   // dots, solids stay solid
    cov *= 1. - .7 * step(.96, h(floor(q * .55) + float(i) * 7.7 + uSheet * 1.3)) * smoothstep(.4, 1., d); // tooth
    cov *= .84 + .16 * vn(vec2(q.x * .025, q.y * .002) + float(i) * 11.);                 // ink streaks
    col *= mix(vec3(1.), ink[i], cov);                     // each ink multiplies over paper and the inks below
  }
  o = vec4(col, 1.);
}`;
```

Drive it from `t`: `const sheet = Math.floor(t * 12 + 1e-4)`, then offsets such as `[Math.sin(sheet * 0.9 + i * 2) * 1.5, Math.cos(sheet * 0.7 + i) * 1.5]` px. Misregistration of 1–4 px reads as print; past 6 px it reads as a glitch. Snapping all plates into register on a beat makes a strong hero moment. Pass inks as 0–1 RGB (`[0, 120, 191].map(v => v / 255)`).

## 8. Halftone dots

The dot radius comes from tone. Grow area, not radius, so that 50 % tone covers about 50 %: `r ∝ sqrt(k)`. **Period ≥ 7 px** (8–12 px is safe at 1080p): smaller coloured dots lose their colour in 4:2:0 and turn to mush or moiré in x264. Keep the screen fixed in paper space and move the content under it, as a press does. A dot grid that slides at sub-pixel speed shimmers. In WebGL, use `screen()` from the press shader. In 2D, with an analytic tone field:

```js
function halftone(ctx, tone, x0, y0, w, h, period = 10, angle = 0.26, ink = '#1b3fa0') {
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  ctx.fillStyle = ink; ctx.translate(x0 + w / 2, y0 + h / 2); ctx.rotate(angle);
  const R = Math.hypot(w, h) / 2, ca = Math.cos(angle), sa = Math.sin(angle);
  for (let v = -R; v <= R; v += period) for (let u = -R; u <= R; u += period) {
    const sx = x0 + w / 2 + u * ca - v * sa, sy = y0 + h / 2 + u * sa + v * ca;  // dot centre on screen
    const k = clamp(tone(sx, sy));                         // 0 = paper, 1 = solid
    if (k < 0.02) continue;
    ctx.beginPath(); ctx.arc(u, v, period * 0.5 * Math.sqrt(k) * 1.12, 0, 7); ctx.fill();
  }
  ctx.restore();
}
```

## 9. CRT / VHS pass

Tape stores luma sharp and chroma at a fraction of the bandwidth. So keep Y crisp, box-blur Cb/Cr horizontally and shift them right a couple of pixels. Then add 3 px scanlines that thin out in highlights, a faint RGB aperture grille, corner falloff, per-line jitter and a slow rolling band. Use it with `makePost`: `post(scene, { uFrame: Math.floor(t * FPS + 0.5), uScan: 0.2, uMask: 0.06, uBleed: 7, uShift: 2, uNoise: 0.02, uRoll: 0.004, uVig: 0.3 })`.

```js
const CRT_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc; uniform vec2 uRes;
uniform float uFrame, uScan, uMask, uBleed, uShift, uNoise, uRoll, uVig;
out vec4 o;
float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 toYC(vec3 c){ float y = dot(c, vec3(.299, .587, .114)); return vec3(y, (c.b - y) * .564, (c.r - y) * .713); }
vec3 toRGB(vec3 v){ return vec3(v.x + 1.403 * v.z, v.x - .344 * v.y - .714 * v.z, v.x + 1.773 * v.y); }
void main(){
  vec2 P = gl_FragCoord.xy, s = 1. / uRes, uv = P * s;
  float line = floor((uRes.y - P.y) / 2.);                       // 2-px "video lines"
  uv.x += (h(vec2(line, uFrame)) - .5) * uNoise * 3. * s.x;     // per-line horizontal jitter
  float Y = toYC(texture(uSrc, uv).rgb).x;                       // luma: sharp
  vec2 C = vec2(0.);                                             // chroma: wide box blur, shifted right
  for (int i = -4; i <= 4; i++)
    C += toYC(texture(uSrc, uv + vec2((float(i) * uBleed / 8. - uShift) * s.x, 0.)).rgb).yz;
  vec3 c = toRGB(vec3(Y, C / 9.));
  float band = exp(-pow((fract(1. - uv.y + uFrame * uRoll) - .5) * 10., 2.));   // slow rolling bright band
  c *= 1. + .06 * band;
  float L = dot(clamp(c, 0., 1.), vec3(.3, .59, .11));
  c *= 1. - uScan * (.5 - .5 * cos(6.2831853 * P.y / 3.)) * (1. - .6 * L);   // 3-px scanlines, thinner in highlights
  float k = mod(floor(P.x), 3.);                                 // aperture grille: R,G,B columns
  c *= mix(vec3(1. - uMask), vec3(1. + 2. * uMask), vec3(equal(vec3(k), vec3(0., 1., 2.))));
  vec2 d = uv - .5;
  c *= 1. - uVig * dot(d, d) * 2.2;                              // corner falloff
  c += (h(P + uFrame * 17.) - .5) * uNoise;                      // signal noise (changes every frame)
  c += (h(P * 1.37) - h(P * 1.37 + 7.1)) / 255.;                 // static triangular dither
  o = vec4(clamp(c, 0., 1.), 1.);
}`;
```

The grille's colour does not survive 4:2:0, which leaves a fine luma texture, so keep `uMask` ≤ 0.08. If the video will mostly be watched small (phones), use a 4 px scanline period. Tracking tears, power-on lines and head-switching noise are extra uniforms on the same pass. Fire them on cues and keep each under a third of a second.

## 10. Film damage

Apply this over the finished frame at 24 fps (`--fps 24`). It combines gate weave (two slow sines plus a per-frame hash, ±2 px), flicker (±4–5 % brightness, which stays well under the 10 % flash threshold), vertical scratches that each live a few frames, and dust that is new every frame.

```js
function filmDamage(ctx, src, t, k = 1, fps = 24) {
  const f = Math.floor(t * fps + 1e-4);
  const wx = (Math.sin(f * 0.31) * 0.6 + Math.sin(f * 0.113 + 1.3) * 0.8 + (hash(f) - 0.5) * 0.5) * 1.4 * k;
  const wy = (Math.sin(f * 0.23 + 0.7) * 0.7 + Math.sin(f * 0.071 + 2.1) * 0.9 + (hash(f + 99) - 0.5) * 0.6) * 1.6 * k;
  const flick = 1 + ((hash(f + 7) - 0.5) * 0.08 + Math.sin(f * 1.9) * 0.02) * k;   // keep under ±10 %
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.filter = `brightness(${flick})`; ctx.drawImage(src, wx, wy); ctx.filter = 'none';
  for (let i = 0; i < 4; i++) {                            // scratches: each lives 5..14 frames
    const life = Math.floor((f + i * 17) / (5 + i * 3));
    if (hash(life * 3.1 + i * 7.7) > 0.45 * k) continue;
    const x = hash(life * 1.7 + i) * W + Math.sin(f * 0.37 + i) * 3, dark = hash(life * 9.1 + i) > 0.6;
    ctx.fillStyle = dark ? 'rgba(10,8,6,.45)' : 'rgba(250,245,230,.55)';
    for (let y = 0; y < H; y += 120) if (hash(life + i * 5 + y) > 0.2) ctx.fillRect(x, y, 0.8 + hash(life + i) * 1.4, 120);
  }
  const nDust = Math.floor(hash(f * 1.3) * 7 * k);         // dust: fresh every frame
  for (let i = 0; i < nDust; i++) {
    const x = hash(f * 7.1 + i * 3.3) * W, y = hash(f * 3.7 + i * 5.9) * H, r = 1 + hash(f + i * 8.1) ** 2 * 4;
    ctx.fillStyle = hash(f + i * 11.7) < 0.35 ? 'rgba(240,232,215,.7)' : 'rgba(12,10,8,.75)';
    ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.5 + hash(i + f) * 0.5), hash(i) * 3, 0, 7); ctx.fill();
  }
  ctx.restore();
}
```

`Math.floor((f + i * 17) / (5 + i * 3))` gives each scratch its own lifetime. It holds still, wobbles 3 px, then jumps somewhere new. Weave moves the image under a fixed gate, so the black edge that shows is part of the look. Add grain after this pass so the grain doesn't weave.

## 11. Die-cut white outline

This gives a sticker or scissor rim around any shape or image with transparency. Draw the art 24–28 times on a circle of radius `r` (which dilates its alpha), fill that with the rim colour using `source-in`, then draw the art back on top. Build it in `ready` and give it a drop shadow when you place it.

```js
function dieCut(img, r = 10, col = '#fffaf0', n = 28) {
  const p = Math.ceil(r) + 2, c = mk(img.width + 2 * p, img.height + 2 * p), g = c.g;
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.drawImage(img, p + Math.cos(a) * r, p + Math.sin(a) * r); }
  g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over'; g.drawImage(img, p, p);
  c.pad = p; return c;
}
```

Use n ≥ 24 for r ≤ 14 px; with fewer copies, scallops appear on convex corners.

## 12. Chrome / extruded text (Canvas 2D)

Chrome is a gradient with a hard horizon in the middle: sky above, a dark band, warm ground below. Put a dark outline and a thin rim under it and an extrusion of stacked offset copies behind it. Prerender it once after the font loads. The only thing that changes per frame is a glint sweep from `t`, added with `source-atop` so it stays inside the letters.

```js
function chromeText(text, font, px) {                      // e.g. chromeText('NORTHWIND', '"Archivo Black", sans-serif', 150)
  const m = mk(10, 10).g; m.font = `${px}px ${font}`;
  const tw = Math.ceil(m.measureText(text).width), pad = Math.ceil(px * 0.3);
  const c = mk(tw + pad * 2, Math.ceil(px * 1.5) + pad), g = c.g;
  const x = pad, y = pad + px, top = y - px * 0.74;         // cap-height band of the face
  g.font = m.font; g.lineJoin = 'round';
  for (let k = 14; k >= 1; k--) {                          // extrusion: stacked copies, dark at the back
    g.fillStyle = `rgb(${lerp(70, 20, k / 14) | 0},${lerp(14, 4, k / 14) | 0},${lerp(110, 40, k / 14) | 0})`;
    g.fillText(text, x + k * 0.6, y + k * 1.1);
  }
  g.strokeStyle = '#0a0014'; g.lineWidth = px * 0.06; g.strokeText(text, x, y);
  const face = g.createLinearGradient(0, top, 0, y);       // sky above a hard horizon, warm ground below
  [[0, '#0d1d55'], [0.3, '#5fb8ff'], [0.49, '#ffffff'], [0.51, '#2b0a26'], [0.7, '#c2452f'], [0.9, '#ffd98a'], [1, '#fff6dc']]
    .forEach(([o, col]) => face.addColorStop(o, col));
  g.fillStyle = face; g.fillText(text, x, y);
  const rim = g.createLinearGradient(0, top, 0, y);
  rim.addColorStop(0, '#fff'); rim.addColorStop(0.5, '#8ea4dc'); rim.addColorStop(1, '#ffab66');
  g.strokeStyle = rim; g.lineWidth = px * 0.018; g.strokeText(text, x, y);
  c.baseX = x; c.baseY = y; return c;
}
function drawChrome(ctx, chrome, layer, x, y, u) {         // layer: same-size canvas made in ready; u = glint 0..1
  const g = layer.g; g.globalCompositeOperation = 'copy'; g.drawImage(chrome, 0, 0);
  if (u > 0 && u < 1) {
    const gx = lerp(-0.3, 1.3, u) * chrome.width, band = g.createLinearGradient(gx - 80, 0, gx + 80, chrome.height * 0.4);
    band.addColorStop(0, 'rgba(255,255,255,0)'); band.addColorStop(0.5, 'rgba(255,255,255,.85)'); band.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = band; g.fillRect(0, 0, chrome.width, chrome.height);
  }
  ctx.drawImage(layer, x - chrome.baseX, y - chrome.baseY);
}
```

Heavy, wide grotesques with open counters work best. Thin or high-contrast faces fill in under the outline. Choose the extrusion direction once and keep it for every title in the film.

## Check on stills

- `sheet --crop` on dark gradients shows no steps, and halftone dots stay round, ≥ 7 px apart and keep their colour. In a `--strip` at 12 fps, grain changes every 2–3 frames.
- Type is sharp and isn't vignetted or scanlined unless the style wants that. `helios verify` passes with every pass on.
- After `render --preset medium`, compare the file size with a render without grain. If it is far larger, lower the grain amount or step it more slowly.

---

Credits: techniques adapted from [lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) by LemoLab (MIT), in particular `core/post/crt.js`, `styles/silent-film/demo/engine/film.js` and `styles/risograph/demo/riso.js`, and [mg-styles-15](https://github.com/Vincentwei1021/mg-styles-15) by Vincentwei1021 (MIT), in particular the bauhaus, synthwave, collage and HUD demos. The text and code are our own, and no assets were copied.
