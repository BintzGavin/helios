// The promo's shaders. Unlike ../shaders.js these don't emulate Skia: they are plain GLSL,
// drawn through the same ShaderStage (skMain returns a premultiplied colour; a `blend`
// layer is composited over the canvas, and may add light where its colour exceeds alpha).

const COMMON = /* glsl */ `
uniform vec3 iResolution;
uniform float iTime;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + 1.), f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0., a = .5;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; }
  return s;
}
const vec3 NAVY = vec3(6., 11., 24.) / 255.;
const vec3 GOLD = vec3(240., 187., 59.) / 255.;
const vec3 BLUE = vec3(68., 157., 240.) / 255.;
`;

/** The sun: limb-darkened disc with moving granulation, and a corona of slow streamers. */
export const SUN = /* glsl */ `${COMMON}
uniform float uRadius;
uniform float uGlow;
vec4 skMain(vec2 p) {
  vec2 d = p - iResolution.xy * .5;
  float r = length(d) / uRadius;
  float angle = atan(d.y, d.x);
  float edge = 1.4 / uRadius;
  float disc = smoothstep(1. + edge, 1. - edge, r);
  float mu = sqrt(max(0., 1. - r * r));
  vec3 core = mix(vec3(.93, .52, .12), vec3(1., .96, .82), pow(mu, .55));
  core *= .88 + .24 * fbm(d / uRadius * 5. + vec2(iTime * .35, -iTime * .25));
  float out_ = max(r - 1., 0.);
  float streamers = fbm(vec2(angle * 2.5 + 3., out_ * 1.6 - iTime * .5));
  vec2 box = abs(d) / (iResolution.xy * .5);
  float window = smoothstep(1., .7, max(box.x, box.y));
  float corona = (exp(-out_ * 3.4) * (.5 + .55 * streamers) + exp(-out_ * .9) * .18) * uGlow * window;
  vec3 col = core * disc + mix(GOLD, vec3(1., .62, .25), clamp(out_ * .6, 0., 1.)) * corona * (1. - disc);
  return vec4(col, clamp(disc + corona * .55, 0., 1.));
}
`;

/** A beam of white light through a glass prism, fanning out into a spectrum. */
export const PRISM = /* glsl */ `${COMMON}
uniform vec2 uCenter;
uniform float uSide;
uniform float uRot;
uniform float uSpread;   // half-angle of the fan, radians
uniform float uBeam;     // 0..1: how far the beam has reached
uniform float uGold;     // 0..1: the fan collapses into one gold beam
uniform vec2 uSource;
uniform vec2 uDir;       // direction of the outgoing fan's centre
uniform float uLength;   // how far the fan reaches from the prism
vec2 rot(vec2 v, float a) { return vec2(cos(a) * v.x - sin(a) * v.y, sin(a) * v.x + cos(a) * v.y); }
float sdTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
  vec2 e0 = b - a, e1 = c - b, e2 = a - c;
  vec2 v0 = p - a, v1 = p - b, v2 = p - c;
  vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0., 1.);
  vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0., 1.);
  vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0., 1.);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                   vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                   vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}
float segment(vec2 p, vec2 a, vec2 b, out float h) {
  vec2 pa = p - a, ba = b - a;
  h = dot(pa, ba) / dot(ba, ba);
  return length(pa - ba * clamp(h, 0., 1.));
}
vec3 spectrum(float x) {
  vec3 c = clamp(vec3(abs(x * 6. - 3.) - 1., 2. - abs(x * 6. - 2.), 2. - abs(x * 6. - 4.)), 0., 1.);
  return c * c * (3. - 2. * c);
}
vec4 skMain(vec2 p) {
  float h = uSide * .8660254;
  vec2 A = uCenter + rot(vec2(0., -h * 2. / 3.), uRot);
  vec2 B = uCenter + rot(vec2(-uSide * .5, h / 3.), uRot);
  vec2 C = uCenter + rot(vec2(uSide * .5, h / 3.), uRot);
  vec2 inP = mix(A, B, .55);
  vec2 outP = mix(A, C, .55);

  vec3 col = NAVY * (.9 + .25 * (1. - p.y / 1080.));
  col += vec3(.02, .035, .07) * fbm(p * .004 + iTime * .05);

  // The incoming beam, drifting dust caught in it.
  float t;
  float db = segment(p, uSource, inP, t);
  float reach = step(t, uBeam * 1.02);
  float dust = .7 + .6 * fbm(p * .03 - vec2(iTime * 3., 0.));
  col += vec3(1., .98, .94) * (exp(-db * db / 30.) * 1.2 + exp(-db / 26.) * .25 * dust) * reach * step(t, 1.);

  // Inside the glass the beam starts to separate.
  float ti;
  float di = segment(p, inP, outP, ti);
  float inside = step(1., uBeam);
  col += mix(vec3(1.), spectrum(ti), .35) * exp(-di * di / 120.) * .55 * inside;

  // The fan: angle from its centre line picks the colour.
  vec2 v = p - outP;
  float along = dot(v, uDir);
  float across = uDir.x * v.y - uDir.y * v.x;
  float phi = atan(across, max(along, 1e-3));
  float u = phi / max(uSpread, 1e-3) * .5 + .5;
  float band = smoothstep(-.05, .04, u) * smoothstep(1.05, .96, u) * step(0., along);
  float fan = band * (1.15 / (1. + along / 1300.)) * smoothstep(0., 60., along) * smoothstep(uLength, uLength - 140., along);
  vec3 fanCol = mix(spectrum(1. - clamp(u, 0., 1.)) * 1.25, GOLD * 1.6, uGold);
  float gate = smoothstep(1., 1.15, uBeam);
  col += fanCol * fan * (.55 + .45 * dust) * gate;
  float beamGold = exp(-pow(across / (6. + along * .01), 2.)) * step(0., along) * uGold * gate;
  col += vec3(1., .86, .5) * beamGold * 1.4;

  // The prism: dark glass, bright edges, a faint inner gradient.
  float sd = sdTriangle(p, A, B, C);
  float body = smoothstep(1., -1., sd);
  vec3 glass = mix(vec3(.05, .08, .16), vec3(.16, .22, .36), clamp((p.y - A.y) / (h * 1.2), 0., 1.));
  glass += vec3(.25, .3, .45) * exp(sd / 24.) * .35;
  col = mix(col, col * .45 + glass, body * .85);
  col += vec3(.75, .85, 1.) * exp(-abs(sd) / 1.3) * .9 + vec3(.4, .5, .8) * exp(-max(sd, 0.) / 18.) * .18;
  return vec4(col, 1.);
}
`;

/**
 * Raymarched glass objects. uShape: 0 "</>", 1 a clock ring with a gold hand, 2 a triangular
 * prism, 3 an orb with a small sun inside. Composited over the canvas with soft edges.
 */
export const GLASS = /* glsl */ `${COMMON}
uniform float uShape;
uniform vec3 uRot;
uniform float uHand;     // the clock hand's angle
uniform vec3 uKey;       // warm key light
uniform vec3 uRim;       // cool fill / rim
uniform vec3 uTint;
uniform float uZoom;
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1, 0, 0, 0, c, s, 0, -s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0, -s, 0, 1, 0, s, 0, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0, -s, c, 0, 0, 0, 1); }
float seg2(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.));
}
float extrude(float d2, float z, float depth) {
  vec2 w = vec2(d2, abs(z) - depth);
  return min(max(w.x, w.y), 0.) + length(max(w, 0.));
}
float material;
float sdCode(vec3 p) {
  vec2 q = p.xy;
  float d = seg2(q, vec2(-.52, .5), vec2(-1.08, 0.));
  d = min(d, seg2(q, vec2(-1.08, 0.), vec2(-.52, -.5)));
  d = min(d, seg2(q, vec2(.52, .5), vec2(1.08, 0.)));
  d = min(d, seg2(q, vec2(1.08, 0.), vec2(.52, -.5)));
  d = min(d, seg2(q, vec2(.2, .66), vec2(-.2, -.66)));
  return extrude(d - .1, p.z, .14) - .045;
}
float sdClock(vec3 p) {
  float ring = length(vec2(length(p.xy) - .95, p.z)) - .09;
  float a = atan(p.y, p.x);
  float sector = 6.2831853 / 12.;
  float k = floor(a / sector + .5) * sector;
  vec2 q = vec2(cos(-k) * p.x - sin(-k) * p.y, sin(-k) * p.x + cos(-k) * p.y);
  float tick = length(max(abs(vec3(q.x - .76, q.y, p.z)) - vec3(.065, .022, .04), 0.)) - .012;
  vec2 hd = vec2(cos(uHand), sin(uHand));
  float hand = length(vec3(p.xy - hd * clamp(dot(p.xy, hd), 0., .66), p.z - .02)) - .04;
  float hub = length(p - vec3(0, 0, .02)) - .085;
  float glass = min(ring, tick);
  float gold = min(hand, hub);
  material = gold < glass ? 1. : 0.;
  return min(glass, gold);
}
float sdPrism(vec3 p) {
  vec3 q = abs(p);
  float d = max(q.z - .5, max(q.x * .8660254 + p.y * .5, -p.y) - .55);
  return d;
}
float sdOrb(vec3 p) {
  float shell = abs(length(p) - .95) - .05;
  float sun = length(p) - .34;
  material = sun < shell ? 2. : 0.;
  return min(shell, sun);
}
float map(vec3 p) {
  material = 0.;
  if (uShape < .5) return sdCode(p);
  if (uShape < 1.5) return sdClock(p);
  if (uShape < 2.5) return sdPrism(p - vec3(0, .12, 0)) - .035;
  return sdOrb(p);
}
vec3 normalAt(vec3 p) {
  vec2 e = vec2(.0015, 0);
  return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
}
vec3 env(vec3 d) {
  vec3 c = mix(vec3(.015, .03, .07), vec3(.05, .09, .18), d.y * .5 + .5);
  c += uKey * pow(max(dot(d, normalize(vec3(.55, .5, .65))), 0.), 14.) * 3.2;
  c += uKey * pow(max(dot(d, normalize(vec3(.55, .5, .65))), 0.), 3.) * .25;
  c += uRim * pow(max(dot(d, normalize(vec3(-.8, -.05, .45))), 0.), 5.) * 1.1;
  return c;
}
vec4 skMain(vec2 p) {
  vec2 uv = (p - iResolution.xy * .5) / iResolution.y * 2. / uZoom;
  uv.y = -uv.y;
  mat3 R = rotY(uRot.y) * rotX(uRot.x) * rotZ(uRot.z);
  vec3 ro = vec3(0, 0, 4.2);
  vec3 rd = normalize(vec3(uv * .62, -1.6));
  ro = R * ro; rd = R * rd;
  float t = 0., minRatio = 1e9, hit = 0.;
  float px = 2. / iResolution.y / uZoom * .62 / 1.6;
  for (int i = 0; i < 80; i++) {
    float d = map(ro + rd * t);
    minRatio = min(minRatio, d / (t * px));
    if (d < .0006) { hit = 1.; break; }
    t += d * .9;
    if (t > 8.) break;
  }
  float cover = hit > .5 ? 1. : clamp(1. - minRatio, 0., 1.) * step(minRatio, 1.);
  if (cover <= 0.) return vec4(0);
  vec3 pos = ro + rd * t;
  vec3 n = normalAt(pos);
  float mat_ = material;
  float fres = pow(1. - max(dot(n, -rd), 0.), 3.);
  vec3 col;
  if (mat_ > 1.5) {
    col = vec3(1., .82, .4) * 1.6;                       // the orb's little sun
  } else if (mat_ > .5) {
    vec3 refl = env(reflect(rd, n));
    col = GOLD * (.25 + .75 * max(dot(n, normalize(vec3(.55, .5, .65))), 0.)) + refl * GOLD * 1.2;
  } else {
    // Glass: reflection plus a refracted look through the body, darker where it is thick.
    vec3 rr = refract(rd, n, 1. / 1.45);
    float thick = 0.;
    vec3 q = pos + rr * .02;
    for (int i = 0; i < 24; i++) {
      float d = -map(q);
      if (d < 0.) break;
      float step_ = max(d, .02);
      q += rr * step_;
      thick += step_;
    }
    vec3 nOut = normalAt(q);
    vec3 exitDir = refract(rr, -nOut, 1.45);
    if (dot(exitDir, exitDir) < .01) exitDir = reflect(rr, -nOut);
    // A little dispersion: each channel leaves the glass at a slightly different angle.
    vec3 through = vec3(env(normalize(exitDir + nOut * .07)).r, env(exitDir).g, env(normalize(exitDir - nOut * .07)).b);
    through = (through * 1.7 + vec3(.09, .13, .22)) * uTint * exp(-thick * .5);
    vec3 refl = env(reflect(rd, n));
    col = mix(through, refl, .12 + .88 * fres);
    col += vec3(1., .9, .72) * fres * .5;
    col += uKey * pow(max(dot(reflect(rd, n), normalize(vec3(.55, .5, .65))), 0.), 60.) * 2.6;
  }
  return vec4(col * cover, cover);
}
`;

/** The finale's sky: night with stars, warming into dawn around the rising sun. */
export const SKY = /* glsl */ `${COMMON}
uniform vec2 uSun;
uniform float uDawn;
vec4 skMain(vec2 p) {
  float y = p.y / 1080.;
  vec3 night = mix(vec3(.03, .055, .12), NAVY, y * .8);
  vec3 dawn = mix(vec3(.05, .09, .2), vec3(.32, .16, .12), smoothstep(.45, 1., y));
  vec3 col = mix(night, dawn, uDawn * .85);
  float r = length(p - uSun);
  col += GOLD * (exp(-r / 380.) * .35 + exp(-r / 120.) * .3) * (.35 + .65 * uDawn);
  vec2 cell = floor(p / 3.);
  float star = step(.9984, h21(cell)) * (.35 + .65 * h21(cell + 7.));
  col += star * (1. - uDawn * .75) * smoothstep(200., 600., r) * (.6 + .4 * sin(iTime * 2.4 + h21(cell + 3.) * 40.));
  return vec4(col, 1.);
}
`;
