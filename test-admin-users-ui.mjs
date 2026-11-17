import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from './.qa/node_modules/jsdom/lib/api.js';

function build(isPrincipal){
  const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://qa.local/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  const users=[
    {id:'principal',name:'Encargado QA',email:'principal@example.test',role:'admin',active:true,isOwner:true,revision:0},
    {id:'secondary',name:'Administrador QA',email:'secondary@example.test',role:'admin',active:true,isOwner:false,revision:0},
    {id:'operator',name:'Operador QA',email:'operator@example.test',role:'operator',active:true,isOwner:false,revision:0}
  ];
  w.esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  w.toast=()=>{};w.navigate=()=>{};w.confirm=()=>true;w.Response=Response;
  w.setInterval=()=>0;
  w.AUTH={user:{id:isPrincipal?'principal':'secondary',name:isPrincipal?'Encargado QA':'Administrador QA',email:isPrincipal?'principal@example.test':'secondary@example.test',role:'admin',isPrincipal,permissions:{}}};
  w.ACCOUNT_USERS=users;
  w.ACCOUNT_DIRECTORY=users.filter(u=>u.active).map(u=>({id:u.id,name:u.name,unit:u.unit||'',role:u.role}));
  w.SM_CLOUD={};w.SM_SCOPE_ACCOUNT='';w.smStorageKey=k=>k;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.fetch=async url=>{
    const path=String(url);
    const data=path.includes('/api/users')?users:path.includes('/api/directory')?w.ACCOUNT_DIRECTORY:[];
    return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
  };
  w.eval(fs.readFileSync('accounts-ui.js','utf8'));
  return {dom,w,by:id=>w.document.getElementById(id)};
}

const principal=build(true);
assert(principal.by('adminTools'),'El panel de herramientas debe existir');
assert.equal(principal.by('adminTools').hidden,false,'El panel debe mostrarse a administradores');
assert(principal.by('usersTable').textContent.includes('Editar'));
assert(principal.by('usersTable').textContent.includes('Eliminar'));
assert(principal.by('usersTable').textContent.includes('Encargado principal'));
principal.by('addUser').click();
assert.equal(principal.by('userForm').elements.role.querySelector('option[value="admin"]').disabled,false);
principal.dom.window.close();

const secondary=build(false);
assert.equal(secondary.by('adminTools').hidden,false);
secondary.by('addUser').click();
assert.equal(secondary.by('userForm').elements.role.querySelector('option[value="admin"]').disabled,true,'Solo el encargado principal puede asignar administradores');
assert.equal(secondary.by('usersTable').querySelectorAll('[data-edit-user]').length,2,'Los administradores secundarios deben ver acciones de usuario');
secondary.dom.window.close();

console.log('Usuarios UI: panel visible, acciones visibles y rol administrador restringido al encargado principal: OK');
