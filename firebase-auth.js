import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut,updateProfile,updatePassword,sendEmailVerification,sendPasswordResetEmail,setPersistence,browserLocalPersistence} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';

const config={apiKey:'AIzaSyAukoVwasMxI2-uRHd7u13ycxb53h2wbeY',authDomain:'sierra-madre-seguridad.firebaseapp.com',projectId:'sierra-madre-seguridad',storageBucket:'sierra-madre-seguridad.firebasestorage.app',messagingSenderId:'260475494499',appId:'1:260475494499:web:b3ef3d6a9ca392842cd856'};
const app=initializeApp(config);
const auth=getAuth(app);
setPersistence(auth,browserLocalPersistence).catch(error=>console.warn('La sesión no podrá recordarse en este navegador.',error));

const by=id=>document.getElementById(id);
const initial='admin@sierra-madre-seguridad.app';
const bootstrapDone='sierra-madre-bootstrap-complete';
let started=false;
let localSessionUser=null; // for local (non-Firebase) user sessions

// Theme
const root=document.documentElement;
try{const theme=localStorage.getItem('sm-theme');root.dataset.theme=['light','dark'].includes(theme)?theme:'light';}catch{root.dataset.theme='light';}
const visualStyle=document.createElement('style');
visualStyle.textContent=`.access-screen{position:relative;isolation:isolate}.access-screen::before{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,#f4f3efed 0%,#f4f3efc9 46%,#f4f3efb5 100%),url('/assets/seguridad-acceso.png') center/cover no-repeat;border-radius:0 0 18px 18px}:root[data-theme=dark] .access-screen::before{background:linear-gradient(90deg,#161b1eed 0%,#161b1ec7 48%,#161b1ea3 100%),url('/assets/seguridad-acceso.png') center/cover no-repeat}.access-card{backdrop-filter:blur(9px)}:root[data-theme=dark] .hero{background-image:linear-gradient(90deg,#111a20eb 0%,#111a20b9 58%,#111a207a 100%),url('/assets/seguridad-panel.png');background-position:center right;background-size:cover}:root[data-theme=dark] .hero>*{position:relative;z-index:1}@media(max-width:1100px){.access-screen::before{opacity:.82}}`;
document.head.appendChild(visualStyle);
function refreshThemeButtons(){document.querySelectorAll('[data-theme-toggle]').forEach(b=>{const dark=root.dataset.theme==='dark';b.textContent=dark?'☀ Día':'☾ Noche';b.setAttribute('aria-label',dark?'Activar modo día':'Activar modo noche');b.setAttribute('aria-pressed',String(dark));});}
document.addEventListener('click',e=>{if(!e.target.closest('[data-theme-toggle]'))return;root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('sm-theme',root.dataset.theme);}catch{}refreshThemeButtons();});
refreshThemeButtons();

const card=()=>document.querySelector('.access-card');
function screen(html){const s=by('accessScreen'),a=by('appRoot');if(s)s.hidden=false;if(a)a.hidden=true;const c=card();if(c)c.innerHTML=html;}
function toast(msg){const t=by('toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}}

// --- Local users storage (shared workspace data keyed by admin workspace) ---
const WORKSPACE_KEY='sm-workspace-v1';
const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h)+s.charCodeAt(i)|0;return 'h'+Math.abs(h).toString(16)};
function emptyWS(){return {reports:[],actions:[],plans:[],users:[],notices:[],reads:{}};}
function readWS(){
  const raw=localStorage.getItem(WORKSPACE_KEY);if(!raw)return emptyWS();
  let data;try{data=JSON.parse(raw);}catch{throw Error('El espacio local no se pudo leer. Conserva el respaldo antes de intentar restaurarlo.');}
  if(!data||!Array.isArray(data.users))throw Error('La estructura del espacio local no es válida. No se reemplazaron tus registros.');
  return data;
}
function writeWS(data){try{localStorage.setItem(WORKSPACE_KEY,JSON.stringify(data));}catch{throw Error('No se pudo guardar en este navegador. Libera espacio o descarga un respaldo; los cambios aún no se guardaron.');}}
async function exportWorkspaceBackup(){
  const workspace=readWS();
  const clean={...workspace,users:(workspace.users||[]).map(({passwordHash,...user})=>user)};
  const serialized=JSON.stringify(clean);
  const bytes=new TextEncoder().encode(serialized);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const sha256=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  const backup={format:'sierra-madre-local-workspace',version:1,generatedAt:new Date().toISOString(),sha256,data:clean};
  const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='Sierra-Madre-respaldo-local-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  return {sha256,records:(clean.reports||[]).length+(clean.actions||[]).length+(clean.plans||[]).length,users:(clean.users||[]).length};
}

// --- Login screen ---
function login(message=''){
  screen(`
    <div class="access-mark">SM</div>
    <span class="eyebrow">ACCESO SEGURO</span>
    <h2>Seguridad Sierra Madre</h2>
    <p>Ingresa con tu correo y contraseña.</p>
    ${message?`<p class="form-help" style="color:#b94a48;margin:8px 0">${message}</p>`:''}
    <form id="loginForm" class="fields" style="display:grid;gap:10px;margin-top:10px">
      <label>Usuario o correo<input name="login" required autocomplete="username" placeholder="Correo o Admin"></label>
      <label>Contraseña<input name="password" type="password" required autocomplete="current-password" placeholder="Contraseña"></label>
      <button class="primary" type="submit">Iniciar sesión</button>
    </form>
    <button class="text" id="forgot" type="button">Recuperar contraseña por correo</button>
    <small>Acceso de administrador con Firebase (primer acceso único) o usuarios locales creados por el administrador.</small>
  `);
  by('loginForm').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const raw=String(f.get('login')).trim();
    const password=String(f.get('password'));
    const email=raw.toLowerCase()==='admin'?initial:raw;

    // 1) Try local user login first? No, try Firebase first for admin, then local
    try{
      await signInWithEmailAndPassword(auth,email,password);
      // onAuthStateChanged will handle the rest
      return;
    }catch(firebaseErr){
      // 2) Try local users (created in-app)
      try{
        const ws=readWS();
        const user=(ws.users||[]).find(u=>(u.email||'').toLowerCase()===raw.toLowerCase() && u.active!==false);
        if(user && user.passwordHash && user.passwordHash===hash(password)){
          localSessionUser={...user};
          try{localStorage.setItem('sm-local-session',user.id);}catch{}
          await launchLocal(localSessionUser);
          return;
        }
      }catch{}
      login('Usuario o contraseña incorrectos.');
    }
  };
  by('forgot').onclick=async()=>{
    const email=prompt('Escribe tu correo de recuperación:');
    if(!email) return;
    try{ await sendPasswordResetEmail(auth,email); login('Si el correo está registrado en Firebase, se envió el enlace de recuperación.'); }
    catch{ login('No se pudo enviar por Firebase. Si es un usuario local, solicita al administrador restablecer tu contraseña.'); }
  };
}

// --- One-time admin bootstrap (Firebase) - Codex function preserved ---
function onboarding(user){
  screen(`
    <div class="access-mark">SM</div>
    <span class="eyebrow">PRIMER ACCESO · ADMINISTRADOR</span>
    <h2>Personaliza tu acceso</h2>
    <p>Este acceso temporal se puede usar una sola vez. Define tu cuenta personal para administrar Sierra Madre.</p>
    <form id="setupForm" class="fields" style="display:grid;gap:10px;margin-top:10px">
      <label>Nombre de usuario<input name="name" required minlength="3" value="Admin" autocomplete="username"></label>
      <label>Correo de recuperación<input name="email" type="email" required autocomplete="email"></label>
      <label>Nueva contraseña<input name="password" type="password" required minlength="8" autocomplete="new-password"></label>
      <label>WhatsApp para recuperación (configuración manual)<input name="whatsapp" type="tel" placeholder="+52 ..."></label>
      <button class="primary" type="submit">Crear acceso seguro</button>
    </form>
    <small>Se creará tu cuenta personal con el correo indicado y recibirás un enlace de verificación. La sesión se recuerda de forma segura en este navegador (Firebase). No se guardan credenciales, red o dispositivo en GitHub.</small>
  `);
  by('setupForm').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const email=String(f.get('email')).trim();
    const password=String(f.get('password'));
    try{
      const credential=await createUserWithEmailAndPassword(auth,email,password);
      await updateProfile(credential.user,{displayName:String(f.get('name')).trim()});
      await sendEmailVerification(credential.user);
      await updateProfile(user,{displayName:bootstrapDone}); // mark bootstrap as used
      localStorage.setItem('sm-recovery-'+credential.user.uid,JSON.stringify({whatsapp:String(f.get('whatsapp')).trim(),configuredAt:new Date().toISOString()}));
      alert('Cuenta personal creada. Confirma el enlace enviado a tu correo para activar la recuperación.');
      await launch(credential.user);
    }catch(err){
      alert(err.code==='auth/email-already-in-use'?'Ese correo ya está registrado. Usa otro correo o inicia sesión con él.':'No se pudo completar: '+(err.code||err.message));
    }
  };
}

// --- Data store & mock API (shared workspace) ---
function installStore(currentUser, isFirebaseAdmin=false){
  const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json'}});
  const real=window.fetch.bind(window);
  window.fetch=async(input,init={})=>{
    const url=typeof input==='string'?input:input.url;
    if(!url.startsWith('/api/')) return real(input,init);
    const u=new URL(url,location.origin);
    const path=u.pathname.slice(5);
    const method=(init.method||'GET').toUpperCase();
    let body={}; try{body=init.body?JSON.parse(init.body):{}}catch{}
    const data=readWS();
    const me=currentUser;

    if(path==='me') return json({user:publicUser(me)});
    if(path==='directory') return json((data.users||[]).filter(x=>x.active!==false).map(x=>({id:x.id,name:x.name,unit:x.unit||'',departmentId:x.departmentId||'',role:x.role})));
    // FASE 2: catálogo aditivo en modo local. No reescribe registros históricos.
    if(path==='departments'||path.startsWith('departments/')){
      const list=Array.isArray(data.departments)?data.departments:[];
      const depId=path.startsWith('departments/')?path.slice('departments/'.length):'';
      if(method==='GET')return json(depId?list.find(d=>d.id===depId)||null:list);
      if(me.role!=='admin'&&!(me.permissions&&me.permissions.departments))return json({error:'Solo el administrador puede gestionar el catálogo.'},403);
      if(method==='POST'||method==='PUT'){
        const key=String(body.id||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
        if(!key||!String(body.name||'').trim())return json({error:'Completa el identificador y el nombre.'},400);
        if(depId&&depId!==key)return json({error:'El identificador no coincide.'},400);
        const idx=list.findIndex(d=>d.id===key);
        if(method==='POST'&&idx>=0)return json({error:'Ya existe ese departamento.'},409);
        if(method==='PUT'&&idx<0)return json({error:'Departamento no encontrado.'},404);
        const record={id:key,name:String(body.name).trim(),aliases:Array.isArray(body.aliases)?body.aliases.filter(x=>typeof x==='string'&&x.trim()):[],activo:body.activo!==false,validFrom:body.validFrom||'',validTo:body.validTo||'',updated:new Date().toISOString()};
        if(idx<0)list.unshift(record);else list[idx]={...list[idx],...record};
        data.departments=list;writeWS(data);
        if(globalThis.SMDepartments?.setCatalog)globalThis.SMDepartments.setCatalog(list.filter(d=>d.activo!==false));
        return json(record);
      }
    }
    // FASES 3-8: colecciones aditivas. No reescriben reports/actions/plans.
    const advancedKinds=['findings','inspectionTemplates','advanceAlerts','auditTrail'];
    const advancedKind=path.split('/')[0];
    if(advancedKinds.includes(advancedKind)){
      const advancedId=path.slice(advancedKind.length).replace(/^\//,'');
      const list=Array.isArray(data[advancedKind])?data[advancedKind]:[];
      if(method==='GET'){
        const visible=advancedKind==='advanceAlerts'&&me.role!=='admin'?list.filter(row=>row.toAccountId===me.id||row.fromAccountId===me.id):list;
        return json(advancedId?visible.find(row=>row.id===advancedId)||null:visible);
      }
      if(advancedKind==='auditTrail')return json({error:'El historial de auditoría es de solo lectura.'},405);
      const canWrite=me.role==='admin'||!!(me.permissions&&(me.permissions.edit_reports||me.permissions.edit_actions||me.permissions.send_notices));
      if(!canWrite)return json({error:'Sin permiso para esta colección.'},403);
      if(!['POST','PUT'].includes(method))return json({error:'Método no permitido.'},405);
      const recordId=advancedId||body.id||crypto.randomUUID();
      const existing=list.find(row=>row.id===recordId);
      if(advancedKind==='findings'&&!existing){
        const key=String(body.dedupeKey||[body.sourceReportId||'',body.checkIndex??'',String(body.findingType||'').trim().toLowerCase()].join('|'));
        if(list.some(row=>String(row.dedupeKey||'')===key))return json({error:'El hallazgo ya fue registrado para este control.'},409);
      }
      const record={...body,id:recordId,folio:body.folio||'SM-'+advancedKind.slice(0,3).toUpperCase()+'-'+Date.now().toString(36).toUpperCase(),
        ownerAccountId:existing?.ownerAccountId||me.id,revision:(existing?.revision||0)+1,updated:new Date().toISOString(),updatedBy:me.name};
      if(advancedKind==='advanceAlerts'){record.createdAt=existing?.createdAt||new Date().toISOString();record.read=body.read!==false;}
      const idx=list.findIndex(row=>row.id===recordId);if(idx<0)list.unshift(record);else list[idx]=record;
      data[advancedKind]=list;
      data.auditTrail=data.auditTrail||[];
      data.auditTrail.unshift({id:crypto.randomUUID(),actorUid:me.id,actorName:me.name,event:advancedKind+'.'+(existing?'update':'create'),target:{collection:advancedKind,id:recordId},before:existing||null,after:record,createdAt:new Date().toISOString()});
      writeWS(data);
      return json(record);
    }
    if(path==='users' || path.startsWith('users/')){
      if(me.role!=='admin' && !(me.permissions&&me.permissions.users)) return json({error:'Solo el administrador puede gestionar usuarios.'},403);
      // Delete user: DELETE /api/users/:id
      if(path.startsWith('users/') && method==='DELETE'){
        const delId=path.slice('users/'.length);
        const target=(data.users||[]).find(x=>x.id===delId);
        if(!target) return json({error:'Usuario no encontrado.'},404);
        if(target.isOwner) return json({error:'No se puede eliminar la cuenta propietaria.'},403);
        if(target.id===me.id) return json({error:'No puedes eliminar tu propia cuenta.'},403);
        data.users=(data.users||[]).filter(x=>x.id!==delId);
        writeWS(data);
        return json({ok:true});
      }
      if(method==='GET') return json((data.users||[]).map(publicUser));
      // create/update user
      const id=body.id || (body.email ? 'u-'+hash((body.email||'').toLowerCase()) : crypto.randomUUID());
      const existing=(data.users||[]).find(x=>x.id===id || (x.email||'').toLowerCase()===(body.email||'').toLowerCase());
      if(existing && existing.isOwner && !isFirebaseAdmin) return json({error:'No se puede modificar la cuenta propietaria.'},403);
      const rec={
        id: existing?.id || id,
        name: body.name||'',
        email: (body.email||'').toLowerCase().trim(),
        unit: body.unit||'',
        role: body.role||'member',
        active: body.active!==false,
        isOwner: !!existing?.isOwner,
        revision: (existing?.revision||0)+1,
        passwordHash: body.password ? hash(body.password) : (existing?.passwordHash||''),
        permissions: body.permissions && typeof body.permissions==='object' ? body.permissions : (existing?.permissions || null),
        allowedUnits: Array.isArray(body.allowedUnits) ? body.allowedUnits.filter(Boolean) : (existing?.allowedUnits || []),
        restrictUnits: typeof body.restrictUnits === 'boolean' ? body.restrictUnits : !!existing?.restrictUnits,
        created: existing?.created || new Date().toISOString(),
        updated: new Date().toISOString()
      };
      if(!rec.email) return json({error:'Correo requerido.'},400);
      if(!existing && !rec.passwordHash) return json({error:'Asigna una contraseña para el nuevo usuario.'},400);
      const i=(data.users=data.users||[]).findIndex(x=>x.id===rec.id);
      if(i<0) data.users.push(rec); else data.users[i]=rec;
      writeWS(data);
      return json(publicUser(rec));
    }
    if(path==='notices'){
      if(method==='GET'){
        const list=(data.notices||[]).filter(n=>(me.role==='admin'||(me.permissions&&me.permissions.view_all))||n.toAccountId===me.id||n.fromAccountId===me.id);
        return json(list.map(n=>({...n,incoming:n.toAccountId===me.id,read:!!(data.reads&&data.reads[me.id]&&data.reads[me.id][n.id])})).sort((a,b)=>(b.created||'').localeCompare(a.created||'')));
      }
      const ids=Array.isArray(body.toAccountIds)?body.toAccountIds:[];
      const created=new Date().toISOString(); let count=0;
      data.notices=data.notices||[];
      for(const tid of ids){
        const target=(data.users||[]).find(x=>x.id===tid);
        if(!target) continue;
        const attachments=Array.isArray(body.attachments)?body.attachments.filter(a=>a&&a.dataUrl).slice(0,10).map(a=>({name:String(a.name||'imagen').slice(0,120),type:String(a.type||'image/jpeg').slice(0,40),dataUrl:String(a.dataUrl)})):[];
        data.notices.push({id:crypto.randomUUID(),type:body.type||'Mensaje',severity:body.severity||'normal',text:body.text||'',fromAccountId:me.id,fromName:me.name,toAccountId:tid,toName:target.name,created,referenceId:body.referenceId,referenceCollection:body.referenceCollection,referenceLabel:body.referenceLabel,attachments});
        count++;
      }
      writeWS(data); return json({ok:true,count});
    }
    const readMatch=path.match(/^notices\/([^/]+)\/read$/);
    if(readMatch && method==='POST'){
      data.reads=data.reads||{}; data.reads[me.id]=data.reads[me.id]||{}; data.reads[me.id][readMatch[1]]=true; writeWS(data); return json({ok:true});
    }
    const delNotice=path.match(/^notices\/([^/]+)$/);
    if(delNotice && method==='DELETE'){
      const id=delNotice[1];
      const idx=(data.notices||[]).findIndex(n=>n.id===id);
      if(idx<0) return json({error:'Aviso no encontrado.'},404);
      const n=data.notices[idx];
      const can=(me.role==='admin'||(me.permissions&&me.permissions.view_all)||n.fromAccountId===me.id||n.toAccountId===me.id);
      if(!can) return json({error:'Sin permiso para eliminar este aviso.'},403);
      data.notices.splice(idx,1);
      if(data.reads){for(const uid of Object.keys(data.reads)){if(data.reads[uid]) delete data.reads[uid][id];}}
      writeWS(data); return json({ok:true});
    }
    if(path==='assignable'){
      const col=u.searchParams.get('collection'); const list=(data[col]||[]);
      return json(list.map(r=>({id:r.id,label:r.folio||r.person||r.description||r.id,detail:r.supervisor||r.owner||r.period||'',accountId:r.assignedAccountId||r.ownerAccountId||me.id})));
    }
    if(path==='assign' && method==='POST'){
      if(me.role!=='admin') return json({error:'Permiso administrativo requerido.'},403);
      const col=body.collection, list=(data[col]||[]), rec=list.find(x=>x.id===body.id);
      if(!rec) return json({error:'Registro no encontrado'},404);
      const target=(data.users||[]).find(x=>x.id===body.accountId);
      if(col==='reports'){rec.ownerAccountId=body.accountId; if(target)rec.supervisor=target.name;}
      else if(col==='plans'){rec.assignedAccountId=body.accountId; if(target)rec.person=target.name;}
      else {rec.assignedAccountId=body.accountId; rec.ownerAccountId=body.accountId; if(target)rec.owner=target.name;}
      rec.updated=new Date().toISOString(); writeWS(data); return json({ok:true});
    }
    const [collection,id]=path.split('/');
    if(['reports','actions','plans'].includes(collection)){
      data[collection]=data[collection]||[]; const list=data[collection];
      // Read permission: admin sees all; others see own/assigned
      const unitAllowed=(r)=>{ if(!me.restrictUnits)return true; const legacy=Array.isArray(me.allowedUnits)?me.allowedUnits:[],ids=Array.isArray(me.allowedUnitIds)?me.allowedUnitIds:[]; if(!legacy.length&&!ids.length)return true; const ru=(r.unit||r.area||r.unidad||'').toString().toLowerCase().trim(); const did=r.departmentId||globalThis.SAFETY?.departmentOf?.(r)||''; if(!ru&&!did)return me.role==='admin'; return legacy.some(u=>u.toString().toLowerCase().trim()===ru)||ids.includes(did); };
      const canReadRec=(r)=>{ if(!unitAllowed(r)) return false; return (me.role==='admin' || (me.permissions&&me.permissions.view_all)) || (collection==='plans' ? r.assignedAccountId===me.id : collection==='actions' ? (r.assignedAccountId===me.id||r.ownerAccountId===me.id) : r.ownerAccountId===me.id); };
      if(method==='GET'){
        if(id){ const rec=list.find(x=>x.id===id); return rec && canReadRec(rec) ? json(rec) : json(null); }
        return json(me.role==='admin' ? list : list.filter(canReadRec));
      }
      if(method==='PUT' || method==='POST'){
        const recId=body.id||id||crypto.randomUUID();
        const prev=list.find(x=>x.id===recId);
        const rec={...body,id:recId,revision:((prev&&prev.revision)||0)+1,updated:new Date().toISOString()};
        if(!rec.departmentId){const resolved=globalThis.SAFETY?.departmentOf?.(rec)||'';if(resolved)rec.departmentId=resolved;}
        // unit restriction enforcement
        if(me.restrictUnits && ((Array.isArray(me.allowedUnits)&&me.allowedUnits.length)||(Array.isArray(me.allowedUnitIds)&&me.allowedUnitIds.length)) && me.role!=='admin' && !(me.permissions&&me.permissions.view_all)){
          const ru=(rec.unit||rec.area||rec.unidad||'').toString().toLowerCase().trim(),did=rec.departmentId||globalThis.SAFETY?.departmentOf?.(rec)||'';
          const legacyOk=ru&&me.allowedUnits.some(u=>u.toString().toLowerCase().trim()===ru),idsOk=did&&me.allowedUnitIds.includes(did);
          if(!legacyOk&&!idsOk) return json({error:'No tienes permiso para este departamento/unidad/área.'},403);
        }
        // edit permission checks
        if(collection==='reports' && !(me.permissions&&me.permissions.edit_reports) && me.role!=='admin') return json({error:'No tienes permiso para editar formatos.'},403);
        if(collection==='actions' && !(me.permissions&&me.permissions.edit_actions) && me.role!=='admin') return json({error:'No tienes permiso para editar acciones.'},403);
        if(collection==='plans' && !(me.permissions&&(me.permissions.edit_program||me.permissions.manage_team)) && me.role!=='admin') return json({error:'No tienes permiso para editar programas.'},403);
        if(!rec.ownerAccountId) rec.ownerAccountId = prev?.ownerAccountId || me.id;
        if(collection==='actions' && !rec.assignedAccountId) rec.assignedAccountId = prev?.assignedAccountId || me.id;
        if(collection==='plans' && !rec.assignedAccountId) rec.assignedAccountId = prev?.assignedAccountId || me.id;
        const idx=list.findIndex(x=>x.id===rec.id); if(idx<0) list.unshift(rec); else list[idx]=rec;
        writeWS(data); return json(rec);
      }
      if(method==='DELETE'){ if(collection==='reports' && !(me.permissions&&me.permissions.edit_reports) && me.role!=='admin') return json({error:'Sin permiso.'},403); if(collection==='actions' && !(me.permissions&&me.permissions.edit_actions) && me.role!=='admin') return json({error:'Sin permiso.'},403); if(collection==='plans' && !(me.permissions&&(me.permissions.edit_program||me.permissions.manage_team)) && me.role!=='admin') return json({error:'Sin permiso.'},403); data[collection]=list.filter(x=>x.id!==id); writeWS(data); return json({ok:true}); }
    }
    return json({error:'No disponible'},404);
  };
}

const DEFAULT_PERMS={
  admin:{dashboard:true,reports:true,edit_reports:true,program:true,edit_program:true,actions:true,edit_actions:true,progress:true,team:true,manage_team:true,notices:true,send_notices:true,users:true,view_all:true,assign:true,departments:true},
  operator:{dashboard:true,reports:true,edit_reports:true,program:true,edit_program:false,actions:true,edit_actions:true,progress:true,team:false,manage_team:false,notices:true,send_notices:true,users:false,view_all:false,assign:false,departments:false},
  supervisor:{dashboard:true,reports:true,edit_reports:true,program:true,edit_program:false,actions:true,edit_actions:true,progress:true,team:true,manage_team:false,notices:true,send_notices:true,users:false,view_all:false,assign:false,departments:false},
  member:{dashboard:true,reports:true,edit_reports:true,program:true,edit_program:false,actions:true,edit_actions:true,progress:true,team:false,manage_team:false,notices:true,send_notices:false,users:false,view_all:false,assign:false,departments:false}
};
function effectivePerms(u){ const base={...(DEFAULT_PERMS[u.role]||DEFAULT_PERMS.member)}; if(u.permissions&&typeof u.permissions==='object'){ for(const k in base){ if(k in u.permissions) base[k]=!!u.permissions[k]; } for(const k in u.permissions){ if(!(k in base)) base[k]=!!u.permissions[k]; } } return base; }
function publicUser(u){ return {id:u.id,email:u.email,name:u.name,role:u.role,active:u.active!==false,unit:u.unit||'',isOwner:!!u.isOwner,revision:u.revision||0,permissions:effectivePerms(u),allowedUnits:Array.isArray(u.allowedUnits)?u.allowedUnits:(typeof u.allowedUnits==='string'&&u.allowedUnits?u.allowedUnits.split(',').map(s=>s.trim()).filter(Boolean):[]),restrictUnits:!!u.restrictUnits,allowedUnitIds:Array.isArray(u.allowedUnitIds)?u.allowedUnitIds:[],departmentId:u.departmentId||''}; }

async function installDepartmentCatalog(){
  let catalog=[];
  try{
    if(Array.isArray(globalThis.SM_CLOUD?.departments))catalog=globalThis.SM_CLOUD.departments;
    else{const response=await fetch('/api/departments',{cache:'no-store'});if(response.ok)catalog=await response.json();}
    if(Array.isArray(catalog)&&catalog.length&&globalThis.SMDepartments?.setCatalog)globalThis.SMDepartments.setCatalog(catalog);
  }catch(error){console.warn('Catálogo de departamentos no disponible; se usa el catálogo embebido.',error);}
  globalThis.SM_DEPARTMENTS=globalThis.SMDepartments?.catalog?.()||catalog;
  globalThis.SM_DEPARTMENT_CATALOG=catalog;
  return catalog;
}

async function loadAppScripts(){
  const required=['assets/pdf-lib.min.js','formats.js','departments.js','extended-formats.js','progress-core.js','supervisor.js','workspace-pdf.js','report-pdf.js','workspace.js','accounts-ui.js','departments-ui.js'];
  const optional=['session-tracker.js'];
  for(const src of [...required,...optional]){
    await new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=ok;s.onerror=()=>optional.includes(src)?ok():no(new Error('No se pudo cargar '+src));document.body.append(s);});
  }
}

// --- Launch for Firebase admin ---
async function launch(user){
  if(started)return;started=true;
  try{
    const {connectPortal}=await import('./cloud-portal.js');
    const cloud=await connectPortal(app,user,DEFAULT_PERMS);
    globalThis.SM_CLOUD=cloud;
    globalThis.AUTH={user:cloud.me};globalThis.ACCOUNT_USERS=cloud.users;globalThis.ACCOUNT_DIRECTORY=cloud.directory;
    globalThis.SM_SCOPE_ACCOUNT=cloud.me.role==='admin'||cloud.me.permissions.view_all?'':cloud.me.id;
    globalThis.smStorageKey=k=>k+'-'+user.uid;
    document.body.dataset.role=cloud.me.role;
    await loadAppScripts();
  await installDepartmentCatalog();
    try{
      const {installNormativeLibrary}=await import('./normative-library.js');
      await installNormativeLibrary();
    }catch(error){console.warn('Biblioteca normativa no disponible',error);}
    try{
      const {createSafetySuiteStore}=await import('./safety-suite-store.js');
      const {installTrainingSuite}=await import('./training-suite.js');
      await installTrainingSuite({store:createSafetySuiteStore(cloud.db,cloud.me),me:cloud.me,directory:cloud.directory});
    }catch(error){console.warn('Programa de pláticas no disponible',error);}
    const {startCloudSession,installSessionReport}=await import('./cloud-sessions.js');
    const closeSession=await startCloudSession(cloud.db,cloud.me);
    installSessionReport(cloud.db,cloud.me);
    try{const {startLiveSync}=await import('./cloud-live.js');startLiveSync(cloud.db,cloud.me);}
    catch(error){console.warn('Sincronización en tiempo real no disponible.',error);}
    by('accessScreen').hidden=true;by('appRoot').hidden=false;
    if(cloud.me.role==='admin')mountProfile(user);
    document.querySelector('.sign-out').onclick=async e=>{
      e.preventDefault();
      try{await Promise.race([closeSession().catch(error=>console.warn('No se pudo sincronizar el cierre de presencia.',error)),new Promise(resolve=>setTimeout(resolve,3000))]);await signOut(auth);try{localStorage.removeItem('sm-local-session');}catch{}location.reload();}
      catch{toast('No se pudo cerrar la sesión. Inténtalo de nuevo.');}
    };
    toast('Conectado al almacenamiento central de Sierra Madre.');
  }catch(error){
    console.warn('No se pudo abrir el almacenamiento central.',error);
    started=false;
    login('No se pudo abrir tu espacio: '+(error.code||error.message));
    const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.textContent='Reintentar conexión';retry.onclick=()=>location.reload();card()?.append(retry);
    const backup=document.createElement('button');backup.type='button';backup.className='secondary';backup.textContent='Descargar respaldo de este navegador';backup.onclick=()=>exportWorkspaceBackup().catch(()=>toast('No se pudo descargar el respaldo.'));card()?.append(backup);
  }
}
async function legacyLaunch(user){
  if(started) return; started=true;
  // Ensure admin user exists in workspace
  const ws=readWS();
  if(!ws.users.find(u=>u.isOwner || u.id===user.uid)){
    ws.users.unshift({id:user.uid,name:user.displayName||'Admin',email:user.email,unit:'Sierra Madre',role:'admin',active:true,isOwner:true,revision:0,created:new Date().toISOString()});
    writeWS(ws);
  } else {
    // sync basic info
    const ou=ws.users.find(u=>u.isOwner || u.id===user.uid);
    if(ou){ou.name=user.displayName||ou.name||'Admin';ou.email=user.email;writeWS(ws);}
  }
  const me={id:user.uid,name:user.displayName||'Admin',email:user.email,unit:'Sierra Madre',role:'admin',active:true,isOwner:true,permissions:DEFAULT_PERMS.admin};
  installStore(me,true);
  globalThis.AUTH={user:me};
  globalThis.smStorageKey=k=>k+'-'+user.uid;
  globalThis.ACCOUNT_DIRECTORY=(readWS().users||[]).filter(x=>x.active!==false).map(x=>({id:x.id,name:x.name,unit:x.unit||'',departmentId:x.departmentId||'',role:x.role}));
  globalThis.ACCOUNT_USERS=(readWS().users||[]).map(publicUser);
  globalThis.SM_SCOPE_ACCOUNT='';
  document.body.dataset.role='admin';
  await loadAppScripts();
  await installDepartmentCatalog();
  by('accessScreen').hidden=true; by('appRoot').hidden=false;
  globalThis.SM_LOCAL_MODE=true;
  document.body.dataset.storage='local';
  const syncEl=by('sync'); if(syncEl){syncEl.textContent='Modo local: datos guardados en este navegador (sin sincronización central)'; syncEl.className='sync local'; syncEl.title='Los datos no se comparten ni sincronizan con otros dispositivos/cuentas desde este modo. Realiza respaldos periódicos.';}
  mountProfile(user);
  try{const {installNormativeLibrary}=await import('./normative-library.js');await installNormativeLibrary();}catch(e){console.warn('Biblioteca normativa no disponible',e);}
  try{const {createLocalSafetySuiteStore}=await import('./safety-suite-store.js');const {installTrainingSuite}=await import('./training-suite.js');const wsDir=(readWS().users||[]).filter(x=>x.active!==false).map(x=>({id:x.id,name:x.name,unit:x.unit||'',departmentId:x.departmentId||'',role:x.role}));await installTrainingSuite({store:createLocalSafetySuiteStore(me,{directory:wsDir}),me,directory:wsDir});}catch(e){console.warn('Programa de pláticas no disponible',e);}
  try{globalThis.SM_SESSION_TRACKER?.start(me);}catch{}
  document.querySelector('.sign-out')?.addEventListener('click',e=>{e.preventDefault(); try{localStorage.removeItem('sm-local-session');}catch{} localSessionUser=null; signOut(auth);});
  setTimeout(()=>toast('Modo local: los datos se guardan solo en este navegador y no se sincronizan con otros equipos. Descarga respaldos periódicos.'),1200);
}

// --- Launch for local (in-app created) users ---
async function launchLocal(user){
  if(started) return; started=true;
  const me={...user, permissions: effectivePerms(user)};
  installStore(me,false);
  globalThis.AUTH={user:publicUser(me)};
  globalThis.smStorageKey=k=>k+'-'+user.id;
  const ws=readWS();
  globalThis.ACCOUNT_DIRECTORY=(ws.users||[]).filter(x=>x.active!==false).map(x=>({id:x.id,name:x.name,unit:x.unit||'',departmentId:x.departmentId||'',role:x.role}));
  globalThis.ACCOUNT_USERS = (me.permissions&&me.permissions.users) ? (ws.users||[]).map(publicUser) : [];
  globalThis.SM_SCOPE_ACCOUNT = (me.permissions&&me.permissions.view_all) ? '' : me.id;
  document.body.dataset.role=me.role||'member';
  await loadAppScripts();
  await installDepartmentCatalog();
  by('accessScreen').hidden=true; by('appRoot').hidden=false;
  globalThis.SM_LOCAL_MODE=true;
  document.body.dataset.storage='local';
  const syncEl=by('sync'); if(syncEl){syncEl.textContent='Modo local: datos guardados en este navegador (sin sincronización central)'; syncEl.className='sync local'; syncEl.title='Los datos no se comparten ni sincronizan con otros dispositivos/cuentas desde este modo. Realiza respaldos periódicos.';}
  document.querySelector('.sign-out')?.addEventListener('click',e=>{e.preventDefault();try{localStorage.removeItem('sm-local-session');}catch{}localSessionUser=null;location.reload();});
  try{const {installNormativeLibrary}=await import('./normative-library.js');await installNormativeLibrary();}catch(e){console.warn('Biblioteca normativa no disponible',e);}
  try{const {createLocalSafetySuiteStore}=await import('./safety-suite-store.js');const {installTrainingSuite}=await import('./training-suite.js');const wsDir=(readWS().users||[]).filter(x=>x.active!==false).map(x=>({id:x.id,name:x.name,unit:x.unit||'',departmentId:x.departmentId||'',role:x.role}));await installTrainingSuite({store:createLocalSafetySuiteStore(me,{directory:wsDir}),me,directory:wsDir});}catch(e){console.warn('Programa de pláticas no disponible',e);}
  try{globalThis.SM_SESSION_TRACKER?.start(me);}catch{toast('No se pudo guardar el tiempo de sesión. Verifica el almacenamiento del navegador.');}
  setTimeout(()=>toast('Modo local: los datos se guardan solo en este navegador y no se sincronizan con otros equipos. Descarga respaldos periódicos.'),1200);
}

async function importLocalWorkspace(me,{preview=false}={}){
  if(!globalThis.SM_CLOUD) throw Error('Activa primero el almacenamiento central.');
  const ws=readWS();
  if(JSON.stringify(ws).match(/"passwordHash"|"refreshToken"|"idToken"|"accessToken"|"apiKey"\s*:/)) throw Error('El espacio local contiene campos sensibles. Descarga un respaldo limpio antes de importar.');
  const localUsers=Array.isArray(ws.users)?ws.users:[];
  let profiles=[];
  try{const r=await fetch('/api/users',{cache:'no-store'});if(r.ok)profiles=await r.json();}catch{}
  const emailToUid={};
  for(const p of profiles){if(p&&p.email)emailToUid[String(p.email).toLowerCase()]=p.id;}
  const ownerFor=localId=>{const u=localUsers.find(x=>x.id===localId);return (u&&emailToUid[String(u.email||'').toLowerCase()])||me.id;};
  const summary={reports:0,actions:0,plans:0,notices:0,skipped:0,conflicts:0,notImported:[],preview:[]};
  for(const col of ['reports','actions','plans']){
    const local=Array.isArray(ws[col])?ws[col]:[];
    if(!local.length)continue;
    let cloud=[];
    try{const r=await fetch('/api/'+col,{cache:'no-store'});if(r.ok)cloud=await r.json();}catch{}
    const existing=new Set((cloud||[]).map(x=>x.id));
    for(const rec of local){
      if(!rec||!rec.id){summary.conflicts++;summary.preview.push({collection:col,id:'',action:'conflicto',reason:'sin identificador'});continue;}
      if(existing.has(rec.id)){summary.skipped++;summary.preview.push({collection:col,id:rec.id,action:'omitir',reason:'ya existe en la nube'});continue;}
      summary.preview.push({collection:col,id:rec.id,action:'agregar'});
      if(preview)continue;
      const body={...rec,revision:0,ownerAccountId:ownerFor(rec.ownerAccountId)};
      if(col==='actions'||col==='plans')body.assignedAccountId=ownerFor(rec.assignedAccountId);
      if(col==='plans'){body.ownerAccountId=me.id;body.assignedAccountId=ownerFor(rec.assignedAccountId);}
      const r=await fetch('/api/'+col+'/'+encodeURIComponent(rec.id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(!r.ok){let e={};try{e=await r.json();}catch{} throw Error(e.error||('No se pudo importar '+col+' ('+(rec.id||'sin id')+').'));}
      summary[col]++;
    }
  }
  let cloudNotices=[];
  try{const r=await fetch('/api/notices',{cache:'no-store'});if(r.ok)cloudNotices=await r.json();}catch{}
  const imported=new Set((cloudNotices||[]).map(n=>n.legacyId).filter(Boolean));
  for(const n of (ws.notices||[])){
    if(!n||!n.id||imported.has(n.id)){summary.skipped++;summary.preview.push({collection:'notices',id:n?.id||'',action:'omitir',reason:n?.id&&imported.has(n.id)?'ya importado':'sin identificador'});continue;}
    summary.preview.push({collection:'notices',id:n.id,action:'agregar'});
    if(preview)continue;
    const target=ownerFor(n.toAccountId);
    const toAccountIds=[...new Set([target,me.id])];
    const attachments=(Array.isArray(n.attachments)?n.attachments:[]).filter(a=>a&&a.dataUrl&&String(a.dataUrl).length<=850000);
    const r=await fetch('/api/notices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({toAccountIds,type:n.type||'Mensaje',severity:n.severity||'normal',text:String(n.text||'Aviso migrado').slice(0,5000),attachments,referenceId:n.referenceId,referenceCollection:n.referenceCollection,referenceLabel:n.referenceLabel,legacyId:n.id})});
    if(!r.ok){let e={};try{e=await r.json();}catch{} throw Error(e.error||'No se pudo importar un aviso.');}
    summary.notices++;
  }
  summary.notImported=localUsers.filter(u=>u&&u.email&&!u.isOwner&&!emailToUid[String(u.email).toLowerCase()]).map(u=>u.name||u.email);
  summary.counts={toAdd:summary.preview.filter(x=>x.action==='agregar').length,toSkip:summary.preview.filter(x=>x.action==='omitir').length,conflicts:summary.preview.filter(x=>x.action==='conflicto').length};
  return summary;
}

// --- Profile (Firebase admin) ---
function mountProfile(user){
  if(by('profileSettings')) return;
  const tools=document.querySelector('.header-tools'); if(!tools) return;
  let saved={};try{saved=JSON.parse(localStorage.getItem('sm-profile-'+user.uid)||'{}')||{};}catch{}
  const btn=document.createElement('button'); btn.id='profileSettings'; btn.className='theme-button'; btn.type='button'; btn.textContent='Perfil';
  const signOutLink=tools.querySelector('.sign-out'); if(signOutLink) tools.insertBefore(btn,signOutLink); else tools.appendChild(btn);
  const dialog=document.createElement('dialog'); dialog.id='profileDialog';
  dialog.innerHTML=`<form method="dialog" id="profileForm"><div class="dialog-top"><div><span class="eyebrow">ADMINISTRADOR</span><h2>Mi perfil y avisos</h2></div><button class="close" value="cancel" aria-label="Cerrar">×</button></div><div class="editor-scroll"><div class="fields"><label>Nombre<input name="name" required maxlength="100" value="${(user.displayName||'Admin').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></label><label>Correo de acceso<input name="email" type="email" value="${user.email||''}" readonly></label><label>Teléfono / WhatsApp<input name="phone" type="tel" maxlength="30" value="${String(saved.phone||'').replace(/&/g,'&amp;').replace(/\"/g,'&quot;')}"></label><label>Nueva contraseña <small>(opcional)</small><input name="password" type="password" minlength="8" autocomplete="new-password"></label></div><div class="report-note"><strong>Respaldo antes de migración</strong><p>Descarga una copia de formatos, acciones, evidencias, permisos, avisos e historiales almacenados en este navegador. Las contraseñas nunca se incluyen.</p><button class="secondary" type="button" id="exportWorkspace">Descargar respaldo local</button></div></div><div class="editor-footer"><button class="secondary" value="cancel" type="button" id="closeProfile">Cancelar</button><button class="primary" type="submit">Guardar perfil</button></div></form>`;
  document.body.appendChild(dialog);
  btn.onclick=()=>dialog.showModal();
  dialog.querySelector('#closeProfile').onclick=()=>dialog.close();
  const connect=document.createElement('button');
  connect.type='button';connect.className='secondary';
  const cloudActive=!!globalThis.SM_CLOUD;
  connect.textContent=cloudActive?'Verificar administración en Firebase':'Activar almacenamiento central';
  dialog.querySelector('.report-note').appendChild(connect);
  connect.onclick=async()=>{
    connect.disabled=true;
    try{
      const {initializeAuthority}=await import('./firebase-cloud.js');
      await initializeAuthority(app,user);
      if(!cloudActive){
        toast('Nube activada. Recargando…');
        setTimeout(()=>location.reload(),1000);
        return;
      }
      await exportWorkspaceBackup();
      const {archiveWorkspace}=await import('./migration-archive.js');
      const workspace=readWS();
      workspace.users=(workspace.users||[]).map(({passwordHash,...profile})=>profile);
      await archiveWorkspace(app,workspace);
      toast('Respaldo central verificado. Se conservan los registros de este navegador.');
    }catch(error){toast('No se pudo verificar Firebase: '+(error.code||error.message));}
    finally{connect.disabled=false;}
  };
  if(cloudActive){
    const importBtn=document.createElement('button');
    importBtn.type='button';importBtn.className='secondary';importBtn.textContent='Importar datos locales a la nube';
     dialog.querySelector('.report-note').appendChild(importBtn);
     importBtn.onclick=async()=>{
       importBtn.disabled=true;
       try{
         const preview=await importLocalWorkspace(globalThis.SM_CLOUD.me,{preview:true});
         const msg=`Previsualización (sin escribir):\n- A agregar: ${preview.counts.toAdd}\n- Omitidos (ya existen/sin id): ${preview.counts.toSkip}\n- Conflictos: ${preview.counts.conflicts}\n\nAntes de importar, crea en Usuarios y permisos las mismas cuentas (con su correo). Los registros de usuarios no existentes en la nube se asignarán a tu cuenta.\n\n¿Continuar con la importación?`;
         if(!window.confirm(msg))return;
         const summary=await importLocalWorkspace(globalThis.SM_CLOUD.me);
         const missing=summary.notImported.length?` Recrea ${summary.notImported.length} usuarios locales en Usuarios y permisos.`:'';
         toast(`Importados: ${summary.reports} formatos, ${summary.actions} acciones, ${summary.plans} programas, ${summary.notices} avisos.${missing}`);
         setTimeout(()=>location.reload(),4000);
       }catch(error){alert('No se pudieron importar todos los datos: '+error.message);}
       finally{importBtn.disabled=false;}
     };
  }
  dialog.querySelector('#exportWorkspace').onclick=async()=>{try{const result=await exportWorkspaceBackup();toast(`Respaldo descargado: ${result.records} registros y ${result.users} usuarios.`)}catch{toast('No se pudo crear el respaldo local. Verifica el espacio disponible e inténtalo de nuevo.')}};
  by('profileForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const f=new FormData(event.currentTarget),name=String(f.get('name')).trim(),password=String(f.get('password'));
    try{
      if(name && name!==user.displayName) await updateProfile(user,{displayName:name});
      if(globalThis.SM_CLOUD)await globalThis.SM_CLOUD.updateName(name);
      if(password) await updatePassword(user,password);
      localStorage.setItem('sm-profile-'+user.uid,JSON.stringify({phone:String(f.get('phone')).trim(),updatedAt:new Date().toISOString()}));
      if(globalThis.AUTH&&globalThis.AUTH.user) globalThis.AUTH.user.name=name;
      const pn=by('profileName'); if(pn) pn.textContent=name;
      dialog.close(); toast('Perfil actualizado.');
    }catch(error){ alert('No se pudo guardar: '+(error.code||error.message)); }
  });
}

// --- Boot: check local session, then Firebase state ---
let bootAuthResolved=false;
onAuthStateChanged(auth, async user=>{
  if(localSessionUser) return; // local session takes precedence if already launched
  if(!user){
    // No Firebase session: try to restore a local session (only once).
    if(!bootAuthResolved){
      bootAuthResolved=true;
      try{
        const sid=localStorage.getItem('sm-local-session');
        if(sid){
          const ws=readWS();
          const u=(ws.users||[]).find(x=>x.id===sid && x.active!==false);
          if(u){ localSessionUser=u; await launchLocal(u); return; }
          else { localStorage.removeItem('sm-local-session'); }
        }
      }catch{}
    }
    started=false; login(); return;
  }
  // Firebase session exists: clear any stale local session marker and use the cloud.
  bootAuthResolved=true;
  try{ localStorage.removeItem('sm-local-session'); }catch{}
  // Codex: one-time bootstrap - if temp admin already used, force re-login with personal account
  if(user.email===initial && user.displayName===bootstrapDone){
    await signOut(auth);
    login('El acceso temporal ya se utilizó. Ingresa con tu correo personal.');
    return;
  }
  if(user.email===initial){ onboarding(user); }
  else { await launch(user); }
});
