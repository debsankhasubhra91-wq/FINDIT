// SPA-style navigation: intercept .nav-link clicks, load pages via fetch, replace <main>, and call mount functions
(function(){
  async function loadPage(url, push = true){
    try{
      const res = await fetch(url, { cache: 'no-cache' });
      if(!res.ok) { console.warn('Failed to load', url); location.href = url; return; }
      const text = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const newMain = doc.querySelector('main');
      const newTitle = doc.querySelector('title');

      // unmount current page
      try{ if(window.unmountApp) window.unmountApp(); }catch(e){}
      try{ if(window.unmountDashboard) window.unmountDashboard(); }catch(e){}

      if(newMain){
        // Replace main content
        const oldMain = document.querySelector('main');
        oldMain.replaceWith(newMain);

        // Update title
        if(newTitle) document.title = newTitle.textContent || document.title;

        // Update header title/subtitle if present in new doc
        const newHeaderTitle = doc.querySelector('.app-title');
        const currentHeaderTitle = document.querySelector('.app-title');
        if(newHeaderTitle && currentHeaderTitle){ currentHeaderTitle.innerHTML = newHeaderTitle.innerHTML; }
        const newSubtitle = doc.querySelector('.subtitle');
        const currentSubtitle = document.querySelector('.subtitle');
        if(newSubtitle && currentSubtitle){ currentSubtitle.innerHTML = newSubtitle.innerHTML; }

        // Load any external scripts present in the fetched doc that are not yet loaded
        const scripts = Array.from(doc.querySelectorAll('script[src]'));
        for(const s of scripts){
          const src = s.getAttribute('src');
          // check if already included
          const existing = Array.from(document.querySelectorAll('script[src]')).some(e => e.getAttribute('src') === src);
          if(!existing){
            const scr = document.createElement('script'); scr.src = src; scr.async = false;
            document.body.appendChild(scr);
            // await load? simple approach: wait briefly
            await new Promise(res => scr.addEventListener('load', res));
          }
        }

        // Evaluate inline scripts from fetched doc
        const inlineScripts = Array.from(doc.querySelectorAll('script:not([src])'));
        inlineScripts.forEach(s => { const el = document.createElement('script'); el.textContent = s.textContent; document.body.appendChild(el); el.remove(); });

        // Update active nav
        if(window.setActiveNav) window.setActiveNav();

        // call page mounters based on path
        const page = url.split('/').pop() || 'index.html';
        if(page === '' || page === 'index.html' || page === 'profile.html'){ if(window.mountApp) window.mountApp(); }
        else if(page === 'dashboard.html'){ if(window.mountDashboard) window.mountDashboard(); }
        else { /* static pages: nothing to mount */ }

        // update history
        if(push) history.pushState({ url }, '', url);
      }
    }catch(e){ console.error('SPA load error', e); location.href = url; }
  }

  // Intercept clicks on nav links
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('.nav-link');
    if(!a) return;
    const href = a.getAttribute('href');
    if(!href) return;
    // only intercept same-origin html files
    if(href.startsWith('http') && !href.startsWith(location.origin)) return;
    e.preventDefault();
    loadPage(href);
  });

  // Handle back/forward
  window.addEventListener('popstate', (e) => {
    const url = e.state && e.state.url ? e.state.url : location.pathname;
    loadPage(url, false);
  });

  // Expose to global
  window.spaNavigate = loadPage;
})();
