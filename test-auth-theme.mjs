import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from './.qa/node_modules/jsdom/lib/api.js';

for(const blocked of [false,true]){
 const dom=new JSDOM('<div id="accessScreen"><div class="access-card"></div></div><div id="appRoot" hidden></div><div id="toast"></div><button data-theme-toggle></button>',{url:'https://test.local',runScripts:'outside-only'}),w=dom.window;
 w.initializeApp=()=>({});w.getAuth=()=>({});w.onAuthStateChanged=()=>{};w.setPersistence=()=>Promise.resolve();w.browserLocalPersistence={};
 if(blocked)Object.defineProperty(w,'localStorage',{get(){throw Error('Storage disabled');}});
 else w.localStorage.setItem('sm-theme','invalid-theme');
 const source=fs.readFileSync('firebase-auth.js','utf8').replace(/^import .*;\r?\n/gm,'');
 w.eval(source);
 assert.equal(w.document.documentElement.dataset.theme,'light');
 const button=w.document.querySelector('[data-theme-toggle]');button.click();
 assert.equal(w.document.documentElement.dataset.theme,'dark');assert.equal(button.getAttribute('aria-pressed'),'true');
 button.click();assert.equal(w.document.documentElement.dataset.theme,'light');
 if(!blocked)assert.equal(w.localStorage.getItem('sm-theme'),'light');
 dom.window.close();
}
console.log('Autenticación: botón día/noche cambia una vez y funciona incluso con almacenamiento deshabilitado: OK');
