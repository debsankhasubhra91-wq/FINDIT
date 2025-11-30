// Delegated hamburger menu events so handlers are resilient to SPA DOM swaps
document.addEventListener('click', (e) => {
  const openAdd = e.target.closest('.open-add');
  if(openAdd){
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    // If current page contains the add form, prefer calling openAddForm. Otherwise navigate to Profile add form
    const hasForm = !!document.getElementById('addItemForm');
    if(window.findit && typeof window.findit.openAddForm === 'function' && hasForm){
      try{ window.findit.openAddForm(); }catch(e){ /* ignore */ }
    } else if(window.spaNavigate){
      window.spaNavigate('profile.html#add');
    } else { location.href = 'profile.html#add'; }
    // close sidebar if open
    if(sidebar && overlay){ sidebar.classList.remove('open'); overlay.classList.remove('active'); const btn = document.getElementById('menu-btn'); if(btn) btn.setAttribute('aria-expanded', 'false'); }
    e.preventDefault();
    return;
  }
  }
  const menuBtn = e.target.closest('#menu-btn');
  const overlay = document.getElementById('overlay');
  const sidebar = document.getElementById('sidebar');
  if(menuBtn){
    if(!sidebar || !overlay) return;
    const isOpen = sidebar.classList.toggle('open');
    overlay.classList.toggle('active', isOpen);
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    e.preventDefault();
    return;
  }
  // overlay click closes sidebar
  const overlayClicked = e.target.closest('#overlay');
  if(overlayClicked && sidebar && overlay){
    sidebar.classList.remove('open'); overlay.classList.remove('active');
    const btn = document.getElementById('menu-btn'); if(btn) btn.setAttribute('aria-expanded', 'false');
    return;
  }

  // New Item opens the add form (if available) and closes menu when clicked inside the sidebar
  const newBtnClick = e.target.closest('#sidebar .new-chat-btn');
  if(newBtnClick){
    if(window.findit && typeof window.findit.openAddForm === 'function'){
      if(location.pathname.split('/').pop() !== 'index.html'){ location.href = 'index.html#add'; return; }
      window.findit.openAddForm();
    } else { if(location && location.href) location.href = 'index.html'; }
    if(sidebar && overlay){ sidebar.classList.remove('open'); overlay.classList.remove('active'); }
    const btn = document.getElementById('menu-btn'); if(btn) btn.setAttribute('aria-expanded','false');
    return;
  }
  // close sidebar when clicking a nav-link inside it (mobile navigation)
  const sidebarNav = e.target.closest('#sidebar .nav-link');
  if(sidebarNav && sidebar && overlay){ sidebar.classList.remove('open'); overlay.classList.remove('active'); const btn = document.getElementById('menu-btn'); if(btn) btn.setAttribute('aria-expanded','false'); }
});

// Close with Escape (delegated)
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if(sidebar && sidebar.classList.contains('open')){ sidebar.classList.remove('open'); if(overlay) overlay.classList.remove('active'); const btn = document.getElementById('menu-btn'); if(btn) btn.setAttribute('aria-expanded', 'false'); }
  }
});
// Simple hamburger toggle: open/close sidebar and overlay
document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if(!menuBtn || !sidebar || !overlay) return; // Not every page may have these elements

  function toggleMenu(){
    const isOpen = sidebar.classList.toggle('open');
    overlay.classList.toggle('active', isOpen);
    menuBtn.setAttribute('aria-expanded', String(isOpen));
  }

  menuBtn.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', toggleMenu);
  // New Item opens the add form (if available) and closes menu
  const newBtn = document.querySelector('#sidebar .new-chat-btn');
  if(newBtn){
    newBtn.addEventListener('click', () => {
      if(window.findit && typeof window.findit.openAddForm === 'function'){
        // when on other pages, navigate to index and then open the form using hash
        if(location.pathname.split('/').pop() !== 'index.html'){
          location.href = 'index.html';
          return;
        }
        window.findit.openAddForm();
      } else { if(location && location.href) location.href = 'index.html'; }
      toggleMenu();
    });
  }
  // Close with escape
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && sidebar.classList.contains('open')) toggleMenu(); });
});
