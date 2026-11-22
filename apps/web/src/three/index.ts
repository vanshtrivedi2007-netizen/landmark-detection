import * as THREE from 'three';
import { createScene, SceneContext } from './createScene.js';
import { setupRenderLoop } from './loop.js';
import { setupAccessibility } from './a11y.js';
import { render2DFallback, handleContextLoss } from './fallback.js';
import { buildTerrainScene } from './terrain/heightfield.js';
import { buildLandmarkSilhouette } from './landmarks/index.js';
import { qualityManager } from './quality.js';

export interface TerrainViewerControls {
  setOverlay: (layer: 'contours' | 'slope' | 'footprint', visible: boolean) => void;
  resetCamera: () => void;
  dispose: () => void;
}

export async function mountTerrainViewer(
  container: HTMLElement,
  options: {
    slug: string;
    name: string;
    elevationRange?: [number, number];
    footprintRadiusM?: number;
    onStats?: (stats: any) => void;
  }
): Promise<TerrainViewerControls> {
  const { slug, name, elevationRange = [160, 170], footprintRadiusM = 300, onStats } = options;

  let activeCtx: SceneContext | null = null;
  let cleanups: (() => void)[] = [];

  const init = () => {
    // Clear container
    container.innerHTML = '';

    const ctx = createScene(container);
    if (!ctx) {
      render2DFallback(container, name, {
        minElevation: elevationRange[0],
        maxElevation: elevationRange[1],
        relief: elevationRange[1] - elevationRange[0],
      });
      return;
    }
    activeCtx = ctx;

    // Handle context loss
    const lossHandler = handleContextLoss(ctx.renderer.domElement, () => {
      dispose();
      init();
    });
    cleanups.push(lossHandler.cleanup);

    const quality = qualityManager.getConfig();
    const terrainData = buildTerrainScene(slug, elevationRange, footprintRadiusM, quality.terrainSegments);
    ctx.scene.add(terrainData.terrainMesh);
    ctx.scene.add(terrainData.contoursLine);
    ctx.scene.add(terrainData.footprintMesh);

    // Add schematic landmark silhouette at the center of terrain
    const silhouette = buildLandmarkSilhouette(slug);
    silhouette.scale.set(0.35, 0.35, 0.35);
    silhouette.position.set(0, 0.1, 0);
    ctx.scene.add(silhouette);

    if (onStats) {
      onStats(terrainData.stats);
    }

    const a11y = setupAccessibility(ctx, `3D terrain and architectural massing of ${name}`);
    cleanups.push(a11y.cleanup);

    const loop = setupRenderLoop(ctx);
    loop.start();
    cleanups.push(loop.stop);

    return terrainData;
  };

  let terrain = init();

  const dispose = () => {
    cleanups.forEach((c) => c());
    cleanups = [];
    if (activeCtx) {
      activeCtx.dispose();
      activeCtx = null;
    }
  };

  return {
    setOverlay: (layer, visible) => {
      if (terrain) {
        terrain.setOverlayVisibility(layer, visible);
        activeCtx?.requestRender();
      }
    },
    resetCamera: () => {
      if (activeCtx) {
        activeCtx.camera.position.copy(activeCtx.initialCameraPos);
        activeCtx.controls.target.copy(activeCtx.initialTarget);
        activeCtx.controls.update();
        activeCtx.requestRender();
      }
    },
    dispose,
  };
}

export async function mountSilhouetteViewer(
  container: HTMLElement,
  slug: string,
  name?: string
): Promise<{ dispose: () => void }> {
  container.innerHTML = '';
  const ctx = createScene(container);
  if (!ctx) {
    render2DFallback(container, name || slug);
    return { dispose: () => {} };
  }

  // Camera setup tailored for massing silhouette
  ctx.camera.position.set(16, 12, 18);
  ctx.initialCameraPos.copy(ctx.camera.position);
  ctx.controls.target.set(0, 4, 0);
  ctx.initialTarget.copy(ctx.controls.target);
  ctx.controls.update();

  const silhouette = buildLandmarkSilhouette(slug);
  ctx.scene.add(silhouette);

  // Subtle circular plinth ring
  const ringGeom = new THREE.RingGeometry(8, 8.1, 32);
  ringGeom.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xd1d5db, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ctx.scene.add(ring);

  const a11y = setupAccessibility(ctx, `3D architectural wireframe massing of ${name || slug}`);
  const loop = setupRenderLoop(ctx);
  loop.start();

  return {
    dispose: () => {
      a11y.cleanup();
      loop.stop();
      ctx.dispose();
    },
  };
}

export async function mountComparisonViewer(
  container: HTMLElement,
  slug: string
): Promise<{ dispose: () => void }> {
  container.innerHTML = '';
  const ctx = createScene(container);
  if (!ctx) {
    render2DFallback(container, slug);
    return { dispose: () => {} };
  }

  ctx.camera.position.set(12, 8, 14);
  ctx.initialCameraPos.copy(ctx.camera.position);
  ctx.controls.target.set(0, 3.5, 0);
  ctx.initialTarget.copy(ctx.controls.target);
  ctx.controls.minDistance = 4;
  ctx.controls.maxDistance = 40;
  ctx.controls.update();

  const silhouette = buildLandmarkSilhouette(slug);
  silhouette.scale.set(0.8, 0.8, 0.8);
  ctx.scene.add(silhouette);

  const a11y = setupAccessibility(ctx, `Reference architectural silhouette of ${slug}`);
  const loop = setupRenderLoop(ctx);
  loop.start();

  return {
    dispose: () => {
      a11y.cleanup();
      loop.stop();
      ctx.dispose();
    },
  };
}
