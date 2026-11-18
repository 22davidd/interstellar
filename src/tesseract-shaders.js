export const structureVertex = /* glsl */`
  in vec4 railData;
  out vec3 localPoint;
  out vec3 localNormal;
  out vec3 worldNormal;
  out vec3 worldPoint;
  out vec3 size;
  flat out vec4 data;

  void main() {
    localPoint = position;
    localNormal = normal;
    worldNormal = normalize(mat3(instanceMatrix) * normal);
    vec4 p = modelMatrix * instanceMatrix * vec4(position, 1.0);
    worldPoint = p.xyz;
    size = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    data = railData;
    gl_Position = projectionMatrix * viewMatrix * p;
  }
`;

export const structureFragment = /* glsl */`
  in vec3 localPoint;
  in vec3 localNormal;
  in vec3 worldNormal;
  in vec3 worldPoint;
  in vec3 size;
  flat in vec4 data;
  out vec4 outColor;
  const vec3 AMBER = vec3(1.0, .43, .145);
  const vec3 STEEL = vec3(.26, .49, .68);

  float hash(vec2 v) {
    vec3 p = fract(vec3(v.xyx) * .1013);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  void main() {
    float style = data.y;
    float seed = data.x;
    if (style > 1.5) {
      float l = max(max(size.x, size.y), size.z);
      float along = dot(localPoint, step(vec3(l - .001), size)) + .5;
      float endCap = smoothstep(0.0, .14, along) * smoothstep(0.0, .14, 1.0 - along);
      float flicker = .84 + .16 * sin(along * 15.0 + 20.0 * seed);
      vec3 lamp = mix(vec3(1.0, .36, .112), vec3(.52, .78, 1.0), data.z);
      vec3 hot = mix(lamp, vec3(1.0, .72, .43), smoothstep(4.0, 10.5, data.w) * (1.0 - data.z));
      outColor = vec4(hot * data.w * (.31 + .69 * endCap) * flicker, 1.0);
      return;
    }

    vec3 n = normalize(worldNormal);
    vec3 f = abs(localNormal);
    vec2 p = f.x > .5 ? localPoint.yz : f.y > .5 ? localPoint.xz : localPoint.xy;
    vec2 dimensions = f.x > .5 ? size.yz : f.y > .5 ? size.xz : size.xy;
    vec2 uv = p + .5;
    vec2 rim = min(uv, 1.0 - uv);
    float width = dimensions.x < dimensions.y ? uv.x : uv.y;
    float lengthwise = dimensions.x < dimensions.y ? uv.y : uv.x;
    float bands = style < .5 ? 8.0 : 34.0;
    float phase = width * bands;
    float ribs = .55 + .45 * cos(phase * 6.283);
    ribs = mix(ribs, .62, smoothstep(.22, .78, fwidth(phase)));
    vec2 brushing = vec2(width * 103.0, lengthwise * 9.0);
    float grain = hash(floor(brushing) + seed * 19.0);
    float fine = mix(grain, .5, smoothstep(.35, 1.3, length(fwidth(brushing))));
    float seal = smoothstep(.011, .035, abs(fract(lengthwise * (3.0 + floor(seed * 9.0))) - .5));
    float bevel = 1.0 - smoothstep(.005, .035, min(rim.x, rim.y));
    float inlay = smoothstep(.78, .98, abs(width - .5) * 2.0);
    vec3 base = mix(vec3(.030, .019, .011), vec3(.029, .038, .043), data.z);
    base *= (.60 + .6 * seed) * (.52 + ribs * .48) * (.79 + fine * .26) * (.62 + .38 * seal);
    base += vec3(.020, .013, .008) * bevel * (.8 + data.w);

    vec3 view = normalize(cameraPosition - worldPoint);
    vec3 key = normalize(vec3(-.43, -.51, -.68));
    vec3 fill = normalize(vec3(.49, .64, .59));
    float lambert = .25 + .18 * max(dot(n, fill), 0.0) + .23 * max(dot(n, key), 0.0);
    float gleam = pow(max(dot(n, normalize(view + key)), 0.0), 14.0);
    float edge = pow(1.0 - abs(dot(n, view)), 2.0);
    float vertical = smoothstep(.20, .90, .5 + .5 * cos(worldPoint.y * .53 + worldPoint.x * .072));
    float side = exp(-abs(worldPoint.x - 10.5) * .095) + .41 * exp(-abs(worldPoint.x + 12.0) * .12);
    float cool = exp(-length((worldPoint.xz - vec2(-10.0, -8.0)) / vec2(15, 7))) * (.34 + .66 * seed);
    vec3 ambient = base * (lambert + side * vertical * 3.15 + cool * 3.3);
    vec3 specular = ((AMBER * side * vertical) + STEEL * cool) * (.026 * inlay + gleam * .071 + edge * bevel * .056);
    outColor = vec4(ambient + specular, 1.0);
  }
`;

export const atmosphereFragment = /* glsl */`
  in vec2 screenUV;
  out vec4 outColor;
  uniform sampler2D tDiffuse;
  uniform sampler2D depthMap;
  uniform mat4 inverseProjection;
  uniform mat4 eyeToWorld;
  uniform float time;
  uniform int lowQuality;

  float shaft(vec2 p, vec2 center, vec2 width) {
    vec2 d = (p - center) / width;
    return exp(-dot(d, d));
  }

  void main() {
    vec3 sceneColor = texture(tDiffuse, screenUV).rgb;
    float depth = texture(depthMap, screenUV).r;
    vec2 ndc = screenUV * 2.0 - 1.0;
    vec4 hit = inverseProjection * vec4(ndc, depth * 2.0 - 1.0, 1.0);
    vec3 delta = mat3(eyeToWorld) * (hit.xyz / hit.w);
    float path = min(132.0, length(delta));
    vec3 direction = normalize(delta);
    vec3 eye = eyeToWorld[3].xyz;
    float transmittance = 1.0;
    vec3 fog = vec3(0.0);
    int count = lowQuality > 0 ? 10 : 17;
    for (int i = 0; i < 17; i++) {
      if (i >= count) break;
      float stepA = float(i) / float(count);
      float stepB = float(i + 1) / float(count);
      float a = stepA * stepA * path;
      float b = stepB * stepB * path;
      vec3 p = eye + direction * ((a + b) * .5);
      vec2 drift = vec2(sin(p.y * .074), cos(p.y * .038)) * 1.8;
      float high = exp(-abs(p.y + 11.0) * .021);
      float ice = shaft(p.xz, vec2(-8.0, -6.5) + drift, vec2(8.5, 5.8)) * high;
      float amber = shaft(p.xz, vec2(8.0, 9.8) - drift * .5, vec2(5.1, 4.4));
      amber *= exp(-abs(p.y + 9.0) * .035) * (.65 + .35 * cos(p.y * .145));
      float center = shaft(p.xz, vec2(-.5, -2.0), vec2(14, 14));
      float textureDrift = .88 + .12 * sin(p.y * .21 + p.x * .13 - p.z * .07 + time * .12);
      float density = (.0031 + .021 * ice + .015 * amber + center * .004) * textureDrift;
      vec3 emission = vec3(.011, .015, .021) * density;
      emission += ice * vec3(.0018, .0038, .0060) * textureDrift;
      emission += amber * vec3(.00525, .00255, .00095) * textureDrift;
      float dt = b - a;
      float transmission = exp(-density * dt);
      fog += transmittance * emission * (1.0 - transmission) / max(density, .001);
      transmittance *= transmission;
    }
    float vignette = 1.0 - .46 * dot(screenUV - .5, screenUV - .5);
    outColor = vec4((sceneColor * transmittance + fog) * vignette, 1.0);
  }
`;
