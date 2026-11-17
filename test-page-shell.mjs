import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {JSDOM,VirtualConsole} from './.qa/node_modules/jsdom/lib/api.js';
import {searchStandards,officialSource} from './regulatory-core.js';
const html=fs.readFileSync('index.html','utf8');
const shell=vm.runInNewContext(fs.readFileSync('sw.js','utf8').match(/const APP_SHELL = (\[[\s\S]*?\]);/)[1]);
for(const resource of shell)assert(fs.existsSync(resource==='/'?'index.html':'.'+resource),'Falta recurso precargado '+resource);
const errors=[],virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{url:'https://qa.invalid/',runScripts:'outside-only',virtualConsole,pretendToBeVisual:true}),w=dom.window;
Object.defineProperty(w,'innerWidth',{value:390,writable:true});
w.localStorage.setItem('sm-sidebar-collapsed','1');
let legacyClicks=0;w.document.getElementById('menuToggle').onclick=()=>{legacyClicks++;w.document.body.classList.toggle('nav-open');};
w.eval(fs.readFileSync('phase3-ui.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
const menu=w.document.getElementById('menuToggle'),body=w.document.body;
menu.click();assert(body.classList.contains('nav-open'));assert.equal(menu.getAttribute('aria-expanded'),'true');assert.equal(legacyClicks,0);
menu.click();assert(!body.classList.contains('nav-open'));
menu.click();w.document.querySelector('.mobile-backdrop').click();assert(!body.classList.contains('nav-open'));assert.equal(menu.getAttribute('aria-expanded'),'false');
const added=w.document.createElement('button');added.dataset.trainingSuiteView='talks';added.textContent='Pláticas';w.document.querySelector('#sidebar nav').append(added);
menu.click();added.click();assert(!body.classList.contains('nav-open'));
menu.click();w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert(!body.classList.contains('nav-open'));
w.innerWidth=1400;menu.click();assert(!body.classList.contains('sidebar-collapsed'));menu.click();assert(body.classList.contains('sidebar-collapsed'));assert.equal(w.localStorage.getItem('sm-sidebar-collapsed'),'1');
w.eval(fs.readFileSync('integration.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
w.AUTH={user:{role:'admin'}};w.SM_ACTIVE={id:'first'};
const editor=w.document.getElementById('editor');editor.setAttribute('open','');await new Promise(r=>setTimeout(r,0));
let received;w.addEventListener('sm:action-from-report',e=>received=e.detail);
w.document.querySelector('[data-action-from-report]').click();assert.equal(received.id,'first');
editor.removeAttribute('open');await new Promise(r=>setTimeout(r,0));w.SM_ACTIVE={id:'second'};editor.setAttribute('open','');await new Promise(r=>setTimeout(r,0));
assert.equal(w.document.querySelectorAll('[data-action-from-report]').length,1);w.document.querySelector('[data-action-from-report]').click();assert.equal(received.id,'second');
for(const name of ['index.html','biblioteca-nom.html']){
 const page=new JSDOM(fs.readFileSync(name,'utf8'));
 const ids=[...page.window.document.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length,'IDs repetidos en '+name);
 for(const e of page.window.document.querySelectorAll('[src],[href]')){const p=e.getAttribute('src')||e.getAttribute('href');if(p.startsWith('/')&&!p.startsWith('//'))assert(fs.existsSync('.'+p),'Falta recurso '+p);}
 page.window.close();
}
const library=new JSDOM(fs.readFileSync('biblioteca-nom.html','utf8'),{url:'https://qa.invalid/',runScripts:'outside-only'}),l=library.window;
l.searchStandards=searchStandards;l.officialSource=officialSource;l.fetch=async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('normative-catalog.json','utf8'))});
l.eval(fs.readFileSync('library-page.js','utf8').replace(/^import .*;\r?\n/,'').replace('await load();','window.ready=load();'));await l.ready;
assert.equal(l.document.querySelectorAll('[data-id]').length,44);
l.document.querySelector('[data-id="NOM-004-STPS-1999"]').click();assert(l.document.getElementById('nomDetail').textContent.includes('Pendiente de verificar'));
const theme=l.document.getElementById('libraryTheme');theme.click();assert.equal(l.document.documentElement.dataset.theme,'dark');assert.equal(l.localStorage.getItem('sm-theme'),'dark');theme.click();assert.equal(l.document.documentElement.dataset.theme,'light');
const search=l.document.getElementById('nomSearch');search.value='soldadura';search.dispatchEvent(new l.Event('input'));assert(l.document.getElementById('nomList').textContent.includes('NOM-027-STPS'));
assert.deepEqual(errors,[]);dom.window.close();library.window.close();

const handlers={},cache=new Map([['https://qa.invalid/supervisor.js',new Response('old')]]),deleted=[];
let online=true;
const cacheApi={match:async req=>cache.get(typeof req==='string'?req:req.url)?.clone(),put:async(req,res)=>cache.set(req.url,res),addAll:async()=>{}};
vm.runInNewContext(fs.readFileSync('sw.js','utf8'),{self:{location:{origin:'https://qa.invalid'},addEventListener:(n,f)=>handlers[n]=f,skipWaiting(){},clients:{claim(){}}},caches:{open:async()=>cacheApi,keys:async()=>['sm-seguridad-v1','unrelated-app'],delete:async key=>deleted.push(key)},fetch:async()=>{if(!online)throw Error('offline');return new Response('new');},URL,Response});
function request(path){let pending;handlers.fetch({request:new Request('https://qa.invalid'+path),respondWith:p=>pending=p});return pending;}
assert.equal(request('/api/reports'),undefined);assert.equal(request('/private-export.json'),undefined);assert.equal(request('/supervisor.js?token=private'),undefined);
assert.equal(await(await request('/supervisor.js')).text(),'new');online=false;
assert.equal(await(await request('/supervisor.js')).text(),'new');assert.equal((await request('/assets/not-cached.pdf')).status,503);
let activation;handlers.activate({waitUntil:p=>activation=p});await activation;assert.deepEqual(deleted,['sm-seguridad-v1']);
console.log('Interfaz: menú móvil/escritorio, cierre y accesibilidad, acción vigente sin botones duplicados, recursos, biblioteca única, día/noche y caché sin datos privados: OK');
