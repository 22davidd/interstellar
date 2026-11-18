## 100% AI generated (ChatGPT 6.2 Sol - XHigh effort)
Prompt:
```
PROJECT: INTERSTELLAR — REAL-TIME 3D CINEMATIC EXPERIENCE
You are an expert graphics programmer, technical artist, and creative director specializing in Three.js, WebGL, GLSL shaders, physically based rendering, and procedural 3D environments.

Your objective is to recreate the visual atmosphere, scale, and scientific phenomena of Christopher Nolan's Interstellar as an extraordinary, fully interactive, real-time 3D experience running directly in a web browser.

You will receive two reference images. Study their composition, geometry, lighting, colors, spatial relationships, and visual atmosphere. Use them as artistic references to reconstruct the environments in three dimensions.
1. THE MOST IMPORTANT REQUIREMENT
EVERY SCENE MUST EXIST AS A LIVE, REAL-TIME, EXPLORABLE 3D ENVIRONMENT.

This is non-negotiable.

Do not use static images, prerecorded videos, panoramic backgrounds, CSS animations, or 2D visual tricks as substitutes for 3D environments.

The user must be able to move the camera, change perspective, observe parallax, and explore the scene from different angles.

All celestial objects, spacecraft, environments, lighting effects, and major visual phenomena must be represented through actual 3D geometry, procedural rendering, or camera-dependent GPU shaders.

Reference images are visual targets, not backgrounds to display.
2. TECHNOLOGY
Use:
- Three.js for the scene graph, cameras, geometry, and rendering.
- WebGL2 and custom GLSL shaders for advanced rendering effects.
- Procedural geometry and shader-generated materials wherever possible.
- GPU-based postprocessing for bloom, tone mapping, and cinematic effects.
- Efficient rendering techniques to maintain interactive frame rates.
Use external libraries only when they meaningfully improve the result.

Do not rely on prebuilt black-hole animations, stock scene backgrounds, or prerecorded effects.
3. GARGANTUA — GRAVITATIONAL LENSING
If the reference images depict Gargantua, prioritize an exceptionally convincing black-hole simulation.

Implement:
- A dark event-horizon silhouette.
- A luminous, geometrically thin accretion disk.
- Gravitational lensing that visibly bends light around the black hole.
- Distortion of the background starfield.
- Apparent accretion-disk light above and below the black hole.
- A photon-ring-like feature near the shadow boundary.
- Physically motivated brightness and color variations.
- Camera-dependent distortion that responds continuously as the observer moves.
The gravitational lensing must not be a decorative glowing ring.

Implement an actual GPU-based light-deflection approximation or numerical ray integration, balancing physical credibility against real-time performance.

The accretion disk must have spatial depth, procedural structure, and convincing motion.
4. CINEMATIC ART DIRECTION
The visual philosophy is minimalism, scientific wonder, and overwhelming cosmic scale.

Avoid excessive UI, distracting particles, unnecessary neon colors, arcade-style effects, or generic science-fiction decorations.

Prioritize:
- Immense scale.
- Deep blacks.
- Restrained, physically motivated lighting.
- Subtle color gradients.
- Dramatic silhouettes.
- Realistic celestial illumination.
- Atmospheric depth.
- Elegant camera composition.
- Carefully controlled bloom and exposure.
The result should feel like a scientifically inspired cinematic environment, not a videogame menu or an animated wallpaper.

Every visual element should have a purpose.
5. INTERACTIVE EXPLORATION
Implement smooth camera controls with:
- Mouse dragging to orbit.
- Scroll-wheel zoom.
- Optional free-flight mode using WASD.
- Smooth camera damping.
- Adjustable movement speed.
- Sensible near/far clipping and scale handling.
- The ability to pause or resume procedural motion.
Camera movement must reveal genuine 3D structure and perspective changes.

Provide a small, unobtrusive interface with controls for switching scenes, resetting the camera, and entering fullscreen mode.

The interface should disappear or become unobtrusive when not in use.
6. MULTIPLE SCENES
If the references represent different environments, reconstruct each as an independent real-time 3D scene.

Support seamless switching between them.

Each scene must have its own geometry, camera configuration, lighting, procedural effects, and visual identity.

Do not simply place two reference images in a gallery.
7. VISUAL FIDELITY
Pay exceptional attention to the reference images.

Reconstruct their:
- Relative object proportions.
- Camera perspective.
- Spatial composition.
- Lighting direction.
- Color temperature.
- Surface appearance.
- Contrast.
- Depth and atmospheric effects.
The initial camera position should closely reproduce the reference composition.

However, the scene must remain coherent when the camera moves away from that initial viewpoint.

When exact reconstruction is impossible from limited references, infer plausible 3D geometry rather than faking the missing information.
8. PERFORMANCE AND QUALITY
Target 60 FPS on a modern desktop GPU at 1080p, where practical.

Implement adjustable rendering quality if necessary.

Use GPU-efficient techniques, adaptive resolution, and sensible shader complexity.

Avoid unnecessary draw calls, excessive geometry, and CPU-heavy per-frame calculations.

Prefer mathematically elegant procedural solutions over brute-force rendering.

Visual fidelity is the priority, but the application must remain responsive and genuinely interactive.
9. DELIVERABLE
Build a complete, functional browser application.

Provide all necessary source files, shaders, dependencies, and instructions for running it locally.

The result must be executable, not pseudocode or an architectural proposal.

Implement the actual rendering systems. Do not replace difficult effects with placeholders or merely describe how they could be implemented.

Before considering the project complete, verify that:
1. Every scene renders in real time.
2. Camera movement changes the actual perspective.
3. Objects exhibit correct spatial parallax.
4. Gravitational lensing responds to camera movement.
5. The application runs without shader compilation errors.
6. The experience is visually coherent from multiple viewing angles.
7. The default camera views closely resemble the supplied references.
FINAL CREATIVE DIRECTION
Imagine the viewer is observing the universe through a window aboard a spacecraft.

There is no unnecessary spectacle.

Only darkness, light, gravity, motion, and scale.

The experience should communicate the same sense of awe, isolation, and cosmic grandeur that makes Interstellar unforgettable.

Build something that feels impossible to believe is running live inside a browser.

Do not stop at a basic prototype. Deliver the most visually convincing complete implementation achievable within the available environment.
```
and 2 reference images.
