import * as THREE from 'three';
import { structureVertex, structureFragment } from './tesseract-shaders.js';

function seededRandom(seed) {
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function buildLattice() {
  const random = seededRandom(2362014);
  const pieces = [];
  const sources = [];
  const solid = (p, size, style = 0, steel = .19, polish = .5) =>
    pieces.push({ p, size, data: [random(), style, steel, polish] });
  const glow = (p, size, coolness, energy) =>
    sources.push({ p, size, data: [random(), 2, coolness, energy] });

  // Each wall is a set of open cells with three increasingly distant layers.
  for (const wall of [
    { axis: 0, direction: 1, face: 16, cool: .13 },
    { axis: 0, direction: -1, face: 17, cool: .72 },
    { axis: 2, direction: -1, face: 16.2, cool: .55 },
    { axis: 2, direction: 1, face: 18.5, cool: .24 },
  ]) {
    const point = (depth, h, y) => wall.axis === 0
      ? [wall.direction * depth, y, h] : [h, y, wall.direction * depth];
    const dimensions = (depth, h, y) => wall.axis === 0
      ? [depth, y, h] : [h, y, depth];
    for (let layer = 0; layer < 3; layer++) {
      const face = wall.face + layer * 13.2;
      const pitch = layer === 0 ? 11.8 : 14.5;
      const offset = (wall.direction < 0 ? -2 : 2.3) + layer * 3.8;
      const cool = Math.max(0, wall.cool - .1 * layer);
      for (let col = -4; col <= 4; col++) {
        const h = col * pitch + offset;
        const column = face + (random() - .5) * 5.1;
        solid(point(column + 1.22, h, -39), dimensions(1.13, 1.93, 177), 1, cool, .66);
        for (let n = 0; n < 6; n++) {
          const a = h - .94 + n * .37;
          const thickness = .074 + random() * .11;
          solid(point(column - .02 - (n % 2) * .15, a, -40),
            dimensions(thickness, thickness, 181), 0, cool * .78, .9);
        }
        for (let tier = -10; tier <= 4; tier++) {
          const y = tier * 11.6 + (layer % 2) * 3.2;
          const step = random();
          const span = pitch - .13;
          const bayH = h + pitch * .5;
          const lintel = column - .52 + (random() - .5) * 2.0;
          solid(point(lintel + .44, bayH, y), dimensions(1.3, span, .61 + step * .84), 1, cool);
          solid(point(lintel - .58, bayH, y - 1.04), dimensions(.26, span, .22), 0, cool, .85);
          for (const rib of [.21, .46, .75]) {
            solid(point(lintel - .68, bayH, y + rib), dimensions(.19, span, .09), 0, cool, 1.1);
          }
          if (step < .42) {
            const backing = column + 6.5 + random() * 4.4;
            solid(point(backing, bayH, y - 5.45), dimensions(.92, span - .8, 9.8), 1, cool * .78, .12);
            for (let panel = 0; panel < 2; panel++) {
              const down = y - 2.5 - 4.5 * panel;
              solid(point(backing - .58, bayH, down), dimensions(.71, span * .91, .32), 0, cool, .75);
            }
            solid(point(backing - 2.45, h + 2.3, y - 5.45), dimensions(.6, .46, 10.1), 1, cool, .75);
          }
          if (step > .55 || (layer === 0 && col % 2 === 0)) {
            const brace = 4.1 + random() * 8.9;
            const braceH = h + (random() - .5) * 2.0;
            solid(point(column + brace * .52 - .55, braceH, y + .13), dimensions(brace, .7, .68), 0, cool);
            solid(point(column + brace * .52 - .55, braceH + .56, y - .35), dimensions(brace, .12, .11), 0, cool, 1.0);
            const tooth = 2.0 + 4.6 * random();
            solid(point(lintel - tooth * .37, h + .28, y - .16), dimensions(tooth, 1.65, .38), 0, cool, .84);
          }
          if (step > .28 || (col === 0 && layer === 0)) {
            const cold = (wall.cool > .5 && random() < .40) ? .78 : .035;
            const energy = .41 + Math.pow(random(), 2.4) * 4.7;
            const streak = (1.4 + random() * 4.4) * (step > .91 ? 1.6 : 1);
            for (const local of [-.51, .16, .38]) {
              glow(point(column - .21, h + local, y + (random() - .4) * 1.8),
                dimensions(.067, .047, streak * (.45 + .55 * random())), cold, energy * (.42 + .5 * random()));
            }
            for (let rib = 0; rib < 3; rib++) {
              const length = streak * (rib === 0 ? 1.05 : .58);
              glow(point(lintel - .718, h + length * .43 + rib * .3, y + .22 + rib * .31),
                dimensions(.10, length, .054 + rib * .011), cold, energy * (rib === 1 ? 1.4 : .68));
            }
            if (step > .78) {
              glow(point(column - .33, h - .45, y - .36),
                dimensions(.20, 1.42, .19), cold * .55, energy * 2.8);
              for (let window = 0; window < 5; window++) {
                glow(point(lintel - .76, h + 1.1 + window * .28, y - .45),
                  dimensions(.055, .13, .092), cold, energy * .85);
              }
            }
          }
        }
      }
    }
  }

  // Suspended longitudinal conduits provide interior layers and visible points of convergence.
  for (const [x, z, palette] of [[-7.3, -9.9, .89], [8.1, 10.9, .02], [12.1, 8.2, .06], [-10.6, 3, .18], [5.4, -12.8, .09]]) {
    for (let i = 0; i < 8; i++) {
      const lane = (i - 3.5) * .192;
      const thickness = i % 3 === 0 ? .19 : .094;
      solid([x + lane, -52, z + lane * .35], [thickness, 171 - random() * 17, thickness], 1, palette, 1.6);
      for (let station = -7; station < 3; station++) {
        if (random() < .36) continue;
        const y = station * 12.4 + Math.sin(x + station) * 1.75;
        const length = 1.8 + random() * 6.1;
        const brightness = .55 + Math.pow(random(), 2.6) * (palette > .6 ? 4.6 : 7.9);
        glow([x + lane, y, z + lane * .35 + .13], [.047, length, .057], palette, brightness);
        if (palette < .1) {
          glow([x + lane - .066, y + 1.2, z + lane * .35 - .16], [.054, length * 1.22, .066], palette, brightness * 1.23);
        }
        if (i % 3 === 0) {
          solid([x + lane, y - 1.9, z], [.33, 2.85, .45], 1, palette, 1.25);
          glow([x + lane, y - 1.9, z + .26], [.092, .65, .06], palette, brightness * 1.43);
        }
        if (i < 2 && station % 3 === 0) {
          const extension = 3.8 + random() * 5;
          const direction = x > 0 ? 1 : -1;
          solid([x + extension * direction * .44, y, z], [extension, .55, .66], 1, palette, .78);
          glow([x + extension * direction * .42, y - .31, z + .23], [extension * .86, .069, .089], palette, (1 + random()) * 2.9);
          solid([x, y + .49, z + direction * (extension * .38)], [.63, .33, extension * .82], 1, palette, .88);
        }
      }
    }
  }

  // A few freestanding lifted spans break the rhythm of the wall grids.
  for (let i = 0; i < 63; i++) {
    const side = i % 4;
    const lateral = (i % 2 ? -1 : 1) * (19 + random() * 18);
    const length = 5 + random() * 21;
    const y = 29 - random() * 160;
    const axis = side < 2 ? 0 : 2;
    const p = axis === 0 ? [-9 + random() * 23, y, lateral] : [lateral, y, -9 + random() * 23];
    const size = axis === 0 ? [length, .84, 1.55] : [1.55, .84, length];
    solid(p, size, 1, .24, .77);
    const thin = axis === 0 ? [length * .66, .083, .058] : [.058, .083, length * .66];
    glow([p[0] - .46, p[1] + .45, p[2] - .46], thin, i % 3 ? .13 : .93, .45 + random() * 2.9);
  }

  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: structureVertex,
    fragmentShader: structureFragment,
  });
  const matrix = new THREE.Matrix4();
  const batches = new THREE.Group();
  for (const collection of [pieces, sources]) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const appearance = new Float32Array(collection.length * 4);
    const mesh = new THREE.InstancedMesh(geometry, material, collection.length);
    collection.forEach(({ p, size, data }, i) => {
      matrix.makeScale(...size);
      matrix.setPosition(...p);
      mesh.setMatrixAt(i, matrix);
      appearance.set(data, i * 4);
    });
    geometry.setAttribute('railData', new THREE.InstancedBufferAttribute(appearance, 4));
    mesh.computeBoundingSphere();
    batches.add(mesh);
  }
  return batches;
}

function astronaut() {
  const group = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0xbcb2a1, roughness: .82 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x5e574a, roughness: .99 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x131416, roughness: .89 });
  const fasteners = new THREE.MeshStandardMaterial({ color: 0x867e71, metalness: .57, roughness: .42 });
  const visor = new THREE.MeshStandardMaterial({ color: 0x141816, metalness: .63, roughness: .19 });
  const wire = new THREE.MeshStandardMaterial({ color: 0x896339, metalness: .31, roughness: .51 });
  const sphere = new THREE.SphereGeometry(1, 24, 16);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function part(geometry, material, pos, size) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...pos);
    mesh.scale.set(...size);
    group.add(mesh);
    return mesh;
  }
  const round = (material, pos, size) => part(sphere, material, pos, size);
  const plate = (material, pos, size) => part(cube, material, pos, size);
  const bone = (material, a, b, radius, flatten = 1) => {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    const center = end.add(start).multiplyScalar(.5);
    const mesh = round(material, center.toArray(), [radius, delta.length() * .5 + radius * .48, radius * flatten]);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return mesh;
  };

  round(cloth, [0, .40, 0], [.257, .345, .155]);
  round(shell, [0, .54, .008], [.29, .26, .178]);
  round(dark, [0, .22, .004], [.215, .10, .166]);
  round(cloth, [0, .10, 0], [.23, .15, .153]);
  plate(dark, [0, .49, -.154], [.415, .61, .24]);
  plate(shell, [0, .49, -.245], [.373, .553, .101]);
  plate(fasteners, [0, .395, -.306], [.283, .105, .033]);
  for (const side of [-1, 1]) {
    plate(dark, [side * .165, .49, -.303], [.025, .51, .026]);
    plate(dark, [side * .147, .45, .175], [.034, .36, .024]).rotation.z = side * -.14;
    round(fasteners, [side * .191, .33, .151], [.031, .046, .024]);
  }
  plate(cloth, [.08, .57, .174], [.126, .091, .026]);
  plate(fasteners, [.058, .575, .191], [.027, .025, .012]);
  round(dark, [0, .744, 0], [.174, .047, .162]);
  round(shell, [.015, .893, .007], [.178, .184, .163]);
  round(fasteners, [.018, .894, .09], [.154, .135, .102]);
  round(visor, [.018, .906, .119], [.137, .111, .09]);
  for (const side of [-1, 1]) {
    round(dark, [side * .169, .87, -.01], [.029, .063, .054]);
    round(fasteners, [side * .187, .865, -.01], [.013, .031, .031]);
  }

  const limbs = [
    { shoulder: [-.27, .608, .01], elbow: [-.44, .40, -.08], wrist: [-.55, .275, .035], tip: [-.63, .23, .057] },
    { shoulder: [.269, .60, .013], elbow: [.46, .474, .032], wrist: [.59, .584, .14], tip: [.67, .613, .158] },
  ];
  for (const { shoulder, elbow, wrist, tip } of limbs) {
    round(shell, shoulder, [.121, .137, .116]);
    bone(shell, shoulder, elbow, .094);
    round(cloth, elbow, [.088, .09, .086]);
    bone(shell, elbow, wrist, .077);
    round(dark, wrist, [.063, .052, .055]);
    bone(dark, wrist, tip, .049, .75);
  }
  for (const [hip, knee, foot, toe] of [
    [[-.127, .076, -.011], [-.215, -.34, .15], [-.276, -.688, .034], [-.313, -.763, .12]],
    [[.125, .079, -.018], [.315, -.243, .026], [.31, -.614, -.171], [.359, -.685, -.099]],
  ]) {
    bone(shell, hip, knee, .121, .92);
    round(cloth, knee, [.105, .097, .106]);
    bone(shell, knee, foot, .091, .9);
    round(dark, foot, [.102, .089, .103]);
    bone(dark, foot, toe, .095, .9);
  }
  const tubing = new THREE.CatmullRomCurve3([
    [0.17, .55, -.22], [.31, .32, -.17], [.29, .21, .025], [.17, .34, .161],
  ].map(p => new THREE.Vector3(...p)));
  group.add(new THREE.Mesh(new THREE.TubeGeometry(tubing, 16, .019, 7, false), wire));
  return group;
}

export function buildTesseract() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(.0015, .0019, .0027);
  const camera = new THREE.PerspectiveCamera(51, 1, .07, 265);
  const home = {
    center: new THREE.Vector3(-.6, -4.0, .8),
    eye: new THREE.Vector3(5.2, 29.0, 8.2),
    roll: -.96,
    shiftX: -.055,
    shiftY: -.145,
    nearOrbit: 4,
    farOrbit: 63,
    minPolar: .075,
    maxPolar: 1.13,
    speed: 6.6,
  };

  scene.add(buildLattice());
  const figure = astronaut();
  figure.scale.setScalar(1.18);
  scene.add(figure);
  const rim = new THREE.DirectionalLight(0xfadeb8, 4.1);
  rim.position.set(-10, -16, -7);
  const fill = new THREE.DirectionalLight(0xa1c8e0, .86);
  fill.position.set(-7, 2, 8);
  const backlight = new THREE.DirectionalLight(0xffa35d, 1.6);
  backlight.position.set(8, -15, 4);
  scene.add(rim, fill, backlight, new THREE.AmbientLight(0x6b7c85, .42));

  return {
    scene, camera, home, bloom: .76, exposure: 1.04,
    update(time) {
      figure.position.set(
        home.center.x + Math.sin(time * .36) * .47,
        home.center.y - Math.sin(time * .47) * .45,
        home.center.z - Math.sin(time * .29) * .39,
      );
      figure.rotation.set(.48 + Math.sin(time * .4) * .13, -1 + time * .075, -.32 + Math.sin(time * .26) * .18);
    },
  };
}
