// Simple settings handler for FINDIT
(function(){
  const STORAGE_KEY = 'findit_settings_v1';

  function $(id){ return document.getElementById(id); }

  function loadSettings(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }

  function saveSettings(settings){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function applyTheme(theme){
    const body = document.body;
    body.classList.remove('theme-light','theme-dark','theme-compact');
    if(theme === 'light') body.classList.add('theme-light');
    else if(theme === 'dark') body.classList.add('theme-dark');
    else if(theme === 'compact') body.classList.add('theme-compact');
    else body.classList.remove('theme-light','theme-dark','theme-compact');
  }

  function populate(){
    const s = loadSettings();
    $('themeSelect').value = s.theme || 'system';
    $('languageSelect').value = s.lang || 'en';
    $('enableNotifications').checked = !!s.notifications;
    $('reportEmail').value = s.reportEmail || 'diptamudebnath43@gmail.com';
    $('autoBackup').checked = !!s.autoBackup;
    applyTheme(s.theme || 'system');
  }

  function exportSettings(){
    const s = loadSettings();
    const blob = new Blob([JSON.stringify(s, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'findit-settings.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 1500);
  }

  function importSettingsFile(file){
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e){
      try{
        const parsed = JSON.parse(e.target.result);
        saveSettings(parsed);
        populate();
        alert('Settings imported — saved locally.');
      }catch(err){ alert('Invalid settings file.'); }
    };
    reader.readAsText(file);
  }

  function resetSettings(){
    if(!confirm('Reset all app settings to defaults?')) return;
    localStorage.removeItem(STORAGE_KEY);
    populate();
    alert('Settings reset');
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    if(!document.getElementById('saveSettings')) return; // only run when on settings page
    populate();

    $('saveSettings').addEventListener('click', ()=>{
      const settings = {
        theme: $('themeSelect').value,
        lang: $('languageSelect').value,
        notifications: !!$('enableNotifications').checked,
        reportEmail: $('reportEmail').value.trim(),
        autoBackup: !!$('autoBackup').checked,
        savedAt: new Date().toISOString()
      };
      saveSettings(settings);
      applyTheme(settings.theme);
      alert('Settings saved');
    });

    $('exportSettings').addEventListener('click', exportSettings);
    $('importSettings').addEventListener('change', (e) => { importSettingsFile(e.target.files && e.target.files[0]); });
    $('resetSettings').addEventListener('click', resetSettings);

    // small UI: reflect selection immediately
    $('themeSelect').addEventListener('change', () => applyTheme($('themeSelect').value));
  });
})();