from pathlib import Path
p=Path('build.mjs');s=p.read_text(encoding='utf8').replace("+fs.readFileSync('worker/accounts.js','utf8')", "+fs.readFileSync('worker/report-rules.js','utf8')+'\\n'+fs.readFileSync('worker/accounts.js','utf8')");p.write_text(s,encoding='utf8')
p=Path('worker/app.js');s=p.read_text(encoding='utf8').replace("if(collection==='reports'){if(!Array.isArray(record.photos)", "if(collection==='reports'){const safetyError=validateSafetyReport(record);if(safetyError)return safetyError;if(!Array.isArray(record.photos)");p.write_text(s,encoding='utf8')
for file in ['test-access.mjs','test-ui-accounts.mjs','test-dom.mjs','test-workspace.mjs']:
 p=Path(file);s=p.read_text(encoding='utf8').replace("fs.readFileSync('worker/accounts.js','utf8')", "fs.readFileSync('worker/report-rules.js','utf8')+'\\n'+fs.readFileSync('worker/accounts.js','utf8')");p.write_text(s,encoding='utf8')
