import type {
  RecognizeResult,
  StreamEvent,
  ApiError,
  CardItem,
} from '@landmark/shared';
import { createQaBox } from '../components/qa-box.js';

let currentAbortController: AbortController | null = null;
let currentPreviewUrl: string | null = null;
let currentComparisonCleanup: (() => void) | null = null;

export function renderRecognize() {
  if (currentComparisonCleanup) {
    currentComparisonCleanup();
    currentComparisonCleanup = null;
  }
  const page = document.getElementById('page')!;
  page.innerHTML = `
    <div style="margin-bottom:var(--sp-6)">
      <h1 style="margin-bottom:var(--sp-2)">Recognize a Landmark</h1>
      <p style="color:var(--text-body);max-width:62ch">
        Upload a photo. The local vision model will identify architectural cues, calibrate confidence, and retrieve cited decision-support evidence.
      </p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:var(--sp-6);align-items:start">
      <!-- Left Column: Image Plate & Upload -->
      <div>
        <div id="dropzone-container">
          <div id="dropzone" class="dropzone" tabindex="0" role="button" aria-label="Upload landmark photo">
            <input type="file" id="file-input" accept="image/jpeg,image/png,image/webp" style="display:none" />
            <p style="font-weight:500;color:var(--text-strong);margin-bottom:var(--sp-1)">Drop an image here or click to select</p>
            <p style="font-size:var(--fs-caption);color:var(--text-muted)">JPEG, PNG, or WebP &middot; Up to 10 MB</p>
            <p style="font-size:var(--fs-caption);color:var(--text-muted);margin-top:var(--sp-2)">Processed in local memory. Never uploaded to the cloud.</p>
          </div>
        </div>

        <div id="preview-container" style="display:none;margin-top:var(--sp-4)">
          <div style="border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;background:var(--bg-sunken);text-align:center">
            <img id="image-preview" src="" alt="Uploaded landmark preview" style="max-width:100%;max-height:360px;object-fit:contain;display:block;margin:0 auto" />
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--sp-2)">
            <span id="image-meta" class="mono" style="font-size:var(--fs-caption);color:var(--text-muted)"></span>
            <button id="btn-change-photo" class="btn-secondary" style="min-height:28px;padding:2px 8px;font-size:var(--fs-caption)">Choose another photo</button>
          </div>
        </div>
      </div>

      <!-- Right Column: Interactive State & Results Panel -->
      <div id="result-panel">
        <div class="decision-card" style="border-style:dashed">
          <div class="dc-label">Awaiting input</div>
          <div class="dc-headline" style="color:var(--text-muted);font-weight:400">Select or drop a photo to begin analysis.</div>
          <p class="dc-support" style="margin-bottom:0">The model evaluates domes, arches, minarets, and materials against the catalogue.</p>
        </div>
      </div>
    </div>
  `;

  initDropzoneEvents();
}

function initDropzoneEvents() {
  const dropzone = document.getElementById('dropzone')!;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const changeBtn = document.getElementById('btn-change-photo');

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]!);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFileSelected(fileInput.files[0]!);
    }
  });

  changeBtn?.addEventListener('click', () => {
    if (currentAbortController) currentAbortController.abort();
    renderRecognize();
  });
}

async function handleFileSelected(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    renderError({
      code: 'IMAGE_INVALID',
      message: 'That file is not a readable image.',
      action: 'Select a valid JPEG, PNG, or WebP photo.',
      retryAfterSeconds: null,
      details: {},
    });
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    renderError({
      code: 'IMAGE_TOO_LARGE',
      message: 'Image is larger than 10 MB.',
      action: 'Select a smaller photo under 10 MB.',
      retryAfterSeconds: null,
      details: {},
    });
    return;
  }

  // Show preview container
  const dropzoneContainer = document.getElementById('dropzone-container')!;
  const previewContainer = document.getElementById('preview-container')!;
  const previewImg = document.getElementById('image-preview') as HTMLImageElement;
  const imageMeta = document.getElementById('image-meta')!;

  dropzoneContainer.style.display = 'none';
  previewContainer.style.display = 'block';

  if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
  currentPreviewUrl = URL.createObjectURL(file);
  previewImg.src = currentPreviewUrl;
  imageMeta.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;

  // Client-side downscale
  renderProgress('preparing', 0, 'Resizing image for inference…');
  let resizedBlob: Blob;
  try {
    resizedBlob = await downscaleImageClient(file, 1024, 0.85);
  } catch {
    resizedBlob = file;
  }

  startRecognitionStream(resizedBlob);
}

function downscaleImageClient(file: File, maxSide = 1024, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width > maxSide || height > maxSide) {
        if (width > height) {
          height = Math.round((height * maxSide) / width);
          width = maxSide;
        } else {
          width = Math.round((width * maxSide) / height);
          height = maxSide;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else resolve(file);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image decode failed'));
    };

    img.src = url;
  });
}

async function startRecognitionStream(imageBlob: Blob) {
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();

  const formData = new FormData();
  formData.append('image', imageBlob, 'photo.jpg');
  formData.append('stream', 'true');

  const startTime = Date.now();
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  try {
    const response = await fetch('/api/recognize', {
      method: 'POST',
      body: formData,
      signal: currentAbortController.signal,
    });

    if (!response.ok && !response.headers.get('content-type')?.includes('application/x-ndjson')) {
      const errData = (await response.json()) as ApiError;
      renderError(errData.error);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No readable response stream');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event: StreamEvent = JSON.parse(line);
          if (event.type === 'status') {
            const elapsed = Math.round((Date.now() - startTime) / 100) / 10;
            if (event.phase === 'queued') {
              renderProgress('queued', elapsed, `Waiting for earlier request (position ${event.position || 1})…`);
            } else if (event.phase === 'loading_model') {
              renderProgress('loading_model', elapsed, 'Loading model into memory. First run can take up to a minute…');
            } else if (event.phase === 'analysing') {
              renderProgress('analysing', elapsed, 'Analysing architectural cues and comparing against catalogue…');
            }
          } else if (event.type === 'result') {
            if (timerInterval) clearInterval(timerInterval);
            renderResult(event.data);
            return;
          } else if (event.type === 'error') {
            if (timerInterval) clearInterval(timerInterval);
            renderError(event.error);
            return;
          }
        } catch {
          // ignore partial json parse
        }
      }
    }
  } catch (err) {
    if (timerInterval) clearInterval(timerInterval);
    if ((err as Error).name === 'AbortError') {
      renderError({
        code: 'CANCELLED',
        message: 'Analysis was cancelled.',
        action: 'Upload or retry when ready.',
        retryAfterSeconds: null,
        details: {},
      });
      return;
    }
    renderError({
      code: 'INTERNAL',
      message: (err as Error).message || 'Connection lost to server.',
      action: 'Check that the API server is running on port 3001.',
      retryAfterSeconds: null,
      details: {},
    });
  }
}

function renderProgress(phase: string, elapsedSec: number, statusText: string) {
  const panel = document.getElementById('result-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="decision-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-2)">
        <span class="section-label">${phase.replace('_', ' ')}</span>
        <span class="mono" style="font-size:var(--fs-caption);color:var(--text-muted)">Elapsed: ${elapsedSec.toFixed(1)}s</span>
      </div>
      <div class="dc-headline" style="font-size:var(--fs-body);margin-bottom:var(--sp-2)">${statusText}</div>
      <div style="height:3px;background:var(--line);border-radius:1px;overflow:hidden;margin-bottom:var(--sp-4)">
        <div style="height:100%;background:var(--accent);width:60%;animation:indeterminate 1.5s infinite linear"></div>
      </div>
      <button id="btn-cancel" class="btn-secondary" style="font-size:var(--fs-small);min-height:32px;padding:2px 12px">Cancel Analysis</button>
    </div>
  `;

  const cancelBtn = document.getElementById('btn-cancel');
  cancelBtn?.addEventListener('click', () => {
    if (currentAbortController) {
      currentAbortController.abort();
    }
  });
}

function renderResult(data: RecognizeResult) {
  const panel = document.getElementById('result-panel');
  if (!panel) return;

  if (data.outcome === 'recognized' && data.match) {
    const topCand = data.candidates[0];
    panel.innerHTML = `
      <div style="margin-bottom:var(--sp-6)">
        <span class="section-label">Identification Result</span>
        <h2 style="font-size:var(--fs-h2);margin-top:var(--sp-1);margin-bottom:var(--sp-2)">
          Likely: ${data.match.name}
        </h2>

        <!-- Confidence Meter -->
        <div class="confidence-meter">
          <div class="cm-track">
            <div class="cm-fill" style="width:${Math.round(data.match.confidence * 100)}%"></div>
          </div>
          <span class="cm-val">${data.match.confidence.toFixed(2)}</span>
          <span class="cm-band">(${data.match.confidenceBand} confidence)</span>
        </div>

        <p style="font-size:var(--fs-small);color:var(--text-body);margin-bottom:var(--sp-4);line-height:1.5">
          ${data.sceneDescription}
        </p>

        <!-- Side-by-side Architectural Comparison Plate per doc 05 section 3.3 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);background:var(--bg-sunken);border:1px solid var(--line);border-radius:var(--radius);padding:var(--sp-3);margin-bottom:var(--sp-4)">
          <div>
            <span class="section-label" style="display:block;margin-bottom:4px">Uploaded Photo</span>
            <div style="height:170px;border-radius:calc(var(--radius) - 2px);overflow:hidden;border:1px solid var(--line);background:var(--bg-surface);display:flex;align-items:center;justify-content:center">
              ${currentPreviewUrl ? `<img src="${currentPreviewUrl}" style="max-height:100%;max-width:100%;object-fit:contain" alt="Uploaded photo preview" />` : '<span style="color:var(--text-muted);font-size:var(--fs-caption)">No preview</span>'}
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
              <span class="section-label">Schematic Massing</span>
              <span class="badge-provenance illustrative" style="font-size:9px">ILLUSTRATIVE</span>
            </div>
            <div id="compare-silhouette-mount" style="position:relative;height:170px;border-radius:calc(var(--radius) - 2px);overflow:hidden;border:1px solid var(--line);background:var(--bg-surface)">
              <div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:var(--fs-caption);color:var(--text-muted)">Loading 3D…</div>
            </div>
          </div>
          <div style="grid-column:1 / -1;font-size:var(--fs-caption);color:var(--text-muted);border-top:1px solid var(--line);padding-top:4px">
            Fidelity: Schematic massing, not survey-accurate. Drag to orbit, scroll to zoom.
          </div>
        </div>

        <!-- Cues list -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);background:var(--bg-sunken);padding:var(--sp-3);border:1px solid var(--line);border-radius:var(--radius);margin-bottom:var(--sp-5);font-size:var(--fs-small)">
          <div>
            <strong style="color:var(--enc-ok);display:block;margin-bottom:var(--sp-1)">&check; Cues Observed</strong>
            <ul style="padding-left:var(--sp-3);margin:0;color:var(--text-body)">
              ${topCand?.visibleCues.length ? topCand.visibleCues.map((c) => `<li>${c}</li>`).join('') : '<li>None specifically cited</li>'}
            </ul>
          </div>
          <div>
            <strong style="color:var(--text-muted);display:block;margin-bottom:var(--sp-1)">&minus; Cues Not Seen</strong>
            <ul style="padding-left:var(--sp-3);margin:0;color:var(--text-muted)">
              ${topCand?.missingCues.length ? topCand.missingCues.map((c) => `<li>${c}</li>`).join('') : '<li>All expected cues visible or unoccluded</li>'}
            </ul>
          </div>
        </div>

        <!-- Alternatives if present -->
        ${data.candidates.length > 1
          ? `
          <div style="margin-bottom:var(--sp-5);font-size:var(--fs-small);border-top:1px solid var(--line);padding-top:var(--sp-3)">
            <p class="section-label" style="margin-bottom:var(--sp-2)">Alternative Candidates</p>
            ${data.candidates
              .slice(1)
              .map((c) => `<div style="display:flex;justify-content:space-between;color:var(--text-muted);margin-bottom:4px"><span>${c.landmarkId}</span><span class="mono">${c.confidence.toFixed(2)}</span></div>`)
              .join('')}
          </div>
        `
          : ''}

        <!-- Decision Support Cards -->
        <div style="margin-bottom:var(--sp-6)">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:var(--sp-3)">
            <h3 style="font-size:var(--fs-h3)">Verified Site Intelligence</h3>
            <a href="/landmarks/${data.match.landmarkId}" data-link style="font-size:var(--fs-small)">Open full landmark page &rarr;</a>
          </div>

          ${data.cards?.identity ? renderCards(data.cards.identity, 'Identity') : ''}
          ${data.cards?.visiting ? renderCards(data.cards.visiting, 'Visiting Guidance') : ''}
          ${data.cards?.conditions ? renderCards(data.cards.conditions, 'Site Conditions') : ''}
          ${data.cards?.context ? renderCards(data.cards.context, 'Context') : ''}
        </div>

        <!-- Grounded Q&A Hook -->
        <div id="recognize-qa-mount"></div>

        <!-- Link to full page -->
        <div style="margin-top:var(--sp-5)">
          <a href="/landmarks/${data.match.landmarkId}" data-link class="btn-primary" style="font-size:var(--fs-small)">
            View 3D Terrain & Complete Evidence &rarr;
          </a>
        </div>
      </div>
    `;

    const silMount = panel.querySelector('#compare-silhouette-mount') as HTMLElement | null;
    if (silMount && data.match) {
      import('../three/index.js').then((threeModule) => {
        threeModule.mountComparisonViewer(silMount, data.match!.landmarkId).then((ctrl) => {
          currentComparisonCleanup = ctrl.dispose;
        });
      });
    }

    const qaMount = panel.querySelector('#recognize-qa-mount');
    if (qaMount && data.match) {
      qaMount.appendChild(createQaBox(data.match.landmarkId, data.match.name));
    }
    return;
  }

  if (data.outcome === 'uncertain') {
    panel.innerHTML = `
      <div class="decision-card" style="border-color:var(--enc-caution)">
        <div class="dc-label" style="color:var(--enc-caution)">Honest Uncertainty</div>
        <div class="dc-headline">Not confident enough to name a landmark</div>
        <p class="dc-support" style="margin-bottom:var(--sp-3)">
          The model detected partial architectural features but cannot confirm a conclusive identification against the catalogue threshold.
        </p>

        <p class="section-label" style="margin-bottom:var(--sp-2)">Candidates considered</p>
        <div style="display:grid;gap:var(--sp-2);margin-bottom:var(--sp-4)">
          ${data.candidates
            .map(
              (c) => `
            <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-sunken);padding:var(--sp-2);border-radius:var(--radius)">
              <span style="font-weight:500">${c.landmarkId}</span>
              <span class="mono" style="color:var(--text-muted)">${c.confidence.toFixed(2)}</span>
            </div>
          `
            )
            .join('')}
        </div>

        <div style="background:var(--bg-canvas);border:1px solid var(--line);border-radius:var(--radius);padding:var(--sp-3);font-size:var(--fs-small);margin-bottom:var(--sp-4)">
          <strong>Suggestions for better identification:</strong>
          <ul style="padding-left:var(--sp-4);margin-top:var(--sp-1);color:var(--text-muted)">
            <li>Capture the full structure including roofline and plinth.</li>
            <li>Ensure bright natural daylight without heavy shadows or backlight.</li>
            <li>Avoid heavy cropping or extreme wide-angle distortion.</li>
          </ul>
        </div>

        <a href="/" data-link class="btn-secondary" style="font-size:var(--fs-small);min-height:32px;padding:2px 12px">Browse catalogue instead</a>
      </div>
    `;
    return;
  }

  // Out of catalogue
  panel.innerHTML = `
    <div class="decision-card">
      <div class="dc-label">Not in Catalogue</div>
      <div class="dc-headline">This does not look like a landmark in the catalogue</div>
      <p class="dc-support" style="margin-bottom:var(--sp-3)">
        ${data.sceneDescription || 'No matching architectural signatures found in the reference catalogue.'}
      </p>
      <div style="font-size:var(--fs-small);color:var(--text-muted);margin-bottom:var(--sp-4)">
        The catalogue currently includes five monuments: Taj Mahal, Red Fort, Qutub Minar, India Gate, and Hawa Mahal.
      </div>
      <a href="/" data-link class="btn-secondary" style="font-size:var(--fs-small);min-height:32px;padding:2px 12px">View all 5 catalogue entries</a>
    </div>
  `;
}

function renderCards(cards: CardItem[], label: string) {
  return cards
    .map(
      (card) => `
      <div class="decision-card">
        <div class="dc-label">${label}</div>
        <div class="dc-headline">${card.text}</div>
        ${card.asOf ? `<div class="dc-support" style="color:var(--text-muted);font-style:italic">Verify locally; last checked ${card.asOf}</div>` : ''}
        <div class="dc-footer">
          <span class="badge-provenance ${card.provenance}">${card.provenance}</span>
          <div class="dc-chips">
            ${card.evidenceIds.map((id) => `<button class="chip-evidence" data-evidence-id="${id}">${id}</button>`).join('')}
          </div>
        </div>
      </div>
    `
    )
    .join('');
}

function renderError(err: ApiError['error']) {
  const panel = document.getElementById('result-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="decision-card" style="border-color:var(--enc-elevated)">
      <div class="dc-label" style="color:var(--enc-elevated)">Error &middot; ${err.code}</div>
      <div class="dc-headline">${err.message}</div>
      <p class="dc-support" style="color:var(--text-muted);margin-bottom:var(--sp-3)">
        Recommended action: ${err.action}
      </p>
      <button onclick="window.location.reload()" class="btn-secondary" style="font-size:var(--fs-small);min-height:32px;padding:2px 12px">
        Retry
      </button>
    </div>
  `;
}
