import * as THREE from 'three';

export const screenVertex = /* glsl */`
  out vec2 screenUV;
  void main() {
    screenUV = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const angularStep = 0.035;
const curveRows = 73;
const curveWidth = 1536;
const maxAngle = angularStep * (4 * (curveRows - 1) - 1);

const solveFragment = /* glsl */`
  out vec4 outColor;
  uniform float eyeRadius;
  uniform int width;
  uniform int rows;
  uniform float stepAngle;
  const float PI = 3.14159265359;
  const float CRITICAL_B = 5.196152423;

  float acceleration(float u) {
    return u * (3.0 * u - 1.0);
  }

  // RK4 applied to the Schwarzschild null orbit in reciprocal radius.
  vec2 advance(vec2 state, float h) {
    vec2 a = vec2(state.y, acceleration(state.x));
    vec2 b = vec2(state.y + h * .5 * a.y, acceleration(state.x + h * .5 * a.x));
    vec2 c = vec2(state.y + h * .5 * b.y, acceleration(state.x + h * .5 * b.x));
    vec2 d = vec2(state.y + h * c.y, acceleration(state.x + h * c.x));
    return state + (h / 6.0) * (a + 2.0 * (b + c) + d);
  }

  void main() {
    float q = 2.0 * gl_FragCoord.x / float(width) - 1.0;
    float critical = asin(CRITICAL_B * sqrt(1.0 - 2.0 / eyeRadius) / eyeRadius);
    float alpha = critical + sign(q) * q * q * (q < 0.0 ? critical : PI - critical);
    alpha = clamp(alpha, .0005, PI - .0005);
    vec2 state = vec2(1.0, cos(alpha) / sin(alpha)) / eyeRadius;
    int row = int(gl_FragCoord.y);
    bool eventRow = row == rows - 1;
    int first = 4 * row;
    int last = eventRow ? first - 1 : first + 3;
    vec4 samples = vec4(state.x);
    float escapeAngle = -1.0;
    for (int i = 0; i <= ${4 * (curveRows - 1) - 1}; i++) {
      if (i >= first && !eventRow) samples[i - first] = state.x;
      if (i == last) break;
      // Outside r = 2 we can still see disk emission on the inbound leg.
      if (state.x > .5 || state.x < 0.0) {
        if (!eventRow) {
          int start = max(0, i - first);
          for (int j = 0; j < 4; j++) if (j >= start) samples[j] = state.x > .5 ? .51 : -.01;
        }
        break;
      }
      vec2 next = advance(state, stepAngle);
      if (next.x < 0.0) {
        escapeAngle = (float(i) + state.x / max(1e-8, state.x - next.x)) * stepAngle;
      }
      state = next;
    }
    outColor = eventRow ? vec4(escapeAngle, 0.0, 0.0, 0.0) : samples;
  }
`;

export class PhotonCurves {
  constructor(renderer) {
    this.renderer = renderer;
    this.radius = 0;
    this.target = new THREE.WebGLRenderTarget(curveWidth, curveRows, {
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    this.material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: screenVertex,
      fragmentShader: solveFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        eyeRadius: { value: 31 },
        width: { value: curveWidth },
        rows: { value: curveRows },
        stepAngle: { value: angularStep },
      },
    });
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
    this.camera = new THREE.Camera();
  }

  update(radius) {
    if (Math.abs(radius - this.radius) < .045) return;
    this.radius = radius;
    this.material.uniforms.eyeRadius.value = radius;
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
  }

  get texture() { return this.target.texture; }
}

export const curveGLSL = /* glsl */`
  uniform highp sampler2D photonCurves;
  uniform float curveRadius;
  const int WIDTH = ${curveWidth};
  const int EVENT_ROW = ${curveRows - 1};
  const float STEP = ${angularStep};
  const float MAX_ANGLE = ${maxAngle.toFixed(4)};
  const float PI = 3.14159265359;
  const float TAU = 6.28318530718;
  const float CRITICAL_B = 5.196152423;

  vec3 curveAddress(float alpha) {
    float critical = asin(CRITICAL_B * sqrt(1.0 - 2.0 / curveRadius) / curveRadius);
    float side = alpha - critical;
    float s = sign(side) * sqrt(abs(side) / (side < 0.0 ? critical : PI - critical));
    float x = (.5 + s * .5) * float(WIDTH) - .5;
    // Never interpolate between a captured ray and an escaping one.
    x = clamp(x, side < 0.0 ? 0.0 : float(WIDTH / 2),
                  side < 0.0 ? float(WIDTH / 2 - 1) : float(WIDTH - 1));
    return vec3(floor(x), min(float(WIDTH - 1), ceil(x)), fract(x));
  }

  float curveValue(int index, vec3 address) {
    ivec2 cell = ivec2(int(address.x), index / 4);
    int channel = index % 4;
    float a = texelFetch(photonCurves, cell, 0)[channel];
    float b = texelFetch(photonCurves, ivec2(int(address.y), cell.y), 0)[channel];
    return mix(a, b, address.z);
  }

  vec2 curveSegment(float angle, vec3 address) {
    float x = clamp(angle, 0.0, MAX_ANGLE - .0001) / STEP;
    int i = int(x);
    float a = curveValue(i, address);
    float b = curveValue(i + 1, address);
    return vec2(mix(a, b, fract(x)), (b - a) / STEP);
  }

  float escapedAt(vec3 address) {
    float a = texelFetch(photonCurves, ivec2(int(address.x), EVENT_ROW), 0).r;
    float b = texelFetch(photonCurves, ivec2(int(address.y), EVENT_ROW), 0).r;
    if (min(a, b) < 0.0) return -1.0;
    return mix(a, b, address.z);
  }
`;
