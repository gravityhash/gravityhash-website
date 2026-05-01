(() => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const revealTargets = document.querySelectorAll('.section, .hero-copy, .hero-card, .product, .service, .work-card, .process > li, .quote');
  revealTargets.forEach((el) => el.classList.add('reveal'));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 }
  );
  revealTargets.forEach((el) => io.observe(el));

  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');

  function setStatus(msg, kind) {
    status.textContent = msg;
    status.classList.remove('is-success', 'is-error');
    if (kind) status.classList.add(`is-${kind}`);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('', null);

    const data = Object.fromEntries(new FormData(form).entries());

    if (!data.name || data.name.trim().length < 2) return setStatus('Please enter your name.', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || '')) return setStatus('Please enter a valid email.', 'error');
    if (!data.message || data.message.trim().length < 10) return setStatus('Message must be at least 10 characters.', 'error');

    form.classList.add('is-loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Something went wrong.');
      form.reset();
      setStatus('Thanks — we received your message and will reply within one business day.', 'success');
    } catch (err) {
      setStatus(err.message || 'Failed to send. Please email hello@gravityhash.com directly.', 'error');
    } finally {
      form.classList.remove('is-loading');
    }
  });
})();
