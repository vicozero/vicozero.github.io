// FASE 3 - Mejoras de UI aditivas (no toca la logica existente)
(function(){
  'use strict';
  const KEY = 'sm-sidebar-collapsed';

  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  ready(function(){
    if(window.SM_UI?.installed)return;
    const body = document.body;
    const toggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    try { if (localStorage.getItem(KEY) === '1') body.classList.add('sidebar-collapsed'); } catch (e) {}

    let backdrop = document.querySelector('.mobile-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-backdrop';
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click', closeMenu);
    }

    function closeMenu(){
      body.classList.remove('nav-open','sidebar-open');
      toggle?.setAttribute('aria-expanded','false');
    }
    function labelNavigation(){
      sidebar?.querySelectorAll('nav button, nav a').forEach(btn=>{
        if(!btn.title)btn.title=btn.textContent.trim();
        if(!btn.getAttribute('aria-label'))btn.setAttribute('aria-label',btn.textContent.trim());
      });
    }
    labelNavigation();
    if(sidebar)new MutationObserver(labelNavigation).observe(sidebar.querySelector('nav'),{childList:true,subtree:true});

    if (toggle) {
      toggle.addEventListener('click', function(e){
        e.preventDefault();
        // workspace.js has a legacy click handler; a single controller owns the menu.
        e.stopImmediatePropagation();
        if (window.innerWidth <= 800) {
          body.classList.remove('sidebar-open');
          const open=body.classList.toggle('nav-open');
          toggle.setAttribute('aria-expanded',String(open));
        } else {
          closeMenu();
          body.classList.toggle('sidebar-collapsed');
          toggle.setAttribute('aria-expanded',String(!body.classList.contains('sidebar-collapsed')));
          try { localStorage.setItem(KEY, body.classList.contains('sidebar-collapsed') ? '1' : '0'); } catch (e) {}
        }
      },true);
    }

    sidebar?.querySelector('nav')?.addEventListener('click',function(e){
      if(e.target.closest('button,a'))closeMenu();
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
    window.addEventListener('resize',closeMenu);

    const tools = document.querySelector('.header-tools');
    const searchInput = document.getElementById('search');
    if (tools && searchInput) {
      const wrap = document.createElement('label');
      wrap.className = 'header-search';
      wrap.innerHTML = '<span>&#8981;</span><input type="search" placeholder="Buscar en esta vista..." aria-label="Busqueda global">';
      const inp = wrap.querySelector('input');
      inp.addEventListener('input', function(){
        searchInput.value = inp.value;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
      searchInput.addEventListener('input', function(){ inp.value = searchInput.value; });
      const bell = document.getElementById('noticeBell');
      if (bell) bell.insertAdjacentElement('beforebegin', wrap);
      else tools.prepend(wrap);
    }

    window.SM_UI = window.SM_UI || {};
    window.SM_UI.installed=true;
    window.SM_UI.loading = function(show){
      let ov = document.querySelector('.loading-overlay');
      if (show) {
        if (!ov) {
          ov = document.createElement('div');
          ov.className = 'loading-overlay';
          ov.innerHTML = '<div class="spinner"></div>';
          document.body.appendChild(ov);
        }
      } else if (ov) {
        ov.remove();
      }
    };
  });
})();
