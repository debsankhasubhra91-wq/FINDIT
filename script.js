// FINDIT - a simple client-side lost & found app
(() => {
  const STORAGE_KEY = 'findit_items_v1';
  let form = document.getElementById('addItemForm');
  let clearBtn = document.getElementById('clearForm');
  let itemsList = document.getElementById('itemsList');
  let searchBox = document.getElementById('searchBox');
  let filterState = document.getElementById('filterState');
  let itemsCountEl = document.getElementById('itemsCount');
  let sortBySelect = document.getElementById('sortBy');
  let fileInput = document.getElementById('itemImageFile');

  // IndexedDB helpers for storing large image blobs (so we don't overflow localStorage)
  function openImageDB(){
    return new Promise((resolve, reject) => {
      if(!window.indexedDB) return reject(new Error('IndexedDB not supported'));
      const req = indexedDB.open('findit_images_v1', 1);
      req.onupgradeneeded = (e) => { const db = e.target.result; if(!db.objectStoreNames.contains('images')) db.createObjectStore('images'); };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error || new Error('IDB open error'));
    });
  }
  function storeImageBlob(blob){
    return openImageDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction('images','readwrite');
      const store = tx.objectStore('images');
      const id = uid();
      const put = store.put(blob, id);
      put.onsuccess = () => { resolve(id); db.close(); };
      put.onerror = (e) => { reject(e.target.error); db.close(); };
    }));
  }
  function getImageURLById(id){
    return openImageDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction('images','readonly');
      const req = tx.objectStore('images').get(id);
      req.onsuccess = () => {
        const blob = req.result;
        db.close();
        if(!blob) return resolve(null);
        const url = URL.createObjectURL(blob);
        resolve(url);
      };
      req.onerror = (e) => { db.close(); reject(e.target.error); };
    }));
  }
  function deleteImageById(id){
    return openImageDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction('images','readwrite');
      const req = tx.objectStore('images').delete(id);
      req.onsuccess = () => { db.close(); resolve(true); };
      req.onerror = (e) => { db.close(); reject(e.target.error); };
    }));
  }

  // helper for onchange attribute in HTML
  window.validateFileSize = function(inp){
    try{
      const f = inp && inp.files && inp.files[0]; if(!f) return true;
      const maxLimit = 50 * 1024 * 1024; // 50MB maximum allowed
      if(f.size > maxLimit){ alert('Selected image is too large. Max allowed is 50 MB.'); inp.value = ''; return false; }
      return true;
    }catch(e){ return false; }
  };

  let items = [];
  // expose basic API for dock integration and other external controls
  window.findit = {
    openAddForm: () => openAddForm(),
    focusSearch: () => { searchBox.focus(); },
    // clearAll removed on user request
    showAll: () => { filterState.value = 'all'; searchBox.value = ''; renderItems(); }
  };
  // Add programmatic API for other pages to add an item (e.g., from Profile)
  window.findit.addItem = function(item){
    try{
      const name = (item.name||'').trim(); if(!name) throw new Error('Item name required');
      const newItem = { id: uid(), name, desc: item.desc || '', location: item.location||'', date: item.date||'', contact: item.contact||'', image: item.image||'', status: item.status || 'lost' };
      // load items in case not yet loaded
      loadItems();
      items.unshift(newItem);
      saveItems();
      // If app has a list, re-render
      if(typeof renderItems === 'function') renderItems();
      return newItem;
    }catch(e){ console.warn('addItem failed', e); return null; }
  };

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

  function loadItems(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      items = raw ? JSON.parse(raw) : [];
    }catch(e){items = []}
    if(items.length === 0){
      // seed demo data
      items = [
        {id: uid(), name: 'Black Backpack', desc: 'Leather with a red ribbon on the strap', location: 'Science Block - 2nd floor', date:'2025-11-21', contact:'student@campus.edu', image:'', status:'lost' },
        {id: uid(), name: 'Silver MacBook', desc: '13 inch, sticker on lid', location: 'Library', date:'2025-11-24', contact:'owner@uni.edu', image:'', status:'lost' }
      ];
      saveItems();
    }
  }

  function saveItems(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function renderItems(){
    const q = (searchBox && searchBox.value) ? searchBox.value.trim().toLowerCase() : '';
    const state = filterState.value;
    if(itemsList) itemsList.innerHTML = '';
    let filtered = items.filter(item => {
      const matchesQ = q === '' || item.name.toLowerCase().includes(q) || item.location.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
      const matchesState = state === 'all' || item.status === state;
      return matchesQ && matchesState;
    });
    // sort
    const sortValue = sortBySelect ? sortBySelect.value : 'newest';
    if(sortValue === 'newest'){
      filtered.sort((a,b) => (b.date||'').localeCompare(a.date||''));
    } else if(sortValue === 'oldest'){
      filtered.sort((a,b) => (a.date||'').localeCompare(b.date||''));
    } else if(sortValue === 'name'){
      filtered.sort((a,b) => a.name.localeCompare(b.name));
    } else if(sortValue === 'location'){
      filtered.sort((a,b) => (a.location||'').localeCompare(b.location||''));
    }

    if(filtered.length === 0){
      if(itemsList) itemsList.innerHTML = '<div class="card">No items found. Add a lost item using the form on the left.</div>';
      return;
    }
    filtered.forEach(item => {
      const el = document.createElement('div'); el.className = 'item card';
      if(item.image){
        if(item.image.indexOf('id:') === 0){
          const id = item.image.slice(3);
          const img = document.createElement('img'); img.alt = item.name; img.style.width='100%'; img.style.height='150px'; img.style.objectFit='cover'; img.style.borderRadius='6px';
          // fetch object URL from IndexedDB
          getImageURLById(id).then(url => { if(url){ img.src = url; } else { img.alt = 'Image unavailable'; } });
          const a = document.createElement('a'); a.href = '#'; a.target = '_blank'; a.appendChild(img);
          // when clicked, open the blob url in a new tab
          a.addEventListener('click', (ev) => { ev.preventDefault(); getImageURLById(id).then(u=>{ if(u) window.open(u, '_blank'); else alert('Image not available'); }); });
          el.appendChild(a);
        } else {
          const a = document.createElement('a'); a.href = item.image; a.target = '_blank';
          const img = document.createElement('img'); img.src = item.image; img.alt = item.name; a.appendChild(img);
          el.appendChild(a);
        }
      }
      const title = document.createElement('h4'); title.textContent = item.name; el.appendChild(title);
      const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${item.location} • ${item.date || 'Date unknown'}`; el.appendChild(meta);
      const desc = document.createElement('p'); desc.textContent = item.desc || '';
      el.appendChild(desc);
      const contact = document.createElement('div'); contact.className='meta'; contact.textContent = `Contact: ${item.contact || '—'}`; el.appendChild(contact);
      const status = document.createElement('div'); status.className = `status ${item.status === 'lost' ? 'lost' : 'found'}`; status.textContent = item.status.toUpperCase(); el.appendChild(status);

      const actions = document.createElement('div'); actions.className = 'actions';
      // mark toggle
      const markBtn = document.createElement('button');
      markBtn.className = item.status === 'lost' ? 'btn btn-found' : 'btn btn-lost';
      markBtn.textContent = item.status === 'lost' ? 'Mark Found' : 'Mark Lost';
      markBtn.setAttribute('data-action', 'toggle-status'); markBtn.setAttribute('data-id', item.id);
      actions.appendChild(markBtn);

      // edit
      const editBtn = document.createElement('button'); editBtn.className='btn'; editBtn.textContent = 'Edit';
      editBtn.setAttribute('data-action','edit'); editBtn.setAttribute('data-id', item.id);
      actions.appendChild(editBtn);

      // delete
      const delBtn = document.createElement('button'); delBtn.className='btn btn-danger'; delBtn.textContent = 'Delete';
      delBtn.setAttribute('data-action','delete'); delBtn.setAttribute('data-id', item.id);
      actions.appendChild(delBtn);
      if(item.contact){
        const copyBtn = document.createElement('button'); copyBtn.className = 'btn'; copyBtn.textContent = 'Copy Contact';
        copyBtn.setAttribute('data-action','copy-contact'); copyBtn.setAttribute('data-id', item.id); copyBtn.setAttribute('data-contact', item.contact || '');
        actions.appendChild(copyBtn);
      }
      el.appendChild(actions);
      if(itemsList) itemsList.appendChild(el);
    });
    // Update count: show filtered count vs total
    if(itemsCountEl) itemsCountEl.textContent = `${filtered.length} of ${items.length} items`;
  }

  function addItemFromForm(e){
    e.preventDefault();
    const name = document.getElementById('itemName').value.trim();
    if(!name) return alert('Please add an item name');
    const desc = document.getElementById('itemDesc').value.trim();
    const location = document.getElementById('itemLocation').value.trim();
    const date = document.getElementById('itemDate').value;
    const contact = document.getElementById('itemContact').value.trim();
    const imageUrl = document.getElementById('itemImage').value.trim();
    const image = form.dataset.imageData || imageUrl;
    if(form.dataset.editId){
      // update existing item
      const id = form.dataset.editId;
      const idx = items.findIndex(i => i.id === id);
        if(idx >= 0){
        items[idx] = { ...items[idx], name, desc, location, date, contact, image };
      }
        delete form.dataset.editId;
        document.querySelector('#addItemForm .btn-primary').textContent = 'Add Item';
        const cancelBtn = document.getElementById('cancelEdit');
        if(cancelBtn) cancelBtn.style.display = 'none';
    } else {
      const item = { id: uid(), name, desc, location, date, contact, image, status:'lost' };
      items.unshift(item);
    }
    saveItems();
    renderItems();
    form.reset();
    // hide preview after submit
    clearImagePreview();
  }

  function clearImagePreview(){
    const preview = document.getElementById('imagePreview');
    if(preview){ preview.src=''; preview.style.display='none'; }
    try{ delete form.dataset.imageData; }catch(e){}
    if(fileInput) fileInput.value = '';
    const urlInp = document.getElementById('itemImage'); if(urlInp) urlInp.value = '';
  }
  function clearForm(){ form.reset(); clearImagePreview(); }


  function openEditForm(item){
    // fill form and focus
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemDesc').value = item.desc;
    document.getElementById('itemLocation').value = item.location;
    document.getElementById('itemDate').value = item.date || '';
    document.getElementById('itemContact').value = item.contact || '';
    if(item.image && item.image.indexOf('data:') === 0){
      // base64 image data URL - keep it in dataset so we can save later
      form.dataset.imageData = item.image;
      document.getElementById('itemImage').value = '';
    } else if(item.image && item.image.indexOf('id:') === 0){
      // image stored in IndexedDB; reference by id
      form.dataset.imageData = item.image;
      document.getElementById('itemImage').value = '';
    } else {
      document.getElementById('itemImage').value = item.image || '';
      try{ delete form.dataset.imageData; }catch(e){}
    }
    const preview = document.getElementById('imagePreview');
    if(item.image){
      if(item.image.indexOf('id:') === 0){ const iid = item.image.slice(3); if(preview){ getImageURLById(iid).then(url=>{ if(url){ preview.src = url; preview.style.display = 'block'; } else { preview.src=''; preview.style.display='none'; } }); } }
      else { if(preview){ preview.src = item.image; preview.style.display = 'block'; } }
    } else { if(preview){ preview.src=''; preview.style.display='none'; } }
    form.dataset.editId = item.id;
    document.querySelector('#addItemForm .btn-primary').textContent = 'Save Changes';
    const cancelBtn = document.getElementById('cancelEdit');
    if(cancelBtn) cancelBtn.style.display = 'inline-block';
    document.getElementById('itemName').focus();
    const left = document.querySelector('.left-col'); if(left) left.scrollIntoView({behavior: 'smooth'});
  }

  function openAddForm(){
    form.reset();
    delete form.dataset.editId;
    document.querySelector('#addItemForm .btn-primary').textContent = 'Add Item';
    document.getElementById('itemName').focus();
    const left = document.querySelector('.left-col'); if(left) left.scrollIntoView({behavior: 'smooth'});
    const cancelBtn = document.getElementById('cancelEdit');
    if(cancelBtn) cancelBtn.style.display = 'none';
  }

  // event listeners are managed by mountApp/unmountApp for SPA-friendly behavior
  const _listeners = [];
  function addListener(el, type, handler){ if(!el) return; el.addEventListener(type, handler); _listeners.push({el,type,handler}); }
  function removeAllListeners(){ _listeners.forEach(l => { try{ l.el.removeEventListener(l.type, l.handler); }catch(e){} }); _listeners.length = 0; }

  function mountApp(){
    // ensure we point to the fresh DOM elements when using SPA swaps
    form = document.getElementById('addItemForm');
    clearBtn = document.getElementById('clearForm');
    itemsList = document.getElementById('itemsList');
    searchBox = document.getElementById('searchBox');
    filterState = document.getElementById('filterState');
    itemsCountEl = document.getElementById('itemsCount');
    sortBySelect = document.getElementById('sortBy');
    fileInput = document.getElementById('itemImageFile');

    removeAllListeners();
    addListener(form, 'submit', addItemFromForm);
    addListener(clearBtn, 'click', clearForm);
    const itemImageEl = document.getElementById('itemImage');
    addListener(itemImageEl, 'input', (e) => {
      const url = e.target.value.trim();
      const preview = document.getElementById('imagePreview');
      if(!preview) return;
      if(url){ preview.src = url; preview.style.display = 'block'; } else { preview.src=''; preview.style.display='none'; }
    });
    addListener(searchBox, 'input', () => renderItems());
    addListener(filterState, 'change', () => renderItems());
    if(sortBySelect) addListener(sortBySelect, 'change', () => renderItems());
    // 'Clear All' button removed; no listener attached
    // delegated actions on item cards
    addListener(itemsList, 'click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if(!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if(action === 'toggle-status'){ const idx = items.findIndex(i=>i.id===id); if(idx>=0){ items[idx].status = items[idx].status === 'lost' ? 'found' : 'lost'; saveItems(); renderItems(); } }
      else if(action === 'edit'){ const idx = items.findIndex(i=>i.id===id); if(idx>=0){ openEditForm(items[idx]); } }
      else if(action === 'delete'){ if(confirm('Delete this item?')){ const idx = items.findIndex(i=>i.id===id); if(idx>=0){ try{ if(items[idx].image && items[idx].image.indexOf('id:') === 0){ deleteImageById(items[idx].image.slice(3)).catch(()=>{}); } }catch(e){} items.splice(idx,1); saveItems(); renderItems(); } } }
      else if(action === 'copy-contact'){ const contact = btn.getAttribute('data-contact'); if(navigator.clipboard){ navigator.clipboard.writeText(contact || '').then(()=>{ const orig = btn.textContent; btn.textContent = 'Copied!'; setTimeout(()=>btn.textContent = orig, 1600); }).catch(()=>alert('Could not copy to clipboard')); } else { alert('Clipboard not supported'); } }
    });
    // file upload handling (supports large images via IndexedDB)
    if(fileInput){ addListener(fileInput, 'change', (e) => {
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      const maxSize = 50 * 1024 * 1024; // 50MB absolute limit
      const idbThreshold = 10 * 1024 * 1024; // store in IndexedDB if > 10MB
      if(file.size > maxSize){ alert('Selected image is too large. Max allowed is 50 MB.'); e.target.value = ''; return; }
      if(!file.type || !file.type.startsWith('image/')){ alert('Please select an image file.'); e.target.value = ''; return; }
      const preview = document.getElementById('imagePreview');
      const urlInp = document.getElementById('itemImage');
      if(file.size > idbThreshold && window.indexedDB){
        // store large blob in IndexedDB and reference it by id
        storeImageBlob(file).then(id => {
          form.dataset.imageData = 'id:' + id;
          if(preview){ getImageURLById(id).then(url => { if(url){ preview.src = url; preview.style.display = 'block'; } }); }
          if(urlInp) urlInp.value = '';
        }).catch(err => { console.error('storeImageBlob failed', err); alert('Failed to store image locally.'); e.target.value = ''; });
      } else {
        // small images: inline as data URL
        const reader = new FileReader();
        reader.onload = function(evt){
          const dataURL = evt.target.result; form.dataset.imageData = dataURL; if(preview){ preview.src = dataURL; preview.style.display = 'block'; }
          if(urlInp) urlInp.value = '';
        };
        reader.readAsDataURL(file);
      }
    }); }
    const cancelEditBtn = document.getElementById('cancelEdit');
    if(cancelEditBtn) addListener(cancelEditBtn, 'click', openAddForm);
    addListener(document, 'keydown', keydownHandler);
    // bootstrap
    loadItems();
    renderItems();
    // auto-open add form if navigation hash indicates so
    if(location.hash === '#add'){
      openAddForm();
    }
    // if a profile contact exists in localStorage, populate the contact field
    try{
      // prefer structured profile storage when available
      const raw = localStorage.getItem('findit_profile');
      let pc = null;
      if(raw){ try{ const p = JSON.parse(raw); pc = (p && p.contact) ? p.contact : null; }catch(e){} }
      if(!pc) pc = localStorage.getItem('findit_profile_contact');
      if(pc){ const c = document.getElementById('itemContact'); if(c) c.value = pc; }
    }catch(e){}
    // if an 'edit' parameter is provided, open the edit form for that item
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if(editId){ const item = items.find(i => i.id === editId); if(item){ setTimeout(() => openEditForm(item), 200); } }
  }
  function unmountApp(){ removeAllListeners(); }
  function keydownHandler(e){
    if(e.key === '/') { e.preventDefault(); searchBox.focus(); }
    if(e.key.toLowerCase() === 'n') { if(document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA'){ document.getElementById('itemName').focus(); } }
    if(e.key === 'Escape') { openAddForm(); }
  }
  window.mountApp = mountApp;
  window.unmountApp = unmountApp;
  document.addEventListener('DOMContentLoaded', mountApp);
})();
