import type { EvidenceDocument } from '@landmark/shared';

let drawerElement: HTMLElement | null = null;

export function initEvidenceDrawer() {
  if (drawerElement) return;

  drawerElement = document.createElement('div');
  drawerElement.className = 'drawer-backdrop';
  drawerElement.setAttribute('role', 'dialog');
  drawerElement.setAttribute('aria-modal', 'true');
  drawerElement.setAttribute('aria-label', 'Evidence details');

  drawerElement.innerHTML = `
    <div class="drawer-panel" tabindex="-1">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--sp-4);padding-bottom:var(--sp-2);border-bottom:1px solid var(--line)">
        <div>
          <span class="mono" id="drawer-ev-id" style="font-size:var(--fs-caption);color:var(--text-muted)"></span>
          <h3 id="drawer-title" style="font-size:var(--fs-h4);margin-top:var(--sp-1)"></h3>
        </div>
        <button id="drawer-close" aria-label="Close evidence panel" style="background:none;border:none;font-size:1.5rem;line-height:1;cursor:pointer;color:var(--text-muted);padding:4px 8px">&times;</button>
      </div>

      <div id="drawer-meta" style="font-size:var(--fs-small);margin-bottom:var(--sp-4);color:var(--text-muted);display:grid;gap:4px"></div>

      <div style="border-top:1px solid var(--line);padding-top:var(--sp-4)">
        <p class="section-label" style="margin-bottom:var(--sp-2)">Cited Passage</p>
        <div id="drawer-body" style="font-size:var(--fs-small);line-height:1.6;color:var(--text-strong)"></div>
      </div>

      <div style="margin-top:auto;padding-top:var(--sp-4);border-top:1px solid var(--line);font-size:var(--fs-caption);color:var(--text-muted)">
        <a id="drawer-link" href="#" target="_blank" rel="noopener noreferrer" style="font-weight:500">Open source URL &rarr;</a>
      </div>
    </div>
  `;

  document.body.appendChild(drawerElement);

  drawerElement.addEventListener('click', (e) => {
    if (e.target === drawerElement) {
      closeEvidenceDrawer();
    }
  });

  const closeBtn = drawerElement.querySelector('#drawer-close');
  closeBtn?.addEventListener('click', () => closeEvidenceDrawer());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerElement?.classList.contains('open')) {
      closeEvidenceDrawer();
    }
  });

  // Global click delegate for evidence chips
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const chip = target.closest('[data-evidence-id]') as HTMLElement | null;
    if (chip) {
      e.preventDefault();
      const id = chip.dataset.evidenceId;
      if (id) {
        openEvidenceDrawer(id);
      }
    }
  });
}

export async function openEvidenceDrawer(evidenceId: string) {
  initEvidenceDrawer();
  if (!drawerElement) return;

  const titleEl = drawerElement.querySelector('#drawer-title')!;
  const idEl = drawerElement.querySelector('#drawer-ev-id')!;
  const metaEl = drawerElement.querySelector('#drawer-meta')!;
  const bodyEl = drawerElement.querySelector('#drawer-body')!;
  const linkEl = drawerElement.querySelector('#drawer-link') as HTMLAnchorElement;

  const baseId = evidenceId.split('#')[0]!;
  idEl.textContent = evidenceId;
  titleEl.textContent = 'Loading evidence…';
  metaEl.innerHTML = '';
  bodyEl.textContent = '';
  drawerElement.classList.add('open');

  try {
    const res = await fetch(`/api/evidence/${baseId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const doc: EvidenceDocument = await res.json();

    titleEl.textContent = doc.title;
    metaEl.innerHTML = `
      <div><strong>Publisher:</strong> ${doc.publisher}</div>
      <div><strong>Type:</strong> ${doc.type} · <strong>Reliability:</strong> ${doc.reliability}</div>
      <div><strong>Retrieved:</strong> ${doc.retrievedAt}</div>
      <div><strong>Licence:</strong> ${doc.licence}</div>
    `;

    // Find specific passage if hash specified
    let displayBody = doc.rawBody;
    const hash = evidenceId.split('#')[1];
    if (hash && hash.startsWith('p')) {
      const pIdx = parseInt(hash.slice(1), 10) - 1;
      if (doc.passages[pIdx]) {
        displayBody = doc.passages[pIdx]!;
      }
    }

    bodyEl.innerHTML = displayBody.replace(/\n\n/g, '<br/><br/>');

    if (doc.url) {
      linkEl.href = doc.url;
      linkEl.style.display = 'inline-block';
    } else {
      linkEl.style.display = 'none';
    }
  } catch (err) {
    titleEl.textContent = 'Failed to load evidence';
    bodyEl.textContent = `Could not load evidence document for ID: ${evidenceId}`;
  }
}

export function closeEvidenceDrawer() {
  drawerElement?.classList.remove('open');
}
