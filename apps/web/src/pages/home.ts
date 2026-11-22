import type { LandmarkIndex } from '@landmark/shared';

export async function renderHome() {
  const page = document.getElementById('page')!;
  page.innerHTML = `
    <section style="margin-bottom:var(--sp-8)">
      <h1 style="margin-bottom:var(--sp-2)">Identify a landmark. See the evidence.</h1>
      <p style="max-width:62ch;margin-bottom:var(--sp-4);color:var(--text-body)">
        Upload a photograph of a landmark. A vision model running on your computer identifies the site, cross-checks it against a curated catalogue, and presents verifiable decision-support guidance.
      </p>
      <a href="/recognize" data-link class="btn-primary">Recognize a photo</a>
    </section>

    <section style="margin-bottom:var(--sp-8)">
      <p class="section-label" style="margin-bottom:var(--sp-3)">How it works</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:var(--radius)">
        <div style="background:var(--bg-canvas);padding:var(--sp-4)">
          <div style="font-family:'JetBrains Mono',monospace;font-size:var(--fs-caption);color:var(--text-muted);margin-bottom:var(--sp-1)">STEP 01</div>
          <strong style="color:var(--text-strong);display:block;margin-bottom:var(--sp-1)">Upload photo</strong>
          <span style="font-size:var(--fs-small);color:var(--text-body)">Client-side normalized. Processed entirely in local memory.</span>
        </div>
        <div style="background:var(--bg-canvas);padding:var(--sp-4)">
          <div style="font-family:'JetBrains Mono',monospace;font-size:var(--fs-caption);color:var(--text-muted);margin-bottom:var(--sp-1)">STEP 02</div>
          <strong style="color:var(--text-strong);display:block;margin-bottom:var(--sp-1)">Verify against catalogue</strong>
          <span style="font-size:var(--fs-small);color:var(--text-body)">Visual cues cross-checked against architectural ground truth.</span>
        </div>
        <div style="background:var(--bg-canvas);padding:var(--sp-4)">
          <div style="font-family:'JetBrains Mono',monospace;font-size:var(--fs-caption);color:var(--text-muted);margin-bottom:var(--sp-1)">STEP 03</div>
          <strong style="color:var(--text-strong);display:block;margin-bottom:var(--sp-1)">Read the evidence</strong>
          <span style="font-size:var(--fs-small);color:var(--text-body)">Every displayed fact cites a traceable primary source.</span>
        </div>
      </div>
    </section>

    <section style="margin-bottom:var(--sp-8)">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:var(--sp-4)">
        <p class="section-label">Catalogue Index</p>
        <span style="font-size:var(--fs-caption);color:var(--text-muted)" id="catalogue-count">5 landmarks</span>
      </div>
      <div id="catalogue-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:var(--sp-4)">
        <p style="color:var(--text-muted);font-size:var(--fs-small)">Loading catalogue…</p>
      </div>
    </section>

    <section style="max-width:68ch;border-top:1px solid var(--line);padding-top:var(--sp-6)">
      <p class="section-label" style="margin-bottom:var(--sp-2)">Method Note</p>
      <p style="color:var(--text-muted);font-size:var(--fs-small);line-height:1.6">
        Recognition runs locally via Ollama. No telemetry, no cloud API calls, and no CDN dependencies.
        When visual certainty is below threshold or the structure is absent from the catalogue, the system abstains.
        <a href="/about" data-link style="margin-left:4px">Read full method &rarr;</a>
      </p>
    </section>
  `;

  loadCatalogue();
}


async function loadCatalogue() {
  const grid = document.getElementById('catalogue-grid');
  if (!grid) return;

  try {
    const res = await fetch('/api/landmarks');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const landmarks: LandmarkIndex[] = await res.json();

    const countEl = document.getElementById('catalogue-count');
    if (countEl) countEl.textContent = `${landmarks.length} landmarks`;

    grid.innerHTML = landmarks
      .map(
        (lm, idx) => `
        <a href="/landmarks/${lm.id}" data-link class="catalogue-card">
          <div class="card-index">LANDMARK 0${idx + 1}</div>
          <h2 class="card-title">${lm.name}</h2>
          <div class="card-desc">${lm.descriptor}</div>
          <div class="card-meta">
            <div class="card-meta-row">
              <span>Location</span>
              <span class="card-meta-val">${lm.location}</span>
            </div>
            <div class="card-meta-row">
              <span>Period</span>
              <span class="card-meta-val">${lm.period}</span>
            </div>
            <div class="card-meta-row">
              <span>Terrain</span>
              <span class="card-meta-val">${lm.hasRealTerrainData ? 'Survey' : 'Illustrative'}</span>
            </div>
          </div>
        </a>
      `
      )
      .join('');
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--enc-elevated);font-size:var(--fs-small)">Could not load catalogue. Make sure the backend server is running.</p>`;
  }
}
