export function render2DFallback(
  container: HTMLElement,
  landmarkName: string,
  stats?: { minElevation: number; maxElevation: number; relief: number }
): void {
  const minElev = stats ? stats.minElevation : 160;
  const maxElev = stats ? stats.maxElevation : 170;
  const relief = stats ? stats.relief : 10;

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:var(--sp-4);background:var(--bg-sunken);border-radius:var(--radius)">
      <svg viewBox="0 0 200 120" style="width:100%;max-width:240px;height:auto;stroke:var(--line-strong);fill:none;margin-bottom:var(--sp-2)">
        <!-- Topographic Contour Simulation -->
        <ellipse cx="100" cy="60" rx="80" ry="45" stroke="#D1D5DB" stroke-width="1" />
        <ellipse cx="100" cy="60" rx="60" ry="34" stroke="#9CA3AF" stroke-width="1" />
        <ellipse cx="100" cy="60" rx="42" ry="24" stroke="#6B7280" stroke-width="1.2" />
        <ellipse cx="100" cy="60" rx="24" ry="14" stroke="#4B5563" stroke-width="1.2" />
        <ellipse cx="100" cy="60" rx="10" ry="6" stroke="#1F3A5F" stroke-width="1.5" />
        <!-- Footprint boundary -->
        <rect x="75" y="45" width="50" height="30" stroke="#1F3A5F" stroke-dasharray="3,3" stroke-width="1.5" />
      </svg>
      <div style="font-size:var(--fs-caption);color:var(--text-muted);text-align:center">
        <strong style="color:var(--text-strong);display:block">${landmarkName} (2D Cartographic Fallback)</strong>
        <span>Relief: ${relief}m (${minElev}m – ${maxElev}m) · WebGL unavailable</span>
      </div>
    </div>
  `;
}

export function handleContextLoss(
  canvas: HTMLCanvasElement,
  onReload: () => void
): { cleanup: () => void } {
  let lossNotice: HTMLElement | null = null;

  const onLost = (e: Event) => {
    e.preventDefault(); // allow WebGL to restore if possible
    if (!lossNotice) {
      lossNotice = document.createElement('div');
      lossNotice.style.position = 'absolute';
      lossNotice.style.inset = '0';
      lossNotice.style.background = 'rgba(255,255,255,0.92)';
      lossNotice.style.display = 'flex';
      lossNotice.style.flexDirection = 'column';
      lossNotice.style.alignItems = 'center';
      lossNotice.style.justifyContent = 'center';
      lossNotice.style.gap = 'var(--sp-2)';
      lossNotice.style.zIndex = '10';

      lossNotice.innerHTML = `
        <p style="font-size:var(--fs-small);color:var(--text-strong);margin:0">3D Graphics Context Interrupted</p>
        <button id="btn-reload-context" class="btn-secondary" style="font-size:var(--fs-caption);min-height:28px;padding:2px 10px">Reload scene</button>
      `;

      canvas.parentElement?.appendChild(lossNotice);
      lossNotice.querySelector('#btn-reload-context')?.addEventListener('click', () => {
        onReload();
      });
    }
  };

  const onRestored = () => {
    if (lossNotice && lossNotice.parentNode) {
      lossNotice.parentNode.removeChild(lossNotice);
      lossNotice = null;
    }
    onReload();
  };

  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  return {
    cleanup: () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (lossNotice && lossNotice.parentNode) {
        lossNotice.parentNode.removeChild(lossNotice);
      }
    },
  };
}
