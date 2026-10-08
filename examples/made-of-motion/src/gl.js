// Runs the film's shaders on one WebGL2 canvas and composites each result onto a 2D canvas,
// like fframes fills an `<image>` rectangle with a Skia runtime shader. The 2D canvas keeps
// the vector ink, type and layer stack; the GPU only produces shader layers.

import { MAIN, PRELUDE } from './shaders.js';

export class ShaderStage {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error('This composition needs WebGL2.');
    this.gl = gl;
    this.programs = new Map();
    this.textures = new Map();
    gl.bindVertexArray(gl.createVertexArray());
  }

  /**
   * Compile one of the shader sources in shaders.js under `name`. A `blend` layer is
   * translucent: it reads the canvas under it and does Skia's src-over itself.
   */
  define(name, source, { blend = false } = {}) {
    const gl = this.gl;
    const compile = (type, text) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(`Shader ${name} failed to compile:\n${gl.getShaderInfoLog(shader)}`);
      }
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, `#version 300 es
      void main() {
        vec2 p = vec2(gl_VertexID == 1 ? 3. : -1., gl_VertexID == 2 ? 3. : -1.);
        gl_Position = vec4(p, 0., 1.);
      }`));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, PRELUDE + source + MAIN));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Shader ${name} failed to link:\n${gl.getProgramInfoLog(program)}`);
    }
    const uniforms = new Map();
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      uniforms.set(info.name, { location: gl.getUniformLocation(program, info.name), type: info.type });
    }
    this.programs.set(name, { program, uniforms, blend });
  }

  /**
   * Upload RGBA8 pixels. Images stay straight (the shaders premultiply them the way usvgr
   * does); a canvas used as the blend destination is uploaded premultiplied, as it is stored.
   */
  texture(name, source, { premultiplied = false } = {}) {
    const gl = this.gl;
    let entry = this.textures.get(name);
    if (!entry) {
      entry = { texture: gl.createTexture() };
      this.textures.set(name, entry);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, entry.texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplied);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /**
   * Fill the canvas rectangle [x, y, w, h] of `ctx` with shader `name`. `time` and `frame`
   * are the scene-local iTime/iFrame, as fframes passes them.
   */
  draw(ctx, name, [x, y, w, h], uniforms = {}, { time = 0, frame = 0 } = {}) {
    if (w <= 0 || h <= 0) return;
    const entry = this.programs.get(name);
    if (!entry) throw new Error(`Unknown shader ${name}`);
    if (entry.blend) this.texture('dst', ctx.canvas, { premultiplied: true });
    this.render(entry, w, h, {
      uCanvasHeight: this.height,
      uZero: 0,
      uOrigin: [x, y],
      uBlend: entry.blend ? 1 : 0,
      uDst: 'dst',
      iResolution: [w, h, 1],
      iTime: time,
      iFrame: frame,
      ...uniforms,
    });
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    if (entry.blend) {
      // The shader already blended with what was there: replace the rectangle.
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.globalCompositeOperation = 'copy';
    }
    ctx.drawImage(this.canvas, 0, 0, w, h, x, y, w, h);
    ctx.restore();
  }

  /**
   * Like `draw`, but composite the layer normally (src-over) with a canvas drop shadow.
   * Only the enhanced grade uses this; the exact film blends inside the shader.
   */
  drawShadowed(ctx, name, [x, y, w, h], uniforms, { time = 0, frame = 0 }, shadow) {
    if (w <= 0 || h <= 0) return;
    const entry = this.programs.get(name);
    this.render(entry, w, h, {
      uCanvasHeight: this.height,
      uZero: 0,
      uOrigin: [x, y],
      uBlend: 0,
      iResolution: [w, h, 1],
      iTime: time,
      iFrame: frame,
      ...uniforms,
    });
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = shadow.x;
    ctx.shadowOffsetY = shadow.y;
    ctx.drawImage(this.canvas, 0, 0, w, h, x, y, w, h);
    ctx.restore();
  }

  /** Render into the top-left `w`×`h` corner of the WebGL canvas. */
  render(entry, w, h, values) {
    const gl = this.gl;
    gl.useProgram(entry.program);
    gl.viewport(0, this.height - h, w, h);
    gl.disable(gl.BLEND);
    let unit = 0;
    for (const [uniform, { location, type }] of entry.uniforms) {
      const value = values[uniform];
      if (value === undefined) continue;
      switch (type) {
        case gl.FLOAT: gl.uniform1f(location, value); break;
        case gl.FLOAT_VEC2: gl.uniform2fv(location, value); break;
        case gl.FLOAT_VEC3: gl.uniform3fv(location, value); break;
        case gl.FLOAT_VEC4: gl.uniform4fv(location, value); break;
        case gl.INT: gl.uniform1i(location, value); break;
        case gl.SAMPLER_2D: {
          const texture = this.textures.get(value);
          if (!texture) {
            if (value === 'dst') continue;
            throw new Error(`Texture ${value} is not loaded`);
          }
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, texture.texture);
          gl.uniform1i(location, unit++);
          break;
        }
        default: throw new Error(`Unsupported uniform type for ${uniform}`);
      }
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
