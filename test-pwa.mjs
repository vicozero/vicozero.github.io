import fs from 'node:fs';
import assert from 'node:assert/strict';

const sw=fs.readFileSync('sw.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('phase3.css','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));

assert.match(sw,/sm-seguridad-v17/);
const shell=sw.slice(sw.indexOf('const APP_SHELL'),sw.indexOf('];',sw.indexOf('const APP_SHELL')));
for(const file of ['advanced-core.js','advanced-pdf.js','advanced-ui.js'])assert(shell.includes(`'/${file}'`),`Falta ${file} en APP_SHELL`);
assert(!shell.includes('/api/'),'/api/ no debe entrar en la caché estática');
assert(sw.includes("url.pathname.startsWith('/api/')"),'El service worker debe ignorar todas las API');
assert(!/addEventListener\(\s*['"]sync['"]/i.test(sw),'No se permite sincronización offline implícita');
assert(/return new Response\('Sin conexión/.test(sw),'Debe existir respuesta explícita sin conexión');
assert(!/caches\.match\(req\)\.then\(response=>response|caches\.match\(request\)\)\?\?response\.text\(\)/.test(sw));

assert(html.includes('<html lang="es">'));
assert(html.includes('name="viewport"'));
assert(html.includes('rel="manifest"'));
assert(html.includes('aria-label="Abrir o cerrar navegación"'));
assert(html.includes('id="toast" role="status"'));

assert((css.match(/@media\s*\(max-width/g)||[]).length>=4,'Deben existir breakpoints móviles/tablet');
assert(css.includes('focus-visible'));
assert(/prefers-reduced-motion/.test(css));

assert.equal(manifest.lang,'es-MX');
assert.equal(manifest.display,'standalone');
assert.equal(manifest.scope,'/');
assert(manifest.icons.some(icon=>icon.purpose==='maskable'));
console.log('PWA y accesibilidad: caché v17 sin API ni sincronización insegura, shell responsive, foco visible y manifiesto válido: OK');
