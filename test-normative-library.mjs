import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from './.qa/node_modules/jsdom/lib/api.js';
import {installNormativeLibrary} from './normative-library.js';
const dom=new JSDOM('<aside id="sidebar"><nav><button data-view="dashboard">Inicio</button></nav></aside><main><h1 id="pageTitle"></h1><p id="pageSubtitle"></p><span id="crumb"></span><section id="dashboard"></section><section id="reports" hidden></section></main><dialog id="editor"><form><div class="editor-scroll"></div></form></dialog>',{url:'https://qa.invalid'});
const {window:w}=dom;
globalThis.MutationObserver=w.MutationObserver;globalThis.Event=w.Event;
const catalog=JSON.parse(fs.readFileSync('normative-catalog.json','utf8'));
try{
 await installNormativeLibrary({catalog,document:w.document});
 w.document.querySelector('[data-normative-view]').click();
 assert(!w.document.getElementById('normativeLibrary').hidden);
 const search=w.document.getElementById('nomQuery');search.value='soldadura';search.dispatchEvent(new w.Event('input'));
 assert(w.document.getElementById('nomResults').textContent.includes('NOM-027'));
 w.document.querySelector('[data-view]').click();assert(w.document.getElementById('normativeLibrary').hidden);
 globalThis.SM_ACTIVE={id:'qa-record',status:'Borrador'};
 const editor=w.document.getElementById('editor');editor.setAttribute('open','');await new Promise(r=>setTimeout(r,0));
 const host=w.document.getElementById('normativeSelector');assert(host);
 host.querySelector('[data-nom-add]').click();assert(host.querySelector('[data-nom-error]').textContent.includes('Confirma'));
 host.querySelector('[data-nom-confirm]').checked=true;host.querySelector('[data-nom-note]').value='Referencia temática que requiere evaluación del sitio.';
 host.querySelector('[data-nom-add]').click();assert.equal(SM_ACTIVE.normativeReferences.length,1);assert.equal(SM_ACTIVE.normativeReferences[0].verifiedAt,null);
 host.querySelector('[data-nom-add]').click();assert.equal(SM_ACTIVE.normativeReferences.length,1);assert(host.querySelector('[data-nom-error]').textContent.includes('ya está'));
 host.querySelector('[data-nom-remove]').click();assert.equal(SM_ACTIVE.normativeReferences.length,0);
 const query=host.querySelector('[data-nom-search]');query.value='zzzzzz-no-results';query.dispatchEvent(new w.Event('input'));assert(!host.querySelector('[data-nom-source]').hasAttribute('href'));assert.equal(host.querySelector('[data-nom-section]').options.length,1);
 editor.removeAttribute('open');SM_ACTIVE.status='Finalizado';editor.setAttribute('open','');await new Promise(r=>setTimeout(r,0));
 assert(w.document.querySelector('[data-nom-add]').disabled);
 console.log('Biblioteca y selector: búsqueda, navegación, confirmación, versiones, duplicados, retiro y bloqueo de finalizados: OK');
}finally{dom.window.close();delete globalThis.MutationObserver;delete globalThis.SM_ACTIVE;}
