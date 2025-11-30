// Small script to mark the current nav link as active
(function(){
  function setActiveNav(){
    const links = Array.from(document.querySelectorAll('.nav-link'));
    const current = (location.pathname || '').split('/').pop() || 'index.html';
    links.forEach(a => a.classList.remove('active'));
    links.forEach(a => {
      try{
        const href = a.getAttribute('href') || '';
        const linkBasename = href.split('/').pop();
        if(linkBasename === current || (current === '' && linkBasename === 'index.html')){
          a.classList.add('active');
        }
      }catch(e){/* ignore */}
    });
  }
  document.addEventListener('DOMContentLoaded', setActiveNav);
  window.setActiveNav = setActiveNav;
})();
