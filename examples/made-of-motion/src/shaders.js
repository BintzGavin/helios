// The film's eight SkSL shaders, translated to GLSL ES 3.0 so they produce the same bytes as
// fframes' CPU Skia renderer.
//
// Matching Skia means matching how it runs SkSL, not just the source:
//   - SkSL turns `x / literal` into `x * (1 / literal)`, so divisions by literals here are
//     written as that multiplication (see `inv`).
//   - sin, cos, exp, pow, dot, mix and smoothstep go through Skia's raster-pipeline routines
//     (SkRasterPipeline_opts.h), which use polynomial and bit-trick approximations. The sk*
//     functions below reproduce them operation for operation. Skia's `mad(f, m, a)` is
//     `a + f * m` with two roundings in the SSE pipeline fframes runs (no fused multiply-add,
//     as measured against its frames), and `skMad` keeps that order. The procedural grain is
//     `fract(sin(huge) * 43758.5453)`, which amplifies any rounding difference into a
//     different pixel, so only the exact sequence of f32 operations reproduces it.
//   - The layer is blended the way Skia's 8888 blitter does it: clamp, then src-over as
//     `src * 255 + dst * (1 - a)` rounded half to even, against the canvas pixels.
// Coordinates are Skia's: `p` is the pixel centre in the layer's own units, y pointing down,
// and image children are sampled in image pixels.

/**
 * A literal's reciprocal as SkSL folds it: the literal is first rounded to f32, then inverted
 * in double. Written with full precision so the GLSL compiler rounds it to the same f32.
 */
const inv = (value) => (1 / Math.fround(value)).toPrecision(17);

export const PRELUDE = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform float uCanvasHeight;
uniform vec2 uOrigin;      // the layer's top-left corner on the canvas
uniform int uBlend;        // 1: src-over onto uDst; 0: the layer replaces what is under it
uniform sampler2D uDst;    // the canvas being drawn on, premultiplied
uniform float uZero;       // always 0: keeps the compiler from folding or merging Skia's math
out vec4 outColor;

// --- Skia raster-pipeline arithmetic --------------------------------------------------
float skMad(float f, float m, float a) { return a + f * m; }
vec2 skMad(vec2 f, vec2 m, vec2 a) { return a + f * m; }
vec3 skMad(vec3 f, vec3 m, vec3 a) { return a + f * m; }
vec4 skMad(vec4 f, vec4 m, vec4 a) { return a + f * m; }

float skFract(float x) { return x - floor(x); }
vec2 skFract(vec2 x) { return x - floor(x); }

float skDot(vec2 a, vec2 b) { return skMad(a.x, b.x, a.y * b.y); }
float skDot(vec3 a, vec3 b) { return skMad(a.x, b.x, skMad(a.y, b.y, a.z * b.z)); }
float skLength(vec2 v) { return sqrt(skDot(v, v)); }

// Skia evaluates (to - from) and (edge1 - edge0) at run time in f32, even for literals; the
// GLSL compiler would fold them (in higher precision), so they go through uZero.
float skMix(float a, float b, float t) { return skMad((b + uZero) - a, t, a); }
vec2 skMix(vec2 a, vec2 b, float t) { return skMad((b + uZero) - a, vec2(t), a); }
vec3 skMix(vec3 a, vec3 b, float t) { return skMad((b + uZero) - a, vec3(t), a); }
vec4 skMix(vec4 a, vec4 b, float t) { return skMad((b + uZero) - a, vec4(t), a); }

float skSmoothstep(float e0, float e1, float x) {
  float t = min(max(0., (x - e0) / ((e1 + uZero) - e0)), 1.);
  return t * t * (3. - 2. * t);
}

// sin(x * 2pi) on [-1/4, 1/4], exact at 0, pi/6, pi/3, pi/2 (from SwiftShader).
float skSin5q(float x) {
  float x2 = x * x;
  return x * skMad(skMad(x2, 74.4388885, -41.1693687), x2, 6.28230858);
}
// Skia's constant factors go through uZero: the compiler would otherwise merge them with a
// literal factor in the argument (x * 1.16 * log2e), which rounds differently.
float skSin(float x) {
  x = skMad(x, -0.15915493667125702 + uZero, .25);
  x = .25 - abs(x - floor(x + .5));
  return skSin5q(x);
}
float skCos(float x) {
  x = x * (0.15915493667125702 + uZero);
  x = .25 - abs(x - floor(x + .5));
  return skSin5q(x);
}

// approx_log2 / approx_pow2: Skia reads the float's bits as a signed integer, so for
// negative inputs pow() comes out as 0 rather than NaN. The film depends on that.
float skLog2(float x) {
  float e = float(floatBitsToInt(x)) * (1. / 8388608.);
  float m = uintBitsToFloat((floatBitsToUint(x) & 0x007fffffu) | 0x3f000000u);
  return skMad(-m, 1.498030302, e - 124.225514990) - 1.725879990 / (.3520887068 + m);
}
float skPow2(float x) {
  float f = x - floor(x);
  float a = skMad(-f, 1.490129070, x + 121.274057500);
  a = a + 27.728023300 / (4.84252568 - f);
  a = a * 8388608.;
  a = a > 0. ? a : 0.;                 // max(a, 0) with SSE semantics: NaN becomes 0
  a = min(a, 2139095040.);             // the bits of +infinity
  return uintBitsToFloat(uint(roundEven(a)));
}
float skExp(float x) { return skPow2((1.4426950408889634 + uZero) * x); }
float skPow(float x, float y) { return (x == 0. || x == 1.) ? x : skPow2(skLog2(x) * y); }

// --- Image children ------------------------------------------------------------------
// usvgr premultiplies RGBA8 with (c * (a / 255) + 0.5) as u8; Skia then reads c * (1/255).
vec4 skTexel(sampler2D s, ivec2 i) {
  vec4 k = floor(texelFetch(s, i, 0) * 255. + .5);
  return vec4(floor(k.rgb * (k.a / 255.) + .5), k.a) * 0.0039215686274509803;
}
// bilerp_clamp_8888: four taps at +/-0.5, weights from fract(c + 0.5), accumulated in order.
vec4 skEval(sampler2D s, vec2 c) {
  vec2 size = vec2(textureSize(s, 0));
  vec2 f = skFract(c + .5);
  vec4 acc = vec4(0);
  for (int j = 0; j < 2; j++) {
    for (int i = 0; i < 2; i++) {
      vec2 o = vec2(float(i) - .5, float(j) - .5);
      // clamp_ex: exclusive of the far edge, i.e. one ulp below the image size.
      vec2 xy = clamp(c + o, vec2(1.17549435e-38), uintBitsToFloat(floatBitsToUint(size) - 1u));
      float sx = o.x > 0. ? f.x : 1. - f.x;
      float sy = o.y > 0. ? f.y : 1. - f.y;
      acc = acc + skTexel(s, ivec2(xy)) * (sx * sy);
    }
  }
  return acc;
}
`;

export const MAIN = /* glsl */ `
void main() {
  vec2 p = vec2(gl_FragCoord.x, uCanvasHeight - gl_FragCoord.y);
  vec4 c = clamp(skMain(p), 0., 1.);
  vec4 d = vec4(0);
  if (uBlend == 1) d = floor(texelFetch(uDst, ivec2(uOrigin + p), 0) * 255. + .5);
  // srcover_rgba_8888 and to_unorm(): round half to even.
  outColor = roundEven(clamp(skMad(d, vec4(1. - c.a), c * 255.), 0., 255.)) / 255.;
}
`;

const HASH = /* glsl */ `
float hash(vec2 p) { return skFract(skSin(skDot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

const NOISE = /* glsl */ `${HASH}
float noise(vec2 p) {
  vec2 q = floor(p), f = skFract(p); f = f * f * (3. - 2. * f);
  return skMix(skMix(hash(q), hash(q + vec2(1, 0)), f.x), skMix(hash(q + vec2(0, 1)), hash(q + 1.), f.x), f.y);
}
`;

export const paper = /* glsl */ `
uniform vec3 iResolution;
uniform float iTime;
uniform float uMode;
uniform float uVignette;
${NOISE}
vec4 skMain(vec2 p) {
  vec2 uv = p / iResolution.xy;
  vec2 d = (uv - vec2(.52, .48)) * vec2(1.15, 1.);
  float cloud = noise(p * ${inv(280)}) * .5 + noise(p * ${inv(81)}) * .22 + noise(p * ${inv(14)}) * .09;
  float grain = (hash(floor(p * .72) + floor(iTime * 24.) * 19.7) - .5) * .058;
  float edge = skSmoothstep(.20, .79, skLength(d));
  vec3 c = vec3(.883, .880, .857) + (cloud - .4) * .085 + grain;
  c -= edge * (.10 + uVignette * .72);
  // grain already carries a literal factor; keep the compiler from merging the two.
  if (uMode > .5 && uMode < 1.5) c = vec3(.048, .049, .048) + (cloud - .4) * .021 + grain * (.20 + uZero);
  if (uMode > 1.5) c = vec3(.91, .105, .065) + (cloud - .4) * .09 + grain * (.7 + uZero) - edge * .10;
  return vec4(c, 1);
}
`;

export const signal = /* glsl */ `
// Bent electric cusp photographed through paper grain and a warm optical halo.
uniform vec3 iResolution;
uniform float iTime;
uniform int iFrame;
uniform vec4 uPose;
uniform float uAngle;
uniform float uPower;
${NOISE}
float cusp(vec2 p) {
  vec2 q = p - uPose.xy;
  vec2 radius = uPose.zw;
  q = vec2(skCos(uAngle) * q.x + skSin(uAngle) * q.y, -skSin(uAngle) * q.x + skCos(uAngle) * q.y) / radius;
  vec2 a = max(abs(q), vec2(.00001));
  float f = skPow(a.x, uPower) + skPow(a.y, uPower) - 1.;
  vec2 m = max(a, vec2(.035));
  vec2 gradient = uPower * vec2(skPow(m.x, uPower - 1.), skPow(m.y, uPower - 1.)) / radius;
  return f / max(skLength(gradient), .0002);
}
vec4 skMain(vec2 p) {
  float f = float(iFrame);
  // Tiny filament displacement is attached to the edge, not moving grain.
  vec2 warped = p + vec2(noise(p * ${inv(8)} + vec2(iTime * .4, 0.)) - .5, noise(p * ${inv(13)}) - .5) * 2.;
  float fold = clamp(f - 43., 0., 1.);
  vec2 cuspPoint = vec2(warped.x * skMix(1., .72, fold), 535. + (warped.y - 535.) * skMix(1., 1.45, fold));
  float d = cusp(cuspPoint);
  vec3 paper = vec3(.896, .89, .885);
  vec2 light = (p - vec2(1190., 545.)) * vec2(${inv(800)}, ${inv(1160)});
  float illumination = skExp(-skDot(light, light) * 1.16);
  vec3 shadow = vec3(.075, .071, .074);
  vec3 c = skMix(shadow, paper, skSmoothstep(.12, .94, illumination));
  c -= skPow(max(0., (500. - p.y) * ${inv(500)}), 1.3) * .14 * skSmoothstep(300., 850., p.x);
  // Brown photographic shoulder surrounding the blue.
  c += skExp(-skPow((p.x - 350.) * ${inv(170)}, 2.)) * vec3(.105, .070, .067);
  float shoulder = skExp(-abs(d) * ${inv(125)}) * .19;
  c += vec3(.36, .145, .072) * shoulder;
  float edge = skExp(-abs(d) * ${inv(8.5)});
  float bloom = skExp(-abs(d) * ${inv(26)});
  float blue = skSmoothstep(4., 16., f);
  vec3 core = skMix(vec3(.06, .84, .76), vec3(.12, .25, .81), blue);
  core += vec3(.02, .09, .03) * noise(p * ${inv(100)});
  float softness = skMix(17., 3.2, skSmoothstep(2., 8., f));
  float inside = 1. - skSmoothstep(-softness, softness, d);
  vec3 electric = skMix(core, vec3(.12, .63, .54), skExp(-abs(d) * ${inv(14)}) * .77);
  c = skMix(c, electric, inside);
  // inside is 1 - smoothstep(); uZero stops the compiler from folding 1 - inside back into it.
  c += vec3(.018, .14, .105) * bloom * ((1. + uZero) - inside) + vec3(.01, .025, .018) * edge;
  // Measured flash/recoil exposures.
  float wash = f == 3. ? .63 : f == 4. ? .35 : f == 5. ? .13 : 0.;
  c = skMix(c, vec3(.885, .885, .875), wash);
  if (f == 0.) c = skMix(vec3(.90, .035, .028), vec3(.95, .78, .17), inside);
  if (f == 1.) c = skMix(vec3(.86, .67, .02), vec3(.80, .93, .08), inside * .83);
  if (f == 2.) c = vec3(.89, .89, .88);
  // A warm paper bloom contracts rapidly into an orange ball, then exits into the portrait.
  if (f >= 41.) {
    float a = clamp(f - 41., 0., 1.);
    float b = clamp(f - 42., 0., 1.);
    float e = clamp(f - 43., 0., 1.);
    vec2 centre = skMix(vec2(810, 540), vec2(730, 530), a);
    centre = skMix(centre, vec2(610, 550), b);
    centre = skMix(centre, vec2(430, 540), e);
    vec2 radius = skMix(vec2(590, 650), vec2(470, 540), a);
    radius = skMix(radius, vec2(365, 445), b);
    radius = skMix(radius, vec2(200, 275), e);
    vec2 q = (p - centre) / radius;
    float r = skLength(q);
    float glow = skExp(-skPow(r, 2.55) * 1.55);
    float halo = skExp(-skPow((r - .81) * 3.8, 2.));
    vec3 hot = skMix(vec3(.84, .61, .47), vec3(.94, .40, .19), a);
    hot = skMix(hot, vec3(.99, .35, .065), b);
    hot = skMix(hot, vec3(.96, .22, .015), e);
    vec3 dark = vec3(.045, .043, .044);
    c = dark + (hot - dark) * glow + vec3(.15, -.026, -.012) * halo;
    vec3 filament = skMix(vec3(.14, .075, .47), vec3(.52, .012, .045), clamp((f - 41.) * .5, 0., 1.));
    c = skMix(c, filament * (.60 + .40 * skExp(-abs(d) * ${inv(90)})), inside * .92);
    c += vec3(.10, .06, .042) * skExp(-abs(d) * ${inv(4.5)});
  }
  float grain = (hash(floor(p * .73) + f * 19.7) - .5) * .072;
  c += (noise(p * ${inv(77)}) - .5) * .022 + grain;
  return vec4(clamp(c, 0., 1.), 1.);
}
`;

export const print = /* glsl */ `
uniform float iTime;
uniform float uStrength;
float hash(vec2 p) { return skFract(skSin(skDot(p, vec2(17.13, 93.17))) * 47111.81); }
vec4 skMain(vec2 p) {
  float h = hash(floor(p * .78) + floor(iTime * 24.) * vec2(13, 37));
  float a = abs(h - .5) * uStrength;
  return vec4(vec3((.5 <= h ? 1. : 0.) * a), a);
}
`;

export const object = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uCenter;
uniform vec3 uRight;
uniform vec3 uDown;
uniform float uSize;
uniform vec2 uStretch;
uniform vec2 uCell;
uniform float uHeat;
uniform float uSoot;
uniform float uPixels;
vec4 sampleObject(vec2 p) {
  vec3 ray = vec3((p + uOrigin - vec2(720, 540)) * ${inv(1250)}, 1.);
  vec3 normal = uRight.yzx * uDown.zxy - uRight.zxy * uDown.yzx;
  float den = skDot(ray, normal);
  if (abs(den) < .00001) return vec4(0);
  vec3 hit = ray * (skDot(uCenter, normal) / den) - uCenter;
  vec2 uv = vec2(skDot(hit, uRight), skDot(hit, uDown)) / (uSize * uStretch) + .5;
  if (min(uv.x, uv.y) < 0. || max(uv.x, uv.y) >= 1.) return vec4(0);
  vec4 c = skEval(uAtlas, uCell + floor((floor(uv * uPixels) + .5) * (64. / uPixels)) + .5);
  float shade = .82 + .18 * abs(normal.z);
  c.rgb *= shade;
  if (uHeat > 0.) {
    float h = skSin(uv.x * 5. + uv.y * 8.) * .5 + .5;
    vec3 heat = skMix(vec3(.9, .09, .015), vec3(1., .9, .39), h);
    c.rgb = skMix(c.rgb, heat * c.a, uHeat);
  }
  float stain = 1. - skSmoothstep(.28, .60, skLength((uv - vec2(.43, .5)) * vec2(1., .82)));
  c.rgb = skMix(c.rgb, vec3(.022, .019, .016) * c.a, uSoot * stain);
  return c;
}
vec4 skMain(vec2 p) {
  // Coverage AA at the projected pixel edges; never blur across atlas texels.
  return (sampleObject(p + vec2(-.28, -.28)) + sampleObject(p + vec2(.28, -.28))
        + sampleObject(p + vec2(-.28, .28)) + sampleObject(p + vec2(.28, .28))) * .25;
}
`;

export const performance = /* glsl */ `
uniform sampler2D uSource;
uniform int iFrame;
float box(vec2 p, vec4 r) {
  vec2 d = max(r.xy - p, p - r.zw);
  return 1. - skSmoothstep(-3., 5., max(d.x, d.y));
}
vec4 boundary(vec2 p) {
  return (skEval(uSource, p + vec2(5, 0)) + skEval(uSource, p - vec2(5, 0))
        + skEval(uSource, p + vec2(0, 5)) + skEval(uSource, p - vec2(0, 5))) * .25;
}
vec4 skMain(vec2 p) {
  vec4 c = skEval(uSource, p);
  // The portrait is the only remaining live-action plate.
  if (iFrame < 9) {
    // The first caption is heavily defocused; its wide halo needs a wider matte.
    vec2 d = max(vec2(150, 466) - p, p - vec2(782, 610));
    float a = 1. - skSmoothstep(-12., 18., max(d.x, d.y));
    float chroma = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
    a *= 1. - skSmoothstep(.08, .18, chroma);
    return skMix(c, skEval(uSource, vec2(105. + p.x * .04, p.y)), a);
  }
  vec4 r = vec4(166, 482, 595, 598);
  vec2 uv = clamp((p - r.xy) / (r.zw - r.xy), 0., 1.);
  // Boundary-constrained interpolation follows the light sweep.
  vec4 vertical = skMix(boundary(vec2(p.x, r.y)), boundary(vec2(p.x, r.w)), uv.y);
  vec4 horizontal = skMix(boundary(vec2(r.x, p.y)), boundary(vec2(r.z, p.y)), uv.x);
  vec4 corners = skMix(skMix(boundary(r.xy), boundary(r.zy), uv.x),
                       skMix(boundary(r.xw), boundary(r.zw), uv.x), uv.y);
  vec4 grain = skEval(uSource, p - vec2(0, 137)) - boundary(p - vec2(0, 137));
  float a = box(p, vec4(181, 499, 579, 578));
  c = skMix(c, clamp(vertical + horizontal - corners + grain * .7, 0., 1.), a);
  // The source caret is a separate element farther right than its caption.
  float caret = box(p, vec4(630, 505, 662, 570));
  c = skMix(c, skEval(uSource, p - vec2(27, 0)), caret);
  return c;
}
`;

export const hand = /* glsl */ `
uniform sampler2D uField;
uniform vec2 uAtlas;
uniform vec4 uRect;
uniform float iTime;
uniform int iFrame;
${NOISE}
vec4 field(vec2 p) {
  vec2 q = p - uRect.xy;
  if (min(q.x, q.y) < 0. || q.x >= uRect.z || q.y >= uRect.w) return vec4(0);
  return skEval(uField, uAtlas + q);
}
vec3 thermal(float h) {
  vec3 c = skMix(vec3(.15, .025, .28), vec3(.65, .016, .14), skSmoothstep(.03, .24, h));
  c = skMix(c, vec3(.96, .075, .016), skSmoothstep(.24, .45, h));
  c = skMix(c, vec3(1., .51, .018), skSmoothstep(.44, .72, h));
  c = skMix(c, vec3(1., .83, .31), skSmoothstep(.69, .88, h));
  return skMix(c, vec3(1., .96, .80), skSmoothstep(.87, 1., h));
}
vec4 skMain(vec2 p) {
  float grain = hash(floor(p * .84) + float(iFrame) * 19.7) - .5;
  float cloud = (noise(p * ${inv(290)}) - .5) * .017 + (noise(p * ${inv(59)}) - .5) * .005;
  float flare = skSmoothstep(1.65, 2.0833, iTime);
  float light = skExp(-skLength((p - vec2(790, 620)) * vec2(${inv(850)}, ${inv(770)})));
  vec3 bg = vec3(.046, .049, .050) + cloud + grain * .012;
  bg += flare * (vec3(.17, .14, .15) * light + vec3(.024, .005, .002));
  vec4 f = field(p);
  float alpha = f.a;
  float heat = alpha > .001 ? f.r / alpha : .3;
  float halo = (field(p + vec2(14, 0)).a + field(p - vec2(14, 0)).a
              + field(p + vec2(0, 14)).a + field(p - vec2(0, 14)).a) * .25;
  bg += vec3(.16, .025, .004) * halo * (1. - alpha) * .18;
  vec3 body = thermal(heat + grain * .018);
  body += grain * .021 + (noise(p * ${inv(3.1)}) - .5) * .007;
  return vec4(skMix(bg, body, alpha), 1);
}
`;

export const thermalCut = /* glsl */ `
uniform int iFrame;
${HASH}
vec4 skMain(vec2 p) {
  float f = float(iFrame);
  float grain = hash(floor(p * .8) + f * 21.3) - .5;
  float reveal = skSmoothstep(.9, 3.8, f);
  float vignette = skSmoothstep(220., 1050., skLength((p - vec2(735, 590)) * vec2(1., .8)));
  vec3 paper = vec3(.878, .875, .853) - vignette * .10;
  vec3 c = skMix(vec3(.044, .043, .044), paper, reveal);
  float y = 970. - f * 134.;
  float glow = skExp(-skPow((p.y - y) * ${inv(190)}, 2.) - skPow((p.x - 690.) * ${inv(580)}, 2.));
  float strength = max(0., 1. - f * .36);
  c = skMix(c, vec3(.93, .018, .003), glow * strength);
  c = skMix(c, vec3(1., .64, .025), skPow(glow, 2.6) * strength);
  c = skMix(c, vec3(1., .94, .70), skPow(glow, 7.) * strength);
  c += grain * skMix(.014, .052, reveal);
  return vec4(c, 1);
}
`;

export const impact = /* glsl */ `
uniform float uAge;
uniform float uSeed;
uniform vec2 uDirection;
float hash(float p) { return skFract(skSin(p * 127.1 + uSeed * 71.7) * 43758.5453); }
vec4 skMain(vec2 p) {
  vec2 q = p - vec2(170.);
  float t = uAge;
  float fade = skExp(-t * .42);
  float r = skLength(q);
  float grain = skFract(skSin(skDot(floor(p), vec2(127.1, 311.7))) * 43758.5453);
  float cloud = skExp(-r * r / (2300. + t * 380.)) * .76;
  cloud *= skSmoothstep(.16, .92, grain);
  float rays = 0.;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float angle = hash(fi) * 6.283185;
    vec2 v = vec2(skCos(angle), skSin(angle));
    float along = skDot(q, v);
    float side = abs(q.x * v.y - q.y * v.x);
    float start = 32. + t * 7.;
    float len = 28. + hash(fi + 11.) * 54.;
    float tip = clamp((along - start) / len, 0., 1.);
    float width = (1. - tip) * (2. + hash(fi + 41.) * 3.);
    float ray = (1. - skSmoothstep(width, width + 1., side)) * (start <= along ? 1. : 0.) * (along <= start + len ? 1. : 0.);
    rays = max(rays, ray);
  }
  float alpha = clamp(max(cloud, rays) * fade, 0., 1.);
  return vec4(vec3(.96, .59, .025) * alpha, alpha);
}
`;
