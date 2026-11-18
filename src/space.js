import * as THREE from 'three';
import { PhotonCurves, screenVertex } from './geodesics.js';
import { spaceFragment } from './space-shader.js';

const metals = {
  alloy: new THREE.MeshStandardMaterial({ color: 0x9a9184, roughness: .49, metalness: .51 }),
  ceramic: new THREE.MeshStandardMaterial({ color: 0x323138, roughness: .72, metalness: .32 }),
  radiator: new THREE.MeshStandardMaterial({ color: 0x121722, roughness: .58, metalness: .38 }),
  gold: new THREE.MeshStandardMaterial({ color: 0x99724b, roughness: .48, metalness: .71 }),
  seam: new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: .83, metalness: .19 }),
};
const unitBox = new THREE.BoxGeometry(1, 1, 1);

function box(group, material, x, y, z, sx, sy, sz) {
  const item = new THREE.Mesh(unitBox, material);
  item.position.set(x, y, z);
  item.scale.set(sx, sy, sz);
  group.add(item);
  return item;
}

function ringCraft() {
  const craft = new THREE.Group();
  const moduleRadius = .322;
  const modules = 12;
  const engineCore = new THREE.MeshBasicMaterial({ color: new THREE.Color(.53, 4.2, 21), toneMapped: false });
  const lamps = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.13, .54), toneMapped: false });
  const torus = new THREE.Mesh(new THREE.TorusGeometry(moduleRadius - .047, .009, 6, 56), metals.ceramic);
  craft.add(torus);
  const back = torus.clone();
  back.position.z = -.039;
  craft.add(back);

  for (let i = 0; i < modules; i++) {
    const bay = new THREE.Group();
    const a = i / modules * Math.PI * 2;
    bay.rotation.z = a;
    craft.add(bay);
    const surface = i % 3 === 1 ? metals.ceramic : metals.alloy;
    box(bay, surface, 0, moduleRadius, -.022, .110, .105, .105);
    box(bay, surface, 0, moduleRadius + .006, .041, .089, .080, .022);
    box(bay, metals.gold, 0, moduleRadius - .041, .040, .066, .017, .015);
    box(bay, metals.seam, 0, moduleRadius + .051, .006, .082, .012, .080);
    for (const side of [-1, 1]) {
      box(bay, metals.ceramic, side * .047, moduleRadius + .002, .006, .009, .095, .087);
      box(bay, metals.alloy, side * .034, moduleRadius - .053, -.025, .012, .045, .026);
    }
    for (let n = 0; n < 5; n++) {
      box(bay, i % 3 === 1 ? metals.radiator : metals.seam,
        -.035 + n * .017, moduleRadius + .012, .053, .003, .042, .002);
    }
    box(bay, lamps, -.034, moduleRadius - .031, .055, .009, .003, .002);
    if (i % 3 === 1 || i === 10) {
      for (const x of [-.022, .023]) {
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.014, .021, .026, 12), metals.radiator);
        nozzle.rotation.x = Math.PI / 2;
        nozzle.position.set(x, moduleRadius, .064);
        bay.add(nozzle);
        const light = new THREE.Mesh(new THREE.CircleGeometry(.0125, 12), engineCore);
        light.position.set(x, moduleRadius, .080);
        bay.add(light);
      }
    }
    if (i % 3 === 0) {
      box(bay, metals.ceramic, 0, .164, -.036, .024, .22, .026);
      box(bay, metals.alloy, .011, .17, -.024, .004, .18, .007);
    }
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.072, .078, .16, 12), metals.ceramic);
  hub.rotation.x = Math.PI / 2;
  craft.add(hub);
  box(craft, metals.alloy, 0, 0, .095, .095, .068, .053);
  box(craft, metals.radiator, 0, .014, .124, .066, .029, .006);
  box(craft, metals.gold, -.038, -.046, .083, .033, .081, .033);
  box(craft, lamps, .039, -.046, .084, .020, .006, .003);
  return craft;
}

const moonVertex = /* glsl */`
  out vec3 localPosition;
  out vec3 normalWorld;
  void main() {
    localPosition = position;
    normalWorld = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const moonFragment = /* glsl */`
  in vec3 localPosition;
  in vec3 normalWorld;
  out vec4 outColor;
  uniform vec3 sourceDirection;
  float hash(vec3 p) {
    p = fract(p * .1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }
  float textureNoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    vec4 a = vec4(hash(i), hash(i + vec3(1,0,0)), hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)));
    i.z += 1.0;
    vec4 b = vec4(hash(i), hash(i + vec3(1,0,0)), hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)));
    vec4 h = mix(a, b, f.z);
    return mix(mix(h.x, h.y, f.x), mix(h.z, h.w, f.x), f.y);
  }
  void main() {
    vec3 n = normalize(normalWorld);
    float lit = smoothstep(.015, .83, dot(n, sourceDirection));
    vec3 p = normalize(localPosition);
    float terrain = textureNoise(p * 8.0) * .45 + textureNoise(p * 23.0) * .35 + textureNoise(p * 71.0) * .20;
    float terminatorRelief = max(0.0, lit + (textureNoise(p * 43.0) - .5) * lit * .39);
    vec3 color = vec3(.0014, .0023, .0024) + vec3(1.5, .99, .53) * terminatorRelief * terrain;
    outColor = vec4(color, 1.0);
  }
`;

export function buildSpace(renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28.7, 1, .035, 280);
  const home = {
    center: new THREE.Vector3(),
    eye: new THREE.Vector3(0, 2.39, 23.35),
    roll: -.331,
    shiftX: .67,
    shiftY: .455,
    referenceAspect: 2.38,
    nearOrbit: 11,
    farOrbit: 90,
    speed: 3.8,
  };
  const curves = new PhotonCurves(renderer);
  const lens = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      inverseProjection: { value: camera.projectionMatrixInverse },
      eyeToWorld: { value: camera.matrixWorld },
      photonCurves: { value: curves.texture },
      curveRadius: { value: home.eye.length() },
      clock: { value: 0 },
      detail: { value: 1 },
    },
    vertexShader: screenVertex,
    fragmentShader: spaceFragment,
    depthTest: false,
    depthWrite: false,
  });
  const background = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lens);
  background.frustumCulled = false;
  background.renderOrder = -10;
  scene.add(background);

  // The apparent shadow radius at the observer is derived from the critical impact parameter.
  const mask = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 32),
    new THREE.MeshBasicMaterial({ colorWrite: false }),
  );
  mask.renderOrder = -5;
  scene.add(mask);

  // Block the foreground objects in reference-camera space once, then keep them in world space.
  const reference = new THREE.PerspectiveCamera(camera.fov, home.referenceAspect, camera.near, camera.far);
  reference.position.copy(home.eye);
  reference.lookAt(home.center);
  reference.rotateZ(home.roll);
  reference.updateProjectionMatrix();
  reference.projectionMatrix.elements[8] = -home.shiftX;
  reference.projectionMatrix.elements[9] = -home.shiftY;
  reference.projectionMatrixInverse.copy(reference.projectionMatrix).invert();
  reference.updateMatrixWorld(true);
  const place = (x, y, depth) => {
    const point = new THREE.Vector3(x, y, 0).applyMatrix4(reference.projectionMatrixInverse);
    return point.multiplyScalar(-depth / point.z).applyMatrix4(reference.matrixWorld);
  };

  const craft = ringCraft();
  craft.position.copy(place(-.378, .23, 12.2));
  craft.quaternion.copy(reference.quaternion);
  craft.rotateY(.27);
  craft.rotateX(-.18);
  craft.rotateZ(-.26);
  const startOrientation = craft.quaternion.clone();
  scene.add(craft);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(.232, 48, 28), new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { sourceDirection: { value: new THREE.Vector3(.62, .15, -.91).normalize() } },
    vertexShader: moonVertex,
    fragmentShader: moonFragment,
  }));
  moon.position.copy(place(-.174, .172, 19.9));
  scene.add(moon);

  const key = new THREE.DirectionalLight(0xffdfb6, 2.8);
  key.position.set(7, 2, -3);
  const fill = new THREE.DirectionalLight(0x8b9dbc, .48);
  fill.position.set(-4, 3, 6);
  scene.add(key, fill, new THREE.AmbientLight(0x6e6a65, .20));

  return {
    scene, camera, home, bloom: .62, exposure: 1.04,
    update(time, quality) {
      const radius = camera.position.length();
      curves.update(radius);
      lens.uniforms.curveRadius.value = curves.radius;
      lens.uniforms.clock.value = time;
      lens.uniforms.detail.value = quality === 'low' ? 0 : 1;
      mask.scale.setScalar(5.196152423 * Math.sqrt(1 - 2 / radius));
      craft.quaternion.copy(startOrientation);
      craft.rotateZ(time * .046);
      moon.rotation.y = time * .035;
    },
  };
}
