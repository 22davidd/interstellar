# Interstellar

A real-time Three.js observatory with two independently explorable scenes inspired by the supplied visual references. The project generates every surface, light source, spacecraft part, and background in code.

## Run locally

1. Extract the archive.
2. Open a terminal in the `Interstellar` folder and run `npm start` with Node.js 18 or later. The bundled Three.js modules let it run offline without `npm install`.
3. Open [http://localhost:4173](http://localhost:4173) in a desktop browser with WebGL 2 and hardware acceleration enabled.

Python 3 can serve the same folder with `python -m http.server 4173 --bind 127.0.0.1`. Serve the files over HTTP so the browser can load the ES modules.

## Controls

| Input | Action |
| --- | --- |
| Drag and scroll | Orbit and zoom |
| Two-finger pinch | Zoom on a touch screen |
| V | Switch between orbit and free flight |
| Drag in free flight | Look around |
| WASD, Q / E | Move in free flight, descend / ascend |
| Shift, + / − | Boost or adjust flight speed |
| 1 / 2 | Switch between Gargantua and Tesseract |
| R | Reset the current camera |
| Space | Pause or resume the scene's motion |
| F | Fullscreen |
| H, Esc | Toggle the interface, or restore it with Esc |

The settings button gives access to the camera mode, speed, and Auto, High, Medium, and Low rendering quality. Auto adjusts the framebuffer resolution based on observed frame times. Space pauses the simulation while leaving the camera interactive.

## Rendering

**Gargantua.** A WebGL 2 prepass uses fourth-order Runge–Kutta integration of the Schwarzschild photon orbit equation, with gravitational units where *M* = 1. The shader stores reciprocal radius along each curved path and concentrates samples near the capture boundary. A second shader maps the observer's screen rays to those paths, traces disk crossings in their orbital planes, and looks up sky radiance along the escape direction. Successive winding paths produce the narrow photon-ring feature and higher-order images of the same disk. Disk filaments shear at different orbital speeds. Approximate Doppler and gravitational shifts color the emission, which is graded for the reference. The spacecraft and moon are separate foreground meshes.

**Tesseract.** Instanced boxes form several overlapping layers of rails, joints, and recessed chambers. Procedural brushed-metal shaders and embedded emissive hardware vary across the structure. A depth-aware shader integrates light in world-space haze up to the nearest surface. The drifting astronaut is built from pressure-suit, helmet, backpack, and limb meshes.

Both scenes render into a linear HDR buffer and use GPU bloom and ACES tone mapping. The gravity model is non-rotating. Disk spectrum, optical depth, and foreground shading are cinematic approximations.

The app code and GLSL live in `src/`. Three.js r180 and the required add-ons are bundled under `vendor/` with their MIT license. For background on the trajectory-table approach, see [Eric Bruneton's black hole rendering paper](https://arxiv.org/abs/2010.08735).
# interstellar
