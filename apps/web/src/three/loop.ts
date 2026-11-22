import { SceneContext } from './createScene.js';
import { qualityManager } from './quality.js';

export interface RenderLoopController {
  start: () => void;
  stop: () => void;
  requestFrame: () => void;
}

export function setupRenderLoop(ctx: SceneContext): RenderLoopController {
  let isRunning = false;
  let isVisible = true;
  let isIntersecting = true;
  let animFrameId: number | null = null;
  let needsRender = true;
  let dampingSettlingFrames = 0;

  const render = (now: number) => {
    if (!isRunning || !isVisible || !isIntersecting) {
      animFrameId = null;
      return;
    }

    // Check if controls are actively moving or damping
    const controlsUpdated = ctx.controls.update();
    if (controlsUpdated) {
      needsRender = true;
      dampingSettlingFrames = 15; // keep loop running briefly while damping settles
    } else if (dampingSettlingFrames > 0) {
      dampingSettlingFrames--;
      needsRender = true;
    }

    if (needsRender) {
      ctx.renderer.render(ctx.scene, ctx.camera);
      qualityManager.recordFrame(now);
      needsRender = false;
    }

    // Continue loop if damping or actively needed, or schedule on demand
    if (dampingSettlingFrames > 0) {
      animFrameId = requestAnimationFrame(render);
    } else {
      animFrameId = null;
    }
  };

  const scheduleRender = () => {
    needsRender = true;
    if (isRunning && isVisible && isIntersecting && animFrameId === null) {
      animFrameId = requestAnimationFrame(render);
    }
  };

  ctx.controls.addEventListener('change', () => {
    scheduleRender();
  });

  // IntersectionObserver to pause when scrolled out of view
  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry) {
        isIntersecting = entry.isIntersecting;
        if (isIntersecting) {
          scheduleRender();
        } else if (animFrameId !== null) {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
      }
    },
    { threshold: 0.05 }
  );
  intersectionObserver.observe(ctx.container);

  // Tab visibility changes
  const onVisibilityChange = () => {
    isVisible = !document.hidden;
    if (isVisible) {
      scheduleRender();
    } else if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  const start = () => {
    if (isRunning) return;
    isRunning = true;
    scheduleRender();
  };

  const stop = () => {
    isRunning = false;
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    intersectionObserver.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };

  return {
    start,
    stop,
    requestFrame: scheduleRender,
  };
}
