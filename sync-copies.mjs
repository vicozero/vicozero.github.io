import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const targets = ['docs', 'public'];

// Allow-list comes from the files already tracked under docs/ (the deployed web assets).
const tracked = [...new Set([...execSync('git ls-files docs/', { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .map(p => p.replace(/^docs\//, '')), 'normative-library.js', 'regulatory-core.js', 'training-core.js', 'normative-catalog.json', 'safety-talk-topics.json', 'safety-suite-store.js', 'training-suite.js'])];

let copied = 0;
for (const rel of tracked) {
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
