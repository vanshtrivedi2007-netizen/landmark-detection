import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const scanDirs = [
  path.join(rootDir, 'apps', 'web', 'src'),
  path.join(rootDir, 'apps', 'web', 'dist'),
];

const ALLOWED_URL_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?(\/.*)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?(\/.*)?$/,
  /^https?:\/\/www\.w3\.org\//,
  /^https?:\/\/schema\.org\//,
];

let violationCount = 0;

function scanFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');

  // Regex to extract http/https URLs
  const urlRegex = /https?:\/\/[a-zA-Z0-9_\-\.]+(:\d+)?(\/[^\s"'`\<\>\)]*)?/g;
  const matches = content.match(urlRegex) || [];

  for (const url of matches) {
    const isAllowed = ALLOWED_URL_PATTERNS.some((pat) => pat.test(url));
    if (!isAllowed) {
      console.error(`[OFFLINE AUDIT VIOLATION] External URL found in ${path.relative(rootDir, filePath)}: ${url}`);
      violationCount++;
    }
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (/\.(js|ts|css|html|json)$/.test(entry.name)) {
      scanFile(fullPath);
    }
  }
}

console.log('Running Offline Asset & Host Audit…');
for (const dir of scanDirs) {
  console.log(`Scanning: ${path.relative(rootDir, dir)}`);
  walkDir(dir);
}

if (violationCount === 0) {
  console.log('✓ PASS: Offline audit verified. Zero external remote hosts or CDN calls found.');
  process.exit(0);
} else {
  console.error(`✗ FAIL: Offline audit detected ${violationCount} external URL(s).`);
  process.exit(1);
}
