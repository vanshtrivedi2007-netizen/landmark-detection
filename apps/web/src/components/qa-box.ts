import type { AskResponse } from '@landmark/shared';

export function createQaBox(landmarkId: string, landmarkName: string): HTMLElement {
  const container = document.createElement('section');
  container.className = 'qa-section';
  container.style.marginTop = 'var(--sp-6)';
  container.style.marginBottom = 'var(--sp-6)';
  container.style.paddingTop = 'var(--sp-5)';
  container.style.borderTop = '1px solid var(--line)';

  container.innerHTML = `
    <div style="margin-bottom:var(--sp-3)">
      <span class="section-label">Grounded Visitor Q&amp;A</span>
      <h3 style="font-size:var(--fs-h3);margin-top:var(--sp-1);margin-bottom:var(--sp-1)">Ask about ${landmarkName}</h3>
      <p style="font-size:var(--fs-small);color:var(--text-muted)">
        Answers are synthesised strictly from local evidence passages. The assistant abstains if facts are ungrounded.
      </p>
    </div>

    <!-- Suggested questions -->
    <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);margin-bottom:var(--sp-3)">
      <button class="chip-evidence btn-suggested" data-q="What are the visiting hours and entry rules?">Visiting hours &amp; gates</button>
      <button class="chip-evidence btn-suggested" data-q="When was it built and who commissioned it?">Date &amp; builder</button>
      <button class="chip-evidence btn-suggested" data-q="What are the environmental and weather conditions?">Weather &amp; conditions</button>
      <button class="chip-evidence btn-suggested" data-q="What architectural styles are combined in its design?">Architectural style</button>
    </div>

    <!-- Question form -->
    <form id="qa-form" style="display:flex;gap:var(--sp-2);align-items:flex-start;margin-bottom:var(--sp-4)">
      <div style="flex-grow:1;position:relative">
        <input
          type="text"
          id="qa-input"
          maxlength="300"
          placeholder="Ask a question about ${landmarkName}…"
          style="width:100%;box-sizing:border-box;padding:var(--sp-2) var(--sp-3);font-size:var(--fs-body);font-family:inherit;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-surface);color:var(--text-strong)"
        />
        <span id="qa-char-count" class="mono" style="position:absolute;right:8px;top:10px;font-size:0.65rem;color:var(--text-muted)">0/300</span>
      </div>
      <button type="submit" id="qa-submit" class="btn-primary" style="white-space:nowrap;min-height:38px;padding:var(--sp-2) var(--sp-4);font-size:var(--fs-small)">
        Ask Question
      </button>
    </form>

    <!-- Answer Display Area -->
    <div id="qa-result-area"></div>
  `;

  const input = container.querySelector('#qa-input') as HTMLInputElement;
  const charCount = container.querySelector('#qa-char-count') as HTMLElement;
  const form = container.querySelector('#qa-form') as HTMLFormElement;
  const submitBtn = container.querySelector('#qa-submit') as HTMLButtonElement;
  const resultArea = container.querySelector('#qa-result-area') as HTMLElement;

  input.addEventListener('input', () => {
    charCount.textContent = `${input.value.length}/300`;
  });

  container.querySelectorAll('.btn-suggested').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const q = (btn as HTMLElement).dataset.q || '';
      input.value = q;
      charCount.textContent = `${q.length}/300`;
      executeQuestion(q);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) executeQuestion(q);
  });

  async function executeQuestion(question: string) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Searching…';
    const startTime = Date.now();

    resultArea.innerHTML = `
      <div class="decision-card" style="margin-bottom:0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-2)">
          <span class="section-label">Retrieving &amp; Verifying</span>
          <span id="qa-timer" class="mono" style="font-size:var(--fs-caption);color:var(--text-muted)">0.0s</span>
        </div>
        <div style="font-size:var(--fs-small);color:var(--text-muted)">
          Searching passages and verifying citation links…
        </div>
      </div>
    `;

    const timer = setInterval(() => {
      const timerEl = resultArea.querySelector('#qa-timer');
      if (timerEl) {
        timerEl.textContent = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
      }
    }, 100);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landmarkId, question }),
      });

      clearInterval(timer);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Ask Question';

      if (!res.ok) {
        const err = await res.json();
        resultArea.innerHTML = `
          <div class="decision-card" style="border-color:var(--enc-elevated);margin-bottom:0">
            <div class="dc-label" style="color:var(--enc-elevated)">Error</div>
            <div class="dc-headline">${err.error?.message || 'Failed to answer question.'}</div>
          </div>
        `;
        return;
      }

      const data: AskResponse = await res.json();

      if (!data.answered) {
        resultArea.innerHTML = `
          <div class="decision-card" style="border-color:var(--enc-caution);margin-bottom:0">
            <div class="dc-label" style="color:var(--enc-caution)">Honest Abstention</div>
            <div class="dc-headline">${data.answer}</div>
            <p class="dc-support" style="margin-bottom:0;color:var(--text-muted)">
              This assistant strictly relies on curated historical and survey records. When sufficient evidence is not on file, the system abstains rather than generating speculative answers.
            </p>
          </div>
        `;
        return;
      }

      // Render verified answer with claims and chips
      resultArea.innerHTML = `
        <div class="decision-card" style="margin-bottom:0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-2)">
            <span class="dc-label">Grounded Answer</span>
            <span class="mono" style="font-size:var(--fs-caption);color:var(--text-muted)">
              Retrieved: ${data.retrieval.passagesUsed} passages (Score: ${data.retrieval.topScore.toFixed(1)})
            </span>
          </div>

          <div class="dc-headline" style="font-weight:500;line-height:1.6;margin-bottom:var(--sp-3)">
            ${data.answer}
          </div>

          <!-- Claims list -->
          <div style="border-top:1px solid var(--line);padding-top:var(--sp-3)">
            <p class="section-label" style="margin-bottom:var(--sp-2)">Verified Claims &amp; Sources</p>
            <div style="display:grid;gap:var(--sp-2)">
              ${data.claims
                .map(
                  (claim) => `
                <div style="font-size:var(--fs-small);line-height:1.5;color:var(--text-body);display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:var(--sp-2)">
                  <span>&bull; ${claim.text}</span>
                  <div class="dc-chips">
                    ${claim.evidenceIds.map((id) => `<button class="chip-evidence" data-evidence-id="${id}">${id}</button>`).join('')}
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      clearInterval(timer);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Ask Question';
      resultArea.innerHTML = `
        <div class="decision-card" style="border-color:var(--enc-elevated);margin-bottom:0">
          <div class="dc-label" style="color:var(--enc-elevated)">Error</div>
          <div class="dc-headline">Network error connecting to API</div>
        </div>
      `;
    }
  }

  return container;
}
