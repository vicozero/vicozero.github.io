(()=>{
 const root=document.documentElement;let theme;try{theme=localStorage.getItem('sm-theme')}catch{}if(!['light','dark'].includes(theme))theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';root.dataset.theme=theme;
 function themeButtons(){document.querySelectorAll('[data-theme-toggle]').forEach(b=>{b.textContent=root.dataset.theme==='dark'?'☀ Día':'☾ Noche';b.setAttribute('aria-label',root.dataset.theme==='dark'?'Activar modo día':'Activar modo noche');b.setAttribute('aria-pressed',String(root.dataset.theme==='dark'))})}
 document.addEventListener('click',e=>{if(e.target.closest('[data-theme-toggle]')){root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('sm-theme',root.dataset.theme)}catch{}themeButtons()}});themeButtons();
 const by=id=>document.getElementById(id);function authState(title,message,signed=false){by('appRoot').hidden=true;by('accessScreen').hidden=false;by('accessTitle').textContent=title;by('accessMessage').textContent=message;by('signInButton').hidden=signed;by('switchAccount').hidden=!signed;}
 function script(src){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.async=false;el.onload=resolve;el.onerror=()=>reject(Error('No se pudo cargar la aplicación. Recarga la página.'));document.body.append(el)})}
 async function start(){try{
  const response=await fetch('/api/me',{cache:'no-store'}),data=await response.json();
  if(!response.ok){authState(response.status===401?'Tu seguridad, en un solo lugar.':'Tu cuenta necesita autorización',data.error,response.status!==401);return}
  globalThis.AUTH=data;globalThis.smStorageKey=key=>key+'-'+data.user.id;
  const [directory,users]=await Promise.all([fetch('/api/directory',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('No se pudo cargar el directorio.');return r.json()}),data.user.role==='admin'?fetch('/api/users',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('No se pudo cargar la administración.');return r.json()}):Promise.resolve([])]);
  globalThis.ACCOUNT_DIRECTORY=directory;globalThis.ACCOUNT_USERS=users;globalThis.SM_SCOPE_ACCOUNT=data.user.role==='admin'?'':data.user.id;
  document.body.dataset.role=data.user.role;
  for(const src of ['/assets/pdf-lib.min.js','/formats.js','/extended-formats.js','/progress-core.js','/supervisor.js','/workspace-pdf.js','/report-pdf.js','/workspace.js','/accounts-ui.js'])await script(src);
  by('accessScreen').hidden=true;by('appRoot').hidden=false;themeButtons();
  setInterval(async()=>{if(document.hidden)return;try{const check=await fetch('/api/me',{cache:'no-store'});if(check.status===401||check.status===403){authState('Acceso no disponible','Tu sesión cambió o la cuenta fue desactivada. Vuelve a iniciar sesión o consulta al administrador.',true);document.body.dataset.role='';}}catch{}},60000);
 }catch(e){authState('No se pudo abrir el panel',e.message||'Revisa tu conexión y vuelve a intentarlo.',true)}}
 by('retryAccess').onclick=start;start();
})();
