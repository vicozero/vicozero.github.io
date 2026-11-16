import {getFirestore,doc,runTransaction,getDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
export async function archiveWorkspace(app,data){
 const db=getFirestore(app),raw=JSON.stringify(data);
 const bytes=new TextEncoder().encode(raw);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const id=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
 // Small UTF-16 chunks keep each Firestore document below its size limit.
 const chunks=[];for(let n=0;n<raw.length;n+=120000)chunks.push(raw.slice(n,n+120000));
 const manifest=doc(db,'migrationBackups',id);
 for(let i=0;i<chunks.length;i++){
   const ref=doc(db,'migrationBackups',id,'chunks',String(i));
   await runTransaction(db,async tx=>{const old=await tx.get(ref);if(old.exists()){if(old.data().text!==chunks[i])throw Error('Conflicto de respaldo');}else tx.set(ref,{text:chunks[i]});});
 }
 let recovered='';for(let i=0;i<chunks.length;i++)recovered+=(await getDoc(doc(db,'migrationBackups',id,'chunks',String(i)))).data().text;
 if(recovered!==raw)throw Error('El respaldo no coincide. Se detuvo la migración.');
 await runTransaction(db,async tx=>{const old=await tx.get(manifest);if(!old.exists())tx.set(manifest,{sha256:id,chunks:chunks.length,verifiedAt:serverTimestamp(),status:'verified-archive'});});
 return {sha256:id,chunks:chunks.length};
}

