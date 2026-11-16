import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Explicit initialization only. Loading this module never migrates browser data.
export async function initializeAuthority(app,user) {
  if(!user)throw Error('Inicia sesión para comprobar el almacenamiento central.');
  const db=getFirestore(app),reference=doc(db,'security','authority');
  const existing=await getDoc(reference);
  if(!existing.exists()) {
    await setDoc(reference,{administratorUid:user.uid,updatedAt:serverTimestamp()});
  }
  const verified=await getDoc(reference);
  if(!verified.exists()||verified.data().administratorUid!==user.uid)throw Error('Esta cuenta no tiene la administración central.');
  const profileRef=doc(db,'profiles',user.uid),profile=await getDoc(profileRef);
  if(!profile.exists())await setDoc(profileRef,{id:user.uid,name:user.displayName||'Administrador',email:user.email||'',unit:'Sierra Madre',role:'admin',active:true,created:new Date().toISOString(),updated:new Date().toISOString()});
  return {db,administratorUid:verified.data().administratorUid};
}
