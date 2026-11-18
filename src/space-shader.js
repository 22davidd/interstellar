import { curveGLSL } from './geodesics.js';

export const spaceFragment = /* glsl */`
  in vec2 screenUV;
  out vec4 outColor;

  uniform mat4 inverseProjection;
  uniform mat4 eyeToWorld;
  uniform float clock;
  uniform int detail;
  ${curveGLSL}

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .11369, .13787));
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + 1.0), f.x), f.y);
  }

  vec3 stars(vec3 d) {
    vec3 a = abs(d);
    vec2 face;
    float id;
    if (a.x >= max(a.y, a.z)) { face = d.yz / a.x; id = sign(d.x); }
    else if (a.y >= a.z) { face = d.xz / a.y; id = 3.0 + sign(d.y); }
    else { face = d.xy / a.z; id = 6.0 + sign(d.z); }

    vec2 uv = face * 245.0;
    vec2 cell = floor(uv) + id * 763.0;
    float pick = hash(cell);
    vec2 offset = vec2(hash(cell + 1.7), hash(cell + 11.2)) * .74 + .13;
    vec2 delta = fract(uv) - offset;
    float core = mix(.08, .15, pow(pick, 12.0));
    float psf = (1.0 - smoothstep(0.0, core, length(delta)));
    float glint = smoothstep(.985, .9998, pick);
    float star = (pick > .987 ? .16 : pick > .884 ? .023 : 0.0) * psf * (.3 + glint * 2.2);
    float tint = hash(cell + 25.3);
    vec3 spectrum = mix(vec3(.65, .79, 1.0), vec3(1.0, .83, .62), tint);
    vec3 sky = vec3(.0009, .0014, .00135);
    vec3 veilAxis = normalize(vec3(-.42, .6, .68));
    float dust = exp(-abs(dot(d, veilAxis) + .23) * 9.0);
    float clouds = noise(vec2(dot(d, vec3(4, 11, -16)), dot(d, vec3(8, -13, 9)))) * .8 + .2;
    sky += vec3(.0032, .012, .016) * dust * clouds;
    return sky + star * spectrum;
  }

  vec4 accretion(float phi, vec3 radial, vec3 tangent, vec3 address, float footprint) {
    if (phi <= 0.0 || phi >= MAX_ANGLE) return vec4(0.0);
    vec2 segment = curveSegment(phi, address);
    float u = segment.x;
    if (u > .191 || u < .009) return vec4(0.0);
    float r = 1.0 / u;
    float inner = smoothstep(5.15, 6.90, r);
    float outer = 1.0 - smoothstep(56.0, 102.0, r);
    float cosine = cos(phi);
    float sine = sin(phi);
    vec3 pointRadial = radial * cosine + tangent * sine;
    vec3 pointTangent = tangent * cosine - radial * sine;
    float azimuth = atan(pointRadial.z, pointRadial.x);
    float du = segment.y;
    vec3 backwards = normalize(pointTangent - pointRadial * du / max(u * sqrt(1.0 - 2.0 * u), .001));
    vec3 orbit = normalize(vec3(pointRadial.z, 0.0, -pointRadial.x));
    float velocity = sqrt(1.0 / max(r - 2.0, 1.0));
    float g = sqrt((1.0 - 2.0 / r) * (1.0 - velocity * velocity) / (1.0 - 2.0 / curveRadius))
              / (1.0 + velocity * dot(backwards, orbit));
    float x = log(r / 6.0);
    float flow = azimuth + clock * .30 * pow(6.0 / r, 1.4);
    // Periodic coordinates keep the Keplerian filaments continuous at the azimuth seam.
    vec2 spiral = vec2(sin(flow + x * .20), cos(flow + x * .20));
    float broad = noise(vec2(x * 8.0 + spiral.x * 4.1, spiral.y * 4.4 + spiral.x * 4.7));
    float strands = noise(vec2(x * 65.0 + broad * 5.8, spiral.y * 5.2 + spiral.x * 7.9));
    float fine = noise(vec2(x * 247.0 + strands * 1.8, spiral.x * 13.0 + spiral.y * 10.0));
    float turbulence = .35 + broad * .72 + strands * .47 + fine * .19;
    float knots = pow(max(0.0, broad * strands + fine * .19), 3.0);
    float emissivity = 9.65 * pow(6.25 / r, 3.25) * inner * outer;
    emissivity *= turbulence * turbulence * (.63 + knots * 2.7) * mix(1.0, pow(g, 2.8), .53);
    float temperature = clamp(pow(7.0 / r, .63) * g, 0.0, 1.07);
    vec3 spectrum = mix(vec3(1.0, .24, .055), vec3(1.0, .83, .64), smoothstep(.17, .97, temperature));
    spectrum = mix(spectrum, vec3(.92, .94, 1.0), smoothstep(.83, 1.12, temperature) * .5);
    float direct = 1.0 - smoothstep(.70, 2.45, phi);
    emissivity *= mix(1.0, .49 * exp(-max(0.0, r - 8.0) * .043), direct);
    emissivity *= 1.0 - .32 * smoothstep(5.05, 9.20, phi);
    float opacity = clamp(inner * outer * (0.17 + broad * .18) * footprint, 0.0, .71);
    return vec4(emissivity * spectrum, opacity);
  }

  vec4 diskImage(float phi, vec3 radial, vec3 tangent, vec3 address, float escape) {
    if (phi > MAX_ANGLE) return vec4(0.0);
    float slope = abs(-radial.y * sin(phi) + tangent.y * cos(phi));
    float spread = min(.24, .0108 / max(slope, .017));
    if (escape > 0.0 && phi - spread * 2.45 > escape) return vec4(0.0);
    float path = clamp(.112 / max(slope, .015), .48, 2.35);
    vec4 c = accretion(phi, radial, tangent, address, path) * .52;
    c += accretion(phi - spread, radial, tangent, address, path) * .24;
    c += accretion(phi + spread, radial, tangent, address, path) * .24;
    if (detail > 0 && phi < 6.0) {
      c += accretion(phi - spread * 2.45, radial, tangent, address, path) * .073;
      c += accretion(phi + spread * 2.45, radial, tangent, address, path) * .073;
    }
    return vec4(c.rgb * sqrt(path) / (1.0 + c.r * .088), c.a);
  }

  void main() {
    vec4 view = inverseProjection * vec4(screenUV * 2.0 - 1.0, 1.0, 1.0);
    vec3 direction = normalize(mat3(eyeToWorld) * (view.xyz / view.w));
    vec3 radial = normalize(eyeToWorld[3].xyz);
    float cosAlpha = clamp(dot(radial, -direction), -1.0, 1.0);
    float alpha = acos(cosAlpha);
    vec3 transverse = direction + radial * cosAlpha;
    vec3 tangent = length(transverse) > 1e-6 ? normalize(transverse) : normalize(cross(radial, vec3(1.0, .01, .13)));
    vec3 address = curveAddress(alpha);
    float escape = escapedAt(address);
    vec3 farDirection = radial * cos(max(0.0, escape)) + tangent * sin(max(0.0, escape));
    vec3 light = escape < 0.0 ? vec3(.00006, .000075, .00009) : stars(farDirection);

    // A ray may cross the same physical disk several times while winding around the hole.
    float first = mod(atan(-radial.y, tangent.y), PI);
    vec4 front = diskImage(first, radial, tangent, address, escape);
    vec4 secondary = diskImage(first + PI, radial, tangent, address, escape);
    vec4 tertiary = diskImage(first + 2.0 * PI, radial, tangent, address, escape);
    vec4 fourth = diskImage(first + 3.0 * PI, radial, tangent, address, escape);
    light = mix(light, vec3(0.0), fourth.a) + fourth.rgb;
    light = mix(light, vec3(0.0), tertiary.a) + tertiary.rgb;
    light = mix(light, vec3(0.0), secondary.a) + secondary.rgb;
    light = mix(light, vec3(0.0), front.a) + front.rgb;
    if (first > PI - .58) {
      vec4 nearPlane = diskImage(first - PI, radial, tangent, address, escape);
      light = mix(light, vec3(0.0), nearPlane.a) + nearPlane.rgb;
    }
    float vignette = 1.0 - .16 * dot(screenUV - .5, screenUV - .5);
    outColor = vec4(light * vignette, 1.0);
  }
`;
