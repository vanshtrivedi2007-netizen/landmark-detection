export function renderShell() {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <header class="site-header">
      <div class="container" style="display:flex;align-items:center;justify-content:space-between;padding-top:var(--sp-3);padding-bottom:var(--sp-3);border-bottom:1px solid var(--line)">
        <a href="/" data-link style="font-family:'Newsreader',Georgia,serif;font-size:var(--fs-h4);color:var(--text-strong);text-decoration:none">Landmark Recognition</a>
        <nav style="display:flex;gap:var(--sp-4);align-items:center">
          <a href="/" data-link>Home</a>
          <a href="/recognize" data-link>Recognize</a>
          <a href="/sources" data-link>Sources</a>
          <a href="/about" data-link>About</a>
          <span class="status-pill" id="status-pill" style="display:inline-flex;align-items:center;gap:4px;font-size:var(--fs-small);color:var(--text-muted)">
            <span style="width:8px;height:8px;border-radius:50%;background:var(--enc-neutral);display:inline-block"></span>
            Checking…
          </span>
        </nav>
      </div>
    </header>
    <main id="page" class="container" style="padding-top:var(--sp-7);padding-bottom:var(--sp-7)"></main>
    <footer style="border-top:1px solid var(--line);padding:var(--sp-4) 0;text-align:center;font-size:var(--fs-small);color:var(--text-muted)">
      <div class="container">v0.1.0 · Runs locally. Images are not stored. · <a href="/sources" data-link>Sources</a></div>
    </footer>
  `;
  pollHealth();
}

async function pollHealth() {
  const pill = document.getElementById('status-pill');
  if (!pill) return;
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    const state: string = data.ollama?.state ?? 'unreachable';
    const labels: Record<string, [string, string]> = {
      ready: ['var(--enc-ok)', 'Ollama ready'],
      loading: ['var(--enc-caution)', 'Loading model'],
      unreachable: ['var(--enc-elevated)', 'Offline'],
      model_missing: ['var(--enc-elevated)', 'Model missing'],
      model_not_vision: ['var(--enc-elevated)', 'Model missing'],
    };
    const [color, text] = labels[state] ?? labels['unreachable']!;
    pill.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block"></span>${text}`;
  } catch {
    pill.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:var(--enc-elevated);display:inline-block"></span>Offline`;
  }
}
