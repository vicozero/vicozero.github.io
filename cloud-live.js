import {collection,doc,query,where,or,onSnapshot} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Realtime sync: listens to Firestore changes and asks the UI modules to reload
// their data. Reloading is debounced and guarded by each module so it never
// overwrites an open editor.
export function startLiveSync(db,me){
  const isAdmin=me.role==='admin';
  const perms=me.permissions||{};
  const seesAllRecords=isAdmin||!!perms.view_all;
  const timers=new Map();
  let closed=false;

  function label(){
    const el=document.getElementById('sync');
    if(!el||el.classList.contains('error'))return;
    const time=new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
    el.textContent='Sincronizado '+time;
    el.title='Los cambios del equipo se reciben automáticamente.';
  }
  function emit(name){
    if(closed)return;
    clearTimeout(timers.get(name));
    timers.set(name,setTimeout(()=>{
      timers.delete(name);
      window.dispatchEvent(new CustomEvent('sm:live',{detail:{collection:name}}));
      label();
    },350));
  }
  function watch(name,ref){
    let first=true;
    try{
      return onSnapshot(ref,snapshot=>{
        if(first){first=false;return;}
        if(snapshot.metadata&&snapshot.metadata.hasPendingWrites)return;
        emit(name);
      },error=>{
        console.warn('Sincronización en vivo no disponible para '+name,error&&error.message);
      });
    }catch(error){
      console.warn('No se pudo activar la sincronización de '+name,error&&error.message);
      return ()=>{};
    }
  }

  const unsubscribers=[];
  unsubscribers.push(watch('notices',isAdmin
    ?collection(db,'notices')
    :query(collection(db,'notices'),or(where('toAccountId','==',me.id),where('fromAccountId','==',me.id)))));
  unsubscribers.push(watch('noticeReads',collection(db,'noticeReads',me.id,'items')));
  for(const name of ['reports','actions','plans']){
    unsubscribers.push(watch(name,seesAllRecords
      ?collection(db,name)
      :query(collection(db,name),or(where('ownerAccountId','==',me.id),where('assignedAccountId','==',me.id)))));
  }
  if(isAdmin){
    unsubscribers.push(watch('profiles',collection(db,'profiles')));
    unsubscribers.push(watch('sessions',collection(db,'sessions')));
  }

  // Watch the signed-in profile: revoke access if the administrator deactivates it.
  try{
    let firstProfile=true;
    unsubscribers.push(onSnapshot(doc(db,'profiles',me.id),snapshot=>{
      if(firstProfile){firstProfile=false;return;}
      const data=snapshot.data();
      if(data&&data.active===false){
        closed=true;
        alert('Tu acceso a Sierra Madre fue desactivado por el administrador. Se cerrará la sesión.');
        location.reload();
      }
    },()=>{}));
  }catch(error){console.warn('No se pudo vigilar el perfil activo',error&&error.message);}

  const catchUp=()=>{
    if(document.hidden||closed)return;
    for(const name of ['reports','actions','plans','notices','profiles','sessions'])emit(name);
  };
  window.addEventListener('online',catchUp);
  document.addEventListener('visibilitychange',catchUp);
  window.addEventListener('focus',catchUp);

  return ()=>{
    closed=true;
    for(const timer of timers.values())clearTimeout(timer);
    timers.clear();
    for(const stop of unsubscribers)try{stop();}catch{}
    window.removeEventListener('online',catchUp);
    document.removeEventListener('visibilitychange',catchUp);
    window.removeEventListener('focus',catchUp);
  };
}
