import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {JSDOM,VirtualConsole} from './.qa/node_modules/jsdom/lib/api.js';

const errors=[],virtualConsole=new VirtualConsole();
virtualConsole.on('jsdomError',e=>{if(!e.message.includes('Could not parse CSS'))errors.push(e.message)});
const html=fs.readFileSync('index.html','utf8');
const source=fs.readFileSync('firebase-auth.js','utf8').replace(/^import .*;\r?\n/gm,'');
const scripts=['formats.js','departments.js','extended-formats.js','progress-core.js','supervisor.js','workspace.js','accounts-ui.js','departments-ui.js'].map(file=>fs.readFileSync(file,'utf8')).join('\n;\n');
const users=[
  {id:'owner',name:'Administrador QA',email:'owner@example.test',role:'admin',active:true,isOwner:true,revision:0,permissions:{}},
  {id:'ana',name:'Usuario Ana',email:'ana@example.test',role:'member',active:true,isOwner:false,revision:0,permissions:{}}
];
const seed=()=>({reports:[],actions:[],plans:[],notices:[],reads:{},users:users.map(u=>({...u}))});

async function makeWindow({userId='owner',workspace=seed(),theme=null,allowAuth=true}={}){
  const dom=new JSDOM(html,{url:'https://qa.local/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
  const w=dom.window;
  let authCallback=null;
  w.structuredClone=structuredClone;w.Response=Response;w.Request=Request;w.Headers=Headers;
  w.crypto.randomUUID=crypto.randomUUID;w.matchMedia=()=>({matches:false});w.confirm=()=>true;w.alert=()=>{};
  w.setInterval=()=>0;
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
  w.fetch=async()=>new Response('',{headers:{'Content-Type':'text/plain'}});
  w.initializeApp=()=>({});w.getAuth=()=>({});
  w.setPersistence=()=>Promise.resolve();w.browserLocalPersistence={};
  w.signInWithEmailAndPassword=async()=>{throw Error('Firebase no disponible en la prueba')};
  w.createUserWithEmailAndPassword=async()=>{throw Error('Firebase no disponible en la prueba')};
  w.signOut=async()=>{};w.updateProfile=async()=>{};w.sendEmailVerification=async()=>{};
  w.sendPasswordResetEmail=async()=>{};w.updatePassword=async()=>{};
  w.onAuthStateChanged=(_auth,cb)=>{authCallback=cb};
  w.localStorage.setItem('sm-workspace-v1',JSON.stringify(workspace));
  if(allowAuth&&workspace.users.some(u=>u.id===userId))w.localStorage.setItem('sm-local-session',userId);
  if(theme)w.localStorage.setItem('sm-theme',theme);
  const me=workspace.users.find(u=>u.id===userId);
  w.AUTH={user:me?{...me,permissions:{}}:{id:'anon',name:'Anónimo',role:'member',permissions:{}}};
  w.ACCOUNT_USERS=workspace.users.filter(u=>u.active!==false).map(u=>({...u,permissions:{}}));
  w.ACCOUNT_DIRECTORY=workspace.users.filter(u=>u.active!==false).map(u=>({id:u.id,name:u.name,unit:u.unit||'',departmentId:u.departmentId||'',role:u.role}));
  w.SM_CLOUD={};w.SM_SCOPE_ACCOUNT='';w.smStorageKey=k=>k;
  w.eval(scripts);
  w.eval(source);
  w.loadAppScripts=async()=>{};
  if(allowAuth&&authCallback)await authCallback(null);
  if(!w.document.getElementById('appRoot').hidden){
    await w.init();
    w.dispatchEvent(new w.CustomEvent('sm:live',{detail:{collection:'notices'}}));
    w.dispatchEvent(new w.CustomEvent('sm:live',{detail:{collection:'profiles'}}));
  }
  return {dom,w,by:id=>w.document.getElementById(id),workspace:()=>JSON.parse(w.localStorage.getItem('sm-workspace-v1'))};
}

const until=async condition=>{for(let i=0;i<700;i++){if(condition())return;await new Promise(r=>setTimeout(r,10))}throw Error('UI timeout: '+errors.join('; '))};
const fill=(w,f,k,v)=>{f.elements[k].value=v;f.elements[k].dispatchEvent(new w.Event('input',{bubbles:true}))};

let owner=await makeWindow();let w=owner.w,by=owner.by;
await until(()=>!by('appRoot').hidden&&by('usersTable').textContent.includes('owner@example.test'));
assert.equal(by('accessScreen').hidden,true);
assert.equal(w.document.documentElement.dataset.theme,'light');
w.document.querySelector('[data-theme-toggle]').click();
assert.equal(w.document.documentElement.dataset.theme,'dark');
assert.equal(w.localStorage.getItem('sm-theme'),'dark');
w.document.querySelector('[data-theme-toggle]').click();
assert.equal(w.document.documentElement.dataset.theme,'light');

w.document.querySelector('[data-view="users"]').click();
assert.equal(by('users').hidden,false);
by('addUser').click();
let f=by('userForm');
fill(w,f,'name','Usuario Ana 2');fill(w,f,'email','ana2@example.test');fill(w,f,'unit','Unidad Norte');if(f.elements.password)fill(w,f,'password','ClaveSegura123!');
f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
await until(()=>!by('userEditor').open&&owner.workspace().users.some(u=>u.email==='ana2@example.test'));
assert(by('usersTable').textContent.includes('ana2@example.test'));

let member=await makeWindow({userId:'ana',workspace:owner.workspace(),theme:'dark'});
let m=member.w;
await until(()=>!member.by('appRoot').hidden);
assert.equal(m.document.documentElement.dataset.theme,'dark');
assert.equal(m.document.body.dataset.role,'member');
assert.equal(member.by('users').hidden,true);
assert.equal(member.by('profileName').textContent,'Usuario Ana');
m.document.querySelector('#newReport').click();
m.document.querySelector('[data-template="leadership"]').click();
const rf=member.by('reportForm');
assert.equal(rf.elements.supervisor.value,'Usuario Ana');
assert.equal(rf.elements.supervisor.readOnly,true);
fill(m,rf,'department','Seguridad');fill(m,rf,'place','Taller');
member.by('saveDraft').click();
await until(()=>member.by('saveState').textContent.includes('Guardado en la nube'));
assert(member.by('recent').textContent.includes('Usuario Ana'));
assert.equal(m.localStorage.getItem('sm-theme'),'dark');
assert(member.workspace().reports.some(r=>r.supervisor==='Usuario Ana'&&r.place==='Taller'));

owner=await makeWindow({workspace:member.workspace()});w=owner.w;by=owner.by;
await until(()=>!by('appRoot').hidden&&by('recent').textContent.includes('Usuario Ana'));
w.document.querySelector('[data-observe-report]').click();
assert.equal(by('noticeForm').elements.type.value,'Observación');
const ana=member.workspace().users.find(u=>u.email==='ana@example.test');
assert.equal(by('noticeForm').elements.recipient.value,ana.id);
fill(w,by('noticeForm'),'text','Completa los detalles de la interacción.');
by('noticeForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
await until(()=>!by('noticeEditor').open&&owner.workspace().notices.length===1);

member=await makeWindow({userId:'ana',workspace:owner.workspace()});m=member.w;
await until(()=>!member.by('appRoot').hidden&&member.by('bellBadge').textContent==='1');
assert(member.by('noticeList').textContent.includes('Completa los detalles'));
m.document.querySelector('[data-read-notice]').click();
await until(()=>member.by('bellBadge').textContent==='0');
m.document.querySelector('[data-open-reference]').click();
assert(member.by('editor').open);
await until(()=>member.by('editor').textContent.includes('Observaciones de seguridad'));
assert(member.by('editor').textContent.includes('Completa los detalles'));

const unauthorized=await makeWindow({workspace:{...seed(),users:[]}});
await until(()=>unauthorized.w.document.querySelector('.access-card').textContent.includes('Ingresa con tu correo y contraseña'));
assert.equal(unauthorized.by('appRoot').hidden,true);
assert(unauthorized.by('loginForm'),'La portada debe ofrecer inicio de sesión a cuentas autorizadas');
assert.deepEqual(errors,[]);
owner.dom.window.close();member.dom.window.close();unauthorized.dom.window.close();
console.log('OK: arranque real de scripts, autenticación local, portada sin acceso, tema día/noche persistente, alta de usuario, interfaz por rol, captura propia, aislamiento de espacio, observaciones vinculadas, notificaciones, lectura y apertura del registro.');
