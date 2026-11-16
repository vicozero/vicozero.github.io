import {doc,collection,setDoc,updateDoc,serverTimestamp,getDocs,query,where} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import {createSessionClock} from './session-clock.js';
export async function startCloudSession(db,me){
 if(!['member','operator'].includes(me.role))return async()=>{};
 const ref=doc(collection(db,'sessions'));
 await setDoc(ref,{userId:me.id,startedAt:serverTimestamp(),updatedAt:serverTimestamp(),activeMs:0,closed:false});
 const clock=createSessionClock(),label=document.createElement('span');
 label.className='sync';label.title='Tiempo activo. Pausa tras 5 minutos sin actividad.';document.querySelector('.header-tools').prepend(label);
 let stopped=false,pending=Promise.resolve();
 function paint(){const ms=clock.snapshot().activeMs;label.textContent='Sesión: '+Math.floor(ms/3600000)+'h '+Math.floor(ms/60000)%60+'m';}
 function touch(){if(!stopped){clock.activity();paint();}}
 for(const event of ['pointerdown','keydown','touchstart'])document.addEventListener(event,touch,{passive:true});
 function save(closed=false){
   const state=closed?clock.close():clock.snapshot();
   pending=pending.catch(()=>{}).then(()=>updateDoc(ref,{activeMs:Math.floor(state.activeMs),updatedAt:serverTimestamp(),closed}));
   return pending;
 }
 const timer=setInterval(()=>{paint();save().catch(()=>{label.textContent='Sesión pendiente de sincronizar';});},30000);
 paint();
 return async()=>{if(stopped)return;await save(true);stopped=true;clearInterval(timer);for(const event of ['pointerdown','keydown','touchstart'])document.removeEventListener(event,touch);};
}
export function installSessionReport(db,me){
 if(me.role!=='admin')return;
 const button=document.createElement('button');button.className='theme-button';button.textContent='Sesiones';
 document.querySelector('.header-tools').prepend(button);
 const transfer=document.createElement('button');transfer.className='theme-button';transfer.textContent='Cambiar encargado';
 document.querySelector('.header-tools').append(transfer);
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
 button.onclick=async()=>{
  button.disabled=true;
  try{
   const rows=(await getDocs(collection(db,'sessions'))).docs.map(d=>({...d.data(),id:d.id}));
   const profiles=(await getDocs(collection(db,'profiles'))).docs.map(d=>({...d.data(),id:d.id}));
   const dialog=document.createElement('dialog');dialog.style.maxWidth='900px';
   const title=document.createElement('h2');title.textContent='Sesiones del equipo';dialog.append(title);
   const note=document.createElement('p');note.textContent='Tiempo activo: pausa tras 5 minutos sin actividad. Una sesión sin cierre puede corresponder a un navegador cerrado.';dialog.append(note);
   const table=document.createElement('table');table.className='work-table';
   const head=document.createElement('tr');for(const name of ['Usuario','Inicio','Tiempo activo','Estado']){const cell=document.createElement('th');cell.textContent=name;head.append(cell);}table.append(head);
   for(const row of rows.sort((a,b)=>(b.startedAt?.seconds||0)-(a.startedAt?.seconds||0))){
    const tr=document.createElement('tr');
    for(const value of [profiles.find(p=>p.id===row.userId)?.name||row.userId,row.startedAt?.toDate().toLocaleString('es-MX')||'Pendiente',Math.floor(row.activeMs/60000)+' min',row.closed?'Cerrada':'Sin cierre registrado']){const td=document.createElement('td');td.textContent=value;tr.append(td);}table.append(tr);
   }
   dialog.append(table);const close=document.createElement('button');close.textContent='Cerrar';close.className='secondary';close.onclick=()=>{dialog.close();dialog.remove();};dialog.append(close);document.body.append(dialog);dialog.showModal();
  }catch(error){alert('No se pudieron cargar las sesiones: '+error.message);}finally{button.disabled=false;}
 };
}

