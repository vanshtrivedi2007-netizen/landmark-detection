import type { EvidenceMeta, LandmarkIndex } from '@landmark/shared';

export async function renderSources() {
  const page = document.getElementById('page')!;
  page.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:var(--sp-6);flex-wrap:wrap;gap:var(--sp-3)">
      <div>
        <h1 style="margin-bottom:var(--sp-2)">Sources Register</h1>
        <p style="color:var(--text-body);max-width:62ch">
          Full register of primary and secondary sources grounding all factual statements in the application.
        </p>
      </div>
      <div style="display:flex;gap:var(--sp-3);align-items:center">
        <label for="filter-landmark" style="font-size:var(--fs-small);color:var(--text-muted)">Filter:</label>
        <select id="filter-landmark" style="padding:var(--sp-1) var(--sp-2);border:1px solid var(--line-strong);border-radius:var(--radius);font-family:inherit;font-size:var(--fs-small);background:var(--bg-surface);color:var(--text-strong)">
          <option value="">All Landmarks</option>
        </select>
        <a id="btn-export-csv" href="/api/sources?format=csv" class="btn-secondary" style="font-size:var(--fs-small);min-height:32px;padding:4px 12px">Export CSV</a>
      </div>
    </div>

    <div style="overflow-x:auto">
      <table class="data-table" id="sources-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Publisher</th>
            <th>Type</th>
            <th>Retrieved</th>
            <th>Licence</th>
            <th>Landmarks</th>
          </tr>
        </thead>
        <tbody id="sources-tbody">
          <tr>
            <td colspan="7" style="text-align:center;color:var(--text-muted);padding:var(--sp-6)">Loading sources register…</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  loadSourcesAndLandmarks();
}

async function loadSourcesAndLandmarks() {
  const tbody = document.getElementById('sources-tbody');
  const select = document.getElementById('filter-landmark') as HTMLSelectElement | null;
  const exportBtn = document.getElementById('btn-export-csv') as HTMLAnchorElement | null;
  if (!tbody) return;

  // Check URL query parameter for pre-filtering
  const urlParams = new URLSearchParams(window.location.search);
  const initialLandmark = urlParams.get('landmarkId') || '';

  try {
    const [sourcesRes, landmarksRes] = await Promise.all([
      fetch('/api/sources'),
      fetch('/api/landmarks'),
    ]);

    if (!sourcesRes.ok || !landmarksRes.ok) throw new Error('API request failed');

    const sources: EvidenceMeta[] = await sourcesRes.json();
    const landmarks: LandmarkIndex[] = await landmarksRes.json();

    if (select) {
      landmarks.forEach((lm) => {
        const opt = document.createElement('option');
        opt.value = lm.id;
        opt.textContent = lm.name;
        if (lm.id === initialLandmark) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener('change', () => {
        const val = select.value;
        if (exportBtn) {
          exportBtn.href = val ? `/api/sources?landmarkId=${val}&format=csv` : '/api/sources?format=csv';
        }
        renderTableRows(sources, val);
      });
    }

    if (exportBtn && initialLandmark) {
      exportBtn.href = `/api/sources?landmarkId=${initialLandmark}&format=csv`;
    }

    renderTableRows(sources, initialLandmark);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--enc-elevated);text-align:center">Error loading sources: ${(err as Error).message}</td></tr>`;
  }
}

function renderTableRows(sources: EvidenceMeta[], landmarkFilter: string) {
  const tbody = document.getElementById('sources-tbody');
  if (!tbody) return;

  const filtered = landmarkFilter
    ? sources.filter((s) => s.landmarkIds.includes(landmarkFilter))
    : sources;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:var(--sp-5)">No sources found for the selected filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (s) => `
      <tr>
        <td>
          <button class="chip-evidence" data-evidence-id="${s.id}">${s.id}</button>
        </td>
        <td>
          <a href="${s.url}" target="_blank" rel="noopener noreferrer" style="font-weight:600;color:var(--text-strong);text-decoration:none">
            ${s.title}
          </a>
        </td>
        <td>${s.publisher}</td>
        <td><span class="mono">${s.type}</span></td>
        <td>${s.retrievedAt}</td>
        <td style="color:var(--text-muted);max-width:180px">${s.licence}</td>
        <td>
          ${s.landmarkIds.map((l) => `<span class="mono" style="font-size:var(--fs-caption)">${l}</span>`).join(', ')}
        </td>
      </tr>
    `
    )
    .join('');
}
