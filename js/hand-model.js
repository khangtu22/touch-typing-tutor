/**
 * Dependency-free, orthographic WebGL hand model. Smoothly joined volumes give
 * the palm, wrist and articulated fingers a single skin surface. The existing
 * SVG guide remains the fallback and draws the teaching cues above this canvas.
 */

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
uniform vec2 uSize;
uniform vec4 uBounds;
out vec2 vScreen;
void main() {
  vScreen = uBounds.xy + aPosition * uBounds.zw;
  vec2 clip = vScreen / uSize * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vScreen;
out vec4 outColor;
uniform vec2 uSize;
uniform vec2 uOrigin;
uniform float uScale;
uniform float uPalmWidth;
uniform float uSide;
uniform vec4 uJoints[20];

float join(float a, float b, float radius) {
  float h = max(radius - abs(a - b), 0.0) / radius;
  return min(a, b) - h * h * radius * 0.25;
}

float ellipsoid(vec3 p, vec3 center, vec3 radii) {
  return (length((p - center) / radii) - 1.0) * min(radii.x, min(radii.y, radii.z));
}

float bone(vec3 p, vec4 a, vec4 b) {
  vec3 axis = b.xyz - a.xyz;
  float span = max(length(axis), 0.01);
  axis /= span;
  vec3 offset = p - a.xyz;
  float along = dot(offset, axis);
  float radial = length(offset - axis * along);
  float taper = clamp((b.w - a.w) / span, -0.98, 0.98);
  // The nearest sphere on a tapered bone lies off the perpendicular projection.
  // Correcting for that slope removes the rings at the ends of each phalanx.
  float t = clamp(along + taper * radial / sqrt(1.0 - taper * taper), 0.0, span);
  return length(offset - axis * t) - mix(a.w, b.w, t / span);
}

float surface(vec3 p) {
  // A broad metacarpal arch, a gently domed back, and a narrower oval wrist.
  float d = ellipsoid(p, vec3(0.0, 61.0, 27.0), vec3(uPalmWidth * 0.92, 78.0, 26.0));
  d = join(d, ellipsoid(p, vec3(0.0, 20.0, 33.0), vec3(uPalmWidth, 39.0, 22.0)), 15.0);
  d = join(d, ellipsoid(p, vec3(uSide * (uPalmWidth - 22.0), 76.0, 24.0), vec3(31.0, 48.0, 25.0)), 16.0);
  d = join(d, bone(p * vec3(1.0, 1.0, 1.9),
    vec4(uSide * 4.0, 119.0, 35.0, 41.0),
    vec4(uSide * 12.0, 235.0, 29.0, 44.0)) / 1.9, 20.0);

  // Subtle extensor ridges converge into the wrist rather than striping the palm.
  float tendons = 0.0;
  for (int f = 0; f < 4; f++) {
    vec2 start = uJoints[f * 4].xy + vec2(0.0, 8.0);
    vec2 end = vec2(uSide * 8.0 + (float(f) - 1.5) * 6.0, 139.0);
    vec2 axis = end - start;
    float t = clamp(dot(p.xy - start, axis) / max(dot(axis, axis), 0.1), 0.0, 1.0);
    float distance = length(p.xy - mix(start, end, t));
    tendons += exp(-pow(distance / 6.5, 2.0)) * sin(t * 3.14159) * 0.5;
  }
  d -= tendons * smoothstep(37.0, 53.0, p.z);

  for (int f = 0; f < 5; f++) {
    int base = f * 4;
    float digit = bone(p, uJoints[base], uJoints[base + 1]);
    digit = join(digit, bone(p, uJoints[base + 1], uJoints[base + 2]), 4.0);
    digit = join(digit, bone(p, uJoints[base + 2], uJoints[base + 3]), 4.0);
    d = join(d, digit, f == 4 ? 13.0 : 9.0);
  }
  return d;
}

float hash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}

float roundedNail(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + radius;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

vec3 normalAt(vec3 p) {
  const vec2 e = vec2(0.42, -0.42);
  return normalize(e.xyy * surface(p + e.xyy) + e.yyx * surface(p + e.yyx)
    + e.yxy * surface(p + e.yxy) + e.xxx * surface(p + e.xxx));
}

vec3 shade(vec3 p, vec3 n) {
  float variation = noise(p * 0.065) - 0.5;
  vec3 skin = vec3(0.52, 0.295, 0.205) + variation * vec3(0.025, 0.019, 0.016);
  float crease = 0.0, blush = 0.0, nail = 0.0, nailEdge = 0.0, cuticle = 0.0;

  for (int f = 0; f < 5; f++) {
    int base = f * 4;
    vec4 tip = uJoints[base + 3];
    vec2 towardRoot = normalize(uJoints[base + 2].xy - tip.xy + vec2(0.0, 0.001));
    vec2 across = vec2(towardRoot.y, -towardRoot.x);

    // Short, rounded-square nails sit on the distal phalanx, following its turn.
    vec2 delta = p.xy - (tip.xy + towardRoot * 4.7);
    vec2 uv = vec2(dot(delta, across), dot(delta, towardRoot));
    vec2 nailSize = vec2(tip.w * 0.63, f == 4 ? 7.8 : 9.0);
    float nd = roundedNail(uv, nailSize, 4.3);
    float dorsal = smoothstep(0.25, 0.7, n.z) * smoothstep(tip.z + 1.0, tip.z + 7.0, p.z);
    float plate = (1.0 - smoothstep(-0.3, 0.45, nd)) * dorsal;
    nail = max(nail, plate);
    nailEdge = max(nailEdge, plate * (1.0 - smoothstep(-nailSize.y + 0.8, -nailSize.y + 1.8, uv.y)));
    cuticle = max(cuticle, exp(-abs(nd - 0.45) * 2.3) * dorsal);

    for (int j = 1; j < 3; j++) {
      if (f == 4 && j == 1) continue;
      vec4 joint = uJoints[base + j];
      vec2 offset = p.xy - joint.xy;
      vec2 local = vec2(dot(offset, across), dot(offset, towardRoot));
      float arc = local.y - 0.018 * local.x * local.x;
      float lines = exp(-pow(arc / 0.48, 2.0)) * 0.38
        + exp(-pow((arc - 2.4) / 0.43, 2.0)) * 0.21
        + exp(-pow((arc + 2.0) / 0.38, 2.0)) * 0.13;
      float width = exp(-pow(local.x / (joint.w * 0.65), 4.0));
      crease = max(crease, lines * width * smoothstep(0.45, 0.85, n.z));
      blush = max(blush, exp(-dot(offset, offset) / 180.0) * n.z);
    }
  }

  skin = mix(skin, skin * vec3(1.04, 0.91, 0.89), blush * 0.32);
  skin *= 1.0 - crease * 0.25 - cuticle * 0.1;
  skin = mix(skin, vec3(0.64, 0.405, 0.34), nail * 0.84);
  skin = mix(skin, vec3(0.79, 0.70, 0.57), nailEdge * 0.55);

  // A large softbox and cool fill keep the skin matte, with a restrained nail sheen.
  float pore = noise(p * 1.8) - 0.5;
  n = normalize(n + vec3(pore * 0.035, pore * 0.022, 0.0) * (1.0 - nail));
  vec3 light = normalize(vec3(-0.5, -0.45, 0.85));
  float diffuse = max(dot(n, light), 0.0);
  float fill = max(dot(n, normalize(vec3(0.7, 0.25, 0.5))), 0.0);
  float wrap = pow(clamp((dot(n, light) + 0.55) / 1.55, 0.0, 1.0), 2.0);
  float occlusion = clamp(surface(p + n * 9.0) / 9.0, 0.5, 1.0);
  vec3 color = skin * (vec3(0.30, 0.32, 0.36) + diffuse * 0.65 + fill * vec3(0.13, 0.15, 0.18));
  color += skin * vec3(0.13, 0.055, 0.028) * wrap;
  color *= 0.82 + 0.18 * occlusion;
  vec3 halfLight = normalize(light + vec3(0,0,1));
  float specular = pow(max(dot(n, halfLight), 0.0), mix(18.0, 65.0, nail));
  color += vec3(1.0, 0.91, 0.80) * specular * mix(0.027, 0.13, nail);
  return pow(max(color, 0.0), vec3(1.0 / 2.2));
}

void main() {
  vec2 xy = (vScreen - uOrigin) / uScale;
  vec3 p = vec3(xy, 112.0);
  bool hit = false;
  for (int step = 0; step < 56; step++) {
    float distance = surface(p);
    if (distance < 0.32) { hit = true; break; }
    p.z -= max(distance * 0.85, 0.24);
    if (p.z < -12.0) break;
  }

  float fade = 1.0 - smoothstep(uSize.y - 78.0 * uScale, uSize.y - 5.0 * uScale, vScreen.y);
  if (hit) {
    outColor = vec4(shade(p, normalAt(p)) * fade, fade);
  } else {
    float shadow = surface(vec3(xy - vec2(5.0, 9.0), 25.0));
    float alpha = exp(-max(shadow, 0.0) / 7.0) * 0.24 * fade;
    outColor = vec4(vec3(0.075, 0.052, 0.044) * alpha, alpha);
  }
}`;

const DIGITS = ['pinky', 'ring', 'middle', 'index', 'thumb'];

export class HandModel {
  constructor(stage, onRestore) {
    this.stage = stage;
    this.onRestore = onRestore;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'keyboard-hand-model';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.hands = new Map();
    this.poses = new Map();
    this.ready = false;
    this.gl = this.canvas.getContext('webgl2', {
      alpha: true, antialias: false, depth: false,
      premultipliedAlpha: true, powerPreference: 'low-power'
    });
    if (!this.gl) return;

    this.handleContextLost = event => {
      event.preventDefault();
      this.ready = false;
      this.stage.classList.remove('has-3d-hands');
      this.onRestore?.();
    };
    this.handleContextRestored = () => {
      this.initialize();
      this.onRestore?.();
    };
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    stage.appendChild(this.canvas);
    this.initialize();
  }

  initialize() {
    const gl = this.gl;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const reason = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(reason);
      }
      return shader;
    };
    let vertex, fragment, program;
    try {
      vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
      fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
      }
      this.program = program;
      gl.useProgram(program);
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 0,1, 0,1, 1,0, 1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      this.uniforms = Object.fromEntries(
        ['uSize', 'uBounds', 'uOrigin', 'uScale', 'uPalmWidth', 'uSide', 'uJoints[0]']
          .map(name => [name, gl.getUniformLocation(program, name)])
      );
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      this.ready = true;
    } catch (error) {
      if (program) gl.deleteProgram(program);
      this.ready = false;
      this.stage.classList.remove('has-3d-hands');
      console.warn('Hand model unavailable; using the SVG guide.', error.message);
    } finally {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
    }
  }

  resize(width, height, scale) {
    this.width = width;
    this.height = height;
    this.scale = scale;
    // Limit fragment work on Retina/mobile screens. Nothing renders while idle.
    const density = Math.min(window.devicePixelRatio || 1, 1.5);
    const pixelWidth = Math.round(width * density);
    const pixelHeight = Math.round(height * density);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.canvas.style.height = `${height}px`;
  }

  setPalm(side, knuckles) {
    const pinky = knuckles[`${side}-pinky`];
    const index = knuckles[`${side}-index`];
    const middle = knuckles[`${side}-middle`];
    const ring = knuckles[`${side}-ring`];
    this.hands.set(side, {
      x: (pinky.x + index.x) / 2,
      y: (middle.y + ring.y) / 2,
      radius: Math.abs(index.x - pinky.x) / (2 * this.scale) + 13,
      joints: this.hands.get(side)?.joints || new Float32Array(80)
    });
  }

  setFinger(nodeId, pose) {
    this.poses.set(nodeId, pose);
  }

  draw(offsets) {
    if (!this.ready || !this.width || !this.stage.isConnected) return;
    if (!this.canvas.getClientRects().length || document.visibilityState === 'hidden') return;
    const gl = this.gl, u = this.uniforms, scale = this.scale;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniform2f(u.uSize, this.width, this.height);
    gl.uniform1f(u.uScale, scale);

    for (const [side, hand] of this.hands) {
      const offset = offsets[side];
      const originX = hand.x + offset.x, originY = hand.y + offset.y;
      let minX = originX - (hand.radius + 32) * scale;
      let maxX = originX + (hand.radius + 32) * scale;
      let minY = originY - 35 * scale;
      let complete = true;

      DIGITS.forEach((digit, f) => {
        const pose = this.poses.get(`fg-${side}-${digit}`);
        if (!pose) { complete = false; return; }
        const points = [pose.knuckle, pose.jointOne, pose.jointTwo, pose.tip];
        const curl = Math.max(0, 1 - Math.hypot(pose.tip.x - pose.knuckle.x, pose.tip.y - pose.knuckle.y) / (170 * scale));
        const heights = digit === 'thumb' ? [25, 30, 23, 12] : [39, 36 + curl * 30, 27 + curl * 12, 12];
        points.forEach((point, j) => {
          const i = (f * 4 + j) * 4;
          hand.joints[i] = (point.x - originX) / scale;
          hand.joints[i + 1] = (point.y - originY) / scale;
          hand.joints[i + 2] = heights[j] + pose.elevation * (j === 0 ? 0 : 13);
          hand.joints[i + 3] = pose.widths[j] / (2 * scale);
          minX = Math.min(minX, point.x - 32 * scale);
          maxX = Math.max(maxX, point.x + 32 * scale);
          minY = Math.min(minY, point.y - 30 * scale);
        });
      });
      if (!complete) continue;

      gl.uniform2f(u.uOrigin, originX, originY);
      gl.uniform1f(u.uPalmWidth, hand.radius);
      gl.uniform1f(u.uSide, side === 'left' ? 1 : -1);
      gl.uniform4fv(u['uJoints[0]'], hand.joints);
      gl.uniform4f(u.uBounds, minX, minY, maxX - minX, this.height - minY);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    this.stage.classList.add('has-3d-hands');
  }

  destroy() {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    if (this.gl) {
      if (this.buffer) this.gl.deleteBuffer(this.buffer);
      if (this.program) this.gl.deleteProgram(this.program);
      this.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.canvas.remove();
    this.stage.classList.remove('has-3d-hands');
    this.ready = false;
  }
}
