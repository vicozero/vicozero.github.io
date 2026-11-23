import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const targets = ['docs', 'public'];
const additionalAssets=['library-page.js','departments.js','departments-ui.js','advanced-core.js','advanced-pdf.js','advanced-ui.js'];

// Allow-list comes from the files already tracked under docs/ (the deployed web assets).
const sourceList=process.argv.includes('--stdin')?fs.readFileSync(0,'utf8'):execSync('git ls-files docs/', { cwd: root, encoding: 'utf8' });
const tracked = [...new Set([...sourceList
  .split(/\r?\n/)
  .filter(Boolean)
  .map(p => p.replace(/^docs\//, '')), 'normative-library.js', 'regulatory-core.js', 'training-core.js', 'normative-catalog.json', 'safety-talk-topics.json', 'safety-suite-store.js', 'training-suite.js', 'manifest.webmanifest', 'sw.js', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-maskable-512.png', 'assets/icons/apple-touch-icon.png', 'assets/icons/icon-32.png', '.well-known/assetlinks.json', 'twa-manifest.json', 'APK_TWA_README.md'])];

let copied = 0;
for (const rel of new Set([...tracked,...additionalAssets])) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) continue;
  for (const target of targets) {
    const dest = path.join(root, target, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    copied++;
  }
}
console.log('Sincronizados ' + tracked.length + ' archivos web hacia ' + targets.join(' y ') + ' (' + copied + ' copias).');
