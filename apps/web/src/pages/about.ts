import type { HealthResponse } from '@landmark/shared';

export async function renderAbout() {
  const page = document.getElementById('page')!;
  page.innerHTML = `
    <div style="max-width:760px">
      <h1 style="margin-bottom:var(--sp-4)">About Landmark Recognition</h1>

      <section style="margin-bottom:var(--sp-6)">
        <p class="section-label" style="margin-bottom:var(--sp-2)">System Philosophy</p>
        <p style="margin-bottom:var(--sp-3);line-height:1.6">
          This system pairs visual recognition with verifiable local evidence. When a visitor uploads a photo, a local vision model running via Ollama proposes candidates. The system then confirms the identification against a curated architectural catalogue and grounds every factual card in a primary evidence record.
        </p>
        <p style="line-height:1.6;color:var(--text-body)">
          <strong>Nothing leaves your machine:</strong> no analytics, no external CDN requests, and no telemetry.
        </p>
      </section>

      <section style="margin-bottom:var(--sp-6);background:var(--bg-sunken);padding:var(--sp-4);border:1px solid var(--line);border-radius:var(--radius)">
        <p class="section-label" style="margin-bottom:var(--sp-2)">Active Runtime Configuration</p>
        <div id="about-health" style="font-size:var(--fs-small);display:grid;gap:6px">
          <p style="color:var(--text-muted)">Querying local health endpoint…</p>
        </div>
      </section>

      <section style="margin-bottom:var(--sp-6)">
        <p class="section-label" style="margin-bottom:var(--sp-2)">Provenance & Badges</p>
        <p style="margin-bottom:var(--sp-3);font-size:var(--fs-small);line-height:1.6">
          Every statement presented to the visitor carries an explicit provenance classification:
        </p>
        <ul style="padding-left:var(--sp-4);font-size:var(--fs-small);line-height:1.8;color:var(--text-body)">
          <li><span class="badge-provenance curated">CURATED</span> Direct excerpts or paraphrases from authoritative sources (UNESCO, ASI, IMD). Traceable via evidence chips.</li>
          <li><span class="badge-provenance derived">DERIVED</span> Computed quantitatively from models, measurements, or cross-checks.</li>
          <li><span class="badge-provenance illustrative">ILLUSTRATIVE</span> Procedural simulations or representations (such as elevation sketches). Never presented as authoritative survey data.</li>
        </ul>
      </section>

      <section style="margin-bottom:var(--sp-6)">
        <p class="section-label" style="margin-bottom:var(--sp-2)">Confidence Calibration</p>
        <p style="margin-bottom:var(--sp-2);font-size:var(--fs-small);line-height:1.6">
          Model-reported confidence is calibrated against cue overlap and candidate margins:
        </p>
        <ul style="padding-left:var(--sp-4);font-size:var(--fs-small);line-height:1.8;color:var(--text-body)">
          <li><strong>High (&ge; 0.75):</strong> Strong visual cue match and unambiguous identification.</li>
          <li><strong>Moderate (0.50–0.74):</strong> Partial view or few visible cues; requires verification.</li>
          <li><strong>Low (&lt; 0.50):</strong> Below certainty threshold; the system reports uncertain or out of catalogue.</li>
        </ul>
      </section>

      <section style="border-top:1px solid var(--line);padding-top:var(--sp-4)">
        <p class="section-label" style="margin-bottom:var(--sp-2)">Privacy & Data Handling</p>
        <p style="font-size:var(--fs-small);line-height:1.6;color:var(--text-muted)">
          Uploaded images are normalized in the browser, held in transient RAM during analysis, stripped of EXIF metadata, and discarded immediately after inference. No photos are written to disk.
        </p>
      </section>
    </div>
  `;

  loadHealth();
}

async function loadHealth() {
  const container = document.getElementById('about-health');
  if (!container) return;

  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: HealthResponse = await res.json();

    container.innerHTML = `
      <div><strong>Ollama Status:</strong> <span class="mono">${data.ollama.state}</span> (${data.ollama.baseUrl})</div>
      <div><strong>Vision Model:</strong> <span class="mono">${data.ollama.visionModel}</span> (Loaded: ${data.ollama.visionModelLoaded})</div>
      <div><strong>Knowledge Base:</strong> ${data.knowledgeBase.landmarks} landmarks, ${data.knowledgeBase.documents} documents, ${data.knowledgeBase.passages} passages</div>
      <div><strong>Validated At:</strong> ${data.knowledgeBase.validatedAt}</div>
      <div><strong>Thresholds:</strong> Recognized &ge; ${data.config.confRecognized}, Uncertain &ge; ${data.config.confUncertain}</div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color:var(--enc-elevated)">Could not reach /api/health</p>`;
  }
}
