import { renderHome } from './pages/home.js';
import { renderRecognize } from './pages/recognize.js';
import { renderLandmark } from './pages/landmark.js';
import { renderSources } from './pages/sources.js';
import { renderAbout } from './pages/about.js';

type Route = {
    pattern: RegExp;
    render: (params: Record<string, string>) => void;
    title: string;
};

const routes: Route[] = [
    { pattern: /^\/$/, render: () => renderHome(), title: 'Landmark Recognition' },
    { pattern: /^\/recognize$/, render: () => renderRecognize(), title: 'Recognize — Landmark Recognition' },
    { pattern: /^\/landmarks\/([a-z0-9-]+)$/, render: (p) => renderLandmark(p.slug || ''), title: 'Landmark' },
    { pattern: /^\/sources$/, render: () => renderSources(), title: 'Sources — Landmark Recognition' },
    { pattern: /^\/about$/, render: () => renderAbout(), title: 'About — Landmark Recognition' },
];

export function navigate(path: string) {
    window.history.pushState(null, '', path);
    resolveRoute();
}

export function resolveRoute() {
    const path = window.location.pathname;
    for (const route of routes) {
        const match = path.match(route.pattern);
        if (match) {
            document.title = route.title;
            const params: Record<string, string> = {};
            if (match[1]) params.slug = match[1];
            route.render(params);
            return;
        }
    }
    renderHome();
}

