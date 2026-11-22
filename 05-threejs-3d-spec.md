# 05 — Three.js 3D Specification

## 1. Purpose

3D exists to add spatial understanding: the shape of the site, its footprint, and environmental overlays. It is not decoration. Scenes are procedural, muted, architectural.

## 2. Visual language

- Background: transparent canvas over `--bg-surface` (`#FFFFFF`) so the scene sits on the page like a plate.
- Material: matte clay for terrain (`MeshStandardMaterial`, roughness 0.95, metalness 0, base `#E9E4DC`).
- Wireframe: fine lines (`LineSegments` over `EdgesGeometry`), colour `#111827` at 0.55 opacity for silhouettes, `#9CA3AF` for secondary grid.
- Lighting: one soft hemisphere light (sky `#FFFFFF`, ground `#E5E7EB`, intensity 0.9) plus one directional light with low-angle for relief (intensity 0.7). **No** shadows by default (optional `PCFSoftShadowMap` on the high tier only).
- No bloom, no post-processing, no fog glow, no emissive materials.
- Overlay colours come from the data-encoding palette in doc 03 and always have a legend.

## 3. Scene catalogue

### 3.1 Terrain scene
- Procedural heightfield on a `PlaneGeometry` (default 128×128 segments, 64×64 on low tier).
- Height source priority: (a) real heightmap PNG/array in `data/geometry/<slug>/height.png` if provided, (b) seeded procedural noise (fixed seed per landmark, so it is deterministic) with parameters from the catalogue record (`relief`, `roughness`, `baseElevation`).
- Layers:
  - **Contours:** computed by marching squares at fixed intervals, drawn as `Line2`/`LineSegments` lifted 0.01 above the surface. Interval from catalogue or auto (relief / 12).
  - **Slope zones:** per-vertex slope from normals. Binned into three classes (`gentle`, `moderate`, `steep`) using configurable degree thresholds (default 10°, 25°). Rendered as a vertex-colour or texture overlay at 0.5 opacity.
  - **Footprint:** extruded flat polygon (from catalogue GeoJSON-like footprint or a primitive fallback) outlined in `--accent`.
  - **Flood/Heat/Seismic context (optional):** rendered as a simple banded plane or annotation, not simulated.
- Label: persistent corner tag `ILLUSTRATIVE TERRAIN` unless the record supplies real data and its source.

### 3.2 Silhouette / wireframe scene
- Built from composed primitives per landmark in `src/three/landmarks/<slug>.ts`: each exports a `build(): Group` using boxes, cylinders, spheres, lathe and extrude geometry.
- Rendering: faint solid fill (`#F3F4F6`) beneath `EdgesGeometry` lines, so form reads without heavy shading.
- Annotated cues: optional numbered hotspots (dome, minaret, arches) that link to the "visible cues" list returned by recognition. Hovering a cue in the list highlights its hotspot.
- Each landmark model carries a `fidelity` note ("schematic massing, not survey-accurate") shown beneath the scene.

### 3.3 Recognition comparison
Small, non-interactive (or lightly orbitable) silhouette beside the user's photo. Same builder as 3.2.

## 4. Architecture of `src/three/`

```
three/
├─ createScene.ts        renderer, camera, controls, resize, dispose
├─ loop.ts               visibility- and intersection-aware render loop
├─ quality.ts            quality tiers and auto-detection
├─ terrain/
│  ├─ heightfield.ts     height sampling (png | noise)
│  ├─ noise.ts           seeded simplex/value noise (no external RNG)
│  ├─ contours.ts        marching squares
│  ├─ slope.ts           slope classification
│  └─ overlays.ts        overlay materials and legend data
├─ landmarks/
│  ├─ index.ts           registry by slug
│  └─ <slug>.ts          procedural builders
└─ a11y.ts               keyboard controls, text alternative
```

Rules:
- Import from `three` by named exports only; load the scene module with dynamic `import()` on pages that need it.
- Use `OrbitControls` from `three/examples/jsm` with damping, polar angle clamped (no looking from below ground), min/max distance set per scene.
- One renderer per page maximum. Scenes share it when multiple viewports are needed (scissor), or the second view uses a lower-cost static render.
- `dispose()` must free geometries, materials, textures, and the renderer when navigating away.

## 5. Performance budget

| Item | Low tier | Standard tier | High tier |
|------|----------|---------------|-----------|
| Terrain segments | 64×64 | 128×128 | 192×192 |
| Total triangles per scene | ≤ 20k | ≤ 60k | ≤ 120k |
| Pixel ratio cap | 1 | 1.5 | 2 |
| Draw calls | ≤ 40 | ≤ 80 | ≤ 120 |
| Shadows | off | off | soft, 1024 map |
| Anti-aliasing | off | on | on |

- Auto tier: start Standard, measure average frame time over 2 seconds; drop a tier if above 22 ms, never go up automatically.
- Render on demand: use `renderer.setAnimationLoop` only while the user is interacting or damping is settling; otherwise render once per change. Stop when the tab is hidden or the canvas is off-screen (`IntersectionObserver`).
- Contours and slope colours are computed once per landmark and cached in memory.
- Heavy computation (noise, marching squares) may move to a Web Worker if it exceeds 50 ms on the main thread.
- Three.js chunk target: ≤ 200 KB gzip; verify with a bundle analyser in CI.

## 6. Fallbacks

- No WebGL2 or context creation fails: show a pre-rendered static SVG/PNG plate (generated at build time by a script, or a simple 2D SVG contour map) with the same legend.
- Context loss: handle `webglcontextlost` and `webglcontextrestored`; show a "Reload scene" button.
- `prefers-reduced-motion`: disable damping inertia and any idle rotation.

## 7. Interaction

| Input | Action |
|-------|--------|
| Drag | Orbit |
| Scroll / pinch | Zoom within limits |
| Right drag / two-finger | Pan, clamped |
| Arrow keys | Orbit |
| `+` / `-` | Zoom |
| `R` | Reset camera |
| Overlay toggles | Show/hide contours, slope zones, footprint |

Scene container is focusable with `role="img"` plus `aria-label` summarising content, and a visible "View as text" disclosure listing terrain stats (min/max elevation, relief, slope class percentages).

## 8. Data contracts used by scenes

```ts
type TerrainSpec = {
  source: 'heightmap' | 'procedural';
  heightmapUrl?: string;           // when source = heightmap
  seed?: number;                   // procedural
  baseElevationM: number;
  reliefM: number;
  roughness: number;               // 0..1
  contourIntervalM?: number;
  slopeThresholdsDeg?: [number, number]; // default [10, 25]
  footprint?: { type: 'polygon'; coordinates: [number, number][] }; // local metres
  provenance: 'curated' | 'illustrative';
  evidenceIds?: string[];
};
```

## 9. Acceptance criteria

- Scenes load lazily and never block first paint of the page.
- Median frame time ≤ 16.7 ms on the Standard tier on the reference laptop, recorded in doc 09 results.
- Navigating between five landmarks 20 times does not grow GPU/JS memory beyond a stable plateau (no leak).
- Illustrative data is always labelled in the scene and in the card.
