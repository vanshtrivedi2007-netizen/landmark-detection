import { resolveRoute, navigate } from './router.js';
import { renderShell } from './components/shell.js';
import { initEvidenceDrawer } from './components/evidence-drawer.js';

renderShell();
initEvidenceDrawer();
resolveRoute();

window.addEventListener('popstate', () => resolveRoute());

document.addEventListener('click', (e) => {
  const anchor = (e.target as HTMLElement).closest('a[data-link]');
  if (anchor) {
    e.preventDefault();
    navigate(anchor.getAttribute('href')!);
  }
});
