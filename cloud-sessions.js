import {doc,collection,setDoc,updateDoc,serverTimestamp,getDocs,deleteDoc} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import {createSessionClock} from './session-clock.js';

const ONLINE_MS=90000;
const IDLE_MS=300000;

function fmtClock(ms){
  ms=Math.max(0,Number(ms)||0);
  const total=Math.floor(ms/1000),h=Math.floor(total/3600),m=Math.floor(total/60)%60,s=total%60;
  return [h,m,s].map(n=>String(n).padStart(2,'0')).join(':');
}
function timeText(value){
  if(!value)return '—';
  const date=value.toDate?value.toDate():new Date(value);
  return isNaN(date.getTime())?'—':date.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
function dateText(value){
  if(!value)return '—';
  const date=value.toDate?value.toDate():new Date(value);
  return isNaN(date.getTime())?'—':date.toLocaleDateString('es-MX',{day:'2-digit',month:'short'})+' '+date.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
}

function mountInHeader(el,before){
  const tools=document.querySelector('.header-tools');
  if(!tools)return;
  const anchor=tools.querySelector(before)||tools.querySelector('.sign-out');
  if(anchor)anchor.insertAdjacentElement('beforebegin',el);
  else tools.append(el);
}

export async function startCloudSession(db,me){
  if(!['member','operator','admin'].includes(me.role))return async()=>{};
  const ref=doc(collection(db,'sessions'));
  let synced=false,lastSaveOk=false,syncError=null;
  const clock=createSessionClock();
  const el=document.createElement('span');
  el.className='session-timer';
  el.innerHTML='<span class="session-dot" aria-hidden="true"></span><span class="session-text">En línea</span><span class="session-clock">00:00:00</span>';
  el.title='Tiempo de sesión conectado.';
  el.setAttribute('role','timer');
  el.setAttribute('aria-live','off');
  mountInHeader(el,'#noticeBell');
  const clockEl=el.querySelector('.session-clock');
  let stopped=false,pending=Promise.resolve();
  function paint(){
    const state=clock.snapshot();
    clockEl.textContent=fmtClock(Date.now()-state.startedAt);
    const idle=Date.now()-state.lastActivityAt>IDLE_MS;
    el.classList.toggle('is-idle',idle&&!stopped);
    el.classList.toggle('is-offline',!lastSaveOk);
    let tip='Sesión iniciada a las '+new Date(state.startedAt).toLocaleTimeString('es-MX')+'.';
    if(idle) tip+=' Sin actividad en los últimos 5 minutos (el tiempo activo está en pausa).';
    if(!lastSaveOk) tip+=' No se pudo conectar con el servidor para registrar tu presencia; se reintentará automáticamente.';
    if(syncError) tip+=' ('+(syncError.code||syncError.message||'error')+')';
    el.title=tip;
  }
  async function ensureSession(){
    if(synced||stopped)return synced;
    try{
      await setDoc(ref,{userId:me.id,startedAt:serverTimestamp(),updatedAt:serverTimestamp(),activeMs:0,closed:false});
      synced=true;lastSaveOk=true;syncError=null;if(!stopped)paint();return true;
    }catch(error){
      syncError=error;lastSaveOk=false;if(!stopped)paint();
      console.error('No se pudo registrar la sesión en la nube.',error);
      try{alert('No se pudo registrar tu sesión en la nube: '+(error.code||error.message||error));}catch{}
      return false;
    }
  }
  const initialSync=await ensureSession();
  if(!initialSync) console.warn('La sesión quedó en modo solo local para este usuario.');
  function touch(){if(!stopped){clock.activity();paint();}}
  for(const event of ['pointerdown','keydown','touchstart'])document.addEventListener(event,touch,{passive:true});
  async function save(closed=false){
    const state=closed?clock.close():clock.snapshot();
    if(!synced) await ensureSession();
    if(!synced){ if(closed) clock.close(); return Promise.resolve(); }
    pending=pending.catch(()=>{}).then(()=>updateDoc(ref,{activeMs:Math.floor(state.activeMs),updatedAt:serverTimestamp(),closed}))
      .then(()=>{lastSaveOk=true;syncError=null;if(!stopped)paint();})
      .catch(error=>{syncError=error;lastSaveOk=false;if(!stopped)paint();throw error;});
    return pending;
  }
  const ticker=setInterval(paint,1000);
  const heartbeat=setInterval(()=>save().catch(()=>{}),30000);
  const flush=()=>save().catch(()=>{});
  const onVisibility=()=>{if(document.visibilityState==='hidden')flush();};
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('pagehide',flush);
  paint();
  return async()=>{
    if(stopped)return;
    stopped=true;clearInterval(ticker);clearInterval(heartbeat);
    for(const event of ['pointerdown','keydown','touchstart'])document.removeEventListener(event,touch);
    document.removeEventListener('visibilitychange',onVisibility);
    window.removeEventListener('pagehide',flush);
    await save(true);
    el.remove();
  };
}

export function installSessionReport(db,me){
  if(me.role!=='admin')return;
  const button=document.createElement('button');
  button.className='theme-button';button.type='button';button.textContent='Sesiones';
  button.title='Ver quién está conectado y cuánto tiempo lleva en línea';
  mountInHeader(button,'#noticeBell');
  const transfer=document.createElement('button');
  transfer.className='theme-button';transfer.type='button';transfer.textContent='Cambiar encargado';
  mountInHeader(transfer,'#noticeBell');
  transfer.onclick=async()=>{
    const email=prompt('Correo de la cuenta activa que recibirá la administración:');if(!email)return;
    try{
      const profiles=(await getDocs(collection(db,'profiles'))).docs;
      const target=profiles.find(p=>p.data().active&&p.data().email?.toLowerCase()===email.trim().toLowerCase());
      if(!target||target.id===me.id)throw Error('Selecciona otra cuenta activa del equipo.');
      if(!confirm('Transferir la administración a '+target.data().name+' ('+email+') y retirar tu acceso administrativo?'))return;
      await updateDoc(doc(db,'security','authority'),{administratorUid:target.id,updatedAt:serverTimestamp()});location.reload();
    }catch(error){alert('No se pudo transferir: '+error.message);}
  };

  const dialog=document.createElement('dialog');
  dialog.className='session-dialog';
  dialog.innerHTML=`
    <div class="dialog-top">
      <div><span class="eyebrow">CONTROL DE SESIONES</span><h2>Equipo conectado</h2></div>
      <button type="button" class="close" data-session-close aria-label="Cerrar">×</button>
    </div>
    <div class="session-summary">
      <span class="session-live"><i></i><b data-session-count>0</b> en línea</span>
      <span class="session-updated">Actualizado <b data-session-updated>—</b></span>
    </div>
    <div class="session-table-wrap">
      <table class="work-table session-table">
        <thead><tr><th>Usuario</th><th>Inicio</th><th>Conectado</th><th>Activo</th><th>Última señal</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody data-session-body></tbody>
      </table>
    </div>
    <p class="session-note">“Conectado” cuenta desde el inicio de sesión. “Activo” descuenta pausas de más de 5 minutos sin interacción. Una sesión sin señal deja de mostrarse como en línea a los 90 segundos.</p>
    <div class="editor-footer">
      <button type="button" class="secondary" data-session-history aria-pressed="false">Ver historial</button>
      <button type="button" class="primary" data-session-close>Cerrar</button>
    </div>`;
  document.body.append(dialog);

  const body=dialog.querySelector('[data-session-body]');
  const countEl=dialog.querySelector('[data-session-count]');
  const updatedEl=dialog.querySelector('[data-session-updated]');
  const historyBtn=dialog.querySelector('[data-session-history]');
  let sessions=[],profiles=[],history=false,view=[];

  const nameOf=id=>{const p=profiles.find(x=>x.id===id);return p?{name:p.name||id,email:p.email||''}:{name:id,email:''};};
  const startMs=row=>row.startedAt?.toMillis?.()||0;
  const seenMs=row=>row.updatedAt?.toMillis?.()||0;
  const elapsed=row=>{const start=startMs(row);return start?Math.max(0,(row.closed?seenMs(row):Date.now())-start):0;};
  function stateOf(row){
    if(row.closed)return{key:'closed',label:'Desconectado'};
    const seen=seenMs(row);
    if(seen&&Date.now()-seen<ONLINE_MS)return{key:'online',label:'En línea'};
    return{key:'stale',label:'Sin señal'};
  }
  function visible(){
    if(history)return sessions.slice().sort((a,b)=>startMs(b)-startMs(a));
    const latest=new Map();
    for(const row of sessions){const prev=latest.get(row.userId);if(!prev||startMs(row)>startMs(prev))latest.set(row.userId,row);}
    return [...latest.values()].sort((a,b)=>{
      const sa=stateOf(a).key==='online'?0:1,sb=stateOf(b).key==='online'?0:1;
      return sa-sb||startMs(b)-startMs(a);
    });
  }
  function build(){
    body.innerHTML='';
    view=visible().map(row=>{
      const who=nameOf(row.userId);
      const tr=document.createElement('tr');
      const user=document.createElement('td');
      user.innerHTML='<b></b><small></small>';
      user.querySelector('b').textContent=who.name;
      user.querySelector('small').textContent=who.email||row.userId;
      tr.append(user);
      const start=document.createElement('td');start.textContent=dateText(row.startedAt);tr.append(start);
      const connected=document.createElement('td');connected.className='session-duration';tr.append(connected);
      const active=document.createElement('td');active.className='session-duration muted';tr.append(active);
      const seen=document.createElement('td');seen.textContent=timeText(row.updatedAt);tr.append(seen);
      const state=document.createElement('td');
      const badge=document.createElement('span');badge.className='session-state';state.append(badge);tr.append(state);
      const action=document.createElement('td');
      const del=document.createElement('button');del.type='button';del.className='secondary';del.textContent='Eliminar';del.dataset.sessionDelete=row.id;
      action.append(del);tr.append(action);
      body.append(tr);
      return{row,connected,active,badge};
    });
    if(!view.length){
      const tr=document.createElement('tr'),td=document.createElement('td');
      td.colSpan=7;td.className='session-empty';td.textContent='Todavía no hay sesiones registradas.';
      tr.append(td);body.append(tr);
    }
    paint();
  }
  function paint(){
    for(const item of view){
      item.connected.textContent=fmtClock(elapsed(item.row));
      item.active.textContent=fmtClock(item.row.activeMs||0);
      item.badge.textContent=stateOf(item.row).label;
      item.badge.className='session-state session-state--'+stateOf(item.row).key;
    }
    countEl.textContent=String(view.filter(item=>stateOf(item.row).key==='online').length);
    updatedEl.textContent=new Date().toLocaleTimeString('es-MX');
  }
  async function load(){
    const [s,p]=await Promise.all([getDocs(collection(db,'sessions')),getDocs(collection(db,'profiles'))]);
    sessions=s.docs.map(d=>({...d.data(),id:d.id}));
    profiles=p.docs.map(d=>({...d.data(),id:d.id}));
    build();
  }
  async function refresh(){
    try{await load();}catch(error){updatedEl.textContent='sin conexión';console.warn('No se pudieron actualizar las sesiones',error);}
  }

  button.onclick=async()=>{
    button.disabled=true;
    try{
      history=false;historyBtn.setAttribute('aria-pressed','false');historyBtn.textContent='Ver historial';
      await load();
      if(!dialog.open)dialog.showModal();
    }catch(error){alert('No se pudieron cargar las sesiones: '+error.message);}
    finally{button.disabled=false;}
  };
  historyBtn.onclick=()=>{
    history=!history;
    historyBtn.setAttribute('aria-pressed',String(history));
    historyBtn.textContent=history?'Ver sesiones actuales':'Ver historial';
    build();
  };
  dialog.addEventListener('click',async event=>{
    const del=event.target.closest('[data-session-delete]');
    if(!del)return;
    if(!confirm('¿Eliminar este registro de sesión?'))return;
    try{await deleteDoc(doc(db,'sessions',del.dataset.sessionDelete));await refresh();}catch(error){alert('No se pudo eliminar la sesión: '+error.message);}
  });
  for(const el of dialog.querySelectorAll('[data-session-close]'))el.onclick=()=>dialog.close();

  setInterval(()=>{if(dialog.open)paint();},1000);
  setInterval(()=>{if(dialog.open)refresh();},30000);
  window.addEventListener('sm:live',event=>{if(event.detail&&event.detail.collection==='sessions'&&dialog.open)refresh();});
}
