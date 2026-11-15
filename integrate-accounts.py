from pathlib import Path
p=Path('build.mjs');s=p.read_text(encoding='utf8').replace("+fs.readFileSync('worker/app.js','utf8')", "+fs.readFileSync('worker/accounts.js','utf8')+'\\n'+fs.readFileSync('worker/app.js','utf8')");p.write_text(s,encoding='utf8')
p=Path('worker/app.js');s=p.read_text(encoding='utf8')
s=s.replace("const match=url.pathname.match", "const auth=await identify(request,env);if(auth.error)return auth.error;const me=auth.user;const accountResponse=await accountRoutes(request,env,url,me);if(accountResponse)return accountResponse;const match=url.pathname.match")
s=s.replace("if(request.method==='GET'&&!id)return json(await readAll(env.BUCKET,collection));", "if(request.method==='GET'&&!id){let all=(await readAll(env.BUCKET,collection)).filter(r=>userCanRead(me,r,collection));const scope=url.searchParams.get('accountId');if(scope&&me.role==='admin')all=all.filter(r=>(r.assignedAccountId||r.ownerAccountId||'owner')===scope);return json(all);}")
needle="const error=validate(record,collection);if(error)return json({error},400);"
s=s.replace(needle,'')
needle="const key=collection+'/'+id+'.json',prior=await env.BUCKET.get(key),previous=prior?await prior.json():null,revision=previous?.revision||0;"
replace=needle+"""
   if(collection==='plans'&&me.role!=='admin')return json({error:'Solo el administrador puede asignar o editar metas.'},403);
   if(previous&&!userCanRead(me,previous,collection))return json({error:'Registro no disponible'},404);
   if(me.role!=='admin'){
    if(collection==='reports'){record.ownerAccountId=me.id;record.supervisor=me.name;}
    if(collection==='actions'){
     if(record.status==='Cerrado')return json({error:'El cierre debe ser verificado por un administrador de seguridad.'},403);
     if(previous&&previous.status==='Cerrado')return json({error:'Solicita al administrador la reapertura de esta acción.'},403);
     if(previous){const editable={progress:record.progress,status:record.status,photos:record.photos,newComment:record.newComment};record={...previous,...editable};}
     record.ownerAccountId=previous?.ownerAccountId||me.id;record.assignedAccountId=previous?.assignedAccountId||me.id;record.owner=me.name;record.requester=previous?.requester||me.name;
    }
   }else{
    record.ownerAccountId=previous?.ownerAccountId||'owner';
    if(previous?.assignedAccountId)record.assignedAccountId=previous.assignedAccountId;else delete record.assignedAccountId;
    if(!previous&&collection!=='reports'){
     const targetName=collection==='plans'?record.person:record.owner;
     const matches=(await allUsers(env,me)).filter(u=>u.active&&norm(u.name)===norm(targetName));
     if(matches.length===1)record.assignedAccountId=matches[0].id;
    }
    if(collection==='actions'&&record.status==='Cerrado')record.verifier=me.name;
   }
   record.updatedBy=me.name;record.updatedByAccountId=me.id;
   const error=validate(record,collection);if(error)return json({error},400);
"""
assert needle in s;s=s.replace(needle,replace)
s=s.replace("if(record.revision!==revision)","if((me.role!=='admin'&&collection==='actions'?JSON.parse(raw).revision:record.revision)!==revision)")
p.write_text(s,encoding='utf8')
