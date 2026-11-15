(()=>{
  const root=document.documentElement;let theme;try{theme=localStorage.getItem('sm-theme')}catch{}if(!['light','dark'].includes(theme))theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';root.dataset.theme=theme;
  function themeButtons(){document.querySelectorAll('[data-theme-toggle]').forEach(b=>{b.textContent=root.dataset.theme==='dark'?'☀ Día':'☾ Noche';b.setAttribute('aria-label',root.dataset.theme==='dark'?'Activar modo día':'Activar modo noche');b.setAttribute('aria-pressed',String(root.dataset.theme==='dark'))})}
  document.addEventListener('click',e=>{if(e.target.closest('[data-theme-toggle]')){root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('sm-theme',root.dataset.theme)}catch{}themeButtons()}});themeButtons();
  const by=id=>document.getElementById(id);
  function authState(title,message,signed=false){by('appRoot').hidden=true;by('accessScreen').hidden=false;by('accessTitle').textContent=title;by('accessMessage').textContent=message;by('signInButton').hidden=signed;by('switchAccount').hidden=!signed;}
  function script(src){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.async=false;el.onload=resolve;el.onerror=()=>reject(Error('No se pudo cargar la aplicación. Recarga la página.'));document.body.append(el})}
  async function start(){try{
    const response=await fetch('/api/me',{cache:'no-store'}),data=await response.json();
    if(!response.ok){
      // Si no hay credenciales de ChatGPT, ofrecer login con contraseña
      if(response.status===401||response.status===403){
        authState('Sierra Madre · Acceso', data.error||'Se requiere iniciar sesión', true);
        // Agregar formulario de login con contraseña si no existe
        const existingForm = document.querySelector('.password-login');
        if(!existingForm){
          const formHTML = `
            <div class="password-login" style="margin-top:20px;padding:20px;border:1px solid var(--line);border-radius:8px;background:var(--surface);max-width:300px">
              <h3 style="margin-top:0;color:var(--ink)">Iniciar sesión con contraseña</h3>
              <input type="email" id="passwordEmail" placeholder="Correo electrónico" required style="width:100%;padding:10px;margin:8px 0;border:1px solid var(--line);border-radius:4px">
              <input type="password" id="passwordPass" placeholder="Contraseña" required style="width:100%;padding:10px;margin:8px 0;border:1px solid var(--line);border-radius:4px">
              <button class="primary" style="width:100%;padding:10px;margin-top:10px" id="loginWithPassword">Entrar con contraseña</button>
              <p class="muted" style="font-size:10px;margin-top:10px">¿No tienes una cuenta? <a href="/register" style="color:var(--gold)">Regístrate aquí</a></p>
            </div>
          `;
          by('accessScreen').insertAdjacentHTML('beforeend', formHTML);
          document.getElementById('loginWithPassword').onclick = async e=>{
            e.preventDefault();
            const email = document.getElementById('passwordEmail').value.trim();
            const pass = document.getElementById('passwordPass').value.trim();
            if(!email||!pass)return toast('Ingresa ambos campos');
            try{
              const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});
              const d=await r.json();
              if(r.ok){globalThis.AUTH=d.user;globalThis.smStorageKey=k=>k+'-'+d.user.id;document.body.dataset.role=d.user.role;by('accessScreen').hidden=true;by('appRoot').hidden=false;themeButtons();await loadNotices()}catch(err){toast(err.message)}
            }catch(err){toast('Error al iniciar sesión')}
          };
        }
        return;
      }
      authState('Acceso no disponible','Tu sesión cambió o la cuenta fue desactivada. Vuelve a iniciar sesión o consulta al administrador.',true);return
    }
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