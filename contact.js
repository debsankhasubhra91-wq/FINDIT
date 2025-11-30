// Client-side contact form handler
// - Validates basic fields (name, email, message)
// - Sends via fetch to the <form action> URL (Formspree) with multipart/form-data
// - Shows progress, success and error messages

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = document.getElementById('contact-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  function setStatus(message, type = '') {
    statusEl.textContent = message;
    // Use a dedicated class to avoid colliding with other `.status` styles
    statusEl.className = type ? `contact-status ${type}` : 'contact-status';
  }

  function validateEmail(email) {
    // Simple RFC-like pattern
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    setStatus('');

    const name = form.elements['name']?.value?.trim();
    const email = form.elements['email']?.value?.trim();
    const message = form.elements['message']?.value?.trim();

    if (!name || !email || !message) {
      setStatus('Please fill in all required fields.', 'error');
      return;
    }

    if (!validateEmail(email)) {
      setStatus('Please enter a valid email address.', 'error');
      return;
    }

    // Build FormData for multipart submission (supports file attachments)
    const fd = new FormData(form);

    // Visual feedback
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    setStatus('Sending...', 'pending');

    try {
      // Use the form's action URL (placeholder in markup). Update FORM_ID in HTML to use a real Formspree id.
      const action = form.action;
      if (!action || action.includes('FORM_ID')) {
        // If user didn't set their Formspree ID, show a friendly message and still mimic success locally
        setStatus('Form submitted locally — please replace FORM_ID in the form action with your Formspree form ID to enable email delivery.', 'warning');
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
        return;
      }

      const res = await fetch(action, {
        method: 'POST',
        body: fd,
        headers: {
          // Don't set Content-Type when sending FormData; browser will set boundary automatically
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        setStatus('Thanks — your message has been sent successfully!', 'success');
        form.reset();
      } else {
        const data = await res.json().catch(() => null);
        const errMsg = (data && data.error) ? data.error : `Server responded with ${res.status}`;
        setStatus(`Failed to send: ${errMsg}`, 'error');
      }
    } catch (err) {
      setStatus(`Failed to send: ${err.message}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
    }
  });
});