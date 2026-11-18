import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CinematicCamera } from './camera.js';
import { buildSpace } from './space.js';
import { buildTesseract } from './tesseract.js';
import { screenVertex } from './geodesics.js';
import { atmosphereFragment } from './tesseract-shaders.js';

const byId = id => document.getElementById(id);
const fail = message => {
  byId('loading').hidden = true;
  byId('error').hidden = false;
  byId('error').textContent = message;
};

function initialize() {
  const viewport = byId('viewport');
  const canvas = document.createElement('canvas');
  let contextFailure = '';
  canvas.addEventListener('webglcontextcreationerror', event => {
    contextFailure = event.statusMessage;
  });
  const options = { alpha: false, antialias: false, depth: true };
  const context = canvas.getContext('webgl2', { ...options, powerPreference: 'high-performance' })
    ?? canvas.getContext('webgl2', options);
  if (!context) {
    console.error('WebGL 2 context creation failed.', contextFailure);
    fail('This browser could not start WebGL 2. Enable hardware acceleration or open the project in a browser with WebGL 2 support.');
    return;
  }
  if (!context.getExtension('EXT_color_buffer_float')) {
    fail('The observatory needs floating-point WebGL 2 render targets. Open it in a browser with hardware acceleration enabled.');
    return;
  }
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    fail('The browser lost its WebGL context. Reload the page to return to the observatory.');
  });
  try {
    run(viewport, canvas, context);
  } catch (error) {
    console.error(error);
    fail('The observatory could not start. Check the browser console for details.');
  }
}

function run(viewport, canvas, context) {
  const renderer = new THREE.WebGLRenderer({ canvas, context });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.debug.checkShaderErrors = true;
  renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
    const message = [gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertex), gl.getShaderInfoLog(fragment)]
      .filter(Boolean).join('\n');
    console.error(message);
    fail('A WebGL shader could not compile. Check the browser console for its compile log.');
  };
  viewport.appendChild(canvas);

  const worlds = { gargantua: buildSpace(renderer), tesseract: buildTesseract() };
  for (const [key, world] of Object.entries(worlds)) {
    world.time = 0;
    world.controls = new CinematicCamera(world.camera, world.home, key === 'gargantua');
  }
  let sceneName = location.hash === '#tesseract' ? 'tesseract' : 'gargantua';
  let active = worlds[sceneName];
  let observed = false;

  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
    depthBuffer: true,
    stencilBuffer: false,
  });
  const composer = new EffectComposer(renderer, target);
  const render = new RenderPass(active.scene, active.camera);
  const fogMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: screenVertex,
    fragmentShader: atmosphereFragment,
    uniforms: {
      tDiffuse: { value: null },
      depthMap: { value: null },
      inverseProjection: { value: worlds.tesseract.camera.projectionMatrixInverse },
      eyeToWorld: { value: worlds.tesseract.camera.matrixWorld },
      time: { value: 0 },
      lowQuality: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const fog = new ShaderPass(fogMaterial);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .6, .76, .47);
  composer.addPass(render);
  composer.addPass(fog);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const keys = new Set();
  const pointers = new Map();
  const sceneButtons = [...document.querySelectorAll('[data-scene]')];
  const modePicker = byId('camera-mode');
  const qualityPicker = byId('quality');
  const speed = byId('speed');
  const speedValue = byId('speed-value');
  const pauseButton = byId('pause');
  const settings = byId('settings');
  const panel = byId('panel');
  const fullscreen = byId('fullscreen');
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let quality = 'auto';
  let autoScale = 1;
  let actualQuality = 'high';
  let idleTimer;
  let sample = { since: 0, frames: 0, total: 0, smooth: 16.7 };

  function applyQuality() {
    const width = Math.max(innerWidth, 1);
    const height = Math.max(innerHeight, 1);
    const pixelBudget = Math.min(devicePixelRatio || 1, 1.75, Math.sqrt(2304000 / (width * height)));
    const scale = { high: 1, medium: .78, low: .57, auto: autoScale }[quality];
    actualQuality = scale <= .66 ? 'low' : scale < .9 ? 'medium' : 'high';
    renderer.setPixelRatio(scale * pixelBudget);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(scale * pixelBudget);
    composer.setSize(width, height);
    for (const world of Object.values(worlds)) world.controls.resize(width / height);
    fogMaterial.uniforms.lowQuality.value = actualQuality === 'low' ? 1 : 0;
  }

  function updatePause() {
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.setAttribute('aria-label', paused ? 'Resume motion' : 'Pause motion');
    pauseButton.title = paused ? 'Resume motion (Space)' : 'Pause motion (Space)';
  }

  function togglePause() {
    paused = !paused;
    updatePause();
  }

  function updateCameraUI() {
    const { controls } = active;
    modePicker.value = controls.mode;
    speed.value = String(controls.speed);
    speedValue.textContent = controls.speed.toFixed(1) + '×';
    byId('interaction-hint').innerHTML = controls.mode === 'orbit'
      ? 'Drag to orbit <i></i> Scroll to zoom'
      : 'Drag to look <i></i> WASD to fly';
  }

  function selectScene(name, changeUrl = true) {
    sceneName = name;
    active = worlds[name];
    render.scene = active.scene;
    render.camera = active.camera;
    fog.enabled = name === 'tesseract';
    bloom.strength = active.bloom;
    renderer.toneMappingExposure = active.exposure;
    sceneButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scene === name)));
    if (changeUrl && location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
    sample.since = performance.now();
    sample.frames = 0;
    sample.total = 0;
    keys.clear();
    updateCameraUI();
  }

  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (panel.hidden && pointers.size === 0) document.body.classList.add('idle');
    }, 5700);
  }

  function showPanel(show) {
    panel.hidden = !show;
    settings.setAttribute('aria-expanded', String(show));
    wake();
  }

  function toggleInterface() {
    const clean = document.body.classList.toggle('clean');
    if (clean) {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      showPanel(false);
    }
    wake();
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      console.info('Fullscreen is unavailable in this window.', error.message);
    }
  }

  function resetCamera() {
    active.controls.reset();
    updateCameraUI();
  }

  function setSpeed(value) {
    active.controls.speed = THREE.MathUtils.clamp(value, .25, 4);
    updateCameraUI();
  }

  sceneButtons.forEach(button => button.addEventListener('click', () => selectScene(button.dataset.scene)));
  document.querySelector('.wordmark').addEventListener('click', event => {
    event.preventDefault();
    selectScene('gargantua');
    resetCamera();
  });
  addEventListener('hashchange', () => selectScene(location.hash === '#tesseract' ? 'tesseract' : 'gargantua', false));
  byId('reset').addEventListener('click', resetCamera);
  pauseButton.addEventListener('click', togglePause);
  fullscreen.addEventListener('click', toggleFullscreen);
  byId('hide').addEventListener('click', toggleInterface);
  settings.addEventListener('click', () => showPanel(panel.hidden));
  speed.addEventListener('input', () => setSpeed(Number(speed.value)));
  modePicker.addEventListener('change', () => {
    active.controls.setMode(modePicker.value);
    updateCameraUI();
  });
  qualityPicker.addEventListener('change', () => {
    quality = qualityPicker.value;
    applyQuality();
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreen.setAttribute('aria-pressed', String(Boolean(document.fullscreenElement)));
    fullscreen.setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen');
  });

  const motionKeys = new Set(['KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight']);
  addEventListener('keydown', event => {
    wake();
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'Escape') {
      if (document.body.classList.contains('clean')) toggleInterface();
      showPanel(false);
      return;
    }
    if (event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement) return;
    const code = event.code;
    if (motionKeys.has(code)) keys.add(code);
    if (event.repeat || (code === 'Space' && event.target instanceof HTMLButtonElement)) return;
    switch (code) {
      case 'Digit1': selectScene('gargantua'); break;
      case 'Digit2': selectScene('tesseract'); break;
      case 'KeyR': resetCamera(); break;
      case 'KeyH': toggleInterface(); break;
      case 'KeyF': toggleFullscreen(); break;
      case 'Space': togglePause(); break;
      case 'KeyV':
        active.controls.setMode(active.controls.mode === 'orbit' ? 'flight' : 'orbit');
        updateCameraUI();
        break;
      case 'Equal': case 'NumpadAdd': setSpeed(active.controls.speed + .25); break;
      case 'Minus': case 'NumpadSubtract': setSpeed(active.controls.speed - .25); break;
      default: return;
    }
    event.preventDefault();
  });
  addEventListener('keyup', event => keys.delete(event.code));
  addEventListener('blur', () => { keys.clear(); pointers.clear(); });
  addEventListener('pointermove', wake, { passive: true });
  addEventListener('pointerdown', wake, { passive: true });
  addEventListener('resize', applyQuality);

  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    viewport.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, new THREE.Vector2(event.clientX, event.clientY));
    if (!panel.hidden) showPanel(false);
  });
  viewport.addEventListener('pointermove', event => {
    const point = pointers.get(event.pointerId);
    if (!point) return;
    let other;
    if (pointers.size === 2) {
      for (const [id, pos] of pointers) if (id !== event.pointerId) other = pos;
    }
    if (other) {
      const distance = Math.hypot(other.x - event.clientX, other.y - event.clientY);
      const change = point.distanceTo(other) - distance;
      active.controls.zoom(change * 5.5);
      if (active.controls.mode === 'flight') updateCameraUI();
    } else if (pointers.size === 1) {
      active.controls.drag(event.clientX - point.x, event.clientY - point.y, innerHeight);
    }
    point.set(event.clientX, event.clientY);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    viewport.addEventListener(type, event => {
      pointers.delete(event.pointerId);
      wake();
    });
  }
  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    wake();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    active.controls.zoom(delta);
    if (active.controls.mode === 'flight') updateCameraUI();
  }, { passive: false });

  selectScene(sceneName, false);
  updatePause();
  applyQuality();
  wake();

  let last = performance.now();
  renderer.setAnimationLoop(now => {
    if (!byId('error').hidden) return;
    const elapsed = Math.max(0, now - last);
    const dt = Math.min(elapsed * .001, .10);
    last = now;
    if (!paused) active.time += dt;
    active.controls.update(dt, keys);
    active.update(active.time, actualQuality);
    fogMaterial.uniforms.depthMap.value = composer.readBuffer.depthTexture;
    fogMaterial.uniforms.time.value = active.time;
    composer.render(dt);
    if (!observed) {
      observed = true;
      byId('loading').hidden = true;
    }

    if (quality !== 'auto' || !elapsed || document.hidden) return;
    sample.total += Math.min(elapsed, 250);
    sample.frames++;
    if (now - sample.since > 1850 && sample.frames > 7) {
      sample.smooth = sample.smooth * .26 + (sample.total / sample.frames) * .74;
      const next = sample.smooth > 21.0 ? Math.max(.57, autoScale - .12)
        : sample.smooth < 16.95 ? Math.min(1, autoScale + .06) : autoScale;
      sample = { since: now, frames: 0, total: 0, smooth: sample.smooth };
      if (Math.abs(next - autoScale) > .001) {
        autoScale = next;
        applyQuality();
      }
    }
  });
}

initialize();
