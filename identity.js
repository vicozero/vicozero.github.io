(()=>{
  const root=document.documentElement;let theme;try{theme=localStorage.getItem('sm-theme')}catch{}if(!['light','dark'].includes(theme))theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';root.dataset.theme=theme;
  function themeButtons(){document.querySelectorAll('[data-theme-toggle]').forEach(b=>{b.textContent=root.dataset.theme==='dark'?'☀ Día':'☾ Noche';b.setAttribute('aria-label',root.dataset.theme==='dark'?'Activar modo día':'Activar modo noche');b.setAttribute('aria-pressed',String(root.dataset.theme==='dark'))})}
  document.addEventListener('click',e=>{if(e.target.closest('[data-theme-toggle]')){root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('sm-theme',root.dataset.theme)}catch{}themeButtons()}});themeButtons();
  const by=id=>document.getElementById(id);
  function authState(title,message,signed=false){by('appRoot').hidden=true;by('accessScreen').hidden=false;by('accessTitle').textContent=title;by('accessMessage').textContent=message;const sb=by('signInButton');if(sb)sb.hidden=signed;const sw=by('switchAccount');if(sw)sw.hidden=!signed;}
  function toast(msg){const t=by('toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500)}else alert(msg)}
  function script(src){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.async=false;el.onload=resolve;el.onerror=()=>reject(Error('No se pudo cargar: '+src));document.body.append(el)})}

  // Demo/local mode fallback for static hosting (GitHub Pages)
  function startDemoMode(){
    const key='sm-local-v2';
    const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h)+s.charCodeAt(i)|0;return 'h'+Math.abs(h).toString(16)};
    const empty=()=>({reports:[],actions:[],plans:[],users:[
      {id:'admin',name:'Administrador',email:'admin@sierra-madre.local',unit:'Sierra Madre',role:'admin',active:true,passwordHash:hash('admin123'),isOwner:true,revision:0}
    ],notices:[],reads:{}});
    const read=()=>{try{const d=JSON.parse(localStorage.getItem(key));if(d&&d.users)return d;return empty()}catch{return empty()}};
    const write=d=>{try{localStorage.setItem(key,JSON.stringify(d))}catch{}};
    const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json'}});
    const realFetch=window.fetch.bind(window);
    let currentUser=null;

    window.fetch=async(input,init={})=>{
      const url=typeof input==='string'?input:input.url;
      if(!url.startsWith('/api/'))return realFetch(input,init);
      const u=new URL(url,location.origin);
      const path=u.pathname.slice(5);
      const method=(init.method||'GET').toUpperCase();
      let body={};try{body=init.body?JSON.parse(init.body):{}}catch{}
      const data=read();

      if(path==='login'&&method==='POST'){
        const email=(body.email||'').toLowerCase().trim(),pass=body.password||'';
        const user=data.users.find(x=>(x.email||'').toLowerCase()===email && x.active!==false);
        if(!user) return json({error:'Credenciales inválidas.'},401);
        if(user.passwordHash && user.passwordHash!==hash(pass)) return json({error:'Credenciales inválidas.'},401);
        currentUser=user; try{localStorage.setItem('sm-session',user.id)}catch{}
        return json({ok:true,user:{id:user.id,name:user.name,email:user.email,unit:user.unit||'',role:user.role,active:user.active,isOwner:!!user.isOwner,revision:user.revision||0}});
      }
      if(path==='me'){
        if(!currentUser){const sid=(()=>{try{return localStorage.getItem('sm-session')}catch{return null}})();if(sid)currentUser=data.users.find(x=>x.id===sid&&x.active!==false)}
        if(!currentUser) return json({error:'Inicia sesión con tu correo y contraseña.',code:'SIGN_IN_REQUIRED'},401);
        return json({user:{id:currentUser.id,name:currentUser.name,email:currentUser.email,unit:currentUser.unit||'',role:currentUser.role,active:currentUser.active,isOwner:!!currentUser.isOwner,revision:currentUser.revision||0}});
      }
      if(path==='directory') return json(data.users.filter(x=>x.active!==false).map(x=>({id:x.id,name:x.name,unit:x.unit||'',role:x.role})));
      if(path==='users'){
        if(!currentUser||currentUser.role!=='admin') return json({error:'Solo el administrador puede gestionar usuarios.'},403);
        if(method==='GET') return json(data.users.map(x=>({id:x.id,email:x.email,name:x.name,role:x.role,active:x.active,unit:x.unit||'',isOwner:!!x.isOwner,revision:x.revision||0})));
        const id=body.id||(body.email?( 'u-'+hash((body.email||'').toLowerCase()) ) :crypto.randomUUID());
        const existing=data.users.find(x=>x.id===id||(x.email||'').toLowerCase()===(body.email||'').toLowerCase());
        const rec={id:existing?.id||id,name:body.name||'',email:(body.email||'').toLowerCase(),unit:body.unit||'',role:body.role||'member',active:body.active!==false,isOwner:existing?.isOwner||false,revision:(existing?.revision||0)+1,passwordHash:body.password?hash(body.password):(existing?.passwordHash||'')};
        const i=data.users.findIndex(x=>x.id===rec.id); if(i<0)data.users.push(rec); else data.users[i]=rec; write(data);
        return json({id:rec.id,email:rec.email,name:rec.name,role:rec.role,active:rec.active,unit:rec.unit,isOwner:rec.isOwner,revision:rec.revision});
      }
      if(path==='notices'){
        if(method==='GET'){
          const me=currentUser; const list=(data.notices||[]).filter(n=>me&&(me.role==='admin'||n.toAccountId===me.id||n.fromAccountId===me.id));
          return json(list.map(n=>({...n,incoming:me&&n.toAccountId===me.id,read:!!(data.reads&&data.reads[me?.id]&&data.reads[me.id][n.id])})).sort((a,b)=>(b.created||'').localeCompare(a.created||'')));
        }
        const ids=Array.isArray(body.toAccountIds)?body.toAccountIds:[];
        const created=new Date().toISOString(); let count=0;
        for(const tid of ids){ const target=data.users.find(x=>x.id===tid); if(!target) continue; (data.notices=data.notices||[]).push({id:crypto.randomUUID(),type:body.type||'Mensaje',severity:body.severity||'normal',text:body.text||'',fromAccountId:currentUser?.id,fromName:currentUser?.name,toAccountId:tid,toName:target.name,created,referenceId:body.referenceId,referenceCollection:body.referenceCollection,referenceLabel:body.referenceLabel}); count++; }
        write(data); return json({ok:true,count});
      }
      const readMatch=path.match(/^notices\/([^/]+)\/read$/);
      if(readMatch&&method==='POST'){data.reads=data.reads||{};data.reads[currentUser?.id]=data.reads[currentUser?.id]||{};data.reads[currentUser.id][readMatch[1]]=true;write(data);return json({ok:true})}
      if(path==='assignable'){
        const col=u.searchParams.get('collection'); const list=data[col]||[];
        return json(list.map(r=>({id:r.id,label:r.folio||r.person||r.description||r.id,detail:r.supervisor||r.owner||r.period||'',accountId:r.assignedAccountId||r.ownerAccountId||'admin'})));
      }
      if(path==='assign'&&method==='POST'){
        const col=body.collection, list=data[col]||[], rec=list.find(x=>x.id===body.id); if(!rec) return json({error:'Registro no encontrado'},404);
        if(col==='reports'){rec.ownerAccountId=body.accountId; const t=data.users.find(x=>x.id===body.accountId); if(t)rec.supervisor=t.name}
        else if(col==='plans'){rec.assignedAccountId=body.accountId; const t=data.users.find(x=>x.id===body.accountId); if(t)rec.person=t.name}
        else{rec.assignedAccountId=body.accountId; rec.ownerAccountId=body.accountId; const t=data.users.find(x=>x.id===body.accountId); if(t)rec.owner=t.name}
        write(data); return json({ok:true});
      }
      const [collection,id]=path.split('/');
      if(['reports','actions','plans'].includes(collection)){
        data[collection]=data[collection]||[]; const list=data[collection];
        if(method==='GET') return json(id? (list.find(x=>x.id===id)||null) : list);
        if(method==='PUT'||method==='POST'){
          const rec={...body,id:body.id||id||crypto.randomUUID(),revision:((list.find(x=>x.id===(body.id||id))?.revision)||0)+1,updated:new Date().toISOString()};
          if(!rec.ownerAccountId && currentUser) rec.ownerAccountId=currentUser.id;
          if(collection==='actions' && !rec.assignedAccountId && currentUser) rec.assignedAccountId=currentUser.id;
          const i=list.findIndex(x=>x.id===rec.id); if(i<0)list.unshift(rec); else list[i]=rec; write(data); return json(rec);
        }
        if(method==='DELETE'){data[collection]=list.filter(x=>x.id!==id);write(data);return json({ok:true})}
      }
      return json({error:'No disponible en modo local'},404);
    };

    // Show login UI
    authState('Sierra Madre · Acceso','Ingresa con tu correo y contraseña. En este modo los datos se guardan en este navegador.',true);
    const card=document.querySelector('.access-card');
    if(card){
      card.innerHTML=`
        <div class="access-mark">SM</div>
        <span class="eyebrow">ACCESO SEGURO</span>
        <h2>Iniciar sesión</h2>
        <p>Ingresa con tu cuenta local. Los datos se guardan en este navegador.</p>
        <form id="localLoginForm" style="display:grid;gap:10px;margin-top:14px">
          <label style="display:grid;gap:4px;font-size:12px">Correo<input name="email" type="email" required placeholder="correo@ejemplo.com" value="admin@sierra-madre.local" style="padding:10px;border:1px solid var(--line);border-radius:6px"></label>
          <label style="display:grid;gap:4px;font-size:12px">Contraseña<input name="password" type="password" required placeholder="Contraseña" value="admin123" style="padding:10px;border:1px solid var(--line);border-radius:6px"></label>
          <button class="primary" type="submit" style="width:100%;margin-top:4px">Entrar</button>
        </form>
        <small style="display:block;margin-top:12px;color:var(--muted)">Acceso inicial: <b>admin@sierra-madre.local</b> / <b>admin123</b>. Cambia la contraseña creando/actualizando usuarios en Administración.</small>`;
      by('localLoginForm').onsubmit=async e=>{
        e.preventDefault();
        const f=new FormData(e.target);
        try{
          const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:f.get('email'),password:f.get('password')})});
          const d=await r.json();
          if(!r.ok) return toast(d.error||'No se pudo iniciar sesión.');
          // bootstrap app
          await bootstrap({user:d.user});
        }catch(err){toast(err.message||'Error al iniciar sesión.')}
      };
    }
  }

  async function bootstrap(data){
    globalThis.AUTH=data;globalThis.smStorageKey=key=>key+'-'+data.user.id;
    try{
      const [directory,users]=await Promise.all([
        fetch('/api/directory',{cache:'no-store'}).then(r=>r.ok?r.json():[]),
        data.user.role==='admin'?fetch('/api/users',{cache:'no-store'}).then(r=>r.ok?r.json():[]):Promise.resolve([])
      ]);
      globalThis.ACCOUNT_DIRECTORY=directory;globalThis.ACCOUNT_USERS=users;globalThis.SM_SCOPE_ACCOUNT=data.user.role==='admin'?'':data.user.id;
    }catch{globalThis.ACCOUNT_DIRECTORY=[];globalThis.ACCOUNT_USERS=[];globalThis.SM_SCOPE_ACCOUNT=''}
    document.body.dataset.role=data.user.role;
    for(const src of ['/assets/pdf-lib.min.js','/formats.js','/extended-formats.js','/progress-core.js','/supervisor.js','/workspace-pdf.js','/report-pdf.js','/workspace.js','/accounts-ui.js']) await script(src);
    by('accessScreen').hidden=true;by('appRoot').hidden=false;themeButtons();
  }

  async function start(){try{
    let response,data;
    try{
      response=await fetch('/api/me',{cache:'no-store'});
      const ct=response.headers.get('content-type')||'';
      if(ct.includes('application/json')) data=await response.json(); else throw new Error('No API');
    }catch(e){
      // No backend API available (static hosting) -> local demo mode
      return startDemoMode();
    }
    if(!response.ok){
      // Backend exists but not authenticated - show password login
      startDemoMode();
      return;
    }
    await bootstrap(data);
    setInterval(async()=>{if(document.hidden)return;try{const check=await fetch('/api/me',{cache:'no-store'});if(check.status===401||check.status===403){location.reload()}}catch{}},60000);
  }catch(e){startDemoMode()}}
  by('retryAccess').onclick=start;start();
})();