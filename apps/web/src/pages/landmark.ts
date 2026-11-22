import type { LandmarkRecord, EvidenceSummary, CardItem } from '@landmark/shared';
import { createQaBox } from '../components/qa-box.js';
import { createTextAlternativeDisclosure } from '../three/a11y.js';

let activeViewerCleanup: (() => void) | null = null;

export async function renderLandmark(slug: string) {
  // Dispose any previous 3D instance before navigating
  if (activeViewerCleanup) {
    activeViewerCleanup();
    activeViewerCleanup = null;
  }

  const page = document.getElementById('page')!;
  page.innerHTML = `
    <div style="margin-bottom:var(--sp-4)">
      <a href="/" data-link style="font-size:var(--fs-small);color:var(--text-muted);text-decoration:none">&larr; Back to Catalogue</a>
    </div>
    <div id="landmark-content">
      <p style="color:var(--text-muted)">Loading landmark details…</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/landmarks/${slug}`);
    if (!res.ok) {
      if (res.status === 404) {
        page.innerHTML = `
          <div style="margin-bottom:var(--sp-4)"><a href="/" data-link>&larr; Back to Catalogue</a></div>
          <div class="decision-card">
            <div class="dc-label">Not Found</div>
            <div class="dc-headline">Landmark '${slug}' was not found</div>
            <p class="dc-support">This landmark does not exist in the local catalogue index.</p>
          </div>
        `;
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const lm: LandmarkRecord = await res.json();
    document.title = `${lm.name} — Landmark Recognition`;

    // Fetch evidence register
    const evRes = await fetch(`/api/landmarks/${slug}/evidence`);
    const evidenceList: EvidenceSummary[] = evRes.ok ? await evRes.json() : [];

    const content = document.getElementById('landmark-content')!;
    content.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(340px, 1fr));gap:var(--sp-6);margin-bottom:var(--sp-8);align-items:start">
        <!-- Visual Plate / 3D Viewer Container -->
        <div style="background:var(--bg-sunken);border:1px solid var(--line);border-radius:var(--radius);padding:var(--sp-4);min-height:380px;display:flex;flex-direction:column;justify-content:space-between">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-2)">
            <div style="display:flex;gap:var(--sp-1)">
              <button id="tab-terrain" class="btn-primary" style="font-size:var(--fs-caption);min-height:26px;padding:2px 8px">Terrain View</button>
              <button id="tab-silhouette" class="btn-secondary" style="font-size:var(--fs-caption);min-height:26px;padding:2px 8px">Silhouette View</button>
            </div>
            <span class="badge-provenance ${lm.terrain.type === 'illustrative' ? 'illustrative' : 'curated'}">
              ${lm.terrain.type === 'illustrative' ? 'ILLUSTRATIVE TERRAIN' : 'CURATED'}
            </span>
          </div>

          <!-- 3D Canvas Mount Point -->
          <div id="three-container" style="position:relative;width:100%;height:260px;background:var(--bg-surface);border:1px solid var(--line);border-radius:calc(var(--radius) - 2px);overflow:hidden">
            <div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:var(--fs-small);color:var(--text-muted)">
              Loading 3D scene…
            </div>
          </div>

          <!-- Controls & Overlay toggles -->
          <div id="terrain-controls" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--sp-2);border-top:1px solid var(--line);padding-top:var(--sp-2);margin-top:var(--sp-2);font-size:var(--fs-caption);color:var(--text-muted)">
            <div style="display:flex;gap:var(--sp-3);align-items:center">
              <label style="cursor:pointer;display:flex;align-items:center;gap:4px">
                <input type="checkbox" id="chk-contours" checked /> Contours
              </label>
              <label style="cursor:pointer;display:flex;align-items:center;gap:4px">
                <input type="checkbox" id="chk-slope" /> Slope Zones
              </label>
              <label style="cursor:pointer;display:flex;align-items:center;gap:4px">
                <input type="checkbox" id="chk-footprint" checked /> Footprint
              </label>
            </div>
            <button id="btn-reset-cam" class="btn-secondary" style="font-size:var(--fs-caption);min-height:24px;padding:0 6px">Reset View (R)</button>
          </div>

          <!-- Fidelity Note & Text Alternative Container -->
          <div style="margin-top:var(--sp-1);font-size:var(--fs-caption);color:var(--text-muted)">
            <span>Fidelity: Schematic massing, not survey-accurate.</span>
            <div id="stats-disclosure-mount"></div>
          </div>
        </div>

        <!-- Catalogue Details -->
        <div>
          <span class="section-label">Catalogue Record</span>
          <h1 style="margin-top:var(--sp-1);margin-bottom:var(--sp-2)">${lm.name}</h1>
          <p style="font-size:var(--fs-small);color:var(--text-muted);margin-bottom:var(--sp-3)">
            Aliases: ${lm.aliases.length > 0 ? lm.aliases.join(', ') : 'None'}
          </p>
          <p style="font-size:var(--fs-body);line-height:1.6;margin-bottom:var(--sp-4);color:var(--text-body)">
            ${lm.descriptor}
          </p>

          <dl class="meta-dl">
            <dt>Location</dt>
            <dd>${lm.location.city}, ${lm.location.state}, ${lm.location.country} (${lm.location.lat.toFixed(4)}° N, ${lm.location.lon.toFixed(4)}° E)</dd>
            <dt>Period</dt>
            <dd>${lm.period}</dd>
            <dt>Confusable with</dt>
            <dd>${lm.confusableWith.length > 0 ? lm.confusableWith.join(', ') : 'None identified'}</dd>
            <dt>Identifying Cues</dt>
            <dd>${lm.identifyingCues.map((c) => c.text).join('; ')}</dd>
          </dl>
        </div>
      </div>

      <!-- Decision Cards -->
      <section style="margin-bottom:var(--sp-6);max-width:800px">
        <h2 style="font-size:var(--fs-h2);margin-bottom:var(--sp-4)">Decision Support Guidance</h2>
        ${renderDecisionCardGroup('Identity', lm.cards.identity)}
        ${renderDecisionCardGroup('Visiting Guidance', lm.cards.visiting)}
        ${renderDecisionCardGroup('Site Conditions', lm.cards.conditions)}
        ${renderDecisionCardGroup('Context & Significance', lm.cards.context)}
        ${lm.cards.caveats && lm.cards.caveats.length > 0 ? renderDecisionCardGroup('Confidence & Caveats', lm.cards.caveats) : ''}
      </section>

      <!-- Grounded Q&A Assistant Hook -->
      <div id="qa-mount-point"></div>

      <!-- Evidence Register for this landmark -->
      <section style="margin-bottom:var(--sp-8)">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:var(--sp-3)">
          <h2 style="font-size:var(--fs-h3)">Evidence Register (${evidenceList.length} documents)</h2>
          <a href="/sources?landmarkId=${slug}" data-link style="font-size:var(--fs-small)">View in full register &rarr;</a>
        </div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Publisher</th>
                <th>Type</th>
                <th>Retrieved</th>
                <th>Licence</th>
              </tr>
            </thead>
            <tbody>
              ${evidenceList
                .map(
                  (ev) => `
                <tr>
                  <td><button class="chip-evidence" data-evidence-id="${ev.id}">${ev.id}</button></td>
                  <td><strong>${ev.title}</strong></td>
                  <td>${ev.publisher}</td>
                  <td><span class="mono">${ev.type}</span></td>
                  <td>${ev.retrievedAt}</td>
                  <td style="color:var(--text-muted)">${ev.licence}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;

    // Lazy load 3D module per acceptance criteria
    const container = document.getElementById('three-container');
    const tabTerrain = document.getElementById('tab-terrain') as HTMLButtonElement | null;
    const tabSilhouette = document.getElementById('tab-silhouette') as HTMLButtonElement | null;
    const terrainControls = document.getElementById('terrain-controls');
    const chkContours = document.getElementById('chk-contours') as HTMLInputElement | null;
    const chkSlope = document.getElementById('chk-slope') as HTMLInputElement | null;
    const chkFootprint = document.getElementById('chk-footprint') as HTMLInputElement | null;
    const btnResetCam = document.getElementById('btn-reset-cam') as HTMLButtonElement | null;
    const statsMount = document.getElementById('stats-disclosure-mount');

    if (container) {
      const threeModule = await import('../three/index.js');

      let currentMode: 'terrain' | 'silhouette' = 'terrain';
      let terrainController: Awaited<ReturnType<typeof threeModule.mountTerrainViewer>> | null = null;

      const loadTerrainView = async () => {
        if (activeViewerCleanup) activeViewerCleanup();
        tabTerrain?.classList.replace('btn-secondary', 'btn-primary');
        tabSilhouette?.classList.replace('btn-primary', 'btn-secondary');
        if (terrainControls) terrainControls.style.display = 'flex';

        terrainController = await threeModule.mountTerrainViewer(container, {
          slug,
          name: lm.name,
          elevationRange: lm.terrain.elevationRange,
          footprintRadiusM: lm.terrain.footprintRadiusM,
          onStats: (stats) => {
            if (statsMount) {
              statsMount.innerHTML = '';
              statsMount.appendChild(
                createTextAlternativeDisclosure({
                  ...stats,
                  footprintRadiusM: lm.terrain.footprintRadiusM,
                })
              );
            }
          },
        });

        activeViewerCleanup = () => {
          terrainController?.dispose();
          terrainController = null;
        };
      };

      const loadSilhouetteView = async () => {
        if (activeViewerCleanup) activeViewerCleanup();
        tabSilhouette?.classList.replace('btn-secondary', 'btn-primary');
        tabTerrain?.classList.replace('btn-primary', 'btn-secondary');
        if (terrainControls) terrainControls.style.display = 'none';

        const silController = await threeModule.mountSilhouetteViewer(container, slug, lm.name);
        activeViewerCleanup = () => {
          silController.dispose();
        };
      };

      // Initial view load
      loadTerrainView();

      tabTerrain?.addEventListener('click', () => {
        if (currentMode !== 'terrain') {
          currentMode = 'terrain';
          loadTerrainView();
        }
      });

      tabSilhouette?.addEventListener('click', () => {
        if (currentMode !== 'silhouette') {
          currentMode = 'silhouette';
          loadSilhouetteView();
        }
      });

      chkContours?.addEventListener('change', () => {
        terrainController?.setOverlay('contours', chkContours.checked);
      });
      chkSlope?.addEventListener('change', () => {
        terrainController?.setOverlay('slope', chkSlope.checked);
      });
      chkFootprint?.addEventListener('change', () => {
        terrainController?.setOverlay('footprint', chkFootprint.checked);
      });
      btnResetCam?.addEventListener('click', () => {
        terrainController?.resetCamera();
      });
    }

    // Mount Q&A Box
    const qaMount = document.getElementById('qa-mount-point');
    if (qaMount) {
      qaMount.appendChild(createQaBox(lm.id, lm.name));
    }
  } catch (err) {
    page.innerHTML = `
      <div style="margin-bottom:var(--sp-4)"><a href="/" data-link>&larr; Back to Catalogue</a></div>
      <p style="color:var(--enc-elevated)">Error loading landmark: ${(err as Error).message}</p>
    `;
  }
}

function renderDecisionCardGroup(categoryLabel: string, items: CardItem[]) {
  if (!items || items.length === 0) {
    return `
      <div class="decision-card">
        <div class="dc-label">${categoryLabel}</div>
        <div class="dc-headline" style="color:var(--text-muted);font-weight:400">No evidence on file</div>
        <div class="dc-footer">
          <span class="badge-provenance curated">CURATED</span>
        </div>
      </div>
    `;
  }

  return items
    .map(
      (card) => `
    <div class="decision-card">
      <div class="dc-label">${categoryLabel}</div>
      <div class="dc-headline">${card.text}</div>
      <div class="dc-footer">
        <div>
          ${card.evidenceIds.map((id) => `<button class="chip-evidence" data-evidence-id="${id}">${id}</button>`).join('')}
        </div>
        <span class="badge-provenance ${card.provenance}">${card.provenance}</span>
      </div>
    </div>
  `
    )
    .join('');
}
