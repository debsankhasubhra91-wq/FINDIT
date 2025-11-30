// Dashboard logic: compute stats from localStorage and render recent items
;(function(){
  const STORAGE_KEY = 'findit_items_v1';
  function loadItems(){
    try{ const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; }catch(e){ return []; }
  }
  function countByStatus(items){
    let total = items.length; let lost = 0; let found = 0;
    items.forEach(i=> { if(i.status === 'lost') lost++; else if(i.status === 'found') found++; });
    return { total, lost, found };
  }
  function uniqueLocations(items){
    const map = {};
    items.forEach(i=>{ const l = (i.location||'Unknown'); map[l] = (map[l]||0)+1; });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  }
  function render(){
    const items = loadItems();
    const { total, lost, found } = countByStatus(items);
    document.getElementById('totalCount').textContent = total;
    document.getElementById('lostCount').textContent = lost;
    document.getElementById('foundCount').textContent = found;

    const recent = items.slice(0, 8);
    const recentList = document.getElementById('recentList');
    recentList.innerHTML = '';
    if(recent.length === 0){ recentList.innerHTML = '<div class="card">No items yet</div>'; }
    recent.forEach(i => {
      const el = document.createElement('div'); el.className = 'item card';
      const title = document.createElement('h4'); title.textContent = i.name; el.appendChild(title);
      const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${i.location} • ${i.date || 'Unknown'}`; el.appendChild(meta);
      if(i.image){ const img = document.createElement('img'); img.src = i.image; img.alt = i.name; el.insertBefore(img, el.firstChild); }
      const actions = document.createElement('div'); actions.className = 'actions';
      const goto = document.createElement('button'); goto.textContent = 'Open in App'; goto.className = 'btn'; goto.setAttribute('data-action','open-in-app'); goto.setAttribute('data-id', i.id);
      goto.addEventListener('click', () => { location.href = `index.html?edit=${i.id}`; });
      actions.appendChild(goto);
      el.appendChild(actions);
      recentList.appendChild(el);
    });

    const topLoc = uniqueLocations(items);
    const topEl = document.getElementById('topLocations'); topEl.innerHTML = '';
    if(topLoc.length === 0) topEl.textContent = '(No data yet)';
    topLoc.slice(0,5).forEach(([loc,count])=>{
      const div = document.createElement('div'); div.style.marginBottom='6px'; div.textContent = `${loc} — ${count}`; topEl.appendChild(div);
    });
  }
  let _tabHandlers = [];
  function showSection(name){
    const sections = { overview: document.getElementById('overviewSection'), recent: document.getElementById('recentSection'), locations: document.getElementById('locationsSection') };
    Object.keys(sections).forEach(k=>{ const el = sections[k]; if(!el) return; el.style.display = (k === name) ? '' : 'none'; });
    const tabs = document.querySelectorAll('.dashboard-tab'); tabs.forEach(t=>{ const sel = t.dataset.section === name; t.setAttribute('aria-selected', sel ? 'true' : 'false'); t.classList.toggle('active', sel); });
    try { history.replaceState(null, '', `#${name}`); } catch(e){}
  }
  function mountDashboard(){
    render();
    // 'Clear All' removed — no clear button on dashboard any more
    const goto = document.getElementById('goToApp'); if(goto) goto.addEventListener('click', ()=>{ location.href = 'index.html'; });
    // Tabs
    const tabs = Array.from(document.querySelectorAll('.dashboard-tab'));
    if(tabs.length){
      const tablist = tabs[0].closest('[role=tablist]'); if(tablist) tablist.setAttribute('aria-orientation','horizontal');
      const onKey = (e)=>{
        const key = e.key;
        const idx = tabs.indexOf(document.activeElement);
        if(idx === -1) return;
        let next = idx;
        if(key === 'ArrowRight') next = (idx + 1) % tabs.length;
        else if(key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
        else if(key === 'Home') next = 0;
        else if(key === 'End') next = tabs.length - 1;
        if(next !== idx){ tabs[next].focus(); }
      };
      const clickHandlers = [];
      tabs.forEach((t,i)=>{
        t.setAttribute('role','tab');
        const handler = ()=>{ showSection(t.dataset.section); };
        t.addEventListener('click', handler);
        t.addEventListener('keydown', onKey);
        clickHandlers.push({el:t, handler, onKey});
        // default aria
        t.setAttribute('tabindex', '0');
      });
      _tabHandlers = clickHandlers;
      // Activate default tab: prefer hash
      const targetFromHash = (location.hash || '').replace('#','') || 'overview';
      showSection(targetFromHash);
    }
  }
  function unmountDashboard(){
    // no clearAllDash cleanup required
    const goto = document.getElementById('goToApp'); if(goto) { /* no-op */ }
    // remove tab handlers if mounted
    if(Array.isArray(_tabHandlers)){
      _tabHandlers.forEach(o=>{ if(o.el){ o.el.removeEventListener('click', o.handler); o.el.removeEventListener('keydown', o.onKey); } });
      _tabHandlers = [];
    }
  }
  window.mountDashboard = mountDashboard;
  window.unmountDashboard = unmountDashboard;
  document.addEventListener('DOMContentLoaded', mountDashboard);
})();
