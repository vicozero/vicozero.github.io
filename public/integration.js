// Open the existing action editor so the user can review responsibilities and dates.
(function(){
  'use strict';
  function install(){
    const editor=document.getElementById('editor');
    if(!editor)return;
    function sync(){
      const footer=editor.querySelector('.editor-footer');
      if(!footer)return;
      let button=footer.querySelector('[data-action-from-report]');
      if(!button){
        button=document.createElement('button');
        button.type='button';button.className='secondary';
        button.dataset.actionFromReport='';
        button.textContent='Generar acción correctiva';
        button.title='Revisar y guardar una acción vinculada a este formato';
        button.addEventListener('click',()=>{
          const record=window.SM_ACTIVE;
          if(!record?.id)return;
          if(typeof capture==='function')capture();
          window.dispatchEvent(new CustomEvent('sm:action-from-report',{detail:window.SM_ACTIVE}));
        });
        footer.insertBefore(button,footer.firstChild);
      }
      const user=window.AUTH?.user;
      button.hidden=!window.SM_ACTIVE?.id||!!(user?.permissions&&user.permissions.edit_actions===false&&user.role!=='admin');
    }
    new MutationObserver(sync).observe(editor,{attributes:true,attributeFilter:['open']});
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
