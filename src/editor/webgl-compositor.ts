import type { BlendMode } from './types'

/** Blend modes with explicit GPU parity math. HSL component modes stay on CPU until parity fixtures exist. */
export const GPU_BLEND_MODES = [
  'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion',
] as const satisfies readonly BlendMode[]
export type GpuBlendMode = (typeof GPU_BLEND_MODES)[number]

const MODE: Record<GpuBlendMode, number> = Object.fromEntries(GPU_BLEND_MODES.map((m, i) => [m, i])) as Record<GpuBlendMode, number>
export const gpuBlendSupported = (mode: BlendMode): mode is GpuBlendMode => (GPU_BLEND_MODES as readonly string[]).includes(mode)
export const gpuBlendIndex = (mode: GpuBlendMode) => MODE[mode]

const VERT = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = vec2((aPosition.x + 1.0) * 0.5, 1.0 - (aPosition.y + 1.0) * 0.5);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

export const COMPOSITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uBackdrop;
uniform sampler2D uSource;
uniform float uOpacity;
uniform int uMode;
out vec4 outColor;

float softLight(float b, float s) {
  if (s <= 0.5) return b - (1.0 - 2.0 * s) * b * (1.0 - b);
  float d = b <= 0.25 ? ((16.0 * b - 12.0) * b + 4.0) * b : sqrt(b);
  return b + (2.0 * s - 1.0) * (d - b);
}
vec3 blend(vec3 b, vec3 s) {
  if (uMode == 0) return s;
  if (uMode == 1) return b * s;
  if (uMode == 2) return b + s - b * s;
  if (uMode == 3) return mix(2.0 * b * s, 1.0 - 2.0 * (1.0 - b) * (1.0 - s), step(vec3(0.5), b));
  if (uMode == 4) return min(b, s);
  if (uMode == 5) return max(b, s);
  if (uMode == 6) return min(vec3(1.0), b / max(vec3(0.000001), 1.0 - s));
  if (uMode == 7) return 1.0 - min(vec3(1.0), (1.0 - b) / max(vec3(0.000001), s));
  if (uMode == 8) return mix(2.0 * b * s, 1.0 - 2.0 * (1.0 - b) * (1.0 - s), step(vec3(0.5), s));
  if (uMode == 9) return vec3(softLight(b.r,s.r), softLight(b.g,s.g), softLight(b.b,s.b));
  if (uMode == 10) return abs(b - s);
  return b + s - 2.0 * b * s;
}
void main() {
  vec4 cb = texture(uBackdrop, vUv);
  vec4 cs0 = texture(uSource, vUv);
  float asrc = clamp(cs0.a * uOpacity, 0.0, 1.0);
  float ab = clamp(cb.a, 0.0, 1.0);
  vec3 cs = cs0.rgb;
  vec3 B = blend(cb.rgb, cs);
  float ao = asrc + ab - asrc * ab;
  vec3 premul = (1.0 - asrc) * cb.rgb * ab + (1.0 - ab) * cs * asrc + asrc * ab * B;
  outColor = ao > 0.000001 ? vec4(premul / ao, ao) : vec4(0.0);
}`

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type); if (!shader) throw Error('WebGL could not create a shader.')
  gl.shaderSource(shader, source); gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'unknown shader error'; gl.deleteShader(shader); throw Error(log)
  }
  return shader
}

function program(gl: WebGL2RenderingContext) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT), fs = compile(gl, gl.FRAGMENT_SHADER, COMPOSITE_FRAGMENT_SHADER)
  const p = gl.createProgram(); if (!p) throw Error('WebGL could not create a program.')
  gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p); gl.deleteShader(vs); gl.deleteShader(fs)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { const log = gl.getProgramInfoLog(p) ?? 'unknown link error'; gl.deleteProgram(p); throw Error(log) }
  return p
}

export interface GpuTexture { texture: WebGLTexture; width: number; height: number }

/**
 * Tile-sized WebGL2 compositor. It does not own document semantics: callers feed resolved source/backdrop tiles.
 * That keeps the CPU renderer as a fidelity fallback and makes context loss disposable/rebuildable.
 */
export class WebGLTileCompositor {
  readonly gl: WebGL2RenderingContext
  private readonly p: WebGLProgram
  private readonly vao: WebGLVertexArrayObject
  private readonly framebuffer: WebGLFramebuffer
  private lost = false

  constructor(public canvas: HTMLCanvasElement | OffscreenCanvas) {
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false }) as WebGL2RenderingContext | null
    if (!gl) throw Error('WebGL2 is unavailable.')
    this.gl = gl; this.p = program(gl)
    const vao = gl.createVertexArray(), buffer = gl.createBuffer(), framebuffer = gl.createFramebuffer()
    if (!vao || !buffer || !framebuffer) throw Error('WebGL could not allocate compositor resources.')
    this.vao = vao; this.framebuffer = framebuffer
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(this.p, 'aPosition'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)
    if ('addEventListener' in canvas) {
      canvas.addEventListener('webglcontextlost', (e: Event) => { e.preventDefault(); this.lost = true })
      canvas.addEventListener('webglcontextrestored', () => { this.lost = false })
    }
  }

  get contextLost() { return this.lost || this.gl.isContextLost() }

  texture(width: number, height: number, source?: TexImageSource | null): GpuTexture {
    if (this.contextLost) throw Error('WebGL context is lost.')
    const gl = this.gl, texture = gl.createTexture(); if (!texture) throw Error('WebGL could not allocate a texture.')
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0)
    if (source) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source)
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    return { texture, width, height }
  }

  upload(target: GpuTexture, source: TexImageSource) {
    const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, target.texture); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source)
  }

  /** Composite equal-sized tiles into `out`. Caller owns all textures. */
  composite(backdrop: GpuTexture, source: GpuTexture, out: GpuTexture, mode: GpuBlendMode = 'source-over', opacity = 1) {
    if (this.contextLost) throw Error('WebGL context is lost.')
    if (backdrop.width !== source.width || backdrop.height !== source.height || out.width !== source.width || out.height !== source.height) throw Error('GPU composite tiles must have the same dimensions.')
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, out.texture, 0)
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw Error('GPU compositor framebuffer is incomplete.')
    gl.viewport(0, 0, out.width, out.height); gl.disable(gl.BLEND); gl.useProgram(this.p); gl.bindVertexArray(this.vao)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, backdrop.texture); gl.uniform1i(gl.getUniformLocation(this.p, 'uBackdrop'), 0)
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, source.texture); gl.uniform1i(gl.getUniformLocation(this.p, 'uSource'), 1)
    gl.uniform1f(gl.getUniformLocation(this.p, 'uOpacity'), Math.max(0, Math.min(1, opacity)))
    gl.uniform1i(gl.getUniformLocation(this.p, 'uMode'), gpuBlendIndex(mode))
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null); gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  read(texture: GpuTexture) {
    const gl = this.gl, out = new Uint8Array(texture.width * texture.height * 4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.texture, 0)
    gl.readPixels(0, 0, texture.width, texture.height, gl.RGBA, gl.UNSIGNED_BYTE, out); gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return out
  }

  disposeTexture(value: GpuTexture) { this.gl.deleteTexture(value.texture) }
  dispose() { this.gl.deleteFramebuffer(this.framebuffer); this.gl.deleteVertexArray(this.vao); this.gl.deleteProgram(this.p) }
}
