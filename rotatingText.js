// Simple rotating text for FINDIT header (vanilla JS)
(function(){
  function createRotatingText(container, texts, options = {}){
    const interval = options.interval || 2500;
    const split = options.split || 'characters'; // characters | words | lines
    const stagger = options.stagger || 30; // ms per char

    let idx = 0;
    let timeoutId;

    function splitText(text){
      if(split === 'characters') return text.split('').map(c => ({ text: c, type: 'char' }));
      if(split === 'words') return text.split(' ').map((w,i,a) => ({ text: w, type: 'word', needsSpace: i < a.length-1 }));
      if(split === 'lines') return text.split('\n').map((l,i,a)=>({text:l,type:'line',needsSpace:i<a.length-1 }));
      return text.split(split).map((t,i,a)=>({text:t,type:'part', needsSpace:i<a.length-1}));
    }

    function clearChildren(el){ while(el.firstChild) el.removeChild(el.firstChild); }

    function setText(text){
      const elements = split === 'characters' ? text.split('').map(t => ({ text:t })) : splitText(text);
      clearChildren(container);

      if(split === 'characters'){
        elements.forEach((e, i) => {
          const span = document.createElement('span');
          span.className = 'text-rotate-element';
          span.textContent = e.text;
          span.style.animationDelay = `${i * stagger}ms`;
          span.classList.add('enter');
          container.appendChild(span);
        });
      } else {
          elements.forEach((e, i) => {
            const wordWrap = document.createElement('span');
            wordWrap.className = 'text-rotate-word';
            const span = document.createElement('span');
            span.className = 'text-rotate-element';
            span.textContent = e.text;
            span.style.animationDelay = `${i * stagger}ms`;
            span.classList.add('enter');
            wordWrap.appendChild(span);
            if(e.needsSpace){ const s = document.createElement('span'); s.className = 'text-rotate-space'; s.textContent = ' '; wordWrap.appendChild(s); }
            container.appendChild(wordWrap);
          });
      }
    }

    function next(){
      // animate out first group
      const children = Array.from(container.querySelectorAll('.text-rotate-element'));
      children.forEach((c,i) => {
        c.classList.remove('enter');
        c.classList.add('exit');
        c.style.animationDelay = `${i * (stagger/2)}ms`;
      });
      // after exit, set next
      setTimeout(()=>{
        idx = (idx + 1) % texts.length;
        setText(texts[idx]);
      }, 300);
    }

    // start
    if(!container) return {start:()=>{}, stop:()=>{}};
    const sr = document.createElement('span'); sr.className = 'text-rotate-sr-only'; sr.setAttribute('aria-live', 'polite'); sr.textContent = texts[idx]; container.parentNode && container.parentNode.insertBefore(sr, container);
    setText(texts[idx]);
    timeoutId = setInterval(()=>{
      // update SR text
      if(sr) sr.textContent = texts[(idx+1) % texts.length];
      next();
    }, interval);

    return {
      stop: () => { clearInterval(timeoutId); },
      start: () => {
        timeoutId = setInterval(next, interval);
      }
    };
  }

  // expose function on window
  window.createRotatingText = createRotatingText;
})();
