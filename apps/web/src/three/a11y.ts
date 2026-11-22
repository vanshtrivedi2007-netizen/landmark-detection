import { SceneContext } from './createScene.js';

export function setupAccessibility(
  ctx: SceneContext,
  label: string,
  onReset?: () => void
): { cleanup: () => void } {
  const container = ctx.container;
  container.setAttribute('role', 'img');
  container.setAttribute('aria-label', label);
  container.setAttribute('tabindex', '0');

  const onKeyDown = (e: KeyboardEvent) => {
    // Only handle if container or an element inside it is focused
    if (document.activeElement !== container && !container.contains(document.activeElement)) {
      return;
    }

    const orbitStep = 0.05;
    const zoomStep = 1.1;

    switch (e.key) {
      case 'ArrowLeft': {
        e.preventDefault();
        // Orbit left around Y axis
        const offset = ctx.camera.position.clone().sub(ctx.controls.target);
        offset.applyAxisAngle(ctx.camera.up, orbitStep);
        ctx.camera.position.copy(ctx.controls.target).add(offset);
        ctx.controls.update();
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        // Orbit right around Y axis
        const offset = ctx.camera.position.clone().sub(ctx.controls.target);
        offset.applyAxisAngle(ctx.camera.up, -orbitStep);
        ctx.camera.position.copy(ctx.controls.target).add(offset);
        ctx.controls.update();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        // Pitch up (within polar clamp)
        const offset = ctx.camera.position.clone().sub(ctx.controls.target);
        const radius = offset.length();
        let theta = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));
        theta = Math.max(0.1, theta - orbitStep);
        const phi = Math.atan2(offset.z, offset.x);
        offset.x = radius * Math.sin(theta) * Math.cos(phi);
        offset.y = radius * Math.cos(theta);
        offset.z = radius * Math.sin(theta) * Math.sin(phi);
        ctx.camera.position.copy(ctx.controls.target).add(offset);
        ctx.controls.update();
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        // Pitch down (within polar clamp)
        const offset = ctx.camera.position.clone().sub(ctx.controls.target);
        const radius = offset.length();
        let theta = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));
        theta = Math.min(Math.PI / 2 - 0.06, theta + orbitStep);
        const phi = Math.atan2(offset.z, offset.x);
        offset.x = radius * Math.sin(theta) * Math.cos(phi);
        offset.y = radius * Math.cos(theta);
        offset.z = radius * Math.sin(theta) * Math.sin(phi);
        ctx.camera.position.copy(ctx.controls.target).add(offset);
        ctx.controls.update();
        break;
      }
      case '+':
      case '=': {
        e.preventDefault();
        // Zoom in
        const offset = ctx.camera.position.clone().sub(ctx.controls.target);
        if (offset.length() > ctx.controls.minDistance * 1.05) {
          offset.divideScalar(zoomStep);
          ctx.camera.position.copy(ctx.controls.target).add(offset);
          ctx.controls.update();
        }
        break;
      }
      case '-':
      case '_': {
        e.preventDefault();
        // Zoom out
        const offset = ctx.camera.position.clone().sub(ctx.controls.target);
        if (offset.length() < ctx.controls.maxDistance * 0.95) {
          offset.multiplyScalar(zoomStep);
          ctx.camera.position.copy(ctx.controls.target).add(offset);
          ctx.controls.update();
        }
        break;
      }
      case 'r':
      case 'R': {
        e.preventDefault();
        // Reset camera
        ctx.camera.position.copy(ctx.initialCameraPos);
        ctx.controls.target.copy(ctx.initialTarget);
        ctx.controls.update();
        if (onReset) onReset();
        break;
      }
    }
  };

  container.addEventListener('keydown', onKeyDown);

  return {
    cleanup: () => {
      container.removeEventListener('keydown', onKeyDown);
    },
  };
}

export function createTextAlternativeDisclosure(stats: {
  minElevation: number;
  maxElevation: number;
  relief: number;
  slope: { gentlePct: number; moderatePct: number; steepPct: number };
  footprintRadiusM?: number;
}): HTMLElement {
  const details = document.createElement('details');
  details.style.fontSize = 'var(--fs-caption)';
  details.style.color = 'var(--text-muted)';
  details.style.marginTop = 'var(--sp-2)';

  const summary = document.createElement('summary');
  summary.style.cursor = 'pointer';
  summary.style.userSelect = 'none';
  summary.textContent = 'View terrain statistics as text';

  const body = document.createElement('div');
  body.style.paddingTop = 'var(--sp-2)';
  body.innerHTML = `
    <dl class="meta-dl" style="font-size:var(--fs-caption);grid-template-columns:120px 1fr;gap:var(--sp-1)">
      <dt>Elevation</dt>
      <dd class="mono">${stats.minElevation}m – ${stats.maxElevation}m (Relief: ${stats.relief}m)</dd>
      <dt>Slope zones</dt>
      <dd class="mono">Gentle (&lt;10°): ${stats.slope.gentlePct}%, Mod (10-25°): ${stats.slope.moderatePct}%, Steep (&gt;25°): ${stats.slope.steepPct}%</dd>
      ${stats.footprintRadiusM ? `<dt>Footprint</dt><dd class="mono">~${stats.footprintRadiusM}m radius</dd>` : ''}
      <dt>Provenance</dt>
      <dd class="mono">ILLUSTRATIVE TERRAIN</dd>
    </dl>
  `;

  details.appendChild(summary);
  details.appendChild(body);
  return details;
}
