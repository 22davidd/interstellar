import * as THREE from 'three';

const worldUp = new THREE.Vector3(0, 1, 0);
const flightEuler = new THREE.Euler(0, 0, 0, 'YXZ');

export class CinematicCamera {
  constructor(camera, home, isSpace) {
    this.camera = camera;
    this.baseFov = camera.fov;
    this.home = home;
    this.isSpace = isSpace;
    this.orbit = new THREE.Spherical();
    this.goal = new THREE.Spherical();
    this.offset = new THREE.Vector3();
    this.origin = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.motion = new THREE.Vector3();
    this.flightTarget = new THREE.Quaternion();
    this.mode = 'orbit';
    this.intro = 1;
    this.introTarget = 1;
    this.aspect = 1;
    this.roll = 0;
    this.speed = 1;
    this.yaw = 0;
    this.pitch = 0;
    this.reset(true);
  }

  reset(immediately = false) {
    if (this.mode === 'flight' && !immediately) {
      this.orbit.setFromVector3(this.offset.copy(this.camera.position).sub(this.home.center));
    }
    this.mode = 'orbit';
    this.goal.setFromVector3(this.offset.copy(this.home.eye).sub(this.home.center));
    if (!immediately) {
      this.goal.theta += Math.round((this.orbit.theta - this.goal.theta) / (Math.PI * 2)) * Math.PI * 2;
    }
    this.introTarget = 1;
    this.velocity.set(0, 0, 0);
    if (immediately) {
      this.orbit.copy(this.goal);
      this.origin.copy(this.home.center);
      this.intro = 1;
      this.roll = this.home.roll;
      this.update(0, new Set());
    }
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === 'flight') {
      flightEuler.setFromQuaternion(this.camera.quaternion);
      this.yaw = flightEuler.y;
      this.pitch = flightEuler.x;
      this.introTarget = 0;
      this.velocity.set(0, 0, 0);
    } else {
      this.orbit.setFromVector3(this.offset.copy(this.camera.position).sub(this.home.center));
      this.goal.copy(this.orbit);
      this.limit();
      this.origin.copy(this.home.center);
    }
  }

  resize(aspect) {
    this.aspect = aspect;
    this.project();
  }

  project() {
    this.camera.aspect = this.aspect;
    const frameSize = this.home.referenceAspect
      ? THREE.MathUtils.clamp(this.home.referenceAspect / this.aspect, 1, 1.57) : 1;
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.baseFov * .5)) * frameSize));
    this.camera.updateProjectionMatrix();
    const horizontal = this.home.shiftX * Math.min(1, this.aspect / 1.30);
    this.camera.projectionMatrix.elements[8] = -horizontal * this.intro;
    this.camera.projectionMatrix.elements[9] = -this.home.shiftY * this.intro;
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  }

  limit() {
    this.goal.phi = THREE.MathUtils.clamp(this.goal.phi, this.home.minPolar ?? .055, this.home.maxPolar ?? Math.PI - .055);
    this.goal.radius = THREE.MathUtils.clamp(this.goal.radius, this.home.nearOrbit, this.home.farOrbit);
  }

  drag(dx, dy, screenHeight) {
    const turn = 2.55 / Math.max(280, screenHeight);
    if (this.mode === 'orbit') {
      this.goal.theta -= dx * turn;
      this.goal.phi -= dy * turn;
      this.limit();
      if (this.isSpace) this.introTarget = Math.max(.20, this.introTarget - Math.hypot(dx, dy) * .0033);
    } else {
      this.yaw -= dx * turn;
      this.pitch = THREE.MathUtils.clamp(this.pitch - dy * turn, -1.54, 1.54);
    }
  }

  zoom(delta) {
    if (this.mode === 'orbit') {
      this.goal.radius *= Math.exp(THREE.MathUtils.clamp(delta * .0011, -.42, .42));
      this.limit();
    } else {
      this.speed = THREE.MathUtils.clamp(this.speed * Math.exp(-delta * .0011), .25, 4);
    }
  }

  update(dt, keys) {
    const ease = 1 - Math.exp(-dt * 9);
    const nextIntro = Math.abs(this.introTarget - this.intro) < .0001
      ? this.introTarget : THREE.MathUtils.lerp(this.intro, this.introTarget, ease * .7);
    if (nextIntro !== this.intro) {
      this.intro = nextIntro;
      this.project();
    }
    if (this.mode === 'orbit') {
      this.orbit.radius = THREE.MathUtils.lerp(this.orbit.radius, this.goal.radius, ease);
      this.orbit.phi = THREE.MathUtils.lerp(this.orbit.phi, this.goal.phi, ease);
      this.orbit.theta = THREE.MathUtils.lerp(this.orbit.theta, this.goal.theta, ease);
      this.roll = THREE.MathUtils.lerp(this.roll, this.home.roll, ease);
      this.camera.position.copy(this.offset.setFromSpherical(this.orbit).add(this.origin));
      this.camera.lookAt(this.origin);
      this.camera.rotateZ(this.roll);
    } else {
      this.roll = THREE.MathUtils.lerp(this.roll, 0, ease);
      flightEuler.set(this.pitch, this.yaw, this.roll);
      this.flightTarget.setFromEuler(flightEuler);
      this.camera.quaternion.slerp(this.flightTarget, ease);
      this.motion.set(
        Number(keys.has('KeyD')) - Number(keys.has('KeyA')),
        0,
        Number(keys.has('KeyS')) - Number(keys.has('KeyW')),
      ).applyQuaternion(this.camera.quaternion);
      this.motion.addScaledVector(worldUp, Number(keys.has('KeyE')) - Number(keys.has('KeyQ')));
      this.motion.normalize().multiplyScalar(this.home.speed * this.speed * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.5 : 1));
      this.velocity.lerp(this.motion, ease);
      this.camera.position.addScaledVector(this.velocity, dt);
      if (this.isSpace && this.camera.position.lengthSq() < 10.6 ** 2) this.camera.position.setLength(10.6);
      if (this.camera.position.lengthSq() > 148 ** 2) this.camera.position.setLength(148);
    }
    this.camera.updateMatrixWorld();
  }
}
