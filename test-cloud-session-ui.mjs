import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from './.qa/node_modules/jsdom/lib/api.js';

const source=fs.readFileSync('cloud-sessions.js','utf8')
  .replace(/^import .*firebase-firestore.js';/m,'const {doc,collection,setDoc,updateDoc,serverTimestamp,getDocs}=globalThis.sessionTestAdapter;')
  .replace("'./session-clock.js'","'../session-clock.js'");
fs.writeFileSync('.qa/cloud-session-under-test.mjs',source);
const dom=new JSDOM('<header><div class="header-tools"><button id="noticeBell"></button><a class="sign-out"></a></div></header>',{url:'https://test.local',pretendToBeVisual:true});
globalThis.window=dom.window;globalThis.document=dom.window.document;
let resolveCreate,updates=[],failUpdate=false;
globalThis.sessionTestAdapter={
 doc:()=>({id:'session-test'}),collection:()=>({}),serverTimestamp:()=>new Date(),
 setDoc:()=>new Promise(resolve=>{resolveCreate=resolve;}),
 updateDoc:async(ref,data)=>{if(failUpdate)throw Error('offline');updates.push(data);},getDocs:async()=>({docs:[]})
};
const {startCloudSession}=await import('./.qa/cloud-session-under-test.mjs');
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
dom.window.close();delete globalThis.sessionTestAdapter;
console.log('Sesiones UI: supervisor, inicio sin conexión, cierre durante sincronización y limpieza ante error: OK');
