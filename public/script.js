(() => {
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Footer year ─────────────────────────────────────────────
  const yr = $('#year');
  if (yr) yr.textContent = new Date().getFullYear();

  // ── Scroll progress + nav scroll state ─────────────────────
  const progressBar = $('.scroll-progress-bar');
  const nav = $('.nav');
  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
        if (progressBar) progressBar.style.width = pct + '%';
        if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8);
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── Active section tracking + sliding nav pill ─────────────
  const navLinks = $$('.nav-links > a[data-nav]');
  const pill = $('.nav-pill');
  const sections = navLinks.map((a) => document.getElementById(a.dataset.nav)).filter(Boolean);

  function setActive(id) {
    let activeEl = null;
    navLinks.forEach((a) => {
      const isActive = a.dataset.nav === id;
      a.classList.toggle('is-active', isActive);
      if (isActive) activeEl = a;
    });
    if (pill && activeEl) {
      const linksBox = activeEl.parentElement.getBoundingClientRect();
      const aBox = activeEl.getBoundingClientRect();
      pill.style.width = aBox.width + 'px';
      pill.style.transform = `translate(${aBox.left - linksBox.left}px, -50%)`;
      pill.classList.add('is-visible');
    }
  }
  function clearActive() {
    navLinks.forEach((a) => a.classList.remove('is-active'));
    if (pill) pill.classList.remove('is-visible');
  }

  if (sections.length && 'IntersectionObserver' in window) {
    const sectionObs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length) setActive(visible[0].target.id);
        else clearActive();
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((s) => sectionObs.observe(s));
  }

  // Hover on a nav link previews the pill
  navLinks.forEach((a) => {
    a.addEventListener('mouseenter', () => {
      if (!pill) return;
      const linksBox = a.parentElement.getBoundingClientRect();
      const aBox = a.getBoundingClientRect();
      pill.style.width = aBox.width + 'px';
      pill.style.transform = `translate(${aBox.left - linksBox.left}px, -50%)`;
      pill.classList.add('is-visible');
    });
  });
  // Restore active pill when leaving the nav links container
  const navLinksEl = $('.nav-links');
  if (navLinksEl) {
    navLinksEl.addEventListener('mouseleave', () => {
      const active = navLinks.find((a) => a.classList.contains('is-active'));
      if (active) active.dispatchEvent(new MouseEvent('mouseenter'));
      else if (pill) pill.classList.remove('is-visible');
    });
  }

  // ── Cursor spotlight on cards ──────────────────────────────
  $$('.spot').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
      el.style.setProperty('--my', ((e.clientY - r.top)  / r.height) * 100 + '%');
    });
  });

  // ── Cursor glow + magnetic pull on buttons ─────────────────
  $$('.btn').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      btn.style.setProperty('--mx', (mx / r.width) * 100 + '%');
      btn.style.setProperty('--my', (my / r.height) * 100 + '%');
      if (!reduce) {
        const dx = (mx - r.width / 2) * 0.08;
        const dy = (my - r.height / 2) * 0.18;
        btn.style.transform = `translate(${dx}px, ${dy - 2}px)`;
      }
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });

  // ── Hero panel parallax on mouse move ──────────────────────
  const heroPanel = $('.hero-panel');
  const hero = $('.hero');
  if (heroPanel && hero && !reduce) {
    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      heroPanel.style.setProperty('--px', (cx * -10).toFixed(2) + 'px');
      heroPanel.style.setProperty('--py', (cy * -8).toFixed(2) + 'px');
    });
    hero.addEventListener('mouseleave', () => {
      heroPanel.style.setProperty('--px', '0px');
      heroPanel.style.setProperty('--py', '0px');
    });
  }

  // ── Industries marquee (duplicate items for seamless loop) ─
  const industries = $('.industries');
  if (industries && !reduce) {
    industries.classList.add('marquee');
    industries.innerHTML += industries.innerHTML;
  }

  // ── Hero KPI count-up ──────────────────────────────────────
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  function animateNumber(el) {
    const target = el.textContent.trim();
    const match = target.match(/^(.*?)([\d.]+)(.*)$/);
    if (!match) return;
    const [, prefix, numStr, suffix] = match;
    const end = parseFloat(numStr);
    const decimals = (numStr.split('.')[1] || '').length;
    const duration = 1300;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const v = end * easeOut(t);
      el.textContent = prefix + v.toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    };
    requestAnimationFrame(tick);
  }
  const kpiEls = $$('.hero-stats dd');
  if (kpiEls.length && 'IntersectionObserver' in window && !reduce) {
    const kpiObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animateNumber(e.target);
            kpiObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    kpiEls.forEach((el) => kpiObs.observe(el));
  }

  // ── Reveal on scroll, with stagger inside groups ───────────
  const revealTargets = $$([
    '.hero-copy', '.hero-panel',
    '.statement',
    '.flagship', '.product',
    '.service',
    '.differentiators > li',
    '.process > li',
    '.work-card',
    '.quote',
    '.cta-banner-inner',
    '.contact-card',
    '.stack',
  ].join(','));

  revealTargets.forEach((el) => el.classList.add('reveal'));

  // stagger siblings within the same parent group
  const groupSelectors = ['.services', '.products-row', '.differentiators', '.process', '.work-grid', '.quote-stack'];
  groupSelectors.forEach((sel) => {
    $$(sel).forEach((parent) => {
      Array.from(parent.children).forEach((child, i) => {
        if (child.classList.contains('reveal')) {
          child.style.setProperty('--reveal-delay', (i * 80) + 'ms');
        }
      });
    });
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('in'));
  }

  // ── Smooth-scroll to anchors with offset ───────────────────
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
      history.pushState(null, '', href);
    });
  });

  // ── Contact form ───────────────────────────────────────────
  const form = $('#contact-form');
  const status = $('#form-status');
  if (!form || !status) return;

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
