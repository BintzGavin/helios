// The "enhanced" grade: everything here runs after the exact frame is drawn, so the
// original film stays intact underneath. A bright pass feeds a two-level bloom; a final
// pass adds halation, god rays from the electric star, refraction shockwaves at the ring
// collisions, heat haze on the thermal shots, light leaks on hard cuts, lens chromatic
// aberration, gate weave and luma-aware grain. All of it is a function of the frame.

const VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3. : -1., gl_VertexID == 2 ? 3. : -1.);
  gl_Position = vec4(p, 0., 1.);
}`;

const COMMON = `#version 300 es
precision highp float;
uniform vec2 uSize;        // size of the target
out vec4 outColor;
vec2 uvOf() { return gl_FragCoord.xy / uSize; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.), f.x), f.y);
}
float luma(vec3 c) { return dot(c, vec3(.2126, .7152, .0722)); }
`;

// Soft-knee bright pass at half resolution: only highlights feed the glow.
const BRIGHT = `${COMMON}
uniform sampler2D uSrc;
uniform float uThreshold;
void main() {
  vec2 uv = uvOf();
  vec2 t = 1. / vec2(textureSize(uSrc, 0));
  vec3 c = (texture(uSrc, uv + t * vec2(-.5, -.5)).rgb + texture(uSrc, uv + t * vec2(.5, -.5)).rgb
          + texture(uSrc, uv + t * vec2(-.5, .5)).rgb + texture(uSrc, uv + t * vec2(.5, .5)).rgb) * .25;
  float l = luma(c);
  float knee = .18;
  float soft = clamp(l - uThreshold + knee, 0., 2. * knee);
  soft = soft * soft / (4. * knee + 1e-4);
  float w = max(soft, l - uThreshold) / max(l, 1e-4);
  // Saturated warm light (fire, the orange ball) glows even when not near white.
  float warm = smoothstep(.35, .9, c.r - .6 * c.b) * .6;
  outColor = vec4(c * max(w, warm), 1);
}`;

// Separable 9-tap Gaussian.
const BLUR = `${COMMON}
uniform sampler2D uSrc;
uniform vec2 uDir;
void main() {
  vec2 uv = uvOf();
  vec2 t = uDir / vec2(textureSize(uSrc, 0));
  vec3 c = texture(uSrc, uv).rgb * .2270270;
  c += (texture(uSrc, uv + t * 1.3846154).rgb + texture(uSrc, uv - t * 1.3846154).rgb) * .3162162;
  c += (texture(uSrc, uv + t * 3.2307692).rgb + texture(uSrc, uv - t * 3.2307692).rgb) * .0702703;
  outColor = vec4(c, 1);
}`;

const FINAL = `${COMMON}
uniform sampler2D uFrame;
uniform sampler2D uBloomA;  // tight glow
uniform sampler2D uBloomB;  // wide glow
uniform float uTime;
uniform float uFrameIndex;
uniform float uBloom;
uniform float uHaze;
uniform vec4 uShock[6];     // centre (px), age (frames), strength
uniform vec4 uRays;         // centre (px), strength, unused
uniform vec4 uLeak;         // centre (uv), radius, strength
uniform vec3 uLeakColor;
uniform vec2 uWeave;        // gate weave, px
uniform float uAberration;
uniform float uGrain;
uniform float uVignette;

vec3 frameAt(vec2 uv) { return texture(uFrame, uv).rgb; }

void main() {
  vec2 res = uSize;
  vec2 px = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y);   // y down, like the film
  vec2 p = px + uWeave;

  // Heat haze: a slow upward shimmer on the thermal shots.
  if (uHaze > 0.) {
    vec2 q = p / res * vec2(9., 7.);
    vec2 w = vec2(noise(q + vec2(0., uTime * 1.7)), noise(q * 1.3 + vec2(5.2, uTime * 2.3))) - .5;
    p += w * 11. * uHaze;
  }

  // Refraction shockwaves where the ring objects hit the ink.
  for (int i = 0; i < 6; i++) {
    vec4 s = uShock[i];
    if (s.w <= 0.) continue;
    vec2 d = p - s.xy;
    float r = length(d);
    float front = 24. + s.z * 34.;
    float ring = exp(-pow((r - front) / (10. + s.z * 3.), 2.));
    float fade = s.w * clamp(1. - s.z / 12., 0., 1.);
    p -= d / max(r, 1.) * ring * 14. * fade;
  }

  vec2 uv = vec2(p.x, res.y - p.y) / res;
  vec2 c = uv - .5;
  float edge = dot(c, c);

  // Lens chromatic aberration, growing towards the corners.
  vec2 ca = c * edge * uAberration;
  vec3 col = vec3(frameAt(uv + ca).r, frameAt(uv).g, frameAt(uv - ca).b);

  // Two-level bloom with a red-orange halation fringe, the way film scatters light.
  vec3 a = texture(uBloomA, uv).rgb;
  vec3 b = texture(uBloomB, uv).rgb;
  vec3 glow = a * .55 + b * vec3(1.15, .62, .42);
  col += glow * uBloom;

  // God rays: march towards the star's centre, gathering only its electric cyan/blue
  // and the orange of the contracting ball, so the paper itself never streaks.
  if (uRays.z > 0.) {
    vec2 centre = vec2(uRays.x, res.y - uRays.y) / res;
    vec2 step = (centre - uv) / 36.;
    vec2 s = uv + step * hash(px + uFrameIndex);
    vec3 rays = vec3(0);
    float decay = 1.;
    for (int i = 0; i < 36; i++) {
      vec3 f = frameAt(s);
      float electric = smoothstep(.12, .55, f.b - f.r) + smoothstep(.35, .8, f.r - f.b) * .8;
      rays += f * electric * decay;
      decay *= .94;
      s += step;
    }
    col += rays / 36. * uRays.z;
  }

  // Light leak: a warm bloom of light from the frame edge on hard cuts.
  if (uLeak.w > 0.) {
    float l = exp(-dot(uv - uLeak.xy, uv - uLeak.xy) / (uLeak.z * uLeak.z));
    col = 1. - (1. - col) * (1. - uLeakColor * l * uLeak.w);   // screen
  }

  // Vignette, a little deeper on the dark shots.
  col *= 1. - uVignette * smoothstep(.15, .9, edge * 2.2);

  // Luma-aware grain: strongest in the mid-tones, like silver halide.
  float l = luma(col);
  float g = hash(px * .73 + uFrameIndex * 17.31) + hash(px * 1.31 - uFrameIndex * 9.17) - 1.;
  col += g * uGrain * (.35 + 4. * l * (1. - l));

  outColor = vec4(clamp(col, 0., 1.), 1);
}`;

export class Enhancer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('The enhanced grade needs WebGL2.');
    this.gl = gl;
    gl.bindVertexArray(gl.createVertexArray());
    this.programs = {
      bright: this.program(BRIGHT),
      blur: this.program(BLUR),
      final: this.program(FINAL),
    };
    this.source = this.texture(width, height);
    const half = [Math.ceil(width / 2), Math.ceil(height / 2)];
    const quarter = [Math.ceil(width / 4), Math.ceil(height / 4)];
    this.targets = {
      halfA: this.target(...half),
      halfB: this.target(...half),
      quarterA: this.target(...quarter),
      quarterB: this.target(...quarter),
    };
  }

  program(source) {
    const gl = this.gl;
    const compile = (type, text) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, source));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    return program;
  }

  texture(width, height) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  target(width, height) {
    const gl = this.gl;
    const texture = this.texture(width, height);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { texture, framebuffer, width, height };
  }

  pass(program, target, uniforms, textures) {
    const gl = this.gl;
    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
    const w = target ? target.width : this.width;
    const h = target ? target.height : this.height;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(gl.getUniformLocation(program, 'uSize'), w, h);
    Object.entries(textures).forEach(([name, texture], unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(gl.getUniformLocation(program, name), unit);
    });
    for (const [name, value] of Object.entries(uniforms)) {
      const location = gl.getUniformLocation(program, name);
      if (!location) continue;
      if (Array.isArray(value) && Array.isArray(value[0])) gl.uniform4fv(location, value.flat());
      else if (Array.isArray(value)) gl[`uniform${value.length}fv`](location, value);
      else gl.uniform1f(location, value);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Grade `source` (a canvas holding the exact frame) into `ctx` with `look` parameters. */
  render(ctx, source, look) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    const { halfA, halfB, quarterA, quarterB } = this.targets;
    const { bright, blur, final } = this.programs;
    this.pass(bright, halfA, { uThreshold: look.threshold }, { uSrc: this.source });
    this.pass(blur, halfB, { uDir: [1, 0] }, { uSrc: halfA.texture });
    this.pass(blur, halfA, { uDir: [0, 1] }, { uSrc: halfB.texture });
    this.pass(blur, quarterA, { uDir: [2, 0] }, { uSrc: halfA.texture });
    this.pass(blur, quarterB, { uDir: [0, 2] }, { uSrc: quarterA.texture });
    this.pass(blur, quarterA, { uDir: [3.5, 0] }, { uSrc: quarterB.texture });
    this.pass(blur, quarterB, { uDir: [0, 3.5] }, { uSrc: quarterA.texture });
    const shocks = Array.from({ length: 6 }, (_, i) => look.shocks[i] || [0, 0, 0, 0]);
    this.pass(final, null, {
      uTime: look.time,
      uFrameIndex: look.frame,
      uBloom: look.bloom,
      uHaze: look.haze,
      uShock: shocks,
      uRays: look.rays,
      uLeak: look.leak,
      uLeakColor: look.leakColor,
      uWeave: look.weave,
      uAberration: look.aberration,
      uGrain: look.grain,
      uVignette: look.vignette,
    }, { uFrame: this.source, uBloomA: halfA.texture, uBloomB: quarterB.texture });
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(this.canvas, 0, 0);
    ctx.restore();
  }
}
