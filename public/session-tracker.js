(function(){
  const KEY='sm-session-history-v1',TAB='sm-current-session-v1';
  let current=null,last=Date.now(),activity=last,timer=null;
  function rows(){const raw=localStorage.getItem(KEY);if(!raw)return [];const value=JSON.parse(raw);if(!Array.isArray(value))throw Error('Historial de sesiones inválido');return value;}
  function save(){const all=rows(),i=all.findIndex(r=>r.id===current.id);if(i<0)all.push(current);else all[i]=current;localStorage.setItem(KEY,JSON.stringify(all));}
  function tick(){if(!current||current.closedAt)return;const now=Date.now();current.activeMs+=Math.max(0,Math.min(now,activity+300000)-last);last=now;current.lastSeenAt=new Date(now).toISOString();save();render();}
  function render(){const el=document.getElementById('sessionClock');if(el&&current)el.textContent='Sesión activa: '+Math.floor(current.activeMs/3600000)+'h '+Math.floor(current.activeMs/60000)%60+'m';}
  function end(){if(!current||current.closedAt)return;tick();current.closedAt=new Date().toISOString();current.endReason='logout';save();sessionStorage.removeItem(TAB);clearInterval(timer);}
  globalThis.SM_SESSION_TRACKER={
    start(user){if(!['member','operator'].includes(user.role))return;const sid=sessionStorage.getItem(TAB);current=rows().find(r=>r.id===sid&&r.userId===user.id&&!r.closedAt);if(!current)current={id:crypto.randomUUID(),userId:user.id,name:user.name,role:user.role,startedAt:new Date().toISOString(),activeMs:0,storage:'browser-local'};last=activity=Date.now();sessionStorage.setItem(TAB,current.id);save();const el=document.createElement('span');el.id='sessionClock';el.className='sync';el.title='Tiempo activo en este navegador. Pausa tras 5 minutos sin actividad.';document.querySelector('.header-tools')?.prepend(el);for(const type of ['pointerdown','keydown','touchstart'])document.addEventListener(type,()=>{tick();activity=Date.now();},{passive:true});timer=setInterval(()=>{try{tick();}catch(e){clearInterval(timer);console.error('No se pudo guardar la sesión',e);}},15000);window.addEventListener('pagehide',tick);document.querySelector('.sign-out')?.addEventListener('click',end,{capture:true});render();},
    export(){const all=rows();const url=URL.createObjectURL(new Blob([JSON.stringify({format:'sierra-madre-sessions',version:1,storage:'browser-local',sessions:all},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='Sierra-Madre-sesiones-locales.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  };
})();
