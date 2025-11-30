// Simple dock interaction for FINDIT - vanilla JS implementation
(function(){
  const dock = document.getElementById('dockPanel');
  if(!dock) return;
  const items = Array.from(dock.querySelectorAll('.dock-item'));

  function scaleItem(item, scale){
    item.style.transform = `scale(${scale})`;
  }

  function update(e){
    const rect = dock.getBoundingClientRect();
    const x = e.pageX || (e.touches && e.touches[0] && e.touches[0].pageX);
    if(typeof x === 'undefined') return;
    items.forEach(item => {
      const r = item.getBoundingClientRect();
      const mid = r.left + r.width/2;
      const dist = Math.abs(mid - x);
      // effect distance
      const maxDist = 200;
      const normalized = Math.max(0, Math.min(1, 1 - dist / maxDist));
      const scale = 1 + normalized * 0.6; // range 1 - 1.6
      scaleItem(item, scale);
    });
  }

  dock.addEventListener('mousemove', update);
  dock.addEventListener('touchmove', update, {passive: true});
  dock.addEventListener('mouseleave', ()=> items.forEach(i=>scaleItem(i, 1)));

  // Wire actions: call functions on window.findit if available
  items.forEach(item => {
    const action = item.getAttribute('data-action');
    item.addEventListener('click', () => {
      const app = window.findit || {};
      if(action === 'add'){
        const hasForm = !!document.getElementById('addItemForm');
        if(app && typeof app.openAddForm === 'function' && hasForm) { app.openAddForm(); }
        else if(window.spaNavigate) { window.spaNavigate('profile.html#add'); }
        else { location.href = 'profile.html#add'; }
      }
      if(action === 'search' && app.focusSearch) app.focusSearch();
      // 'Clear all' action disabled — removed in UI and app API
      if(action === 'showall') {
        if(app.showAll) app.showAll(); else document.getElementById('filterState').value = 'all'; document.getElementById('searchBox').value = ''; document.getElementById('searchBox').dispatchEvent(new Event('input'));
      }
    });
  });
})();