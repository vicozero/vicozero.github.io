import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from './.qa/node_modules/jsdom/lib/api.js';

const source=fs.readFileSync('cloud-sessions.js','utf8')
  .replace(/^import .*firebase-firestore.js';/m,'const {doc,collection,setDoc,updateDoc,serverTimestamp,getDocs,getDoc,runTransaction}=globalThis.sessionTestAdapter;')
  .replace("'./session-clock.js'","'../session-clock.js'");
fs.writeFileSync('.qa/cloud-session-under-test.mjs',source);
const dom=new JSDOM('<header><div class="header-tools"><button id="noticeBell"></button><a class="sign-out"></a></div></header><section id="users"><div class="admin-tools" id="adminTools"><div class="admin-tools-actions" id="adminToolsActions"></div></div></section>',{url:'https://test.local',pretendToBeVisual:true});
globalThis.window=dom.window;globalThis.document=dom.window.document;
let resolveCreate,updates=[],failUpdate=false,transactionSets=[],transactionUpdates=[];
const profileSnapshot={exists:()=>true,data:()=>({revision:0})};
globalThis.sessionTestAdapter={
  doc:()=>({id:'session-test'}),collection:()=>({}),serverTimestamp:()=>new Date(),
  setDoc:()=>new Promise(resolve=>{resolveCreate=resolve;}),
  updateDoc:async(ref,data)=>{if(failUpdate)throw Error('offline');updates.push(data);},
  getDocs:async()=>({docs:[{id:'target',data:()=>({active:true,email:'target@example.test',name:'Target QA',revision:0})}]}),
  getDoc:async()=>profileSnapshot,
  runTransaction:async(_db,fn)=>fn({get:async()=>profileSnapshot,update:(_ref,data)=>transactionUpdates.push(data),set:(_ref,data)=>transactionSets.push(data)})
};
const {startCloudSession,installSessionReport,transferAdministration}=await import('./.qa/cloud-session-under-test.mjs');
let close=await Promise.race([startCloudSession({}, {id:'supervisor',role:'supervisor'}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Offline presence blocked opening the app')),250))]);
assert(document.querySelector('.session-timer'),'Supervisor should have a session clock');
await close();assert(!document.querySelector('.session-timer'));
resolveCreate();await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(updates.at(-1)?.closed,true,'A create that resolves after logout must close its presence record');
globalThis.sessionTestAdapter.setDoc=async()=>{};
// The imported module captures adapter functions, so reuse its original delayed creation.
close=await startCloudSession({}, {id:'operator',role:'operator'});
resolveCreate();await new Promise(resolve=>setTimeout(resolve,0));
failUpdate=true;await assert.rejects(close,/offline/);assert(!document.querySelector('.session-timer'));

const cleanupPrincipal=installSessionReport({}, {id:'principal',role:'admin',isPrincipal:true});
assert(document.getElementById('adminSessionsButton'),'Principal should see the sessions tool');
assert(document.getElementById('transferAuthorityButton'),'Principal should see the transfer tool');
assert(document.getElementById('adminSessionsButton').closest('#adminTools'),'Tools should be mounted inside the Users panel');
assert.equal(document.getElementById('adminSessionsButton').className,'secondary');

let reloaded=false;
const transferred=await transferAdministration({}, {id:'principal',role:'admin',isPrincipal:true},'target@example.test',{
  prompt:()=>'target@example.test',
  confirm:()=>true,
  alert:message=>{throw Error('Unexpected transfer alert: '+message);},
  reload:()=>{reloaded=true;}
});
assert.equal(transferred,true);
assert.equal(reloaded,true,'A successful transfer should reload the portal');
assert.deepEqual(transactionUpdates,[{administratorUid:'target',updatedAt:globalThis.sessionTestAdapter.serverTimestamp()}]);
assert.equal(transactionSets.length,2,'Both profiles should be written transactionally');
for(const profile of ['target','principal']){
  const record=transactionSets.find(entry=>entry.id===profile);
  assert(record,'Missing profile write for '+profile);
  assert.equal(record.role,'admin');
  assert.equal(record.active,true);
  assert.equal(record.revision,1);
}
cleanupPrincipal();
assert(!document.getElementById('adminSessionsButton'));
assert(!document.querySelector('.session-dialog'));

const cleanupSecondary=installSessionReport({}, {id:'secondary',role:'admin',isPrincipal:false});
assert(document.getElementById('adminSessionsButton'),'Secondary admin should see the sessions tool');
assert(!document.getElementById('transferAuthorityButton'),'Secondary admin must not see the transfer tool');
cleanupSecondary();

dom.window.close();delete globalThis.sessionTestAdapter;
console.log('Sesiones UI: supervisor, inicio sin conexión, cierre durante sincronización, transferencia transaccional, limpieza y panel por rol: OK');
