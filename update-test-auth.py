from pathlib import Path
for file in ['test-dom.mjs','test-workspace.mjs']:
 p=Path(file);s=p.read_text(encoding='utf8')
 s=s.replace("fs.readFileSync('worker/app.js','utf8')", "fs.readFileSync('worker/accounts.js','utf8')+'\\n'+fs.readFileSync('worker/app.js','utf8')")
 if file=='test-dom.mjs':
  s=s.replace("Origin:'https://qa.local'", "Origin:'https://qa.local','oai-authenticated-user-email':'owner@example.test','oai-authenticated-user-id':'test-owner'")
  s=s.replace("{BUCKET:bucket}", "{BUCKET:bucket,SM_OWNER_EMAIL:'owner@example.test'}")
  s=s.replace("w.structuredClone=structuredClone;", "w.AUTH={user:{id:'owner',name:'Administrador Sierra Madre',role:'admin',unit:'Sierra Madre'}};w.ACCOUNT_DIRECTORY=[];w.ACCOUNT_USERS=[];w.smStorageKey=k=>k+'-owner';w.SM_SCOPE_ACCOUNT='';w.structuredClone=structuredClone;")
 else:
  s=s.replace("Origin:origin,'Content-Type'", "Origin:origin,'oai-authenticated-user-email':'owner@example.test','oai-authenticated-user-id':'test-owner','Content-Type'")
  s=s.replace("{BUCKET:bucket}", "{BUCKET:bucket,SM_OWNER_EMAIL:'owner@example.test'}")
  s=s.replace("assert.equal(saved.verifier,'Jefe de ejemplo')", "assert.equal(saved.verifier,'Administrador Sierra Madre')")
 p.write_text(s,encoding='utf8')
