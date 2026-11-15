from pathlib import Path
p=Path('build.mjs');s=p.read_text(encoding='utf8').replace("fs.readFileSync('worker/index.js','utf8')", "fs.readFileSync('worker/app.js','utf8')");p.write_text(s,encoding='utf8')
p=Path('preview.mjs');s=p.read_text(encoding='utf8').replace('async list(){return {objects:[...memory.keys()].map', "async list(opts){return {objects:[...memory.keys()].filter(k=>k.startsWith(opts.prefix)).map");p.write_text(s,encoding='utf8')
p=Path('public/index.html');s=p.read_text(encoding='utf8').replace('<script src="/workspace.js"></script>','<script src="/workspace-pdf.js"></script><script src="/workspace.js"></script>');p.write_text(s,encoding='utf8')
